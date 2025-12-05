<template>
  <div class="p-6 overflow-auto flex-1 bg-gray-50 dark:bg-gray-900 text-base" aria-label="Statistics dashboard">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- Overview Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Dataset Overview</h2>
          <button class="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800" @click="exportOverviewPng">
            Export PNG
          </button>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="space-y-4">
            <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div class="text-sm text-gray-600 dark:text-gray-400">Total Tables</div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalTables }}</div>
            </div>
            <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div class="text-sm text-gray-600 dark:text-gray-400">Total Rows</div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalRows.toLocaleString() }}</div>
            </div>
            <div class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div class="text-sm text-gray-600 dark:text-gray-400">Avg Rows / Table</div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ avgRows.toLocaleString() }}</div>
            </div>
            <div class="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <div class="text-sm text-gray-600 dark:text-gray-400">Valid Schemas</div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ validCount }} <span class="text-sm font-normal text-gray-500">/ {{ totalTables }}</span></div>
            </div>
          </div>
          
          <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 text-center">Top Tables by Rows</h3>
              <div class="flex justify-center">
                <canvas ref="overviewBar" :width="400" :height="260" role="img" aria-label="Top tables by rows"></canvas>
              </div>
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 text-center">Row Size Changes</h3>
              <div class="flex justify-center">
                <canvas ref="overviewPie" :width="260" :height="260" role="img" aria-label="Row size change distribution"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Relationships Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Relationships</h2>
          <button class="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800" @click="exportRelationsSvg">
            Export SVG
          </button>
        </div>
        <div class="flex justify-center bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
          <svg ref="relationsSvg" :width="800" :height="500" role="img" aria-label="Inter-table relationship graph" class="w-full max-w-[800px]"></svg>
        </div>
      </div>

      <!-- Table Analysis Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Table Analysis</h2>
          <button class="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800" @click="exportTableChartsPng">
            Export PNG
          </button>
        </div>
        
        <div class="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wider">Table</label>
            <select v-model="selectedTable" class="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 min-w-[200px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option value="" disabled>Select a table...</option>
              <option v-for="t in tableNames" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wider">Numeric Column</label>
            <select v-model="selectedNumeric" class="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 min-w-[200px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" :disabled="!selectedTable">
              <option value="">Select numeric column...</option>
              <option v-for="col in numericColumns" :key="col" :value="col">{{ col }}</option>
            </select>
          </div>
        </div>

        <div v-if="selectedTable" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div class="mb-4 flex items-center justify-between">
              <h3 class="font-medium text-gray-700 dark:text-gray-300">Distribution: {{ selectedNumeric || '—' }}</h3>
            </div>
            
            <div v-if="selectedNumeric" class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div class="text-xs text-gray-500 uppercase">Mean</div>
                <div class="font-mono font-medium">{{ stats.mean }}</div>
              </div>
              <div>
                <div class="text-xs text-gray-500 uppercase">Median</div>
                <div class="font-mono font-medium">{{ stats.median }}</div>
              </div>
              <div>
                <div class="text-xs text-gray-500 uppercase">Mode</div>
                <div class="font-mono font-medium">{{ stats.mode }}</div>
              </div>
              <div>
                <div class="text-xs text-gray-500 uppercase">StdDev</div>
                <div class="font-mono font-medium">{{ stats.stddev }}</div>
              </div>
            </div>

            <div class="flex justify-center border border-gray-100 dark:border-gray-700 rounded p-2">
              <canvas ref="tableBar" :width="500" :height="260" role="img" aria-label="Histogram"></canvas>
            </div>
          </div>
          
          <div>
            <div class="mb-4">
              <h3 class="font-medium text-gray-700 dark:text-gray-300">Correlation Matrix</h3>
            </div>
            <div class="flex justify-center border border-gray-100 dark:border-gray-700 rounded p-2 overflow-auto bg-white dark:bg-gray-800">
              <div ref="corrHeat" role="img" aria-label="Correlation heatmap" style="width: 500px; height: 260px; position: relative;"></div>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          Select a table to view detailed analysis
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, inject, shallowRef, computed, onMounted, watch, ref, nextTick } from 'vue'
import type { DatSchemasDatabase, TableStats, ViewerSerializedHeader } from '@/app/dat-viewer/db.js'
import type { BundleIndex } from '@/app/patchcdn/index-store.js'
import { readDatFile, analyzeDatFile, readColumn } from 'pathofexile-dat/dat.js'
import { fromSerializedHeaders, type Header } from '@/app/dat-viewer/headers.js'

