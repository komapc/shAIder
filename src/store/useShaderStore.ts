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
  errorDetails: string | null;
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
  setLastError: (error: string | null, details?: string | null) => void;
  setIsCompiled: (isCompiled: boolean) => void;
  clearLogs: () => void;
  toggleSidebar: () => void;
  setHeaderHeight: (height: number) => void;
  setActiveEditorTab: (tab: 'vertex' | 'fragment' | 'scene') => void;
  setObjectType: (type: string) => void;
  resetToDefault: () => void;
}

const initialState = {
  prompt: 'A highly reflective iridescent metal material that shifts through the rainbow spectrum as the camera moves.',
  sceneDescription: 'A dark minimalist room with a single glowing sphere in the center. Cinematic lighting with deep shadows and high contrast.',
  vertexShader: `
    varying vec2 vUv;
    uniform float time;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    varying vec2 vUv;
    uniform float time;
    void main() {
      vec3 color = 0.5 + 0.5 * cos(time + vUv.xyx + vec3(0, 2, 4));
      gl_FragColor = vec4(color, 1.0);
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
  errorDetails: null,
  isSidebarVisible: true,
  headerHeight: 220,
  isCompiled: true,
  activeEditorTab: 'fragment' as const,
};

export const useShaderStore = create<ShaderState>((set) => ({
  ...initialState,

  setPrompt: (prompt) => set({ prompt }),
  setSceneDescription: (sceneDescription) => set({ sceneDescription }),
  setVertexShader: (vertexShader) => set({ vertexShader, lastError: null, errorDetails: null, isCompiled: true }),
  setFragmentShader: (fragmentShader) => set({ fragmentShader, lastError: null, errorDetails: null, isCompiled: true }),
  setShaders: (vertex, fragment, uniforms, sceneObjects) => 
    set({ vertexShader: vertex, fragmentShader: fragment, uniforms, sceneObjects, lastError: null, errorDetails: null, isCompiled: true }),
  updateUniform: (name, value) => set((state) => ({
    uniforms: state.uniforms.map(u => u.name === name ? { ...u, value } : u)
  })),
  setLoading: (isLoading) => set({ isLoading, lastError: null, errorDetails: null }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setLastError: (lastError, errorDetails = null) => set({ lastError, errorDetails }),
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
  resetToDefault: () => set(initialState),
}));
