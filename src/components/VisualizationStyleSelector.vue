<template>
  <div class="w-full bg-white rounded-lg shadow-sm p-4 mt-4">
    <div class="text-gray-600 text-sm mb-2">ビジュアルスタイル</div>
    <div class="flex flex-wrap gap-2 justify-center">
      <button 
        v-for="style in styles" 
        :key="style.id"
        @click="selectStyle(style.id)"
        :class="[
          'px-4 py-2 rounded-lg font-medium transition-colors',
          selectedStyle === style.id 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        ]"
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
  { id: 'circular', name: '円形' },
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
