<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <div class="p-2 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-800 shrink-0 z-10">
      <div class="font-semibold px-2">Vue Flow Diagram: {{ tableName }}</div>
      <div class="flex items-center gap-x-2">
        <div class="flex rounded border bg-white dark:bg-gray-700 overflow-hidden mr-2">
          <button 
            class="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 border-r dark:border-gray-600 text-sm" 
            :class="{ 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200': layoutDirection === 'TB' }"
            @click="layoutDirection = 'TB'" 
            title="Vertical Layout"
          >
            Vertical
          </button>
          <button 
            class="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm" 
            :class="{ 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200': layoutDirection === 'LR' }"
            @click="layoutDirection = 'LR'" 
            title="Horizontal Layout"
          >
            Horizontal
          </button>
        </div>
        <button class="px-3 py-1 text-sm border rounded hover:bg-gray-200 dark:hover:bg-gray-700" @click="handleClose">Close</button>
      </div>
    </div>
    <div class="flex-1 h-full w-full relative">
      <div v-if="!db.isLoaded" class="absolute inset-0 flex items-center justify-center z-20 bg-white/50 dark:bg-black/50">
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow">Loading schema...</div>
      </div>
      <VueFlow
        v-model="elements"
        :node-types="nodeTypes"
        :default-viewport="{ zoom: 1 }"
        :min-zoom="0.1"
        :max-zoom="4"
        fit-view-on-init
        class="vue-flow-basic"
        :only-render-visible-elements="true"
        :pan-on-scroll="true"
      >
        <Background pattern-color="#aaa" :gap="8" />
        <Controls />
        <MiniMap 
          pannable 
          zoomable 
          :node-color="getNodeColor"
          :node-stroke-color="getNodeStrokeColor"
        />
      </VueFlow>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, type PropType, markRaw } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import dagre from 'dagre'
import type { DatSchemasDatabase } from '@/app/dat-viewer/db.js'
import TableNode from './nodes/TableNode.vue'
import ClusterNode from './nodes/ClusterNode.vue'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

