<template>
  <div :class="$style.bar">
    <div class="flex">
      <template v-if="selections.length === 0">
        <div class="text-gray-400 italic px-1.5 self-center">No bytes selected</div>
      </template>
      <template v-else-if="selections.length === 1">
        <button :class="$style.actionBtn"
          @click="defineColumn"><i class="codicon codicon-add"></i> Define column</button>
      </template>
      <template v-else-if="selections.length > 1">
        <div class="px-1.5 mr-1 self-center text-muted">Selections</div>
        <!-- eslint-disable-next-line vue/require-v-for-key -->
        <div v-for="range in selections"
          :class="$style.selectionTag"
          v-text="range" />
      </template>
    </div>
    <div class="flex gap-x-1 items-center relative">
      <div class="relative">
        <button :class="[$style.actionBtn, showColumnsDropdown ? $style.secondary : '']" @click="showColumnsDropdown = !showColumnsDropdown">
          <i class="codicon codicon-layout"></i> Columns
        </button>
        <div v-if="showColumnsDropdown" class="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 max-h-96 overflow-y-auto p-2 min-w-[200px]">
          <div class="flex justify-between items-center mb-2 px-1">
            <span class="font-semibold text-sm">Visible Columns</span>
            <button class="text-xs text-blue-600 hover:underline" @click="showAllColumns">Show All</button>
          </div>
          <div v-for="header in viewer.headers.value" :key="header.offset" class="flex items-center gap-x-2 px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer" @click="toggleColumn(header.offset)">
            <input type="checkbox" :checked="!viewer.hiddenColumns.value.has(header.offset)" class="pointer-events-none" />
            <span class="text-sm truncate max-w-[180px]" :title="header.name || 'unnamed'">{{ header.name || 'unnamed' }}</span>
          </div>
        </div>
      </div>
      <input v-model.trim="rowQuery" placeholder="Find rows" class="px-1.5 py-1 border bg-white" style="width: 180px;" />
      <button v-if="rowQuery" :class="[$style.actionBtn, $style.secondary]" @click="clearRowFilter">Clear</button>
      <button v-if="rowSorting"
        :class="[$style.actionBtn, $style.secondary]"
        @click="rowSorting = null"
        >Clear sorting</button>
      <button
        :class="$style.actionBtn"
        @click="restoreSchema"
        ><i class="codicon codicon-discard" /> Restore schema</button>
      <button
        :class="$style.actionBtn"
        @click="showSchema"
        ><i class="codicon codicon-json" /> Show schema</button>
      <button
        :class="$style.actionBtn"
        @click="exportDataJson"
        ><i class="codicon codicon-database" /> Export data</button>
      <button
        :class="$style.actionBtn"
        @click="openInPoEDB"
        ><i class="codicon codicon-globe" /> Open in PoEDB</button>
      <div class="flex items-center gap-x-1">
        <span class="text-muted">Refs</span>
        <select :class="$style.actionBtn" v-model="refChoice">
          <option v-for="n in referenced" :key="n" :value="n">{{ n }}</option>
        </select>
        <button :class="$style.actionBtn" @click="refChoice && openReferencedTable(refChoice)">Open</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, inject, triggerRef, shallowRef, watch } from 'vue'
import { clearColumnSelection, getColumnSelections } from '../selection.js'
import { createHeaderFromSelected } from '../headers.js'
import FileSaver from 'file-saver'
import { type Viewer, exportAllRows, saveHeaders, removeHeaders, importHeaders } from '../Viewer.js'
import { openTab } from '../../workbench/workbench-core.js'
import ShowSchema from './ShowSchema.vue'
import type { DatSchemasDatabase } from '@/app/dat-viewer/db.js'
import { getFieldReader } from 'pathofexile-dat/dat.js'
import { readColumn } from 'pathofexile-dat/dat.js'
import { poedbUrlForTable, poedbUrlForRow } from '@/app/utils/poedb.js'
import type { BundleIndex } from '@/app/patchcdn/index-store.js'

