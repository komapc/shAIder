const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

/**
 * Fallback to OpenRouter using a stable model
 */
async function callOpenRouter(systemPrompt, userMessage) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "YOUR_KEY_HERE") {
    throw new Error("OpenRouter API Key is missing. Please update it in AWS Secrets Manager.");
  }

  // Priority: best JSON reliability first, free tiers as last resort
  const models = [
    "anthropic/claude-3-5-haiku",          // Best JSON adherence, cheap
    "anthropic/claude-3-haiku",            // Fallback paid
    "google/gemma-2-27b-it:free",          // Larger free model, better JSON
    "meta-llama/llama-3.1-8b-instruct:free"
  ];

  let lastError = null;

  for (const model of models) {
    try {
      console.log(`[API] Trying OpenRouter model: ${model}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/komapc/shAIder",
          "X-Title": "shAIder local"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!data.choices || !data.choices[0]) {
        throw new Error("OpenRouter returned an empty choices array.");
      }

      return data.choices[0].message.content;
    } catch (err) {
      console.warn(`[API] Model ${model} failed:`, err.name === 'AbortError' ? 'Timeout' : err.message);
      lastError = err;
      // If it's a network/fetch error, wait a moment before trying next model
      if (err.name !== 'AbortError') {
          await new Promise(res => setTimeout(res, 1000));
      }
    }
  }

  throw new Error(`Connectivity Error: Could not reach OpenRouter. Please check your internet connection or if OpenRouter is down. (Last error: ${lastError.message})`);
}

/**
 * AWS Lambda function to generate or refine shader code from a text prompt.
 */
exports.handler = async (event) => {
  const region = process.env.AWS_REGION || "eu-central-1";
  const client = new BedrockRuntimeClient({ region });
  
  try {
    const body = JSON.parse(event.body || "{}");
    const { 
      prompt, 
      sceneDescription = "",
      isRefining = false, 
      currentVertexShader = "", 
      currentFragmentShader = "", 
      currentUniforms = [],
      currentSceneObjects = [],
      lastError = "",
      modelId = "anthropic.claude-3-haiku-20240307-v1:0" 
    } = body;
    
    if (!prompt && !sceneDescription && !lastError) {
      return { 
        statusCode: 400, 
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "No prompt provided" }) 
      };
    }

    const libraryContext = `
      AVAILABLE GEOMETRIES:
      - Primitives: 'sphere', 'box' (cube), 'plane', 'torus', 'knot', 'cylinder', 'pyramid'.
      - Special: 'floor' (large flat ground plane, rotation already applied — do NOT rotate it yourself).
      - Composite: 'table', 'chair'.
      NOTE: There is no 'room' geometry. For an enclosed dark scene, use a 'floor' object plus dark ambient in the shader.
    `;

    let systemPrompt = `
      You are a concise Three.js and GLSL expert. Generate a shader and scene config from user descriptions.
      Be brief — keep shaders under 60 lines total. Verbose output causes JSON truncation.

      ${libraryContext}

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
      - normalMatrix * normal  →  view-space normal (use for lighting/fresnel).
      - (modelMatrix * vec4(position,1.0)).xyz  →  world-space position (pass from vertex).
      - Fresnel rim: pow(1.0 - max(dot(n, viewDir), 0.0), 2.5) for glow edges.
      - For "cinematic" / "dark" scenes: use low ambient (0.03–0.08), strong rim glow, and a pulsing emissive.
      - For "glowing" objects: combine rim fresnel + emissive + subtle diffuse from a fixed light direction.
    `;

    if (isRefining || lastError) {
      systemPrompt += `
      CONTEXT:
      - Current Vertex Shader: \`${currentVertexShader}\`
      - Current Fragment Shader: \`${currentFragmentShader}\`
      - Current Uniforms: ${JSON.stringify(currentUniforms)}
      - Current Scene Objects: ${JSON.stringify(currentSceneObjects)}
      ${lastError ? `- LAST ERROR: ${lastError}` : ""}
      `;
    }

    const userMessage = `
      SHADER GOAL: ${prompt || "Maintain current visual effect"}
      SCENE GOAL: ${sceneDescription || "Maintain current layout"}
      
      ${lastError ? "The previous shader failed to compile. Fix it." : "Generate the JSON object now."}
    `;

    let rawContent = "";
    
    // Try Bedrock first, fallback to OpenRouter on failure
    try {
        console.log("[API] Attempting Bedrock...");
        const payload = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 6000,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        };

        const command = new InvokeModelCommand({
          contentType: "application/json",
          accept: "application/json",
          modelId: modelId,
          body: JSON.stringify(payload),
        });

        const response = await client.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.body));
        
        if (result.content && Array.isArray(result.content)) {
            rawContent = result.content[0].text;
        } else if (result.completion) {
            rawContent = result.completion;
        }
    } catch (bedrockError) {
        console.warn("[API] Bedrock failed, trying fallback:", bedrockError.message);
        rawContent = await callOpenRouter(systemPrompt, userMessage);
    }

    if (!rawContent) {
        throw new Error("No response from any AI provider.");
    }

    // Aggressive JSON extraction and fixing
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("AI did not return a valid JSON object.");
    }

    let jsonString = jsonMatch[0].trim();
    
    // Fix common AI formatting errors like "key": `value`
    jsonString = jsonString.replace(/:\s*`([\s\S]*?)`/g, (match, content) => {
        const escaped = content
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/"/g, '\\"');
        return `: "${escaped}"`;
    });

    jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
        return c === '\n' || c === '\r' || c === '\t' ? c : '';
    });
    
    let shaderData;
    try {
        shaderData = JSON.parse(jsonString);
    } catch (parseError) {
        console.error("[API] JSON Parse Error. String attempted:", jsonString);
        try {
            shaderData = JSON.parse(jsonString.replace(/`/g, '"'));
        } catch (secondError) {
            throw new Error(`Failed to parse generated JSON: ${parseError.message}`);
        }
    }

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify(shaderData),
    };

  } catch (error) {
    console.error("[API] CRITICAL ERROR:", error);
    return {
      statusCode: 500,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ 
        error: "Internal Server Error", 
        message: error.message
      }),
    };
  }
};
