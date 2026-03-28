import { describe, it, expect, beforeEach } from 'vitest';
import { useShaderStore } from './useShaderStore';
import type { SceneObject, Uniform } from './useShaderStore';

describe('useShaderStore', () => {
  beforeEach(() => {
    const { 
      setPrompt, 
      setSceneDescription, 
      setVertexShader, 
      setFragmentShader, 
      setActiveEditorTab
    } = useShaderStore.getState();
    
    // Reset to defaults or initial state if needed
    setPrompt('');
    setSceneDescription('');
    setVertexShader('');
    setFragmentShader('');
    setActiveEditorTab('fragment');
  });

  it('updates shaders and scene config', () => {
    const { setShaders } = useShaderStore.getState();
    
    const newVertex = 'void main() {}';
    const newFragment = 'void main() { gl_FragColor = vec4(1.0); }';
    const newUniforms: Uniform[] = [{ name: 'test', type: 'float' as const, value: 1.0 }];
    const newSceneObjects: SceneObject[] = [
      { id: '1', objectType: 'box', position: [1, 1, 1], scale: [1, 1, 1], rotation: [0, 0, 0] }
    ];

    setShaders(newVertex, newFragment, newUniforms, newSceneObjects);

    const state = useShaderStore.getState();
    expect(state.vertexShader).toBe(newVertex);
    expect(state.fragmentShader).toBe(newFragment);
    expect(state.sceneObjects).toHaveLength(1);
    expect(state.sceneObjects[0].objectType).toBe('box');
  });

  it('toggles sidebar visibility', () => {
    const { toggleSidebar } = useShaderStore.getState();
    const initialVisibility = useShaderStore.getState().isSidebarVisible;
    
    toggleSidebar();
    expect(useShaderStore.getState().isSidebarVisible).toBe(!initialVisibility);
  });
});
