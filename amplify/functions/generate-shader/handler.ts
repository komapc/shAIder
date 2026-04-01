import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

/**
 * Fallback to OpenRouter using a stable model
 */
async function callOpenRouter(systemPrompt: string, userMessage: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "YOUR_KEY_HERE") {
    throw new Error("OpenRouter API Key is missing.");
  }

  const models = [
    "anthropic/claude-3-haiku",
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-3-8b-instruct:free"
  ];

  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || response.statusText);
      return data.choices[0].message.content;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export const handler = async (event: any) => {
  const region = process.env.AWS_REGION || "eu-central-1";
  const client = new BedrockRuntimeClient({ region });
  
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { 
      prompt, 
      sceneDescription = "",
      isRefining = false, 
      currentVertexShader = "", 
      currentFragmentShader = "", 
      currentUniforms = [],
      currentSceneObjects = [],
      lastError = ""
    } = body;

    const libraryContext = `
      LIBRARY MATERIALS: 'Iridescent Metal', 'Molten Lava', 'Frosted Glass', 'Digital Hologram', 'Voronoi Cells'.
      AVAILABLE GEOMETRIES: 'sphere', 'box', 'plane', 'torus', 'knot', 'cylinder', 'pyramid', 'floor', 'table', 'chair'.
      AVAILABLE CC0 TEXTURES (use these exact URLs for 'texture' type uniforms):
      - wood: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/dark_wooden_planks/dark_wooden_planks_diff_2k.jpg
      - marble: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/white_marble/white_marble_diff_2k.jpg
      - iron: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/scratched_iron/scratched_iron_diff_2k.jpg
    `;

    let systemPrompt = `
      You are an expert Three.js and GLSL developer. Your goal is to generate high-quality, efficient GLSL shaders and a matching 3D scene configuration in JSON format.
      
      ${libraryContext}
      
      STRICT OUTPUT FORMAT (JSON ONLY):
      {
        "vertexShader": "string",
        "fragmentShader": "string",
        "uniforms": [
          { "name": "string", "type": "float" | "color" | "texture", "value": any, "min": number, "max": number }
        ],
        "sceneObjects": [
          { "id": "string", "objectType": "string", "position": [x,y,z], "scale": [x,y,z], "rotation": [x,y,z] }
        ]
      }
      
      CORE RULES:
      1. NO #version directive.
      2. ALWAYS include 'precision highp float;' at the top of BOTH shaders.
      3. THREE.JS BUILT-INS (DO NOT DECLARE THESE, THEY ARE PREPENDED BY THREE.JS):
         - Attributes: position (vec3), normal (vec3), uv (vec2)
         - Matrices: projectionMatrix (mat4), modelViewMatrix (mat4), viewMatrix (mat4), modelMatrix (mat4), normalMatrix (mat3)
         - Camera: cameraPosition (vec3)
         - Varyings: vUv (if you declare it in vertex and pass to fragment)
      4. UNIFORMS:
         - Common uniforms like 'time' (float) should be included in the 'uniforms' array.
         - If a custom uniform is used in both shaders, it MUST be declared in both.
         - 'resolution' should be a vec2 representing the viewport size.
      5. TEXTURES: Only use the provided CC0 Texture URLs. Type must be 'texture'. Declared as 'uniform sampler2D name;'.
      6. ARRAYS: 'uniforms' and 'sceneObjects' MUST be arrays.
      7. JSON: Return ONLY the JSON object. No markdown code blocks, no preamble.
      8. COORDINATES: Three.js uses a right-handed coordinate system. Y is up.
      9. LIGHTING: Since this is a ShaderMaterial, you must implement lighting manually in the fragment shader if desired (using normals, cameraPosition, etc.).
    `;

    if (isRefining || (lastError && lastError.trim() !== "")) {
      systemPrompt += `
      ### TASK: REFINEMENT / BUG FIX
      You are modifying an existing scene.
      
      CURRENT STATE:
      - Vertex Shader: \n${currentVertexShader}\n
      - Fragment Shader: \n${currentFragmentShader}\n
      - Uniforms: ${currentUniforms}
      - Scene Objects: ${currentSceneObjects}
      
      ${lastError ? `FAILED WITH ERROR: ${lastError}\nINSTRUCTION: Analyze this error and fix the code. If it is a redefinition error, remove the extra declaration.` : "INSTRUCTION: Update the scene based on the user's new request below."}
      `;
    } else {
      systemPrompt += `
      ### TASK: NEW GENERATION
      Create a complete scene from scratch based on the user request. Ensure shaders are visually interesting and use the provided libraries.
      `;
    }

    const userMessage = `SHADER: ${prompt}\nSCENE: ${sceneDescription}`;

    let rawContent = "";
    try {
        const payload = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        };

        const command = new InvokeModelCommand({
          contentType: "application/json",
          accept: "application/json",
          modelId: "anthropic.claude-3-haiku-20240307-v1:0",
          body: JSON.stringify(payload),
        });

        const response = await client.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.body));
        rawContent = result.content?.[0]?.text || result.completion;
    } catch (err) {
        rawContent = await callOpenRouter(systemPrompt, userMessage);
    }

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.log("Raw AI Content (failed JSON match):", rawContent);
        throw new Error("AI did not return valid JSON");
    }
    
    // Aggressive clean: handle cases where AI might use backticks for multiline strings
    let jsonString = jsonMatch[0].trim();
    jsonString = jsonString.replace(/:\s*`([\s\S]*?)`/g, (m, c) => `: "${c.replace(/\n/g, '\\n').replace(/"/g, '\\"')}"`);
    
    try {
        const shaderData = JSON.parse(jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""));
        
        // Normalization Step: Ensure uniforms and sceneObjects are arrays
        if (shaderData.uniforms && !Array.isArray(shaderData.uniforms)) {
            shaderData.uniforms = Object.entries(shaderData.uniforms).map(([name, config]: [string, any]) => ({
                name,
                type: config.type === 't' ? 'texture' : config.type,
                value: config.value,
                min: config.min,
                max: config.max
            }));
        }
        
        if (shaderData.sceneObjects && !Array.isArray(shaderData.sceneObjects)) {
            shaderData.sceneObjects = Object.entries(shaderData.sceneObjects).map(([id, config]: [string, any]) => ({
                id,
                ...config
            }));
        }

        return JSON.stringify(shaderData);
    } catch (parseErr: any) {
        console.log("Raw AI Content (failed parse):", rawContent);
        console.log("Cleaned JSON String:", jsonString);
        throw new Error(`JSON Parse Error: ${parseErr.message}`);
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};
