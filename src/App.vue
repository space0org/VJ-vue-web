<script setup>
import { ref, nextTick, onMounted } from 'vue'
import AudioVisualizer from './components/AudioVisualizer.vue'
import VJModeOverlay from './components/VJModeOverlay.vue'
import FractalVisualizer from './components/FractalVisualizer.vue'

const colorTheme = ref('default')
const isVJModeActive = ref(false)
const audioAnalyser = ref(null)

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
    // Force a re-initialization of the VJ mode overlay immediately
    window.dispatchEvent(new CustomEvent('vj-mode-activated', { 
      detail: { audioAnalyser: audioAnalyser.value } 
    }))
    
    // Add a small delay to ensure the component is mounted and visible
    setTimeout(() => {
      console.log('App.vue: VJ mode setTimeout: checking if overlay is visible')
      const overlay = document.querySelector('.vj-overlay')
      console.log('App.vue: VJ overlay element:', overlay ? 'found' : 'not found')
      
      if (overlay) {
        // Force overlay to be visible by adding a class
        overlay.classList.add('vj-active')
        console.log('App.vue: Added vj-active class to overlay')
      }
    }, 100)
  }
}

const deactivateVJMode = () => {
  console.log('Deactivating VJ mode')
  isVJModeActive.value = false
  console.log('VJ mode deactivated:', isVJModeActive.value)
}
</script>

<template>
  <div class="min-h-screen bg-black py-8">
    <div class="max-w-4xl mx-auto px-4">
      <h1 class="text-3xl font-bold text-center mb-8 text-white">サイケデリックVJモード</h1>
      
      <AudioVisualizer 
        :theme="colorTheme" 
        @analyser-ready="setAudioAnalyser"
      />
      
      <!-- Direct fractal visualization -->
      <div v-if="audioAnalyser" class="w-full h-64 rounded-lg mt-4 relative overflow-hidden">
        <FractalVisualizer 
          v-if="audioAnalyser" 
          :audioAnalyser="audioAnalyser" 
          theme="default"
        />
      </div>
      
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
  </div>
</template>
