<template>
  <viewer-actions />
  <div class="flex flex-col flex-1 min-h-0">
    <div class="flex flex-1 min-h-0 relative">
      <resize-observer @resize="handleResize" class="flex-1 min-h-0 relative">
        <div :class="[$style.headerBlock, 'absolute']" :style="headerBlockStyle">
          <viewer-head :style="headerOverlayContentStyle"
            :left="scrollLeft"
            :width="rowsWidth"
            :columns="renderColumns"
          />
        </div>
        <canvas-scroll
          ref="canvasScroll"
          :class="[$style.canvasSurface, 'absolute']"
          @scroll="handleScroll"
          :style="scrollableStyle"
          :paint-size="scrollablePaintSize"
          :full-size="scrollableFullSize">
          <canvas ref="canvasRef"
            @click="handleCanvasClick"
            @mousemove="handleCanvasMouseMove"
            @mouseleave="handleCanvasMouseLeave"
          />
        </canvas-scroll>
        <div :class="$style.rowsOverlay" :style="rowsOverlayStyle">
          <div class="absolute" :style="{ transform: `translate(0, ${renderItems.top}px)` }">
            <div v-for="(rowIdx, i) in renderItems.ids" :key="rowIdx"
              :style="{ transform: `translate(0, ${i * LINE_HEIGHT}px)`, width: rowsNumberWidth, position: 'absolute' }"
              v-text="rowIdx" />
          </div>
        </div>
        <div v-if="hoveredTooltip" class="fixed z-50 px-2 py-1 bg-gray-900 text-white text-sm rounded shadow-lg pointer-events-none max-w-md break-words"
          :style="{ left: hoveredTooltip.x + 'px', top: hoveredTooltip.y + 'px' }">
          {{ hoveredTooltip.text }}
        </div>
      </resize-observer>
      <header-props
        @focus-editing-header="focusEditingHeader" />
    </div>
    <div v-if="viewer.pagination.value.enabled" class="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0">
      <div class="flex items-center gap-x-2 text-sm">
        <span>Rows per page:</span>
        <select v-model="viewer.pagination.value.pageSize" class="border rounded px-1 py-0.5 bg-white dark:bg-gray-700">
          <option :value="100">100</option>
          <option :value="500">500</option>
          <option :value="1000">1000</option>
        </select>
        <span class="ml-2">
          {{ (viewer.pagination.value.currentPage - 1) * viewer.pagination.value.pageSize + 1 }} -
          {{ Math.min(viewer.pagination.value.currentPage * viewer.pagination.value.pageSize, viewer.datFile.rowCount) }}
          of {{ viewer.datFile.rowCount }}
        </span>
      </div>
      <div class="flex items-center gap-x-2">
        <button class="px-2 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
          :disabled="viewer.pagination.value.currentPage <= 1"
          @click="viewer.pagination.value.currentPage--">Prev</button>
        <span class="text-sm">Page {{ viewer.pagination.value.currentPage }}</span>
        <button class="px-2 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
          :disabled="viewer.pagination.value.currentPage * viewer.pagination.value.pageSize >= viewer.datFile.rowCount"
          @click="viewer.pagination.value.currentPage++">Next</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType, computed, provide, watch, ref, onMounted, inject, EffectScope } from 'vue'
import ResizeObserver from '@/ResizeObserver.vue'
import CanvasScroll from '@/CanvasScroll.vue'
import { type Viewer, createViewer } from '../Viewer.js'
import ViewerActions from './Actions.vue'
import ViewerHead from './ViewerHead.vue'
import HeaderProps from './HeaderProps.vue'
import * as rendering from '../rendering.js'
import { renderByteCols, renderColStats } from '../rendering/byte-columns.js'
import { renderHeaderCols } from '../rendering/header-columns.js'
import type { BundleIndex } from '@/app/patchcdn/index-store.js'
import type { DatSchemasDatabase } from '@/app/dat-viewer/db.js'
import { useTheme } from '@/theme.js'
import { readColumn } from 'pathofexile-dat/dat.js'

