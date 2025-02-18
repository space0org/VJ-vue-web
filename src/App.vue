<script setup>
import AudioVisualizer from './components/AudioVisualizer.vue'
import P5Visualizer from './components/P5Visualizer.vue'
import TapEffects from './components/TapEffects.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-8">
    <div class="max-w-4xl mx-auto px-4">
      <h1 class="text-3xl font-bold text-center mb-8">マイク波形ビジュアライザー</h1>
      <AudioVisualizer />
      <div class="mt-8">
        <h2 class="text-2xl font-bold text-center mb-4">タップエフェクト</h2>
        <TapEffects />
      </div>
    </div>
  </div>
</template>
