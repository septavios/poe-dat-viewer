<template>
  <div 
    class="bg-white dark:bg-gray-800 border-2 rounded-lg shadow-md min-w-[180px] overflow-hidden transition-all duration-200"
    :class="{ 
      'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900': selected,
      'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500': !selected,
      'scale-105': isHovered
    }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <Handle type="target" :position="Position.Top" class="!bg-gray-400" />
    
    <div class="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 font-bold text-center text-gray-800 dark:text-gray-100 truncate" :title="label">
      {{ label }}
    </div>
    
    <div class="p-2 text-xs text-gray-500 dark:text-gray-400 text-center">
      <div v-if="data.isCentral" class="text-blue-600 dark:text-blue-400 font-semibold">Current Table</div>
      <div v-else>Double-click to view</div>
    </div>

    <Handle type="source" :position="Position.Bottom" class="!bg-gray-400" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'

export default defineComponent({
  components: { Handle },
  props: {
    label: {
      type: String,
      required: true
    },
    selected: {
      type: Boolean,
      default: false
    },
    data: {
      type: Object,
      default: () => ({})
    }
  },
  setup () {
    const isHovered = ref(false)
    return {
      Position,
      isHovered
    }
  }
})
</script>