function drawBar (canvas: HTMLCanvasElement, labels: string[], values: number[]) {
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const max = Math.max(1, ...values)
  const pad = 36
  const bw = Math.max(8, Math.floor((canvas.width - pad * 2) / labels.length))
  ctx.font = '12px sans-serif'
  ctx.fillStyle = '#1f2937'
  labels.forEach((lab, i) => {
    const h = Math.floor((values[i] / max) * (canvas.height - pad * 2))
    const x = pad + i * bw
    const y = canvas.height - pad - h
    ctx.fillStyle = '#3b82f6'
    ctx.fillRect(x, y, bw - 2, h)
    ctx.fillStyle = '#1f2937'
    if (bw > 24) ctx.fillText(String(lab), x, canvas.height - pad + 14)
  })
}

function drawPie (canvas: HTMLCanvasElement, labels: string[], values: number[]) {
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const total = values.reduce((a, b) => a + b, 0) || 1
  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const r = Math.min(cx, cy) - 10
  let start = -Math.PI / 2
  const colors = ['#10b981', '#ef4444', '#f59e0b', '#6366f1', '#06b6d4']
  labels.forEach((_, i) => {
    const angle = (values[i] / total) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, start, start + angle)
    ctx.closePath()
    ctx.fillStyle = colors[i % colors.length]
    ctx.fill()
    start += angle
  })
}

function drawHeatmap (el: HTMLElement, labels: string[], values: number[][]) {
  el.innerHTML = ''
  const w = el.clientWidth
  const h = el.clientHeight
  const rows = values.length
  const cols = values[0]?.length || 0
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('width', String(w))
  svg.setAttribute('height', String(h))
  const cellW = Math.max(10, Math.floor(w / Math.max(cols, 1)))
  const cellH = Math.max(10, Math.floor(h / Math.max(rows, 1)))
  const legend = (v: number) => {
    const t = Math.max(0, Math.min(1, (v + 1) / 2))
    const r = Math.floor(255 * (1 - t))
    const g = Math.floor(255 * t)
    return `rgb(${r},${g},128)`
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rect = document.createElementNS(svgNS, 'rect')
      rect.setAttribute('x', String(c * cellW))
      rect.setAttribute('y', String(r * cellH))
      rect.setAttribute('width', String(cellW - 1))
      rect.setAttribute('height', String(cellH - 1))
      rect.setAttribute('fill', legend(values[r][c]))
      svg.appendChild(rect)
    }
  }
  el.appendChild(svg)
}

function exportCanvas (canvas: HTMLCanvasElement, name: string) {
  canvas.toBlob((blob) => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  })
}

