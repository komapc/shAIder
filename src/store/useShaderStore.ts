import { create } from 'zustand';

export interface SceneObject {
  id: string;
  objectType: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color?: string;
}

export interface Uniform {
  name: string;
  type: 'float' | 'vec3' | 'color' | 'texture';
  value: unknown;
  min?: number;
  max?: number;
}

interface ShaderState {
  prompt: string;
  sceneDescription: string;
  vertexShader: string;
  fragmentShader: string;
  uniforms: Uniform[];
  sceneObjects: SceneObject[];
  isLoading: boolean;
  logs: string[];
  lastError: string | null;
  isSidebarVisible: boolean;
  headerHeight: number;
  isCompiled: boolean;
  activeEditorTab: 'vertex' | 'fragment' | 'scene';
  
  setPrompt: (prompt: string) => void;
  setSceneDescription: (description: string) => void;
  setVertexShader: (code: string) => void;
  setFragmentShader: (code: string) => void;
  setShaders: (vertex: string, fragment: string, uniforms: Uniform[], sceneObjects: SceneObject[]) => void;
  updateUniform: (name: string, value: unknown) => void;
  setLoading: (loading: boolean) => void;
  addLog: (log: string) => void;
  setLastError: (error: string | null) => void;
  setIsCompiled: (isCompiled: boolean) => void;
  clearLogs: () => void;
  toggleSidebar: () => void;
  setHeaderHeight: (height: number) => void;
  setActiveEditorTab: (tab: 'vertex' | 'fragment' | 'scene') => void;
  setObjectType: (type: string) => void;
}

export const useShaderStore = create<ShaderState>((set) => ({
  prompt: 'Apply a pulsing, iridescent metallic material with organic, flowing wave patterns that react to time specifically to the cube object.',
  sceneDescription: 'A mahogany wooden table with a reflective metallic cube sitting in the center. Bright, soft ambient global illumination with a main point light (sun) high above and to the right. The camera is positioned at a distance, providing a cinematic wide-angle view of the entire scene.',
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
  sceneObjects: [
    {
      id: 'main-obj',
      objectType: 'sphere',
      position: [0, 0, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
    }
  ],
  isLoading: false,
  logs: [],
  lastError: null,
  isSidebarVisible: true,
  headerHeight: 220,
  isCompiled: true,
  activeEditorTab: 'fragment',

  setPrompt: (prompt) => set({ prompt }),
  setSceneDescription: (sceneDescription) => set({ sceneDescription }),
  setVertexShader: (vertexShader) => set({ vertexShader, lastError: null, isCompiled: true }),
  setFragmentShader: (fragmentShader) => set({ fragmentShader, lastError: null, isCompiled: true }),
  setShaders: (vertex, fragment, uniforms, sceneObjects) => 
    set({ vertexShader: vertex, fragmentShader: fragment, uniforms, sceneObjects, lastError: null, isCompiled: true }),
  updateUniform: (name, value) => set((state) => ({
    uniforms: state.uniforms.map(u => u.name === name ? { ...u, value } : u)
  })),
  setLoading: (isLoading) => set({ isLoading }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setLastError: (lastError) => set({ lastError }),
  setIsCompiled: (isCompiled) => set({ isCompiled }),
  clearLogs: () => set({ logs: [] }),
  toggleSidebar: () => set((state) => ({ isSidebarVisible: !state.isSidebarVisible })),
  setHeaderHeight: (headerHeight) => set({ headerHeight }),
  setActiveEditorTab: (activeEditorTab) => set({ activeEditorTab }),
  setObjectType: (objectType) => set((state) => ({ 
    sceneObjects: state.sceneObjects.map(obj => 
      obj.id === 'main-obj' ? { ...obj, objectType } : obj
    )
  })),
}));
