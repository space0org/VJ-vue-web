<template>
  <div class="w-full bg-white rounded-lg shadow-sm p-4 mt-4">
    <div class="text-gray-600 text-sm mb-2">カラーテーマ</div>
    <div class="flex flex-wrap gap-3 justify-center">
      <button 
        v-for="theme in themes" 
        :key="theme.id"
        @click="selectTheme(theme.id)"
        class="w-10 h-10 rounded-full border-2 transition-all"
        :class="selectedTheme === theme.id ? 'border-blue-500 scale-110' : 'border-transparent'"
        :style="{ background: theme.gradient }"
      ></button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const themes = [
  { id: 'default', gradient: 'linear-gradient(45deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)' },
  { id: 'cool', gradient: 'linear-gradient(45deg, #00c6ff, #0072ff)' },
  { id: 'warm', gradient: 'linear-gradient(45deg, #f5576c, #f093fb)' },
  { id: 'forest', gradient: 'linear-gradient(45deg, #43e97b, #38f9d7)' },
  { id: 'sunset', gradient: 'linear-gradient(45deg, #fa709a, #fee140)' }
]

const selectedTheme = ref('default')
const emit = defineEmits(['change-theme'])

const selectTheme = (themeId) => {
  selectedTheme.value = themeId
  emit('change-theme', themeId)
}
</script>
