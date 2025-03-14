// Version configuration for visualization styles
export const visualizationVersions = [
  {
    id: 'v1',
    name: '初期バージョン',
    description: '最初のサイケデリックフラクタル',
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
    config: {
      maxDepth: 5,
      branchCount: 24,
      branchThickness: { min: 4, max: 12 },
      maxLength: { min: 200, max: 400 },
      angleVelocity: 0.008,
      colorOffset: 0.3,
      intensity: { min: 1.5, max: 4.0 }
    }
  }
]

// Get version by ID
export const getVersionById = (id) => {
  return visualizationVersions.find(version => version.id === id) || visualizationVersions[0]
}

// Get default version
export const getDefaultVersion = () => {
  return visualizationVersions[0]
}
