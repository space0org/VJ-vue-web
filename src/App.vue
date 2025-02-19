<script setup>
import { ref } from 'vue'
import AudioVisualizer from './components/AudioVisualizer.vue'
import P5Visualizer from './components/P5Visualizer.vue'
import TapEffects from './components/TapEffects.vue'
import AudioEffectScreen from './components/AudioEffectScreen.vue'

const audioVisualizer = ref(null)
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-8">
    <div class="max-w-4xl mx-auto px-4">
      <h1 class="text-3xl font-bold text-center mb-8">マイク波形ビジュアライザー</h1>
      <AudioVisualizer ref="audioVisualizer" />
      <div class="mt-8">
        <h2 class="text-2xl font-bold text-center mb-4">タップエフェクト</h2>
        <TapEffects />
      </div>
      <div class="mt-8">
        <h2 class="text-2xl font-bold text-center mb-4">音声エフェクト 1</h2>
        <AudioEffectScreen 
          v-if="audioVisualizer?.isRecording && !audioVisualizer?.error" 
          :audioAnalyser="audioVisualizer?.getAnalyser()"
        />
      </div>
      <div class="mt-8">
        <h2 class="text-2xl font-bold text-center mb-4">音声エフェクト 2</h2>
        <AudioEffectScreen 
          v-if="audioVisualizer?.isRecording && !audioVisualizer?.error" 
          :audioAnalyser="audioVisualizer?.getAnalyser()"
        />
      </div>
    </div>
  </div>
</template>
