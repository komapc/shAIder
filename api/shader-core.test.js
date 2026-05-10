// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPrompts, extractShaderJson } from './shader-core.js';

const MINIMAL_SHADER_DATA = {
  vertexShader: 'precision highp float;\\nvoid main() { gl_Position = vec4(0.0); }',
  fragmentShader: 'precision highp float;\\nvoid main() { gl_FragColor = vec4(1.0); }',
  uniforms: [{ name: 'time', type: 'float', value: 0 }],
  sceneObjects: [{ id: 'obj1', objectType: 'sphere', position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] }],
};

describe('extractShaderJson', () => {
  it('parses a clean JSON response', () => {
    const raw = JSON.stringify(MINIMAL_SHADER_DATA);
    const result = extractShaderJson(raw);
    expect(result.vertexShader).toBe(MINIMAL_SHADER_DATA.vertexShader);
    expect(result.uniforms).toHaveLength(1);
    expect(result.sceneObjects).toHaveLength(1);
  });

  it('ignores preamble text before the JSON object', () => {
    const raw = `Here is your shader:\n\n${JSON.stringify(MINIMAL_SHADER_DATA)}\n\nLet me know if you need changes.`;
    const result = extractShaderJson(raw);
    expect(result.vertexShader).toBe(MINIMAL_SHADER_DATA.vertexShader);
  });

  it('handles backtick-quoted multiline string values from the AI', () => {
    const raw = `{"vertexShader": \`void main() {}\`,"fragmentShader": \`void main() {}\`,"uniforms": [],"sceneObjects": []}`;
    const result = extractShaderJson(raw);
    expect(result.vertexShader).toBe('void main() {}');
    expect(result.fragmentShader).toBe('void main() {}');
  });

  it('normalizes uniforms returned as an object-map instead of an array', () => {
    const withObjectUniforms = {
      ...MINIMAL_SHADER_DATA,
      uniforms: {
        time: { type: 'float', value: 0, min: 0, max: 10 },
        color: { type: 'color', value: '#ff0000' },
      },
    };
    const result = extractShaderJson(JSON.stringify(withObjectUniforms));
    expect(Array.isArray(result.uniforms)).toBe(true);
    expect(result.uniforms).toHaveLength(2);
    expect(result.uniforms[0].name).toBe('time');
    expect(result.uniforms[1].name).toBe('color');
  });

  it('normalizes sceneObjects returned as an object-map instead of an array', () => {
    const withObjectScene = {
      ...MINIMAL_SHADER_DATA,
      sceneObjects: {
        sphere1: { objectType: 'sphere', position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] },
        box1: { objectType: 'box', position: [2, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] },
      },
    };
    const result = extractShaderJson(JSON.stringify(withObjectScene));
    expect(Array.isArray(result.sceneObjects)).toBe(true);
    expect(result.sceneObjects).toHaveLength(2);
    expect(result.sceneObjects[0].id).toBe('sphere1');
    expect(result.sceneObjects[1].id).toBe('box1');
  });

  it('maps texture uniform type "t" to "texture" during normalization', () => {
    const withObjectUniforms = {
      ...MINIMAL_SHADER_DATA,
      uniforms: { woodTex: { type: 't', value: 'https://example.com/wood.jpg' } },
    };
    const result = extractShaderJson(JSON.stringify(withObjectUniforms));
    expect(result.uniforms[0].type).toBe('texture');
  });

  it('throws on empty/null rawContent', () => {
    expect(() => extractShaderJson('')).toThrow('No response');
    expect(() => extractShaderJson(null)).toThrow('No response');
  });

  it('throws when no JSON object is present in the response', () => {
    expect(() => extractShaderJson('Sorry, I cannot help with that.')).toThrow('valid JSON');
  });

  it('throws on malformed JSON', () => {
    expect(() => extractShaderJson('{ "vertexShader": missing quotes }')).toThrow();
  });
});

describe('buildPrompts', () => {
  it('returns systemPrompt and userMessage strings', () => {
    const { systemPrompt, userMessage } = buildPrompts({ prompt: 'glowing sphere' });
    expect(typeof systemPrompt).toBe('string');
    expect(typeof userMessage).toBe('string');
    expect(systemPrompt.length).toBeGreaterThan(100);
    expect(userMessage).toContain('glowing sphere');
  });

  it('includes current shader context when isRefining is true', () => {
    const { systemPrompt } = buildPrompts({
      prompt: 'make it blue',
      isRefining: true,
      currentVertexShader: 'void main() {}',
      currentFragmentShader: 'void main() {}',
    });
    expect(systemPrompt).toContain('void main() {}');
  });

  it('includes LAST ERROR section when lastError is provided', () => {
    const { systemPrompt, userMessage } = buildPrompts({
      prompt: '',
      lastError: 'undeclared identifier: uv',
    });
    expect(systemPrompt).toContain('undeclared identifier: uv');
    expect(userMessage).toContain('Fix it');
  });

  it('does not include context section when isRefining is false and no lastError', () => {
    const { systemPrompt } = buildPrompts({ prompt: 'new scene' });
    expect(systemPrompt).not.toContain('Current Vertex Shader');
  });

  it('uses fallback text when prompt is empty', () => {
    const { userMessage } = buildPrompts({ prompt: '' });
    expect(userMessage).toContain('Maintain current visual effect');
  });
});
