<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <div class="p-2 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-800 shrink-0 z-10">
      <div class="font-semibold px-2">Schema Diagram: {{ tableName }}</div>
      <div class="flex items-center gap-x-2">
        <div class="flex rounded border bg-white dark:bg-gray-700 overflow-hidden">
          <button class="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 border-r dark:border-gray-600" @click="zoomIn" title="Zoom In">+</button>
          <button class="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 border-r dark:border-gray-600" @click="zoomOut" title="Zoom Out">-</button>
          <button class="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600" @click="resetZoom" title="Reset View">Reset</button>
        </div>
        <button class="px-3 py-1 text-sm border rounded hover:bg-gray-200 dark:hover:bg-gray-700" @click="handleClose">Close</button>
      </div>
    </div>
    <div class="flex-1 overflow-hidden relative bg-gray-50 dark:bg-gray-900" ref="wrapper">
      <div v-if="!db.isLoaded" class="absolute inset-0 flex items-center justify-center z-20 bg-white/50 dark:bg-black/50">
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow">Loading schema...</div>
      </div>
      <div v-else-if="loading" class="absolute inset-0 flex items-center justify-center z-20 bg-white/50 dark:bg-black/50">
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow">Generating diagram...</div>
      </div>
      <div v-else-if="error" class="absolute inset-0 flex items-center justify-center text-red-500">{{ error }}</div>
      <div ref="container" class="w-full h-full flex items-center justify-center origin-top-left">
        <div v-html="svgContent" class="mermaid-diagram"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, type PropType, onBeforeUnmount, nextTick } from 'vue'
import mermaid from 'mermaid'
import panzoom, { type PanZoom } from 'panzoom'
import type { DatSchemasDatabase } from '@/app/dat-viewer/db.js'

export default defineComponent({
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
  emits: ['close'],
  setup (props, { emit }) {
    const wrapper = ref<HTMLElement | null>(null)
    const container = ref<HTMLElement | null>(null)
    const svgContent = ref('')
    const loading = ref(false)
    const error = ref('')
    let pz: PanZoom | null = null

    function handleClose () {
      if (props.isStandalone) {
        window.close()
      } else {
        emit('close')
      }
    }

    // Configure Mermaid with better contrast
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#e0e7ff', // indigo-100
        primaryTextColor: '#1e3a8a', // blue-900
        primaryBorderColor: '#3b82f6', // blue-500
        lineColor: '#64748b', // slate-500
        secondaryColor: '#f3f4f6',
        tertiaryColor: '#fff',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '16px'
      },
      securityLevel: 'loose'
    })

    async function generateDiagram () {
      if (!props.db.isLoaded) return

      loading.value = true
      error.value = ''
      svgContent.value = ''

      try {
        const { tableName, db } = props
        const refsTo = db.getDetailedReferencesTo(tableName)
        const refsFrom = db.getDetailedReferencesFrom(tableName)

        let graph = 'erDiagram\n'
        
        // Central table
        graph += `  ${tableName} {\n  }\n`

        const addedTables = new Set<string>([tableName])

        for (const ref of refsTo) {
          if (!addedTables.has(ref.table)) {
            graph += `  ${ref.table} {\n  }\n`
            addedTables.add(ref.table)
          }
          graph += `  ${ref.table} }o--|| ${tableName} : "${ref.column}"\n`
        }

        for (const ref of refsFrom) {
          if (!addedTables.has(ref.table)) {
            graph += `  ${ref.table} {\n  }\n`
            addedTables.add(ref.table)
          }
          graph += `  ${tableName} }o--|| ${ref.table} : "${ref.column}"\n`
        }

        const { svg } = await mermaid.render('graphDiv', graph)
        svgContent.value = svg
        
        await nextTick()
        initPanZoom()
      } catch (e) {
        console.error(e)
        error.value = 'Failed to generate diagram'
      } finally {
        loading.value = false
      }
    }

    function initPanZoom () {
      if (pz) {
        pz.dispose()
      }
      if (container.value) {
        pz = panzoom(container.value, {
          maxZoom: 5,
          minZoom: 0.1,
          initialZoom: 1,
          bounds: true,
          boundsPadding: 0.1
        })
        // Center the view
        setTimeout(() => {
          resetZoom()
        }, 100)
      }
    }

    function zoomIn () {
      if (!pz || !wrapper.value) return
      const { width, height } = wrapper.value.getBoundingClientRect()
      pz.smoothZoom(width / 2, height / 2, 1.25)
    }

    function zoomOut () {
      if (!pz || !wrapper.value) return
      const { width, height } = wrapper.value.getBoundingClientRect()
      pz.smoothZoom(width / 2, height / 2, 0.8)
    }

    function resetZoom () {
      if (!pz || !wrapper.value || !container.value) return
      // Simple reset to fit
      pz.moveTo(0, 0)
      pz.zoomAbs(0, 0, 1)
      
      // Auto-fit logic could be added here if needed, but 1:1 is a safe start
      // For true auto-fit:
      const wrapRect = wrapper.value.getBoundingClientRect()
      const contentRect = container.value.firstElementChild?.getBoundingClientRect()
      if (contentRect) {
        const scale = Math.min(
          (wrapRect.width - 40) / contentRect.width,
          (wrapRect.height - 40) / contentRect.height
        )
        const newScale = Math.min(Math.max(scale, 0.2), 1.5) // Clamp scale
        
        const cx = wrapRect.width / 2
        const cy = wrapRect.height / 2
        
        // Calculate offsets to center
        // We need to set transform origin to 0,0 effectively
        // panzoom handles this via moveTo/zoomAbs
        
        pz.zoomAbs(0, 0, newScale)
        
        // After zoom, center it
        // This library is a bit tricky with centering, let's stick to a reasonable default
        // or just let the user pan.
        // Actually, let's try to center:
        const newW = contentRect.width * newScale
        const newH = contentRect.height * newScale
        const offsetX = (wrapRect.width - newW) / 2
        const offsetY = (wrapRect.height - newH) / 2
        pz.moveTo(offsetX, offsetY)
      }
    }

    onMounted(() => {
      if (props.db.isLoaded) {
        generateDiagram()
      }
    })

    watch(() => props.tableName, () => {
      generateDiagram()
    })

    watch(() => props.db.isLoaded, (loaded) => {
      if (loaded) {
        generateDiagram()
      }
    })

    onBeforeUnmount(() => {
      if (pz) pz.dispose()
    })

    return {
      wrapper,
      container,
      svgContent,
      loading,
      error,
      zoomIn,
      zoomOut,
      resetZoom,
      handleClose
    }
  }
})
</script>

<style>
.mermaid-diagram svg {
  max-width: none; /* Allow svg to be its natural size for panzoom */
  height: auto;
}
</style>
