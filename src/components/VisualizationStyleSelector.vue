<template>
  <div class="w-full bg-white rounded-lg shadow-sm p-4 mt-4">
    <div class="text-gray-600 text-sm mb-2">ビジュアライゼーションスタイル</div>
    <div class="flex flex-wrap gap-2">
      <button 
        v-for="style in styles" 
        :key="style.id"
        @click="selectStyle(style.id)"
        class="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
        :class="selectedStyle === style.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'"
      >
        {{ style.name }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const styles = [
  { id: 'default', name: 'デフォルト' },
  { id: 'circular', name: '円環' },  // 円環 (ring/circle) style
  { id: 'bars', name: 'バー' },
  { id: 'dots', name: 'ドット' },
  { id: 'wave', name: 'ウェーブ' }
]

const selectedStyle = ref('default')
const emit = defineEmits(['change-style'])

const selectStyle = (styleId) => {
  selectedStyle.value = styleId
  emit('change-style', styleId)
}
</script>
