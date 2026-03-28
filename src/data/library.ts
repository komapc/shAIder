export interface LibraryObject {
  id: string;
  name: string;
  type: 'sphere' | 'box' | 'plane' | 'torus' | 'knot' | 'table' | 'chair' | 'cylinder' | 'pyramid';
  description: string;
}

export interface LibraryMaterial {
  id: string;
  name: string;
  prompt: string;
  description: string;
}

export interface LibraryTexture {
  id: string;
  name: string;
  url: string;
  description: string;
}

export const OBJECT_LIBRARY: LibraryObject[] = [
  { id: 'sphere', name: 'Sphere', type: 'sphere', description: 'Smooth, round 3D ball' },
  { id: 'box', name: 'Cube', type: 'box', description: 'Standard 6-sided box' },
  { id: 'plane', name: 'Plane', type: 'plane', description: 'Flat 2D surface in 3D space' },
  { id: 'torus', name: 'Torus', type: 'torus', description: 'Donut-shaped ring' },
  { id: 'knot', name: 'Torus Knot', type: 'knot', description: 'Complex intertwined knot' },
  { id: 'table', name: 'Table', type: 'table', description: 'A basic 4-legged table' },
  { id: 'chair', name: 'Chair', type: 'chair', description: 'A basic chair with a backrest' },
  { id: 'cylinder', name: 'Cylinder', type: 'cylinder', description: 'A classic tube or pillar' },
  { id: 'pyramid', name: 'Pyramid', type: 'pyramid', description: 'A sharp 4-sided pyramid' },
];

export const MATERIAL_LIBRARY: LibraryMaterial[] = [
  { 
    id: 'iridescent', 
    name: 'Iridescent Metal', 
    prompt: 'Apply a pulsing, iridescent metallic material with organic, flowing wave patterns that react to time specifically to the cube object.',
    description: 'Shiny, color-shifting metal'
  },
  { 
    id: 'lava', 
    name: 'Molten Lava', 
    prompt: 'Glowing molten lava with dark crusty rocks. Use noise for movement and a hot orange-red glow.',
    description: 'Animated hot magma effect'
  },
  { 
    id: 'glass', 
    name: 'Frosted Glass', 
    prompt: 'Semi-transparent frosted glass with blurred light refraction and soft white highlights.',
    description: 'Blurry translucent surface'
  },
  { 
    id: 'hologram', 
    name: 'Digital Hologram', 
    prompt: 'Blue glowing hologram with scanning lines, digital noise, and flickering transparency.',
    description: 'Sci-fi holographic projection'
  },
  { 
    id: 'voronoi', 
    name: 'Voronoi Cells', 
    prompt: 'Moving voronoi cellular patterns with sharp edges and shifting colors based on distance to centers.',
    description: 'Geometric organic cells'
  },
];

export const TEXTURE_LIBRARY: LibraryTexture[] = [
  { id: 'noise', name: 'Disturb Noise', url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/disturb.jpg', description: 'Standard noise for displacement' },
  { id: 'lavatile', name: 'Lava Rock', url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/lava/lavatile.jpg', description: 'Hot lava texture' },
  { id: 'brick', name: 'Brick Wall', url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/brick_diffuse.jpg', description: 'Classic red brick' },
  { id: 'carbon', name: 'Carbon Fiber', url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/carbon/Carbon.png', description: 'High-tech weave' },
];
