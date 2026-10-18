'use strict';

const LIBRARY_CONTEXT = `
  AVAILABLE GEOMETRIES:
  - Primitives: 'sphere', 'box' (cube), 'plane', 'torus', 'knot', 'cylinder', 'pyramid'.
  - Special: 'floor' (large flat ground plane, rotation already applied — do NOT rotate it yourself).
  - Composite: 'table', 'chair'.
  NOTE: There is no 'room' geometry. For an enclosed dark scene, use a 'floor' object plus dark ambient in the shader.
`;

const OPENROUTER_MODELS = [
  "anthropic/claude-3-5-haiku",
  "anthropic/claude-3-haiku",
  "google/gemma-2-27b-it:free",
  "meta-llama/llama-3.1-8b-instruct:free",
];

/**
 * Concatenate the text blocks of a Bedrock/Anthropic response. Newer models put a
 * "thinking" block first, so content[0].text cannot be relied on.
 * @param {{content?: Array<{type?: string, text?: string}>, completion?: string}} result
 */
function extractText(result) {
  if (Array.isArray(result?.content)) {
    return result.content.filter((b) => b && b.type === 'text' && b.text).map((b) => b.text).join('');
  }
  return result?.completion || '';
}

const LIMITS = {
  prompt: 2000,
  sceneDescription: 4000,
  shader: 20000,
  lastError: 4000,
  json: 20000,
};

// EU cross-region inference profile; Claude 3 Haiku is no longer offered in eu-central-1.
const DEFAULT_BEDROCK_MODEL = "eu.anthropic.claude-haiku-5-5";

/**
 * Validate and size-limit a client request so an anonymous caller cannot send
 * arbitrarily large prompts to a paid model. Returns { error } or { value }.
 * @param {Record<string, unknown>} body
 */
function validateRequest(body) {
  if (!body || typeof body !== 'object') return { error: 'Invalid request body' };
  const str = (key, max) => {
    const v = body[key];
    if (v === undefined || v === null || v === '') return '';
    if (typeof v !== 'string') throw new Error(`${key} must be a string`);
    if (v.length > max) throw new Error(`${key} is too long (max ${max} characters)`);
    return v;
  };
  const json = (key) => {
    const v = body[key];
    if (v === undefined || v === null || v === '') return [];
    const parsed = typeof v === 'string' ? JSON.parse(v) : v;
    if (JSON.stringify(parsed).length > LIMITS.json) throw new Error(`${key} is too large`);
    return parsed;
  };
  try {
    const value = {
      prompt: str('prompt', LIMITS.prompt),
      sceneDescription: str('sceneDescription', LIMITS.sceneDescription),
      isRefining: body.isRefining === true,
      currentVertexShader: str('currentVertexShader', LIMITS.shader),
      currentFragmentShader: str('currentFragmentShader', LIMITS.shader),
      currentUniforms: json('currentUniforms'),
      currentSceneObjects: json('currentSceneObjects'),
      lastError: str('lastError', LIMITS.lastError),
    };
    if (!value.prompt && !value.sceneDescription && !value.lastError) {
      return { error: 'No prompt provided' };
    }
    return { value };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Invalid request' };
  }
}

/**
 * @typedef {Object} ShaderRequest
 * @property {string} [prompt]
 * @property {string} [sceneDescription]
 * @property {boolean} [isRefining]
 * @property {string} [currentVertexShader]
 * @property {string} [currentFragmentShader]
 * @property {unknown} [currentUniforms]
 * @property {unknown} [currentSceneObjects]
 * @property {string} [lastError]
 */

/**
 * Build systemPrompt and userMessage strings for a shader generation request.
 * @param {ShaderRequest} params
 * @returns {{ systemPrompt: string, userMessage: string }}
 */
