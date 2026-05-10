export const MATERIAL_LIBRARY = [
  {
    id: 'mat-iridescent',
    name: 'Iridescent Metal',
    description: 'A shimmering, rainbow-like metallic effect based on viewing angle.',
    prompt: 'A highly reflective iridescent metal material that shifts through the rainbow spectrum as the camera moves.'
  },
  {
    id: 'mat-lava',
    name: 'Molten Lava',
    description: 'Glowing, flowing procedural lava with dark crust and bright cracks.',
    prompt: 'Procedural molten lava with a moving glowing texture, dark basalt patches, and bright emissive cracks.'
  },
  {
    id: 'mat-glass',
    name: 'Frosted Glass',
    description: 'A blurry, refractive semi-transparent glass effect.',
    prompt: 'A frosted glass shader with soft refraction, subtle surface roughness, and semi-transparency.'
  },
  {
    id: 'mat-hologram',
    name: 'Digital Hologram',
    description: 'Scanning lines, flicker effects, and blue emissive transparency.',
    prompt: 'A blue digital hologram with moving scanlines, subtle flicker, and edge-glow fresnel effect.'
  },
  {
    id: 'mat-voronoi',
    name: 'Voronoi Cells',
    description: 'Organic cellular pattern with pulsating colors.',
    prompt: 'A procedural voronoi cellular pattern that slowly pulsates and shifts colors across the surface.'
  }
];

export const OBJECT_LIBRARY = [
  { id: 'obj-sphere', name: 'Sphere', type: 'sphere', description: 'Perfect for smooth, round materials.' },
  { id: 'obj-box', name: 'Cube', type: 'box', description: 'Great for testing corner alignment.' },
  { id: 'obj-torus', name: 'Torus', type: 'torus', description: 'A donut shape to test curves.' },
  { id: 'obj-knot', name: 'Torus Knot', type: 'knot', description: 'Complex interlaced geometry.' },
  { id: 'obj-table', name: 'Modern Table', type: 'table', description: 'A surface with legs for environment testing.' }
];

export const TEXTURE_LIBRARY = [
  {
    id: 'tex-wood',
    name: 'Dark Wood',
    url: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/dark_wooden_planks/dark_wooden_planks_diff_2k.jpg',
    description: 'Dark weathered wooden planks.'
  },
  {
    id: 'tex-marble',
    name: 'White Marble',
    url: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/white_marble/white_marble_diff_2k.jpg',
    description: 'Elegant white marble with grey veining.'
  },
  {
    id: 'tex-iron',
    name: 'Scratched Iron',
    url: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/scratched_iron/scratched_iron_diff_2k.jpg',
    description: 'Industrial scratched iron metal.'
  }
];
