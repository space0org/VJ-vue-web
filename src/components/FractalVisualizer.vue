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
  },
  version: {
    type: Object,
    default: () => ({
      id: 'v1',
      config: {
        maxDepth: 8,
        branchCount: 32,
        branchThickness: { min: 3, max: 8 },
        maxLength: { min: 150, max: 300 },
        angleVelocity: 0.01,
        colorOffset: 0.5,
        intensity: { min: 2.0, max: 5.0 }
      }
    })
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
    this.maxDepth = props.version.config.maxDepth || 8
    this.angle = 0
    this.angleVelocity = props.version.config.angleVelocity || 0.01
    this.centerX = p.width / 2
    this.centerY = p.height / 2
    this.colors = getThemeColors(props.theme)
    this.colorScale = chroma.scale(['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'])
    this.colorOffset = 0
    // Store frequency-specific intensities for more detailed audio reactivity
    this.bassIntensity = 0
    this.midIntensity = 0
    this.highIntensity = 0
    this.initBranches()
    
    // Debug message
    console.log('FractalSystem initialized with dimensions:', p.width, 'x', p.height)
  }

  initBranches() {
    const branchCount = props.version.config.branchCount || 32
    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * this.p.TWO_PI
      const thicknessConfig = props.version.config.branchThickness || { min: 3, max: 8 }
      const lengthConfig = props.version.config.maxLength || { min: 150, max: 300 }
      
      this.branches.push({
        angle: angle,
        length: 0,
        maxLength: this.p.random(lengthConfig.min, lengthConfig.max),
        growing: true,
        children: [],
        depth: 0,
        hue: this.p.random(this.colors.hueStart, this.colors.hueEnd),
        thickness: this.p.random(thicknessConfig.min, thicknessConfig.max)
      })
    }
    console.log('Initialized', branchCount, 'branches for fractal visualization')
  }

  update(audioIntensity, bassIntensity, midIntensity, highIntensity) {
    // Store frequency-specific intensities for use in branch updates
    this.bassIntensity = bassIntensity || 0
    this.midIntensity = midIntensity || 0
    this.highIntensity = highIntensity || 0
    
    this.angle += this.angleVelocity * (audioIntensity + bassIntensity * 0.5) // More responsive rotation
    
    // Update existing branches
    this.updateBranch(this.branches, audioIntensity)
    
    // Add new branches occasionally based on audio intensity
    if (this.p.random() < (0.05 + this.bassIntensity * 0.05) * audioIntensity && this.branches.length < 20) {
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
        // For inward contraction effect, we start with full length and decrease
        if (branch.length === 0) {
          branch.length = branch.maxLength; // Start at full length
        } else {
          // Use frequency-specific intensity for more dynamic contraction
          const contractionSpeed = 1.0 * audioIntensity * (1.0 + (this.bassIntensity * 0.5));
          branch.length -= contractionSpeed; // Contract inward with variable speed
        }
        
        // Create child branches when parent contracts to certain length with more variation
        if (branch.length < branch.maxLength * (0.5 - this.midIntensity * 0.2) && // Dynamic threshold based on mid frequencies
            branch.children.length < Math.min(4, Math.floor(3 + this.highIntensity * 2)) && // Variable child count based on high frequencies
            branch.depth < this.maxDepth && 
            this.p.random() < (0.05 + this.bassIntensity * 0.1) * audioIntensity) {
          
          // Create multiple branches with varying angles for more complexity
          const baseAngleOffset = this.p.random(0.2, 0.5)
          
          // First branch - slightly right
          branch.children.push({
            angle: branch.angle + baseAngleOffset,
            length: branch.maxLength * 0.65, // Start at full length
            maxLength: branch.maxLength * 0.65,
            growing: true,
            children: [],
            depth: branch.depth + 1,
            hue: (branch.hue + 30) % 360,
            thickness: branch.thickness * 0.7
          })
          
          // Second branch - slightly left
          branch.children.push({
            angle: branch.angle - baseAngleOffset,
            length: branch.maxLength * 0.65, // Start at full length
            maxLength: branch.maxLength * 0.65,
            growing: true,
            children: [],
            depth: branch.depth + 1,
            hue: (branch.hue + 60) % 360,
            thickness: branch.thickness * 0.7
          })
          
          // Third branch - random angle for more variety (only at lower depths)
          if (branch.depth < 3 && this.p.random() < 0.7) {
            const randomAngle = branch.angle + this.p.random(-0.3, 0.3)
            branch.children.push({
              angle: randomAngle,
              length: branch.maxLength * 0.5, // Start at full length
              maxLength: branch.maxLength * 0.5,
              growing: true,
              children: [],
              depth: branch.depth + 1,
              hue: (branch.hue + 90) % 360,
              thickness: branch.thickness * 0.6
            })
          }
        }
        
        // Stop growing when minimum length is reached
        if (branch.length <= 0) {
          branch.growing = false;
          // Reset to create infinite fractal effect
          branch.length = branch.maxLength;
          branch.growing = true;
          branch.children = []; // Clear children to restart the pattern
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
    this.p.strokeWeight(branch.thickness * 2) // Reduced from 3 to 2 for finer lines
    this.p.stroke(branch.hue, 100, 100, 0.9) // Slightly reduced opacity for layering effect
    this.p.line(startX, startY, endX, endY)
    
    // Draw a much larger, brighter circle at the end
    this.p.noStroke()
    this.p.fill(branch.hue, 100, 100, 0.9) // Slightly reduced opacity
    this.p.circle(endX, endY, branch.thickness * 6) // Reduced from 8 to 6 for finer detail
    
    // Add multiple glow effects with varying sizes and opacities for more detailed appearance
    this.p.fill(branch.hue, 100, 100, 0.5)
    this.p.circle(endX, endY, branch.thickness * 10)
    
    this.p.fill(branch.hue, 100, 100, 0.3)
    this.p.circle(endX, endY, branch.thickness * 16)
    
    this.p.fill(branch.hue, 100, 100, 0.1)
    this.p.circle(endX, endY, branch.thickness * 24)
    
    // Add small detail circles along the branch for more intricate patterns
    if (branch.length > 20) {
      const midX = startX + Math.cos(branch.angle) * (branch.length * 0.5)
      const midY = startY + Math.sin(branch.angle) * (branch.length * 0.5)
      
      this.p.fill((branch.hue + 30) % 360, 100, 100, 0.7)
      this.p.circle(midX, midY, branch.thickness * 3)
      
      // Add even more detail with smaller circles at quarter points for more intricate patterns
      if (branch.length > 40) {
        const quarterX = startX + Math.cos(branch.angle) * (branch.length * 0.25)
        const quarterY = startY + Math.sin(branch.angle) * (branch.length * 0.25)
        const threeQuarterX = startX + Math.cos(branch.angle) * (branch.length * 0.75)
        const threeQuarterY = startY + Math.sin(branch.angle) * (branch.length * 0.75)
        
        this.p.fill((branch.hue + 60) % 360, 100, 100, 0.5)
        this.p.circle(quarterX, quarterY, branch.thickness * 2)
        this.p.circle(threeQuarterX, threeQuarterY, branch.thickness * 2)
      }
    }
    
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
      
      // Calculate average intensity with more dynamic range
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const intensityConfig = props.version.config.intensity || { min: 2.0, max: 5.0 }
      const intensity = p.map(average, 0, 255, intensityConfig.min, intensityConfig.max)
      
      // Calculate frequency bands for more detailed audio analysis
      const bassAvg = calculateBandAverage(dataArray, 0, 10); // Low frequencies
      const midAvg = calculateBandAverage(dataArray, 10, 100); // Mid frequencies
      const highAvg = calculateBandAverage(dataArray, 100, 255); // High frequencies
      
      // Adjust color cycling based on frequency bands
      fractalSystem.colorOffset = (fractalSystem.colorOffset + bassAvg * 0.01) % 360;
      
      // Update and draw fractal system with enhanced audio responsiveness
      fractalSystem.update(intensity, bassAvg, midAvg, highAvg)
      fractalSystem.draw()
      
      // Log every 60 frames
      if (p.frameCount % 60 === 0) {
        console.log('Fractal drawing at frame:', p.frameCount, 'with intensity:', intensity, 
                    'bass:', bassAvg.toFixed(2), 'mid:', midAvg.toFixed(2), 'high:', highAvg.toFixed(2))
      }
      
    } catch (error) {
      console.error('Error in fractal visualizer draw loop:', error)
    }
  }
  
  // Helper function to calculate average value in a frequency range
  function calculateBandAverage(dataArray, startIdx, endIdx) {
    let sum = 0;
    let count = 0;
    
    // Make sure we don't exceed array bounds
    const start = Math.max(0, Math.min(startIdx, dataArray.length - 1));
    const end = Math.max(0, Math.min(endIdx, dataArray.length - 1));
    
    for (let i = start; i < end; i++) {
      sum += dataArray[i];
      count++;
    }
    
    return count > 0 ? (sum / count) / 255 : 0; // Normalize to 0-1 range
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

// Listen for version change events
const handleVersionChange = (event) => {
  if (event.detail && event.detail.version && p5Instance) {
    console.log('FractalVisualizer: Received version change event:', event.detail.version.name)
    
    // Recreate p5 instance with new version
    if (p5Instance) {
      p5Instance.remove()
    }
    
    p5Instance = new p5(sketch)
  }
}

window.addEventListener('version-changed', handleVersionChange)

onUnmounted(() => {
  window.removeEventListener('version-changed', handleVersionChange)
  if (p5Instance) {
    p5Instance.remove()
  }
})
</script>
