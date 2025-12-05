<template>
  <div class="flex flex-col h-full text-base">
    <div class="p-4 border-b shrink-0">
      <button v-if="!isPreloading && !tables.length" class="py-1 px-3 bg-blue-600 text-white hover:bg-blue-800"
        @click="preloadDataTables">Analyze Tables</button>
      <div v-else-if="tables.length !== totalTables" class="flex items-center gap-x-4">
        <i class="codicon codicon-loading animate-spin"></i>
        <div>{{ tables.length }} / {{ totalTables }} tables<span v-if="tables.length">, estimated {{ timeLeft }} sec</span></div>
      </div>
      <div v-if="errorMsg" class="mt-3 px-3 py-2 bg-red-500 text-white">{{ errorMsg }}</div>
      <div v-if="!errorMsg && !isPreloading && tables.length === totalTables && totalTables > 0 && isDone" class="mt-3 px-3 py-2 bg-green-600 text-white">Analysis complete</div>
      <div class="flex items-center gap-x-2 mt-3">
        <input v-model.trim="filterText" placeholder="Filter tables" class="border px-2 py-1 bg-white" />
        <label class="inline-flex items-center gap-x-1">
          <input type="checkbox" v-model="onlyReferenced" />
          <span>Only referenced</span>
        </label>
        <input v-model.trim="poedbToken" placeholder="PoEDB token (optional)" class="border px-2 py-1 bg-white flex-1" />
      </div>
    </div>
    
    <div class="flex-1 overflow-auto min-h-0">
      <table v-if="hotFiltered.length" class="w-full border-collapse relative">
        <thead class="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 shadow-sm">
          <tr>
            <th class="border-b px-4 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 select-none" @click="toggleSort('name')">
              Name <span v-if="sortColumn === 'name'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="border-b px-4 py-2 text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 select-none" @click="toggleSort('totalRows')">
              Rows <span v-if="sortColumn === 'totalRows'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="border-b px-4 py-2 text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 select-none" @click="toggleSort('refCount')">
              Refs <span v-if="sortColumn === 'refCount'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="border-b px-4 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 select-none" @click="toggleSort('score')">
              Signals <span v-if="sortColumn === 'score'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in hotFiltered" :key="row.name" @click="selectedName = row.name" class="hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer border-b last:border-b-0" :class="{ 'bg-blue-50 dark:bg-blue-900/30': selectedName === row.name }">
            <td class="px-4 py-1">
              {{ row.name }}
              <button class="ml-2 underline text-sm text-blue-600 dark:text-blue-400" @click.stop="openPoEDBTable(row.name)" title="Open on PoEDB">PoEDB</button>
            </td>
            <td class="px-4 py-1 text-right font-mono">{{ row.totalRows }}</td>
            <td class="px-4 py-1 text-right font-mono">{{ row.refCount }}</td>
            <td class="px-4 py-1">
              <span v-if="row.headersValid === false" class="px-2 py-px rounded bg-red-500 text-white mr-2 text-xs">Invalid schema</span>
              <span v-if="row.increasedRowLength" class="px-2 py-px rounded bg-yellow-400 text-black mr-2 text-xs">Changed row size</span>
              <span v-if="row.totalRows > 5000" class="px-2 py-px rounded bg-blue-500 text-white mr-2 text-xs">Large</span>
              <span v-if="row.refCount > 0" class="px-2 py-px rounded bg-green-600 text-white text-xs">Referenced</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="px-8 py-4">Waiting for analysis...</div>
    </div>

    <div v-if="selectedName" class="p-4 border-t shrink-0 bg-gray-50 dark:bg-gray-900 relative">
      <div class="flex items-center justify-between mb-2">
        <div class="font-semibold">Related tables for {{ selectedName }}</div>
        <div class="flex gap-x-2">
          <button class="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm" @click="openInNewWindow" title="Open Mermaid in New Window">
            <i class="codicon codicon-link-external"></i>
          </button>
          <button class="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm" @click="openVueFlowInNewWindow" title="Open Vue Flow in New Window">
            <i class="codicon codicon-link-external"></i> VF
          </button>
          <button class="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm" @click="showDiagram = true">Diagram</button>
          <button class="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm" @click="showVueFlow = true">Vue Flow</button>
          <button class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm" @click="openByName(selectedName)">Open Table</button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="font-medium mb-1 text-sm text-gray-600 dark:text-gray-400">References to this table</div>
          <div v-if="refsTo.length === 0" class="text-muted italic">None</div>
          <ul>
            <li v-for="t in refsTo" :key="t.table + t.column">
              <button class="underline hover:text-blue-600 text-left" @click="selectedName = t.table" title="View relations">
                {{ t.table }} <span class="text-gray-500 text-xs">(via {{ t.column }})</span>
              </button>
            </li>
          </ul>
        </div>
        <div>
          <div class="font-medium mb-1 text-sm text-gray-600 dark:text-gray-400">Referenced by this table</div>
          <div v-if="refsFrom.length === 0" class="text-muted italic">None</div>
          <ul>
            <li v-for="t in refsFrom" :key="t.table + t.column">
              <button class="underline hover:text-blue-600 text-left" @click="selectedName = t.table" title="View relations">
                {{ t.table }} <span class="text-gray-500 text-xs">(via {{ t.column }})</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
      
      <div v-if="showDiagram" class="absolute inset-0 z-20 bg-white dark:bg-gray-900 border shadow-lg flex flex-col">
        <schema-diagram :table-name="selectedName" :db="db" @close="showDiagram = false" />
      </div>
      <div v-if="showVueFlow" class="absolute inset-0 z-20 bg-white dark:bg-gray-900 border shadow-lg flex flex-col">
        <vue-flow-diagram :table-name="selectedName" :db="db" @close="showVueFlow = false" @navigate="selectedName = $event" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, shallowRef, inject, onMounted, watch } from 'vue'
