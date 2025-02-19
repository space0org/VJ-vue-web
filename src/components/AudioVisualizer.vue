<template>
  <div>
    <div class="w-full bg-white rounded-lg shadow-sm p-6">
      <div v-if="!isRecording && !error" class="flex flex-col items-center gap-4">
        <div class="text-gray-600 mb-2">
          シミュレーション音声で波形を表示します
        </div>
        <button 
          @click="startRecording" 
          class="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg shadow-sm hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          シミュレーション開始
        </button>
      </div>
      <div v-else-if="error" class="flex flex-col items-center gap-4 text-center">
        <div class="text-red-500 font-medium">{{ error }}</div>
        <button 
          @click="retryRecording" 
          class="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
        >
          再試行する
        </button>
      </div>
      <div v-else>
        <div class="text-gray-600 text-sm mb-2">シミュレーション音声の波形を表示しています</div>
        <canvas 
          ref="canvas" 
          width="800" 
          height="200" 
          class="w-full h-48 border border-gray-200 rounded-lg bg-white"
        ></canvas>
      </div>
    </div>
    <P5Visualizer 
      v-if="isRecording && !error && analyser" 
      :audioAnalyser="getAnalyser()" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'

const canvas = ref(null)
const isRecording = ref(false)
const error = ref('')
let audioContext = null
let analyser = null
let dataArray = null
let source = null
let animationId = null

const getAnalyser = () => {
  if (!analyser) {
    console.warn('Audio analyser not initialized')
    return null
  }
  console.log('Providing audio analyser:', {
    fftSize: analyser.fftSize,
    frequencyBinCount: analyser.frequencyBinCount
  })
  return analyser
}

const startRecording = async () => {
  try {
    console.log('Starting recording...')
    error.value = ''
    
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    
    // Create oscillator for testing
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    // Set up oscillator
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime)
    
    // Create LFO for amplitude modulation
    const lfo = audioContext.createOscillator()
    const lfoGain = audioContext.createGain()
    lfo.frequency.value = 0.5
    lfoGain.gain.value = 0.3
    
    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(analyser)
    lfo.connect(lfoGain)
    lfoGain.connect(gainNode.gain)
    
    const bufferLength = analyser.frequencyBinCount
    dataArray = new Uint8Array(bufferLength)
    
    console.log('Audio context initialized:', {
      sampleRate: audioContext.sampleRate,
      fftSize: analyser.fftSize,
      bufferLength
    })
    
    // Start oscillators
    oscillator.start()
    lfo.start()
    
    isRecording.value = true
    confetti()
    
    requestAnimationFrame(draw)
  } catch (err) {
    let message = 'マイクの許可が得られませんでした'
    if (err.name === 'NotFoundError') {
      message = 'マイクが見つかりませんでした。マイクが接続されているか確認してください。'
    } else if (err.name === 'NotAllowedError') {
      message = 'マイクの使用が許可されませんでした。ブラウザの設定を確認してください。'
    }
    error.value = message
    console.error(message, err)
  }
}

const retryRecording = () => {
  error.value = ''
  startRecording()
}

const draw = () => {
  if (!canvas.value || !isRecording.value) return
  
  const canvasCtx = canvas.value.getContext('2d')
  const width = canvas.value.width
  const height = canvas.value.height
  
  analyser.getByteTimeDomainData(dataArray)
  
  canvasCtx.fillStyle = 'rgb(255, 255, 255)'
  canvasCtx.fillRect(0, 0, width, height)
  
  canvasCtx.lineWidth = 2
  canvasCtx.strokeStyle = 'rgb(0, 0, 0)'
  canvasCtx.beginPath()
  
  const sliceWidth = width / dataArray.length
  let x = 0
  
  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 128.0
    const y = v * height / 2
    
    if (i === 0) {
      canvasCtx.moveTo(x, y)
    } else {
      canvasCtx.lineTo(x, y)
    }
    
    x += sliceWidth
  }
  
  canvasCtx.lineTo(width, height / 2)
  canvasCtx.stroke()
  
  animationId = requestAnimationFrame(draw)
}

onUnmounted(() => {
  console.log('AudioVisualizer unmounting...')
  if (animationId) {
    console.log('Canceling animation frame')
    cancelAnimationFrame(animationId)
  }
  if (audioContext) {
    console.log('Closing audio context')
    audioContext.close()
  }
})
</script>
