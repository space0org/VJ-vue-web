// Version configuration for visualization styles
export const visualizationVersions = [
  {
    id: 'v1',
    name: '収縮フラクタル',
    description: '内側に収縮する無限フラクタル',
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
  },
  {
    id: 'v4',
    name: '無限フラクタル',
    description: '永遠に続く深い収縮パターン',
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

// Get version by ID
export const getVersionById = (id) => {
  return visualizationVersions.find(version => version.id === id) || visualizationVersions[0]
}

// Get default version
export const getDefaultVersion = () => {
  return visualizationVersions[0]
}
