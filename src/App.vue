<script setup>
import { ref, nextTick, onMounted } from 'vue'
import AudioVisualizer from './components/AudioVisualizer.vue'
import TapEffects from './components/TapEffects.vue'
import VisualizationControls from './components/VisualizationControls.vue'
import ThemeSelector from './components/ThemeSelector.vue'
import VJModeOverlay from './components/VJModeOverlay.vue'

const visualizationMode = ref('all')
const colorTheme = ref('default')
const isVJModeActive = ref(false)
const audioAnalyser = ref(null)

const handleModeChange = (mode) => {
  visualizationMode.value = mode
}

const handleThemeChange = (theme) => {
  colorTheme.value = theme
}

const setAudioAnalyser = (analyser) => {
  console.log('App.vue: Received audio analyser from AudioVisualizer')
  audioAnalyser.value = analyser
  console.log('App.vue: Set audioAnalyser.value:', audioAnalyser.value ? 'present' : 'null')
}

const activateVJMode = () => {
  console.log('App.vue: Activating VJ mode')
  
  // Ensure we have a valid audio analyzer
  if (!audioAnalyser.value) {
    console.error('Cannot activate VJ mode: No audio analyzer available')
    return
  }
  
  // Toggle VJ mode active state
  isVJModeActive.value = !isVJModeActive.value
  console.log('App.vue: VJ mode toggled to:', isVJModeActive.value, 'audioAnalyser:', audioAnalyser.value ? 'present' : 'null')
  
  // If activating, force a re-render by using nextTick
  if (isVJModeActive.value) {
    nextTick(() => {
      console.log('App.vue: VJ mode nextTick: isVJModeActive =', isVJModeActive.value)
      
      // Add a small delay to ensure the component is mounted
      setTimeout(() => {
        console.log('App.vue: VJ mode setTimeout: checking if overlay is visible')
        const overlay = document.querySelector('.vj-overlay')
        console.log('App.vue: VJ overlay element:', overlay ? 'found' : 'not found')
        
        // Force a re-initialization of the VJ mode overlay
        if (overlay) {
          console.log('App.vue: Forcing re-initialization of overlay')
          // Dispatch a custom event to force re-initialization
          window.dispatchEvent(new CustomEvent('vj-mode-activated', { 
            detail: { audioAnalyser: audioAnalyser.value } 
          }))
        }
      }, 100) // Reduced delay for faster response
    })
  }
}

const deactivateVJMode = () => {
  console.log('Deactivating VJ mode')
  isVJModeActive.value = false
  console.log('VJ mode deactivated:', isVJModeActive.value)
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
      
      <AudioVisualizer 
        :mode="visualizationMode" 
        :theme="colorTheme" 
        @analyser-ready="setAudioAnalyser"
      />
      
      <!-- VJ Mode Button -->
      <div class="mt-4 flex justify-center">
        <button 
          @click="activateVJMode"
          :disabled="!audioAnalyser"
          :class="[
            'px-6 py-3 text-white font-medium rounded-lg shadow-lg transition-colors flex items-center gap-2',
            audioAnalyser ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed',
            isVJModeActive ? 'opacity-50' : 'opacity-100'
          ]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          {{ isVJModeActive ? 'VJモード実行中' : 'VJモードを起動' }}
        </button>
      </div>
      
      <!-- Debug info -->
      <div v-if="audioAnalyser" class="mt-2 text-xs text-gray-500 text-center">
        Audio Analyzer: {{ audioAnalyser ? 'Available' : 'Not Available' }} | 
        VJ Mode: {{ isVJModeActive ? 'Active' : 'Inactive' }}
      </div>
      <div class="mt-8" v-if="visualizationMode === 'all' || visualizationMode === 'tap'">
        <h2 class="text-2xl font-bold text-center mb-4">タップエフェクト</h2>
        <TapEffects :theme="colorTheme" />
      </div>
    </div>
    
   <!-- VJ Mode Overlay - Always rendered -->
    <VJModeOverlay 
      v-if="audioAnalyser"
      :audioAnalyser="audioAnalyser" 
      :theme="colorTheme"
      :showButton="false"
      :isActive="isVJModeActive"
      @close="deactivateVJMode"
    />
    
    <!-- VJ Mode Indicator -->
    <div v-if="isVJModeActive" class="fixed top-4 left-4 bg-purple-600 text-white px-3 py-1 rounded-lg shadow-lg z-[10000]">
      VJモード実行中
    </div>
    <!-- Debug info -->
    <div v-if="audioAnalyser" class="fixed bottom-2 right-2 text-xs text-gray-500">
      Audio Analyzer: {{ audioAnalyser ? 'Available' : 'Not Available' }}
    </div>
  </div>
</template>
