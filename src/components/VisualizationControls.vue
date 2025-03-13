<template>
  <div class="w-full bg-white rounded-lg shadow-sm p-4">
    <div class="text-gray-600 text-sm mb-2">ビジュアライゼーションモード</div>
    <div class="flex flex-wrap gap-2">
      <button 
        v-for="mode in modes" 
        :key="mode.id"
        @click="selectMode(mode.id)"
        class="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
        :class="selectedMode === mode.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'"
      >
        {{ mode.name }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const modes = [
  { id: 'all', name: 'すべて' },
  { id: 'waveform', name: '波形' },
  { id: 'frequency', name: '周波数' },
  { id: 'particles', name: 'パーティクル' },
  { id: 'tap', name: 'タップエフェクト' }
]

const selectedMode = ref('all')
const emit = defineEmits(['change-mode'])

const selectMode = (modeId) => {
  selectedMode.value = modeId
  emit('change-mode', modeId)
}
</script>
