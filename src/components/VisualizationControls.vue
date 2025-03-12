<template>
  <div class="w-full bg-white rounded-lg shadow-sm p-4 mt-4">
    <div class="flex flex-wrap gap-2 justify-center">
      <button 
        v-for="mode in modes" 
        :key="mode.id"
        @click="selectMode(mode.id)"
        :class="[
          'px-4 py-2 rounded-lg font-medium transition-colors',
          selectedMode === mode.id 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        ]"
      >
        {{ mode.name }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const modes = [
  { id: 'waveform', name: '波形' },
  { id: 'particles', name: 'パーティクル' },
  { id: 'frequency', name: '周波数' },
  { id: 'all', name: 'すべて' }
]

const selectedMode = ref('all')
const emit = defineEmits(['change-mode'])

const selectMode = (modeId) => {
  selectedMode.value = modeId
  emit('change-mode', modeId)
}
</script>
