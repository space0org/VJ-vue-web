// Version configuration for visualization styles
export const visualizationVersions = [
  {
    id: 'v1',
    name: '収縮フラクタル',
    description: '内側に収縮する無限フラクタル',
    type: 'fractal', // Add type identifier
    config: {
      maxDepth: 8,
      branchCount: 36,
      branchThickness: { min: 3, max: 10 },
      maxLength: { min: 150, max: 300 },
      angleVelocity: 0.01,
      colorOffset: 0.5,
      intensity: { min: 2.0, max: 5.0 }
    }
  },
  {
    id: 'v2',
    name: '詳細バージョン',
    description: 'より複雑な幾何学模様',
    type: 'fractal',
    config: {
      maxDepth: 12,
      branchCount: 48,
      branchThickness: { min: 2, max: 8 },
      maxLength: { min: 100, max: 250 },
      angleVelocity: 0.015,
      colorOffset: 0.8,
      intensity: { min: 2.5, max: 6.0 }
    }
  },
  {
    id: 'v3',
    name: '軽量バージョン',
    description: 'シンプルで軽量なパターン',
    type: 'fractal',
    config: {
      maxDepth: 5,
      branchCount: 24,
      branchThickness: { min: 4, max: 12 },
      maxLength: { min: 200, max: 400 },
      angleVelocity: 0.008,
      colorOffset: 0.3,
      intensity: { min: 1.5, max: 4.0 }
    }
  },
  {
    id: 'v4',
    name: '無限フラクタル',
    description: '永遠に続く深い収縮パターン',
    type: 'fractal',
    config: {
      maxDepth: 10,
      branchCount: 42,
      branchThickness: { min: 2, max: 7 },
      maxLength: { min: 120, max: 280 },
      angleVelocity: 0.012,
      colorOffset: 0.6,
      intensity: { min: 2.2, max: 5.5 }
    }
  },
  {
    id: 'v5',
    name: '超詳細フラクタル',
    description: '非常に細かい複雑なパターン',
    type: 'fractal',
    config: {
      maxDepth: 14,
      branchCount: 54,
      branchThickness: { min: 1.5, max: 6 },
      maxLength: { min: 100, max: 250 },
      angleVelocity: 0.018,
      colorOffset: 0.9,
      intensity: { min: 2.8, max: 6.5 }
    }
  },
  {
    id: 'v6',
    name: '音響反応フラクタル',
    description: '音に敏感に反応する複雑なパターン',
    type: 'fractal',
    config: {
      maxDepth: 12,
      branchCount: 48,
      branchThickness: { min: 2, max: 7 },
      maxLength: { min: 110, max: 270 },
      angleVelocity: 0.015,
      colorOffset: 0.7,
      intensity: { min: 2.5, max: 6.0 },
      frequencyResponse: { bass: 1.5, mid: 1.2, high: 1.0 }
    }
  }
]

// Add a placeholder for Pattern B
export const patternBVersions = [
  {
    id: 'pattern-b-v1',
    name: 'パターンB - 基本',
    description: '新しい視覚化パターン - 基本バージョン',
    type: 'pattern-b',
    config: {
      particleCount: 200,
      particleSize: { min: 2, max: 8 },
      speed: { min: 0.5, max: 2.0 },
      colorShift: 0.5,
      opacity: 0.8,
      blendMode: 'screen',
      frequencyResponse: { bass: 1.2, mid: 1.0, high: 0.8 }
    }
  },
  {
    id: 'pattern-b-v2',
    name: 'パターンB - 高密度',
    description: '粒子数が多い複雑なパターン',
    type: 'pattern-b',
    config: {
      particleCount: 500,
      particleSize: { min: 1, max: 5 },
      speed: { min: 0.8, max: 3.0 },
      colorShift: 0.7,
      opacity: 0.6,
      blendMode: 'lighten',
      frequencyResponse: { bass: 1.5, mid: 1.2, high: 1.0 }
    }
  }
]

// Combine all versions
export const allVisualizations = [...visualizationVersions, ...patternBVersions]

// Get version by ID
export const getVersionById = (id) => {
  return allVisualizations.find(version => version.id === id) || allVisualizations[0]
}

// Get default version
export const getDefaultVersion = () => {
  return allVisualizations[0]
}

// Get versions by type
export const getVersionsByType = (type) => {
  return allVisualizations.filter(version => version.type === type)
}
