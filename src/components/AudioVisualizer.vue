<template>
  <div>
    <div class="w-full bg-white rounded-lg shadow-sm p-6">
      <div v-if="!isRecording && !error" class="flex flex-col items-center gap-4">
        <div class="text-gray-600 mb-2">
          マイク入力で波形を表示します
        </div>
        <button 
          @click="startRecording" 
          class="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg shadow-sm hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
          </svg>
          マイク入力開始
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
        <div class="text-gray-600 text-sm mb-2">{{ localAudioMode === 'simulation' ? 'シミュレーション音声' : 'マイク入力' }}の波形を表示しています</div>
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import confetti from 'canvas-confetti'

const emit = defineEmits(['update:audioContext', 'update:analyser'])

const canvas = ref(null)
const isRecording = ref(false)
const error = ref('')
let source = null
let animationId = null
let audioContext = null
let analyser = null

watch(() => props.audioMode, (newMode) => {
  if (newMode) {
    localAudioMode.value = newMode
  }
})

watch(localAudioMode, (newMode) => {
  emit('update:audioMode', newMode)
})

const updateAudioContext = (ctx) => {
  audioContext = ctx
  emit('update:audioContext', ctx)
}

const updateAnalyser = (ana) => {
  analyser = ana
  emit('update:analyser', ana)
}

const setupAudioSource = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    console.log('Microphone access granted')
    source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)
  } catch (err) {
    console.error('Error setting up audio source:', err)
    error.value = 'マイクの許可が得られませんでした'
    throw err
  }
}

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
    
    if (!audioContext) {
      audioContext = new AudioContext()
    }
    if (!analyser) {
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
    }
    updateAudioContext(audioContext)
    updateAnalyser(analyser)
    
    await setupAudioSource()
    
    const bufferLength = analyser.frequencyBinCount
    dataArray = new Uint8Array(bufferLength)
    
    console.log('Audio context initialized:', {
      sampleRate: audioContext.sampleRate,
      fftSize: analyser.fftSize,
      bufferLength,
      mode: localAudioMode.value
    })
    
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

const cleanup = () => {
  if (animationId) {
    console.log('Canceling animation frame')
    cancelAnimationFrame(animationId)
  }
  if (source) {
    console.log('Disconnecting audio source')
    source.disconnect()
  }
  if (audioContext) {
    console.log('Closing audio context')
    audioContext.close()
  }
}

onUnmounted(cleanup)
</script>