export default defineComponent({
  components: { ResizeObserver, CanvasScroll, ViewerActions, ViewerHead, HeaderProps },
  emits: ['update:kaState'],
  props: {
    args: {
      type: Object as PropType<{
        fileContent: Uint8Array
        fullPath: string
      }>,
      required: true
    },
    kaState: {
      type: Object as PropType<Viewer | undefined>,
      default: undefined
    },
    kaScope: {
      type: Object as PropType<EffectScope>,
      required: true
    }
  },
  setup (props, ctx) {
    const index = inject<BundleIndex>('bundle-index')!
    const db = inject<DatSchemasDatabase>('dat-schemas')!

    let viewer: Viewer
    if (props.kaState) {
      viewer = props.kaState
    } else {
      viewer = createViewer(props.args.fullPath, props.args.fileContent, index, db, props.kaScope)
      ctx.emit('update:kaState', viewer)
    }
    provide('viewer', viewer)

    const canvasRef = ref<HTMLCanvasElement | null>(null)

    const canvasScroll = ref<{ scrollTo(x: number | undefined, y: number | undefined): void } | null>(null)
    onMounted(() => {
      canvasScroll.value!.scrollTo(viewer.scrollPos.x, viewer.scrollPos.y)
    })

    const rowIndices = computed(() => {
      let indices: number[]
      if (viewer.rowSorting.value) {
        indices = viewer.rowSorting.value
      } else {
        indices = Array.from(
          { length: viewer.datFile.rowCount },
          (_, rowIdx) => rowIdx)
      }

      if (viewer.pagination.value.enabled) {
        const { currentPage, pageSize } = viewer.pagination.value
        const start = (currentPage - 1) * pageSize
        return indices.slice(start, start + pageSize)
      }
      return indices
    })

    const paintWidth = ref(0)
    const paintHeight = ref(0)
    function handleResize (sz: { width: number, height: number }) {
      paintWidth.value = sz.width
      paintHeight.value = sz.height
    }
    const { scrollPos } = viewer
    function handleScroll (pos: { y: number, x: number }) {
      scrollPos.x = pos.x
      scrollPos.y = pos.y
    }

    const visibleHeaders = computed(() => 
      viewer.headers.value.filter(h => !viewer.hiddenColumns.value.has(h.offset))
    )

    const rowsFullWidth = computed(() =>
      rendering.getRowWidth(visibleHeaders.value))
    const rowsFullHeight = computed(() =>
      rowIndices.value.length * rendering.LINE_HEIGHT)
    const rowsOverlayWidth = computed(() =>
      rendering.rowsOverlayWidth(viewer.datFile.rowCount))
    const rowsWidth = computed(() =>
      Math.max(0, paintWidth.value - rowsOverlayWidth.value))
    const rowsHeight = computed(() =>
      Math.max(0, paintHeight.value - rendering.HEADERS_HEIGHT))

    const { isDarkTheme } = useTheme()
    const canvasPalette = computed(() =>
      rendering.canvasPalettes[isDarkTheme.value ? 'dark' : 'light'])

    watch([rowsWidth, rowsHeight, canvasPalette], () => {
      const dpr = window.devicePixelRatio

      canvasRef.value!.style.width = rowsWidth.value + 'px'
      canvasRef.value!.style.height = rowsHeight.value + 'px'

      canvasRef.value!.width = rowsWidth.value * dpr
      canvasRef.value!.height = rowsHeight.value * dpr

      const ctx = canvasRef.value!.getContext('2d', { alpha: false })!
      ctx.scale(dpr, dpr)

      draw()
    })

    const renderStats = computed(() =>
      renderColStats(viewer.columnStats.value, viewer.datFile))

    const renderColumns = computed(() =>
      renderByteCols(
        viewer.columnSelection.value,
        renderStats.value,
        visibleHeaders.value,
        scrollPos.x,
        scrollPos.x + Math.min(rowsFullWidth.value, rowsWidth.value))
    )

    const tablesLoadWatcher = computed(() => {
      for (const entry of viewer.referencedTables.value.values()) {
        void entry.value // vue-reactivity: subscribe
      }
      return undefined
    })

    watch([scrollPos, renderColumns, rowIndices, viewer.selectedRow, viewer.hoveredRow, tablesLoadWatcher, canvasPalette], () => { draw() })

    function draw () {
      const ctx = canvasRef.value!.getContext('2d', { alpha: false })!

      rendering.drawRows({
        left: scrollPos.x,
        paintWidth: rowsWidth.value,
        top: renderItems.value.top,
        rows: renderItems.value.ids,
        columns: renderColumns.value,
        viewer,
        ctx,
        palette: canvasPalette.value
      })
    }

    const renderItems = computed(() => {
      const scrollTop = scrollPos.y

      const count = Math.ceil(rowsHeight.value / rendering.LINE_HEIGHT) + 1
      const startIdx = Math.floor(scrollTop / rendering.LINE_HEIGHT)

      const top = (startIdx * rendering.LINE_HEIGHT) - scrollTop

      return {
        top,
        ids: rowIndices.value.slice(startIdx, startIdx + count)
      }
    })

    function focusEditingHeader () {
      const header = viewer.editHeader.value!
      const cols = renderHeaderCols(viewer.headers.value, null, 0, 0 + Infinity)
      const target = cols.find(col => col.offset === header.offset)!
      canvasScroll.value!.scrollTo(target.leftPx - rowsWidth.value * 0.33, undefined)
    }

    function handleCanvasClick (e: MouseEvent) {
      const { selectedRow } = viewer
      const sortedIdx = Math.floor((e.offsetY + renderItems.value.top + scrollPos.y) / rendering.LINE_HEIGHT)
      // Fix: Correctly map click to row index considering renderItems offset
      // Actually, e.offsetY is relative to canvas.
      // renderItems.top is the negative offset for smooth scrolling? No, it's positive.
      // Let's re-check renderItems logic.
      // top = (startIdx * LINE_HEIGHT) - scrollTop. This is usually negative or small positive.
      // The canvas is drawn starting from `top`.
      // So y = 0 on canvas corresponds to `top`.
      // Click y on canvas corresponds to `top + y`.
      // Row index = floor((y - top) / LINE_HEIGHT) + startIdx?
      // Wait, drawRows draws at `params.top + (i * LINE_HEIGHT)`.
      // So y on canvas = params.top + (i * LINE_HEIGHT).
      // i = (y - params.top) / LINE_HEIGHT.
      // realRow = renderItems.ids[i].
      
      const clickY = e.offsetY
      const rowOffset = Math.floor((clickY - renderItems.value.top) / rendering.LINE_HEIGHT)
      if (rowOffset >= 0 && rowOffset < renderItems.value.ids.length) {
        const realIdx = renderItems.value.ids[rowOffset]
        selectedRow.value = (selectedRow.value !== realIdx) ? realIdx : null
      }
    }

    const hoveredTooltip = ref<{ x: number, y: number, text: string } | null>(null)

    function handleCanvasMouseMove (e: MouseEvent) {
      const clickY = e.offsetY
      const rowOffset = Math.floor((clickY - renderItems.value.top) / rendering.LINE_HEIGHT)
      
      if (rowOffset >= 0 && rowOffset < renderItems.value.ids.length) {
        const realIdx = renderItems.value.ids[rowOffset]
        viewer.hoveredRow.value = realIdx

        // Tooltip logic
        const clickX = e.offsetX + scrollPos.x
        const col = renderColumns.value.find(c => clickX >= c.leftPx && clickX < c.leftPx + c.widthPx)
        if (col) {
          const header = visibleHeaders.value.find(h => h.offset === col.offset)
          if (header && header.type.string) {
             const data = readColumn(header, viewer.datFile)
             const text = data[realIdx] as string
             // Simple check: if text length > column width in chars (approx)
             // Or just show tooltip if it's a string column
             if (text && text.length > 0) {
               hoveredTooltip.value = {
                 x: e.clientX + 10,
                 y: e.clientY + 10,
                 text
               }
               return
             }
          }
        }
      } else {
        viewer.hoveredRow.value = null
      }
      hoveredTooltip.value = null
    }

    function handleCanvasMouseLeave () {
      viewer.hoveredRow.value = null
      hoveredTooltip.value = null
    }

    return {
      viewer,
      headerBlockStyle: computed(() =>
        ({ height: rendering.HEADERS_HEIGHT + 'px', width: paintWidth.value + 'px' })),
      headerOverlayContentStyle: computed(() =>
        ({ left: rowsOverlayWidth.value + 'px', height: rendering.HEADERS_HEIGHT + 'px', width: rowsWidth.value + 'px' })),
      scrollableStyle: computed(() =>
        ({ top: rendering.HEADERS_HEIGHT + 'px', left: rowsOverlayWidth.value + 'px' })),
      scrollablePaintSize: computed(() =>
        ({ width: rowsWidth.value, height: rowsHeight.value })),
      scrollableFullSize: computed(() =>
        ({ width: rowsFullWidth.value, height: rowsFullHeight.value })),
      rowsOverlayStyle: computed(() =>
        ({ top: rendering.HEADERS_HEIGHT + 'px', width: rowsOverlayWidth.value + 'px', height: rowsHeight.value + 'px', fontFamily: rendering.FONT_FAMILY, fontSize: rendering.FONT_SIZE + 'px', lineHeight: rendering.LINE_HEIGHT + 'px' })),
      handleScroll,
      handleResize,
      renderItems,
      canvasRef,
      renderColumns,
      scrollLeft: computed(() => scrollPos.x),
      rowsWidth: computed(() => Math.min(rowsFullWidth.value, rowsWidth.value)),
      LINE_HEIGHT: rendering.LINE_HEIGHT,
      canvasScroll,
      rowsNumberWidth: (rendering.rowsNumWidth(viewer.datFile.rowCount) + 'px'),
      focusEditingHeader,
      handleCanvasClick,
      handleCanvasMouseMove,
      handleCanvasMouseLeave,
      hoveredTooltip
    }
  }
})
</script>

<style lang="postcss" module>
.rowsOverlay {
  position: absolute;
  overflow: hidden;
  transform: translate3d(0, 0, 0);
  contain: strict;
  background: var(--color-surface);
  padding-left: 7px;
  border-left: 1px solid var(--color-border-subtle);
  padding-right: 8px;
  text-align: right;
  box-shadow: var(--color-overlay-shadow) 0 6px 6px -6px inset;
  user-select: none;
  color: var(--color-text-muted);
}

.headerBlock {
  background: var(--color-surface-alt);
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
}

.canvasSurface {
  background: var(--color-surface);
  color: var(--color-text);
}
</style>