function buildPrompts({
  prompt = '',
  sceneDescription = '',
  isRefining = false,
  currentVertexShader = '',
  currentFragmentShader = '',
  currentUniforms = [],
  currentSceneObjects = [],
  lastError = '',
}) {
  let systemPrompt = `
    You are a concise Three.js and GLSL expert. Generate a shader and scene config from user descriptions.
    Be brief — keep shaders under 60 lines total. Verbose output causes JSON truncation.

    ${LIBRARY_CONTEXT}

    OUTPUT FORMAT — return ONLY a single JSON object with these four keys, nothing else:
    1. "vertexShader": GLSL vertex shader string (newlines escaped as \\n).
    2. "fragmentShader": GLSL fragment shader string (newlines escaped as \\n).
    3. "uniforms": [{ name, type ("float"|"color"|"texture"), value, min?, max? }]
    4. "sceneObjects": [{ id, objectType, position:[x,y,z], scale:[x,y,z], rotation:[x,y,z] }]

    JSON RULES:
    - Double quotes only. No backticks. Escape newlines as \\n. No markdown fences. No preamble.

    TEXTURE SUPPORT:
    - For a texture URL, add a uniform with type:"texture". Declare as 'uniform sampler2D name;' in GLSL.
    - Sample with texture2D(name, vUv).

    GLSL RULES:
    - No "#version" directives. No "layout(location=X)".
    - Start BOTH shaders with "precision highp float;\\n".
    - THREE.JS BUILT-IN ATTRIBUTES (never redeclare): position, normal, uv.
    - THREE.JS BUILT-IN UNIFORMS (never redeclare): projectionMatrix, modelViewMatrix, modelMatrix, viewMatrix, normalMatrix, cameraPosition.
    - Declare any custom uniform in EVERY shader that uses it.
    - Always include "time" (float) uniform if animating.

    LIGHTING GUIDE (implement in fragment shader):
    - normalMatrix * normal  → view-space normal (use for lighting/fresnel).
    - Fresnel rim: pow(1.0 - max(dot(n, viewDir), 0.0), 2.5) for glow edges.
    - For "cinematic" / "dark" scenes: use low ambient (0.03-0.08), strong rim glow, and a pulsing emissive.
  `;

  if (isRefining || lastError) {
    systemPrompt += `
    CONTEXT:
    - Current Vertex Shader: \`${currentVertexShader}\`
    - Current Fragment Shader: \`${currentFragmentShader}\`
    - Current Uniforms: ${JSON.stringify(currentUniforms)}
    - Current Scene Objects: ${JSON.stringify(currentSceneObjects)}
    ${lastError ? `- LAST ERROR: ${lastError}` : ''}
    `;
  }

  const userMessage = `
    SHADER GOAL: ${prompt || 'Maintain current visual effect'}
    SCENE GOAL: ${sceneDescription || 'Maintain current layout'}

    ${lastError ? 'The previous shader failed to compile. Fix it.' : 'Generate the JSON object now.'}
  `;

  return { systemPrompt, userMessage };
}

/**
 * Call OpenRouter API with model fallbacks and a 30s timeout per attempt.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
async function callOpenRouter(systemPrompt, userMessage) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'YOUR_KEY_HERE') {
    throw new Error('OpenRouter API Key is missing. Please update it in AWS Secrets Manager.');
  }

  let lastError = null;

  for (const model of OPENROUTER_MODELS) {
    try {
      console.log(`[API] Trying OpenRouter model: ${model}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/komapc/shAIder',
          'X-Title': 'shAIder',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      if (!data.choices?.[0]) {
        throw new Error('OpenRouter returned an empty choices array.');
      }
      return data.choices[0].message.content;
    } catch (err) {
      console.warn(`[API] Model ${model} failed:`, err.name === 'AbortError' ? 'Timeout' : err.message);
      lastError = err;
      if (err.name !== 'AbortError') {
        await new Promise(res => setTimeout(res, 1000));
      }
    }
  }

  throw new Error(`Connectivity Error: Could not reach OpenRouter. (Last error: ${lastError.message})`);
}

/**
 * Extract and normalize shader JSON from a raw AI response string.
 * Returns the parsed shader data object, or throws on failure.
 * @param {string} rawContent
 * @returns {object}
 */
function extractShaderJson(rawContent) {
  if (!rawContent) throw new Error('No response from any AI provider.');

  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return a valid JSON object.');

  let jsonString = jsonMatch[0].trim();

  // Fix backtick-quoted multiline strings (common AI formatting mistake)
  jsonString = jsonString.replace(/:\s*`([\s\S]*?)`/g, (_match, content) => {
    const escaped = content
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/"/g, '\\"');
    return `: "${escaped}"`;
  });

  // Strip control characters, preserving whitespace
  jsonString = jsonString.replace(/[ --]/g, (c) =>
    (c === '\n' || c === '\r' || c === '\t') ? c : ''
  );

  let shaderData;
  try {
    shaderData = JSON.parse(jsonString);
  } catch (firstErr) {
    try {
      shaderData = JSON.parse(jsonString.replace(/`/g, '"'));
    } catch {
      throw new Error(`Failed to parse generated JSON: ${firstErr.message}`);
    }
  }

  // Normalize uniforms from object-map to array (some models return objects instead of arrays)
  if (shaderData.uniforms && !Array.isArray(shaderData.uniforms)) {
    shaderData.uniforms = Object.entries(shaderData.uniforms).map(([name, cfg]) => ({
      name,
      type: cfg.type === 't' ? 'texture' : cfg.type,
      value: cfg.value,
      min: cfg.min,
      max: cfg.max,
    }));
  }

  // Normalize sceneObjects from object-map to array
  if (shaderData.sceneObjects && !Array.isArray(shaderData.sceneObjects)) {
    shaderData.sceneObjects = Object.entries(shaderData.sceneObjects).map(([id, cfg]) => ({
      id,
      ...cfg,
    }));
  }

  return shaderData;
}

module.exports = { buildPrompts, callOpenRouter, extractShaderJson, validateRequest, extractText, DEFAULT_BEDROCK_MODEL, LIMITS };
