<script setup>
import { ref } from 'vue'
import AudioVisualizer from './components/AudioVisualizer.vue'
import TapEffects from './components/TapEffects.vue'
import VisualizationControls from './components/VisualizationControls.vue'
import ThemeSelector from './components/ThemeSelector.vue'

const visualizationMode = ref('all')
const colorTheme = ref('default')

const handleModeChange = (mode) => {
  visualizationMode.value = mode
}

const handleThemeChange = (theme) => {
  colorTheme.value = theme
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-8">
    <div class="max-w-4xl mx-auto px-4">
      <h1 class="text-3xl font-bold text-center mb-8">マイク波形ビジュアライザー</h1>
      <div class="flex flex-col md:flex-row gap-4">
        <div class="w-full md:w-1/2">
          <VisualizationControls @change-mode="handleModeChange" />
        </div>
        <div class="w-full md:w-1/2">
          <ThemeSelector @change-theme="handleThemeChange" />
        </div>
      </div>
      <AudioVisualizer :mode="visualizationMode" :theme="colorTheme" />
      <div class="mt-8" v-if="visualizationMode === 'all' || visualizationMode === 'tap'">
        <h2 class="text-2xl font-bold text-center mb-4">タップエフェクト</h2>
        <TapEffects :theme="colorTheme" />
      </div>
    </div>
  </div>
</template>
