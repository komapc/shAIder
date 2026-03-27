import { describe, it, expect, beforeEach } from 'vitest';
import { useShaderStore } from './useShaderStore';

/**
 * Unit tests for the Zustand shader store.
 * Verifies state management for prompt, shaders, and loading status.
 */
describe('useShaderStore', () => {
  beforeEach(() => {
    // Reset store to initial state if needed, 
    // though Zustand's state persists between tests.
  });

  it('should update the prompt', () => {
    const { setPrompt } = useShaderStore.getState();
    setPrompt('A metallic ball');
    expect(useShaderStore.getState().prompt).toBe('A metallic ball');
  });

  it('should update shaders and scene configuration', () => {
    const { setShaders } = useShaderStore.getState();
    const newVertex = 'void main() { gl_Position = vec4(1.0); }';
    const newFragment = 'void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }';
    const newUniforms = [{ name: 'test', type: 'float', value: 0.5 }];
    const newSceneConfig = {
      objectType: 'cube',
      position: [1, 1, 1] as [number, number, number],
      scale: [2, 2, 2] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    };

    setShaders(newVertex, newFragment, newUniforms, newSceneConfig);

    const state = useShaderStore.getState();
    expect(state.vertexShader).toBe(newVertex);
    expect(state.fragmentShader).toBe(newFragment);
    expect(state.uniforms[0].name).toBe('test');
    expect(state.sceneConfig.objectType).toBe('cube');
  });

  it('should manage loading state and logs', () => {
    const { setLoading, addLog } = useShaderStore.getState();
    
    setLoading(true);
    expect(useShaderStore.getState().isLoading).toBe(true);
    
    addLog('Compiling shader...');
    expect(useShaderStore.getState().logs).toContain('Compiling shader...');
  });
});