export default defineComponent({
  components: { VueFlow, Background, Controls, MiniMap },
  props: {
    tableName: {
      type: String,
      required: true
    },
    db: {
      type: Object as PropType<DatSchemasDatabase>,
      required: true
    },
    isStandalone: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'navigate'],
  setup (props, { emit }) {
    const elements = ref<any[]>([])
    const { fitView, onNodeDoubleClick } = useVueFlow()
    const expandedClusters = ref<Set<string>>(new Set())
    const layoutDirection = ref<'TB' | 'LR'>('LR') // Default to Horizontal as requested

    // Register custom node types
    const nodeTypes: any = {
      table: markRaw(TableNode),
      cluster: markRaw(ClusterNode)
    }

    function handleClose () {
      if (props.isStandalone) {
        window.close()
      } else {
        emit('close')
      }
    }

    function getLayoutedElements (nodes: any[], edges: any[]) {
      const g = new dagre.graphlib.Graph()
      const isHorizontal = layoutDirection.value === 'LR'
      
      g.setGraph({ 
        rankdir: layoutDirection.value, 
        nodesep: 50, 
        ranksep: isHorizontal ? 150 : 80 
      })
      g.setDefaultEdgeLabel(() => ({}))

      nodes.forEach((node) => {
        // Estimate sizes based on type
        const width = node.type === 'cluster' ? 180 : 200
        const height = node.type === 'cluster' ? 50 : 60
        g.setNode(node.id, { width, height })
      })

      edges.forEach((edge) => {
        g.setEdge(edge.source, edge.target)
      })

      dagre.layout(g)

      return {
        nodes: nodes.map((node) => {
          const pos = g.node(node.id)
          return { ...node, position: { x: pos.x, y: pos.y } }
        }),
        edges
      }
    }

    function toggleCluster (id: string, expanded: boolean) {
      if (expanded) {
        expandedClusters.value.add(id)
      } else {
        expandedClusters.value.delete(id)
      }
      generateGraph()
    }

    function generateGraph () {
      if (!props.db.isLoaded) return

      const { tableName, db } = props
      const refsTo = db.getDetailedReferencesTo(tableName)
      const refsFrom = db.getDetailedReferencesFrom(tableName)

      const nodes = []
      const edges = []
      const addedNodes = new Set<string>()

      // Central node
      nodes.push({
        id: tableName,
        label: tableName,
        type: 'table',
        data: { isCentral: true },
        position: { x: 0, y: 0 }
      })
      addedNodes.add(tableName)

      const CLUSTER_THRESHOLD = 10

      // Process Refs To (Incoming)
      if (refsTo.length > CLUSTER_THRESHOLD && !expandedClusters.value.has('cluster-to')) {
        nodes.push({
          id: 'cluster-to',
          type: 'cluster',
          data: { 
            count: refsTo.length, 
            type: 'to', 
            expanded: false,
            onExpand: (v: boolean) => toggleCluster('cluster-to', v)
          },
          position: { x: 0, y: 0 }
        })
        edges.push({
          id: 'e-cluster-to-central',
          source: 'cluster-to',
          target: tableName,
          animated: true,
          style: { strokeDasharray: '5,5' }
        })
      } else {
        // Show all or expanded
        if (expandedClusters.value.has('cluster-to')) {
          // Add cluster header node to allow collapsing
          nodes.push({
            id: 'cluster-to',
            type: 'cluster',
            data: { 
              count: refsTo.length, 
              type: 'to', 
              expanded: true,
              onExpand: (v: boolean) => toggleCluster('cluster-to', v)
            },
            position: { x: 0, y: 0 }
          })
           edges.push({
            id: 'e-cluster-to-central',
            source: 'cluster-to',
            target: tableName,
            animated: true,
            style: { strokeDasharray: '5,5' }
          })
        }

        for (const ref of refsTo) {
          if (!addedNodes.has(ref.table)) {
            nodes.push({
              id: ref.table,
              label: ref.table,
              type: 'table',
              position: { x: 0, y: 0 }
            })
            addedNodes.add(ref.table)
          }
          edges.push({
            id: `e-${ref.table}-${tableName}-${ref.column}`,
            source: ref.table,
            target: tableName,
            label: ref.column,
            animated: true
          })
        }
      }

      // Process Refs From (Outgoing)
      if (refsFrom.length > CLUSTER_THRESHOLD && !expandedClusters.value.has('cluster-from')) {
        nodes.push({
          id: 'cluster-from',
          type: 'cluster',
          data: { 
            count: refsFrom.length, 
            type: 'from', 
            expanded: false,
            onExpand: (v: boolean) => toggleCluster('cluster-from', v)
          },
          position: { x: 0, y: 0 }
        })
        edges.push({
          id: 'e-central-cluster-from',
          source: tableName,
          target: 'cluster-from',
          animated: true,
          style: { strokeDasharray: '5,5' }
        })
      } else {
         if (expandedClusters.value.has('cluster-from')) {
          // Add cluster header node to allow collapsing
          nodes.push({
            id: 'cluster-from',
            type: 'cluster',
            data: { 
              count: refsFrom.length, 
              type: 'from', 
              expanded: true,
              onExpand: (v: boolean) => toggleCluster('cluster-from', v)
            },
            position: { x: 0, y: 0 }
          })
          edges.push({
            id: 'e-central-cluster-from',
            source: tableName,
            target: 'cluster-from',
            animated: true,
            style: { strokeDasharray: '5,5' }
          })
        }

        for (const ref of refsFrom) {
          if (!addedNodes.has(ref.table)) {
            nodes.push({
              id: ref.table,
              label: ref.table,
              type: 'table',
              position: { x: 0, y: 0 }
            })
            addedNodes.add(ref.table)
          }
          edges.push({
            id: `e-${tableName}-${ref.table}-${ref.column}`,
            source: tableName,
            target: ref.table,
            label: ref.column,
            animated: true
          })
        }
      }

      const layouted = getLayoutedElements(nodes, edges)
      elements.value = [...layouted.nodes, ...layouted.edges]
      
      setTimeout(() => {
        fitView()
      }, 50)
    }

    onMounted(() => {
      if (props.db.isLoaded) {
        generateGraph()
      }
    })

    watch(() => props.tableName, () => {
      expandedClusters.value.clear()
      generateGraph()
    })

    watch(() => props.db.isLoaded, (loaded) => {
      if (loaded) {
        generateGraph()
      }
    })

    watch(layoutDirection, () => {
      generateGraph()
    })

    onNodeDoubleClick((e) => {
      if (e.node.type === 'table' && e.node.id !== props.tableName) {
        // Navigate
        if (props.isStandalone) {
           window.location.search = `?vueflow=${e.node.id}`
        } else {
           emit('navigate', e.node.id)
        }
      }
    })

    function getNodeColor (node: any) {
      if (node.data?.isCentral) return '#3b82f6' // Blue for central
      if (node.type === 'cluster') return '#818cf8' // Indigo for cluster
      return '#e5e7eb' // Gray for others
    }

    function getNodeStrokeColor (node: any) {
      if (node.data?.isCentral) return '#1e40af'
      if (node.type === 'cluster') return '#4338ca'
      return '#9ca3af'
    }

    return {
      elements,
      handleClose,
      nodeTypes,
      layoutDirection,
      getNodeColor,
      getNodeStrokeColor
    }
  }
})
</script>

<style>
.vue-flow-basic {
  background: #f0f0f0;
}
.dark .vue-flow-basic {
  background: #1a1a1a;
}
</style>