export default defineComponent({
  name: 'ViewerActions',
  setup () {
    const viewer = inject<Viewer>('viewer')!
    const db = inject<DatSchemasDatabase>('dat-schemas')!
    const index = inject<BundleIndex>('bundle-index')!

    const selections = computed(() =>
      getColumnSelections(viewer.columnSelection.value)
        .map(range => range.map(col => String(col)).join(' '))
    )

    const rowQuery = shallowRef('')
    const refChoice = shallowRef('')
    function clearRowFilter () {
      rowQuery.value = ''
    }

    watch(rowQuery, (q) => {
      const term = q.toLowerCase()
      if (!term) {
        viewer.rowSorting.value = null
        return
      }
      const headers = viewer.headers.value
      const matchers: Array<(idx: number) => boolean> = []
      const nameHdr = headers.find(h => (h.name || '').toLowerCase() === 'name' && h.type.string)
      if (nameHdr) {
        const data = readColumn(nameHdr, viewer.datFile) as string[]
        matchers.push((i) => String(data[i] || '').toLowerCase().includes(term))
      }
      const idHdr = headers.find(h => (h.name || '').toLowerCase() === 'id' && (h.type.integer || h.type.string))
      if (idHdr) {
        const data = readColumn(idHdr, viewer.datFile) as Array<number | string>
        matchers.push((i) => String(data[i] ?? '').toLowerCase().includes(term))
      }
      for (const hdr of headers) {
        if (!hdr.type.string || hdr === nameHdr) continue
        const data = readColumn(hdr, viewer.datFile) as string[]
        matchers.push((i) => String(data[i] || '').toLowerCase().includes(term))
      }
      const out: number[] = []
      for (let i = 0; i < viewer.datFile.rowCount; i++) {
        if (matchers.some(m => m(i))) out.push(i)
      }
      viewer.rowSorting.value = out
    })

    function defineColumn () {
      const { editHeader, columnSelection, headers } = viewer
      editHeader.value = createHeaderFromSelected(columnSelection.value, headers.value)
      clearColumnSelection(columnSelection.value)
      triggerRef(headers)
      triggerRef(columnSelection)
      saveHeaders(viewer, db)
    }

    function exportDataJson () {
      const data = exportAllRows(viewer.headers.value, viewer.datFile)
      FileSaver.saveAs(new File(
        [JSON.stringify(data, null, 2)],
        `${viewer.name}.json`,
        { type: 'application/json;charset=utf-8' }
      ))
    }

    function showSchema () {
      openTab({
        id: 'poe-dat-viewer@show-schema',
        title: 'Schema',
        type: ShowSchema,
        args: {
          name: viewer.name,
          headers: JSON.parse(JSON.stringify(viewer.headers.value))
        }
      })
    }

    function poedbUrlForRowLocal () {
      const row = viewer.selectedRow.value
      if (row == null) return poedbUrlForTable(db.patchVersion, viewer.name)
      const idHeader = viewer.headers.value.find(h => (h.name || '').toLowerCase() === 'id')
      const nameHeader = viewer.headers.value.find(h => (h.name || '').toLowerCase() === 'name')
      const readerId = idHeader ? getFieldReader(idHeader, viewer.datFile) : null
      const readerName = nameHeader ? getFieldReader(nameHeader, viewer.datFile) : null
      const idVal = readerId ? String(readerId(row)) : ''
      const nameVal = readerName ? String(readerName(row)) : ''
      return poedbUrlForRow(db.patchVersion, viewer.name, nameVal || idVal)
    }

    function openInPoEDB () {
      const url = poedbUrlForRowLocal()
      window.open(url, '_blank')
    }

    async function openReferencedTable (name: string) {
      const fullPath = viewer.path.replace(`/${viewer.name}.`, `/${name}.`)
      const fileContent = await index.loadFileContent(fullPath)
      openTab({ id: `bundles@${fullPath}`, title: name, type: (await import('./DatViewer.vue')).default, args: { fileContent, fullPath } })
    }

    async function restoreSchema () {
      await removeHeaders(viewer, db)
      await importHeaders(viewer, db)
    }

    const showColumnsDropdown = shallowRef(false)

    function toggleColumn (offset: number) {
      const hidden = viewer.hiddenColumns.value
      if (hidden.has(offset)) {
        hidden.delete(offset)
      } else {
        hidden.add(offset)
      }
      triggerRef(viewer.hiddenColumns)
    }

    function showAllColumns () {
      viewer.hiddenColumns.value.clear()
      triggerRef(viewer.hiddenColumns)
    }

    return {
      viewer,
      showColumnsDropdown,
      toggleColumn,
      showAllColumns,
      rowSorting: viewer.rowSorting,
      selections,
      rowQuery,
      clearRowFilter,
      defineColumn,
      exportDataJson,
      showSchema,
      restoreSchema,
      openInPoEDB
      , openReferencedTable,
      refChoice,
      referenced: computed(() => Array.from(viewer.referencedTables.value.keys()).filter(n => n !== viewer.name))
    }
  }
})
</script>

<style lang="postcss" module>
.bar {
  display: flex;
  justify-content: space-between;
  line-height: 1;
  @apply p-2;
  height: 35px;
  background: var(--color-toolbar);
  color: var(--color-toolbar-text-muted);
}

.actionBtn {
  @apply px-1.5;
  @apply flex;
  @apply gap-x-1;
  @apply items-center;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-toolbar-text);
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: var(--color-hover);
    color: var(--color-text);
  }
}

.secondary {
  border-color: var(--color-border-strong);
  background: var(--color-surface-elevated);
  color: var(--color-text);

  &:hover {
    background: var(--color-hover-strong);
    color: var(--color-text-inverse);
  }
}

.selectionTag {
  @apply px-1.5;
  @apply mr-1;
  font-family: ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  border-radius: 0.375rem;
  background: var(--color-selection-soft);
  color: var(--color-text);
  display: flex;
  align-items: center;
}
</style>
