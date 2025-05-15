<template>
  <div>
    <!-- Semi-transparent center button (visible when VJ mode is closed) -->
    <button 
      v-if="showVersionButton"
      @click="openModal"
      class="fixed bottom-20 right-20 z-50 
             w-20 h-20 rounded-full bg-purple-600/90 hover:bg-purple-600/100 
             flex items-center justify-center transition-all duration-300 shadow-lg border-4 border-white/50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"></path>
      </svg>
      <span class="absolute -bottom-8 text-white text-xs bg-purple-600/80 px-2 py-1 rounded-md whitespace-nowrap">バージョン選択</span>
    </button>
    
    <!-- Version selector modal -->
    <div 
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      @click.self="closeModal"
    >
      <div class="bg-gray-900 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-white">バージョン選択</h2>
          <button 
            @click="closeModal"
            class="p-1 rounded-full hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="space-y-4 max-h-80 overflow-y-auto">
          <div v-for="(versionsOfType, type) in versionsByType" :key="type" class="mb-4">
            <h3 class="text-lg font-semibold text-white mb-2">
              {{ type === 'fractal' ? 'フラクタルパターン' : 'パターンB' }}
            </h3>
            <div class="space-y-2">
              <div 
                v-for="version in versionsOfType" 
                :key="version.id"
                @click="selectVersion(version)"
                :class="[
                  'p-3 rounded-lg cursor-pointer transition-colors',
                  selectedVersionId === version.id ? 'bg-purple-700' : 'bg-gray-800 hover:bg-gray-700'
                ]"
              >
                <div class="flex justify-between items-center">
                  <h3 class="font-medium text-white">{{ version.name }}</h3>
                  <span 
                    v-if="selectedVersionId === version.id" 
                    class="text-xs bg-purple-500 text-white px-2 py-1 rounded-full"
                  >
                    現在
                  </span>
                </div>
                <p class="text-sm text-gray-400 mt-1">{{ version.description }}</p>
                <div class="mt-2 text-xs text-gray-500">
                  <template v-if="version.type === 'fractal'">
                    <span>深さ: {{ version.config.maxDepth }}</span>
                    <span class="mx-2">|</span>
                    <span>枝: {{ version.config.branchCount }}</span>
                  </template>
                  <template v-else>
                    <span>粒子数: {{ version.config.particleCount }}</span>
                    <span class="mx-2">|</span>
                    <span>速度: {{ version.config.speed.min }}-{{ version.config.speed.max }}</span>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-4 flex justify-end">
          <button 
            @click="closeModal"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { allVisualizations, getVersionById, getDefaultVersion, getVersionsByType } from '../utils/VersionManager'

const props = defineProps({
  isVJModeActive: {
    type: Boolean,
    default: false
  },
  currentVersionId: {
    type: String,
    default: ''
  },
  showVersionButton: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['version-selected'])

const versions = ref(allVisualizations)
const selectedVersionId = ref(props.currentVersionId || getDefaultVersion().id)
const isModalOpen = ref(false)

// Group versions by type
const versionsByType = computed(() => {
  const grouped = {}
  versions.value.forEach(version => {
    if (!grouped[version.type]) {
      grouped[version.type] = []
    }
    grouped[version.type].push(version)
  })
  return grouped
})

// Watch for changes in currentVersionId prop
watch(() => props.currentVersionId, (newValue) => {
  if (newValue) {
    selectedVersionId.value = newValue
  }
})

const openModal = () => {
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const selectVersion = (version) => {
  selectedVersionId.value = version.id
  emit('version-selected', version)
  closeModal()
}
</script>
