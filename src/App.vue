<script setup>
import { ref } from 'vue'
import AudioVisualizer from './components/AudioVisualizer.vue'
import P5AudioVisualizer from './components/P5AudioVisualizer.vue'
import TapEffects from './components/TapEffects.vue'

const audioMode = ref('simulation')
const audioContext = ref(null)
const analyser = ref(null)
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-8">
    <div class="max-w-4xl mx-auto px-4">
      <h1 class="text-3xl font-bold text-center mb-8">マイク波形ビジュアライザー</h1>
      <AudioVisualizer 
        v-model:audioMode="audioMode"
        v-model:audioContext="audioContext"
        v-model:analyser="analyser"
      />
      <div class="mt-8">
        <h2 class="text-2xl font-bold text-center mb-4">幾何学的なビジュアライザー</h2>
        <P5AudioVisualizer 
          :audioMode="audioMode"
          :audioContext="audioContext"
          :analyser="analyser"
        />
      </div>
      <div class="mt-8">
        <h2 class="text-2xl font-bold text-center mb-4">タップエフェクト</h2>
        <TapEffects />
      </div>
    </div>
  </div>
</template>
