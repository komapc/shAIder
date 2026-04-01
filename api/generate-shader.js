const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

/**
 * Fallback to OpenRouter using a stable model
 */
async function callOpenRouter(systemPrompt, userMessage) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "YOUR_KEY_HERE") {
    throw new Error("OpenRouter API Key is missing. Please update it in AWS Secrets Manager.");
  }

  // Priority: Stable Paid (Haiku) -> Free Models
  const models = [
    "anthropic/claude-3-haiku",      // Most stable, very cheap
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-3-8b-instruct:free"
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
      LIBRARY MATERIALS:
      - 'Iridescent Metal': Pulsing, flowing wave patterns.
      - 'Molten Lava': Glowing orange-red noise-based magma.
      - 'Frosted Glass': Semi-transparent blurred refraction.
      - 'Digital Hologram': Sci-fi blue glowing flickers.
      - 'Voronoi Cells': Shifting geometric organic patterns.

      AVAILABLE GEOMETRIES:
      - Primitives: 'sphere', 'box' (or 'cube'), 'plane', 'torus', 'knot', 'cylinder', 'pyramid', 'floor'.
      - Complex (Composite): 'table', 'chair'.
    `;

    let systemPrompt = `
      You are an expert Three.js and GLSL developer.
      Your task is to generate both a GLSL shader and a 3D scene configuration based on user descriptions.

      ${libraryContext}

      OUTPUT FORMAT:
      You MUST return a strict JSON object with EXACTLY these four keys:
      1. "vertexShader": A GLSL vertex shader string.
      2. "fragmentShader": A GLSL fragment shader string.
      3. "uniforms": An array of objects: { name, type, value, min, max }.
      4. "sceneObjects": An array of objects: { id, objectType, position, scale, rotation, color }.

      CRITICAL JSON RULES:
      - Use standard double quotes (") for all strings.
      - DO NOT use backticks (\`) for multi-line strings.
      - Escape newlines as \\n.
      - The response must be a SINGLE valid JSON object.
      - Return ONLY the JSON object. No markdown code blocks, no preamble.

      TEXTURE SUPPORT:
      - If user provides a URL for a texture, create a uniform with type: 'texture' and value: 'the_url'.
      - In the GLSL code, declare it as 'uniform sampler2D name;'.
      - Use texture2D(name, vUv) to sample it.

      CRITICAL GLSL RULES:
      - DO NOT include "#version" directives.
      - DO NOT use "layout (location = X)" syntax.
      - ALWAYS include "precision highp float;" at the top of BOTH the Vertex and Fragment shaders.
      - THREE.JS BUILT-INS (DO NOT DECLARE THESE): position (vec3), normal (vec3), uv (vec2), projectionMatrix (mat4), modelViewMatrix (mat4), cameraPosition (vec3).
      - Uniforms (like "time", "resolution", or custom ones) MUST be declared in BOTH the Vertex and Fragment shaders if they are used in both.
      - Ensure "time" (float) and "resolution" (vec2) uniforms are declared if used.
      - LIGHTING: Implement lighting manually (Phong, Lambert, or custom) using 'cameraPosition' and normals if needed.
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
          max_tokens: 4000,
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
