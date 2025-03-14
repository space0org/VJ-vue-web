<template>
  <div class="relative">
    <div 
      ref="canvasContainer" 
      :class="[
        'transition-all duration-300 ease-in-out bg-black',
        isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-64 rounded-lg mt-4'
      ]"
      style="mix-blend-mode: screen; z-index: 40;"
    >
      <!-- p5.js canvas will be mounted here -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import p5 from 'p5'
import chroma from 'chroma-js'

const props = defineProps({
  audioAnalyser: {
    type: Object,
    required: true,
    validator: (value) => {
      return value && typeof value.getByteFrequencyData === 'function' && 
             typeof value.frequencyBinCount === 'number'
    }
  },
  theme: {
    type: String,
    default: 'default'
  }
})

const getThemeColors = (theme) => {
  switch (theme) {
    case 'cool':
      return { hueStart: 180, hueEnd: 240 }
    case 'warm':
      return { hueStart: 0, hueEnd: 60 }
    case 'forest':
      return { hueStart: 90, hueEnd: 150 }
    case 'sunset':
      return { hueStart: 0, hueEnd: 60, saturation: 100, brightness: 100 }
    default:
      return { hueStart: 0, hueEnd: 360 }
  }
}

const canvasContainer = ref(null)
const isFullscreen = ref(false)
let p5Instance = null

// Fractal parameters
class FractalSystem {
  constructor(p, audioData) {
    this.p = p
    this.audioData = audioData
    this.branches = []
    this.maxDepth = 5
    this.angle = 0
    this.angleVelocity = 0.01 // Increased velocity
    this.centerX = p.width / 2
    this.centerY = p.height / 2
    this.colors = getThemeColors(props.theme)
    this.colorScale = chroma.scale(['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'])
    this.colorOffset = 0
    this.initBranches()
    
    // Debug message
    console.log('FractalSystem initialized with dimensions:', p.width, 'x', p.height)
  }

  initBranches() {
    const branchCount = 16 // Increased branch count
    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * this.p.TWO_PI
      this.branches.push({
        angle: angle,
        length: 0,
        maxLength: this.p.random(200, 400), // Increased length
        growing: true,
        children: [],
        depth: 0,
        hue: this.p.random(this.colors.hueStart, this.colors.hueEnd),
        thickness: this.p.random(5, 12) // Increased thickness
      })
    }
    console.log('Initialized', branchCount, 'branches for fractal visualization')
  }

  update(audioIntensity) {
    this.angle += this.angleVelocity * audioIntensity
    
    // Update existing branches
    this.updateBranch(this.branches, audioIntensity)
    
    // Add new branches occasionally based on audio intensity
    if (this.p.random() < 0.05 * audioIntensity && this.branches.length < 20) {
      const angle = this.p.random(this.p.TWO_PI)
      this.branches.push({
        angle: angle,
        length: 0,
        maxLength: this.p.random(100, 200),
        growing: true,
        children: [],
        depth: 0,
        hue: this.p.random(this.colors.hueStart, this.colors.hueEnd),
        thickness: this.p.random(2, 5)
      })
    }
  }
  
  updateBranch(branches, audioIntensity) {
    for (let i = branches.length - 1; i >= 0; i--) {
      const branch = branches[i]
      
      if (branch.growing) {
        branch.length += 1 * audioIntensity
        
        // Create child branches when parent reaches certain length
        if (branch.length > branch.maxLength * 0.6 && 
            branch.children.length < 2 && 
            branch.depth < this.maxDepth && 
            this.p.random() < 0.03 * audioIntensity) {
          
          const angleOffset = this.p.random(0.3, 0.7)
          branch.children.push({
            angle: branch.angle + angleOffset,
            length: 0,
            maxLength: branch.maxLength * 0.7,
            growing: true,
            children: [],
            depth: branch.depth + 1,
            hue: (branch.hue + 30) % 360,
            thickness: branch.thickness * 0.7
          })
          
          branch.children.push({
            angle: branch.angle - angleOffset,
            length: 0,
            maxLength: branch.maxLength * 0.7,
            growing: true,
            children: [],
            depth: branch.depth + 1,
            hue: (branch.hue + 60) % 360,
            thickness: branch.thickness * 0.7
          })
        }
        
        // Stop growing when max length is reached
        if (branch.length >= branch.maxLength) {
          branch.growing = false
        }
      } else {
        // Slowly fade out completed branches
        branch.thickness -= 0.01
        if (branch.thickness <= 0) {
          branches.splice(i, 1)
        }
      }
      
      // Update children recursively
      this.updateBranch(branch.children, audioIntensity)
    }
  }
  
  draw() {
    this.p.push()
    this.p.translate(this.centerX, this.centerY)
    this.p.rotate(this.angle)
    
    for (const branch of this.branches) {
      this.drawBranch(branch, 0, 0)
    }
    
    this.p.pop()
  }
  
  drawBranch(branch, startX, startY) {
    const endX = startX + Math.cos(branch.angle) * branch.length
    const endY = startY + Math.sin(branch.angle) * branch.length
    
    // Draw the branch with extreme brightness and thickness
    this.p.strokeWeight(branch.thickness * 3)
    this.p.stroke(branch.hue, 100, 100, 1) // Maximum brightness and opacity
    this.p.line(startX, startY, endX, endY)
    
    // Draw a much larger, brighter circle at the end
    this.p.noStroke()
    this.p.fill(branch.hue, 100, 100, 1) // Maximum brightness and opacity
    this.p.circle(endX, endY, branch.thickness * 8) // Much larger circle
    
    // Add a glow effect with a larger, semi-transparent circle
    this.p.fill(branch.hue, 100, 100, 0.3)
    this.p.circle(endX, endY, branch.thickness * 16)
    
    // Draw children recursively
    for (const child of branch.children) {
      this.drawBranch(child, endX, endY)
    }
  }
}

