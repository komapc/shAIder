export interface LibraryObject {
  id: string;
  name: string;
  type: 'sphere' | 'box' | 'plane' | 'torus' | 'knot';
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
];

export const MATERIAL_LIBRARY: LibraryMaterial[] = [
  { 
    id: 'iridescent', 
    name: 'Iridescent Metal', 
    prompt: 'A pulsing, iridescent metallic material with organic, flowing wave patterns that react to time.',
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
    prompt: 'Moving voronoi cellular pattern with sharp edges and shifting colors based on distance to centers.',
    description: 'Geometric organic cells'
  },
];

export const TEXTURE_LIBRARY: LibraryTexture[] = [
  { id: 'noise', name: 'Perlin Noise', url: 'https://threejs.org/examples/textures/disturb.jpg', description: 'Standard noise for displacement' },
  { id: 'metal', name: 'Brushed Metal', url: 'https://threejs.org/examples/textures/uv_grid_opengl.jpg', description: 'UV Test Grid (Placeholder)' },
];
