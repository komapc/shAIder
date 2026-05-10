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
  prompt: 'A dark cinematic material with a neon blue rim glow and subtle pulsing emissive light along the edges.',
  sceneDescription: 'A single glowing cube centered in a dark void, slightly rotated to show depth. Add a floor plane beneath it.',
  vertexShader: `precision highp float;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;
uniform float time;

void main() {
  vUv = uv;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewPos = -mvPos.xyz;
  gl_Position = projectionMatrix * mvPos;
}`,
  fragmentShader: `precision highp float;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;
uniform float time;
uniform float glowIntensity;
uniform vec3 glowColor;

void main() {
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(vViewPos);

  float fresnel = 1.0 - max(dot(n, viewDir), 0.0);
  float rim = pow(fresnel, 2.5);
  float pulse = 0.75 + 0.25 * sin(time * 1.5);

  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
  float diffuse = max(dot(n, lightDir), 0.0) * 0.12;

  vec3 base = vec3(0.02, 0.02, 0.05) * (0.08 + diffuse);
  vec3 emissive = glowColor * (rim * glowIntensity + 0.08) * pulse;

  gl_FragColor = vec4(base + emissive, 1.0);
}`,
  uniforms: [
    { name: 'time',          type: 'float' as const, value: 0,          min: 0, max: 10 },
    { name: 'glowIntensity', type: 'float' as const, value: 2.5,        min: 0, max: 5  },
    { name: 'glowColor',     type: 'color' as const, value: '#2266ff'                   },
  ],
  sceneObjects: [
    {
      id: 'cube-01',
      objectType: 'box',
      position: [0, 0.5, 0] as [number, number, number],
      scale:    [1, 1, 1]   as [number, number, number],
      rotation: [0, 0.4, 0] as [number, number, number],
    },
    {
      id: 'floor-01',
      objectType: 'floor',
      position: [0, 0, 0] as [number, number, number],
      scale:    [1, 1, 1] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    },
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