const sketch = (p) => {
  let canvas = null
  let fractalSystem = null
  
  p.setup = () => {
    if (!canvasContainer.value) {
      console.error('Canvas container not available during p5 setup')
      return
    }

    try {
      const width = canvasContainer.value.clientWidth
      const height = canvasContainer.value.clientHeight
      
      canvas = p.createCanvas(width, height)
      canvas.parent(canvasContainer.value)
      
      p.colorMode(p.HSB, 360, 100, 100, 1)
      p.background(0)
      
      // Initialize fractal system
      fractalSystem = new FractalSystem(p, [])
      
      console.log('Fractal visualizer setup completed successfully')
    } catch (error) {
      console.error('Failed to setup fractal visualizer:', error)
    }
  }
  
  p.draw = () => {
    if (!props.audioAnalyser) {
      console.error('Audio analyser not available during draw')
      return
    }
    
    p.clear() // Clear the canvas completely instead of semi-transparent background
    
    try {
      // Get audio data
      const dataArray = new Uint8Array(props.audioAnalyser.frequencyBinCount)
      props.audioAnalyser.getByteFrequencyData(dataArray)
      
      // Calculate average intensity
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const intensity = p.map(average, 0, 255, 1.5, 4) // Increased intensity range
      
      // Update and draw fractal system
      fractalSystem.update(intensity)
      fractalSystem.draw()
      
      // Debug visualization
      p.fill(255, 0, 0)
      p.noStroke()
      p.circle(p.width/2, p.height/2, 10) // Red dot at center to confirm rendering
      
      // Log every 30 frames
      if (p.frameCount % 30 === 0) {
        console.log('Fractal drawing at frame:', p.frameCount, 'with intensity:', intensity)
      }
      
    } catch (error) {
      console.error('Error in fractal visualizer draw loop:', error)
    }
  }
  
  p.windowResized = () => {
    if (!canvasContainer.value) return
    
    try {
      const width = canvasContainer.value.clientWidth
      const height = canvasContainer.value.clientHeight
      
      p.resizeCanvas(width, height)
      
      // Update center position
      if (fractalSystem) {
        fractalSystem.centerX = width / 2
        fractalSystem.centerY = height / 2
      }
    } catch (error) {
      console.error('Failed to resize fractal visualizer canvas:', error)
    }
  }
}

onMounted(() => {
  if (!canvasContainer.value) {
    console.error('Canvas container not found during mount')
    return
  }
  
  if (!props.audioAnalyser) {
    console.error('Audio analyser not provided during mount')
    return
  }

  try {
    p5Instance = new p5(sketch)
    console.log('P5 instance created successfully for fractal visualizer')
  } catch (error) {
    console.error('Failed to create P5 instance for fractal visualizer:', error)
  }
})

onUnmounted(() => {
  if (p5Instance) {
    p5Instance.remove()
  }
})
</script>
