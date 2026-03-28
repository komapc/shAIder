import { create } from 'zustand';

interface SceneConfig {
  objectType: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
}

interface Uniform {
  name: string;
  type: 'float' | 'vec3' | 'color';
  value: any;
  min?: number;
  max?: number;
}

interface ShaderState {
  prompt: string;
  sceneDescription: string;
  vertexShader: string;
  fragmentShader: string;
  uniforms: Uniform[];
  sceneConfig: SceneConfig;
  isLoading: boolean;
  logs: string[];
  lastError: string | null;
  isSidebarVisible: boolean;
  
  setPrompt: (prompt: string) => void;
  setSceneDescription: (description: string) => void;
  setShaders: (vertex: string, fragment: string, uniforms: Uniform[], sceneConfig: SceneConfig) => void;
  updateUniform: (name: string, value: any) => void;
  setLoading: (loading: boolean) => void;
  addLog: (log: string) => void;
  setLastError: (error: string | null) => void;
  toggleSidebar: () => void;
}

export const useShaderStore = create<ShaderState>((set) => ({
  prompt: 'A pulsing, iridescent metallic material with organic, flowing wave patterns that react to time.',
  sceneDescription: 'A mahogany wooden table with a reflective metallic cube sitting in the center. A bright point light source (sun) positioned high above and slightly to the right.',
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform float time;
    void main() {
      gl_FragColor = vec4(vUv, sin(time) * 0.5 + 0.5, 1.0);
    }
  `,
  uniforms: [
    { name: 'time', type: 'float', value: 0, min: 0, max: 10 },
  ],
  sceneConfig: {
    objectType: 'sphere',
    position: [0, 0, 0],
    scale: [1, 1, 1],
    rotation: [0, 0, 0],
  },
  isLoading: false,
  logs: [],
  lastError: null,
  isSidebarVisible: true,

  setPrompt: (prompt) => set({ prompt }),
  setSceneDescription: (sceneDescription) => set({ sceneDescription }),
  setShaders: (vertex, fragment, uniforms, sceneConfig) => 
    set({ vertexShader: vertex, fragmentShader: fragment, uniforms, sceneConfig, lastError: null }),
  updateUniform: (name, value) => set((state) => ({
    uniforms: state.uniforms.map(u => u.name === name ? { ...u, value } : u)
  })),
  setLoading: (isLoading) => set({ isLoading }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setLastError: (lastError) => set({ lastError }),
  toggleSidebar: () => set((state) => ({ isSidebarVisible: !state.isSidebarVisible })),
}));
