<script setup>
import { ref } from 'vue'
import AudioVisualizer from './components/AudioVisualizer.vue'
import P5EffectScreen from './components/P5EffectScreen.vue'

const audioContext = ref(null)
const analyser = ref(null)
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-8">
    <div class="max-w-4xl mx-auto px-4">
      <h1 class="text-3xl font-bold text-center mb-8">マイク波形ビジュアライザー</h1>
      <AudioVisualizer 
        v-model:audioContext="audioContext"
        v-model:analyser="analyser"
      />
      <div class="mt-8">
        <P5EffectScreen 
          :audioContext="audioContext"
          :analyser="analyser"
        />
      </div>
    </div>
  </div>
</template>
