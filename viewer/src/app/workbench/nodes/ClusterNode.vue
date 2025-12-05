<template>
  <div 
    class="bg-indigo-100 dark:bg-indigo-900 border-2 border-indigo-300 dark:border-indigo-700 rounded-full shadow-lg px-4 py-2 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
    @click="toggle"
  >
    <Handle type="target" :position="Position.Top" class="!bg-indigo-400 !w-3 !h-3" />
    
    <div class="text-indigo-800 dark:text-indigo-200 font-bold text-sm whitespace-nowrap">
      {{ data.count }} {{ data.type === 'to' ? 'References' : 'Referenced By' }}
      <span class="ml-1 text-xs opacity-75">({{ data.expanded ? 'Collapse' : 'Expand' }})</span>
    </div>

    <Handle type="source" :position="Position.Bottom" class="!bg-indigo-400 !w-3 !h-3" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Handle, Position } from '@vue-flow/core'

export default defineComponent({
  components: { Handle },
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  setup (props) {
    function toggle () {
      if (props.data.onExpand) {
        props.data.onExpand(!props.data.expanded)
      }
    }

    return {
      Position,
      toggle
    }
  }
})
</script>