import type { DatSchemasDatabase, TableStats } from '@/app/dat-viewer/db.js'
import type { BundleIndex } from '@/app/patchcdn/index-store.js'
import { openTab, setExploreDir } from './workbench-core.js'
import DatViewer from '../dat-viewer/components/DatViewer.vue'
import SchemaDiagram from './SchemaDiagram.vue'
import VueFlowDiagram from './VueFlowDiagram.vue'
import { poedbUrlForTable, getPoedbToken, setPoedbToken } from '@/app/utils/poedb.js'

const isPreloading = shallowRef(false)
const totalTables = shallowRef(0)
const startedAt = shallowRef(0)
const firstTableAt = shallowRef(0)
const errorMsg = shallowRef('')
const isDone = shallowRef(false)
const selectedName = shallowRef('')
const showDiagram = shallowRef(false)
const showVueFlow = shallowRef(false)

export default defineComponent({
  components: { SchemaDiagram, VueFlowDiagram },
  setup () {
    const db = inject<DatSchemasDatabase>('dat-schemas')!
    const index = inject<BundleIndex>('bundle-index')!

    watch(selectedName, () => {
      showDiagram.value = false
    })

    const timeLeft = computed(() => {
      if (!firstTableAt.value && db.tableStats.length) {
        firstTableAt.value = Date.now() / 1000
      }
      const now = Date.now() / 1000
      const predicted = (totalTables.value * (now - firstTableAt.value) / db.tableStats.length)
      return Math.max(Math.ceil(predicted - now + firstTableAt.value), 0)
    })

    const sortColumn = shallowRef<'name' | 'totalRows' | 'refCount' | 'score'>('score')
    const sortDirection = shallowRef<'asc' | 'desc'>('desc')

    function toggleSort(column: 'name' | 'totalRows' | 'refCount' | 'score') {
      if (sortColumn.value === column) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
      } else {
        sortColumn.value = column
        sortDirection.value = 'desc'
      }
    }

    const hot = computed(() => {
      const stats = db.tableStats as TableStats[]
      const rowsScore = (n: number) => Math.log10(n + 1)
      const out = stats.map(s => {
        const refs = db.referenceCount(s.name)
        const score = (rowsScore(s.totalRows) * 2) + (refs * 3) + (s.increasedRowLength ? 2 : 0) + (s.headersValid ? 0 : 1)
        return { name: s.name, totalRows: s.totalRows, headersValid: s.headersValid, increasedRowLength: s.increasedRowLength, refCount: refs, score }
      })
      
      out.sort((a, b) => {
        const valA = a[sortColumn.value]
        const valB = b[sortColumn.value]
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection.value === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }
        
        // Numeric sort
        if (valA < valB) return sortDirection.value === 'asc' ? -1 : 1
        if (valA > valB) return sortDirection.value === 'asc' ? 1 : -1
        return 0
      })
      
      return out
    })

    const filterText = shallowRef('')
    const onlyReferenced = shallowRef(false)
    const poedbToken = shallowRef('')
    const hotFiltered = computed(() => {
      const term = filterText.value.toLowerCase()
      return hot.value.filter(r => {
        if (onlyReferenced.value && r.refCount === 0) return false
        return !term || r.name.toLowerCase().includes(term)
      })
    })

    const expectedTotal = computed(() => {
      if (!index.isLoaded) return 0
      const dir = index.getDirContent('data')
      return dir.files.filter(f => f.endsWith('.datc64')).length
    })

    async function autoAnalyzeIfNeeded () {
      if (!index.isLoaded) return
      if (db.tableStats.length >= expectedTotal.value && expectedTotal.value > 0) {
        isDone.value = true
        return
      }
      try {
        errorMsg.value = ''
        isPreloading.value = true
        firstTableAt.value = 0
        startedAt.value = Date.now() / 1000
        await db.preloadDataTables(totalTables)
        isDone.value = true
      } catch (e) {
        errorMsg.value = String((e as Error).message)
      } finally {
        isPreloading.value = false
      }
    }

    onMounted(() => {
      if (index.isLoaded) {
        void autoAnalyzeIfNeeded()
      } else {
        watch(() => index.isLoaded, (ready) => {
          if (ready) void autoAnalyzeIfNeeded()
        }, { immediate: true })
      }
      const saved = getPoedbToken()
      if (saved) poedbToken.value = saved
      watch(poedbToken, (t) => setPoedbToken(t))
    })

    async function openFromHot (row: { name: string }) {
      const fullPath = `data/${row.name}.datc64`
      setExploreDir('data')
      const fileContent = await index.loadFileContent(fullPath)
      openTab({
        id: `bundles@${fullPath}`,
        title: row.name,
        type: DatViewer,
        args: { fileContent, fullPath }
      })
      selectedName.value = row.name
    }

    async function openByName (name: string) {
      const fullPath = `data/${name}.datc64`
      setExploreDir('data')
      const fileContent = await index.loadFileContent(fullPath)
      openTab({ id: `bundles@${fullPath}`, title: name, type: DatViewer, args: { fileContent, fullPath } })
      selectedName.value = name
    }

    function openPoEDBTable (name: string) {
      const url = poedbUrlForTable(db.patchVersion, name)
      window.open(url, '_blank')
    }

    function openInNewWindow () {
      if (!selectedName.value) return
      window.open(`/?diagram=${selectedName.value}`, '_blank', 'width=1200,height=800')
    }

    function openVueFlowInNewWindow () {
      if (!selectedName.value) return
      window.open(`/?vueflow=${selectedName.value}`, '_blank', 'width=1200,height=800')
    }

    return {
      timeLeft,
      totalTables,
      isPreloading,
      errorMsg,
      isDone,
      filterText,
      onlyReferenced,
      hotFiltered,
      poedbToken,
      preloadDataTables: async () => {
        firstTableAt.value = 0
        startedAt.value = Date.now() / 1000
        isPreloading.value = true
        await db.preloadDataTables(totalTables)
        isPreloading.value = false
      },
      tables: computed(() => db.tableStats),
      hot,
      openFromHot,
      openByName,
      selectedName,
      refsTo: computed(() => selectedName.value ? db.getDetailedReferencesTo(selectedName.value) : []),
      refsFrom: computed(() => selectedName.value ? db.getDetailedReferencesFrom(selectedName.value) : []),
      openPoEDBTable,
      sortColumn,
      sortDirection,
      toggleSort,
      showDiagram,
      showVueFlow,
      db,
      openInNewWindow,
      openVueFlowInNewWindow
    }
  }
})
</script>

<style lang="postcss" module>
</style>