function exportSvg (svg: SVGSVGElement, name: string) {
  const serializer = new XMLSerializer()
  const str = serializer.serializeToString(svg)
  const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export default defineComponent({
  setup () {
    const db = inject<DatSchemasDatabase>('dat-schemas')!
    const index = inject<BundleIndex>('bundle-index')!

    const overviewBar = ref<HTMLCanvasElement | null>(null)
    const overviewPie = ref<HTMLCanvasElement | null>(null)
    const relationsSvgRef = ref<SVGSVGElement | null>(null)

    const totalTables = computed(() => db.tableStats.length)
    const totalRows = computed(() => db.tableStats.reduce((a, s) => a + s.totalRows, 0))
    const avgRows = computed(() => totalTables.value ? Math.round(totalRows.value / totalTables.value) : 0)
    const validCount = computed(() => db.tableStats.filter(s => s.headersValid).length)

    const topByRows = computed(() =>
      [...db.tableStats].sort((a, b) => b.totalRows - a.totalRows).slice(0, 12))

    const changedRowSizeCount = computed(() => db.tableStats.filter(s => s.increasedRowLength).length)

    onMounted(() => {
      nextTick(() => {
        if (overviewBar.value) {
          drawBar(overviewBar.value, topByRows.value.map(s => s.name), topByRows.value.map(s => s.totalRows))
        }
        if (overviewPie.value) {
          drawPie(overviewPie.value, ['Changed', 'Unchanged'], [changedRowSizeCount.value, totalTables.value - changedRowSizeCount.value])
        }
        if (relationsSvgRef.value) {
          drawRelations()
        }
      })
    })

    watch([topByRows, totalTables], () => {
      if (overviewBar.value) drawBar(overviewBar.value, topByRows.value.map(s => s.name), topByRows.value.map(s => s.totalRows))
      if (overviewPie.value) drawPie(overviewPie.value, ['Changed', 'Unchanged'], [changedRowSizeCount.value, totalTables.value - changedRowSizeCount.value])
      if (relationsSvgRef.value) drawRelations()
    })

    function drawRelations () {
      const svg = relationsSvgRef.value!
      while (svg.firstChild) svg.removeChild(svg.firstChild)
      const stats = db.tableStats as TableStats[]
      const nodes = stats.slice(0, 20).map(s => s.name)
      const edges: Array<[string, string]> = []
      for (const n of nodes) {
        for (const to of db.getReferencesFrom(n)) {
          if (nodes.includes(to)) edges.push([n, to])
        }
      }
      const cx = svg.viewBox.baseVal.width || svg.clientWidth
      const cy = svg.viewBox.baseVal.height || svg.clientHeight
      const R = Math.min(cx, cy) / 2 - 40
      const pos = new Map<string, [number, number]>()
      nodes.forEach((n, i) => {
        const a = (i / nodes.length) * Math.PI * 2
        const x = cx / 2 + Math.cos(a) * R
        const y = cy / 2 + Math.sin(a) * R
        pos.set(n, [x, y])
      })
      const svgNS = 'http://www.w3.org/2000/svg'
      for (const [a, b] of edges) {
        const [x1, y1] = pos.get(a)!
        const [x2, y2] = pos.get(b)!
        const line = document.createElementNS(svgNS, 'line')
        line.setAttribute('x1', String(x1))
        line.setAttribute('y1', String(y1))
        line.setAttribute('x2', String(x2))
        line.setAttribute('y2', String(y2))
        line.setAttribute('stroke', '#64748b')
        line.setAttribute('stroke-width', '1')
        svg.appendChild(line)
      }
      for (const n of nodes) {
        const [x, y] = pos.get(n)!
        const circle = document.createElementNS(svgNS, 'circle')
        circle.setAttribute('cx', String(x))
        circle.setAttribute('cy', String(y))
        circle.setAttribute('r', '12')
        circle.setAttribute('fill', '#0ea5e9')
        circle.setAttribute('stroke', '#0369a1')
        circle.setAttribute('stroke-width', '1')
        circle.setAttribute('tabindex', '0')
        circle.setAttribute('role', 'button')
        circle.setAttribute('aria-label', `Open ${n}`)
        circle.addEventListener('click', () => { selectedTable.value = n })
        svg.appendChild(circle)

        const label = document.createElementNS(svgNS, 'text')
        label.setAttribute('x', String(x + 14))
        label.setAttribute('y', String(y + 4))
        label.setAttribute('fill', 'var(--color-text)')
        label.setAttribute('font-size', '12')
        label.textContent = n
        svg.appendChild(label)
      }
    }

    const tableNames = computed(() => db.tableStats.map(s => s.name).sort())
    const selectedTable = shallowRef('')
    const selectedNumeric = shallowRef('')
    const numericColumns = shallowRef<string[]>([])
    const numericData = shallowRef<number[]>([])

    watch(selectedTable, async (name) => {
      numericColumns.value = []
      numericData.value = []
      selectedNumeric.value = ''
      if (!name) return
      const fullPath = `data/${name}.datc64`
      const fileContent = await index.loadFileContent(fullPath)
      const datFile = readDatFile(fullPath, fileContent.buffer)
      const colStats = await analyzeDatFile(datFile)
      const serialized: ViewerSerializedHeader[] = await db.findByName(name)
      const headers = fromSerializedHeaders(serialized, colStats, datFile)
      if (!headers) return
      const cols = headers.headers
      numericColumns.value = cols.filter(h => h.type.integer || h.type.decimal).map(h => h.name || '').filter(Boolean)
      if (numericColumns.value[0]) {
        selectedNumeric.value = numericColumns.value[0]
      }
    })

    watch([selectedTable, selectedNumeric], async ([name, col]) => {
      if (!name || !col) return
      const fullPath = `data/${name}.datc64`
      const fileContent = await index.loadFileContent(fullPath)
      const datFile = readDatFile(fullPath, fileContent.buffer)
      const colStats = await analyzeDatFile(datFile)
      const serialized: ViewerSerializedHeader[] = await db.findByName(name)
      const headers = fromSerializedHeaders(serialized, colStats, datFile)
      if (!headers) return
      const hdr = headers.headers.find(h => (h.name || '') === col)
      if (!hdr) return
      const data = readColumn(hdr, datFile) as number[]
      numericData.value = data.map(v => Number(v) || 0)
      nextTick(() => {
        if (tableBar.value) drawBar(tableBar.value, [], histogram(numericData.value, 12).map(h => h.count))
        if (corrHeat.value) drawHeatmap(corrHeat.value, [], correlationMatrix(headers.headers, datFile))
      })
    })

    function histogram (values: number[], bins: number) {
      const min = Math.min(...values)
      const max = Math.max(...values)
      const width = (max - min) || 1
      const step = width / bins
      const counts = Array(bins).fill(0)
      for (const v of values) {
        const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / step)))
        counts[idx] += 1
      }
      return counts.map((c, i) => ({ bin: min + i * step, count: c }))
    }

    function correlationMatrix (headersArr: Header[], datFile: ReturnType<typeof readDatFile>) {
      const cols = headersArr.filter((h: Header) => h.type.integer || h.type.decimal)
      const data = cols.map((h: Header) => readColumn(h, datFile) as number[])
      const n = cols.length
      const mat: number[][] = Array(n).fill(0).map(() => Array(n).fill(0))
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          mat[i][j] = corr(data[i], data[j])
        }
      }
      return mat
    }

    function corr (a: number[], b: number[]) {
      const n = Math.min(a.length, b.length)
      if (n === 0) return 0
      let sumA = 0, sumB = 0
      let sumA2 = 0, sumB2 = 0, sumAB = 0
      for (let i = 0; i < n; i++) {
        const x = Number(a[i]) || 0
        const y = Number(b[i]) || 0
        sumA += x; sumB += y
        sumA2 += x * x; sumB2 += y * y
        sumAB += x * y
      }
      const cov = sumAB - (sumA * sumB) / n
      const varA = sumA2 - (sumA * sumA) / n
      const varB = sumB2 - (sumB * sumB) / n
      const denom = Math.sqrt(varA * varB) || 1
      return cov / denom
    }

    const tableBar = ref<HTMLCanvasElement | null>(null)
    const corrHeat = ref<HTMLElement | null>(null)

    const stats = computed(() => {
      const vals = numericData.value
      if (!vals.length) return { mean: 0, median: 0, mode: 0, stddev: 0 }
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length
      const sorted = [...vals].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      const median = (sorted.length % 2) ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
      const freq = new Map<number, number>()
      for (const v of vals) freq.set(v, (freq.get(v) || 0) + 1)
      let mode = vals[0]
      let modeF = 0
      for (const [v, f] of freq.entries()) { if (f > modeF) { mode = v; modeF = f } }
      const variance = vals.reduce((a, v) => a + (v - mean) * (v - mean), 0) / vals.length
      const stddev = Math.sqrt(variance)
      return { mean: round(mean), median: round(median), mode: round(mode), stddev: round(stddev) }
    })

    function round (v: number) { return Math.round(v * 100) / 100 }

    function exportOverviewPng () {
      if (overviewBar.value) exportCanvas(overviewBar.value, 'overview-top-by-rows.png')
      if (overviewPie.value) exportCanvas(overviewPie.value, 'overview-row-changes.png')
    }

    function exportRelationsSvg () {
      if (relationsSvgRef.value) exportSvg(relationsSvgRef.value, 'relations.svg')
    }

    function exportTableChartsPng () {
      if (tableBar.value) exportCanvas(tableBar.value, 'table-histogram.png')
      // corrHeat is SVG; export handled separately if needed
    }

    return {
      totalTables,
      totalRows,
      avgRows,
      validCount,
      topByRows,
      selectedTable,
      selectedNumeric,
      numericColumns,
      stats,
      overviewBar,
      overviewPie,
      relationsSvg: relationsSvgRef,
      tableBar,
      corrHeat,
      tableNames,
      exportOverviewPng,
      exportRelationsSvg,
      exportTableChartsPng
    }
  }
})
</script>

<style lang="postcss" module>
</style>
