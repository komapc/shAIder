const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

/**
 * AWS Lambda function to generate or refine shader code from a text prompt.
 */
exports.handler = async (event) => {
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "eu-central-1" });
  
  try {
    const body = JSON.parse(event.body || "{}");
    console.log("Request Body:", JSON.stringify(body, null, 2));

    const { 
      prompt, 
      sceneDescription = "",
      isRefining = false, 
      currentVertexShader = "", 
      currentFragmentShader = "", 
      currentUniforms = [],
      lastError = "",
      modelId = "anthropic.claude-3-haiku-20240307-v1:0" 
    } = body;
    
    if (!prompt && !sceneDescription && !lastError) {
      return { statusCode: 400, body: JSON.stringify({ error: "No prompt provided" }) };
    }

    // Comprehensive System Prompt with strict GLSL rules
    let systemPrompt = `
      You are an expert Three.js and GLSL developer.
      Your task is to generate both a GLSL shader and a 3D scene configuration based on user descriptions.

      OUTPUT FORMAT:
      You MUST return a strict JSON object with EXACTLY these four keys:
      1. "vertexShader": A GLSL vertex shader string.
      2. "fragmentShader": A GLSL fragment shader string.
      3. "uniforms": An array of objects: { name, type, value, min, max }.
      4. "sceneConfig": An object describing the primary object: { objectType, position, scale, rotation }.

      CRITICAL GLSL RULES:
      - DO NOT include "#version" directives. Three.js will add them automatically.
      - DO NOT use "layout (location = X)" syntax. Use standard "attribute" or "varying" for WebGL 1.0/2.0 compatibility in Three.js.
      - In the Fragment Shader, always declare "precision highp float;".
      - Ensure "time" (float) and "resolution" (vec2) uniforms are declared if used.
      - If you need a color, use a "vec3" and declare it in the uniforms as type: 'color' with a hex string value.

      SCENE CONFIGURATION:
      - objectType: One of 'sphere', 'box', 'plane', 'torus', 'knot'.
      - position: [x, y, z] (array of 3 numbers)
      - scale: [x, y, z] (array of 3 numbers)
      - rotation: [x, y, z] (array of 3 numbers in radians)

      UNIFORM TYPES:
      - 'float': value is a number.
      - 'vec3': value is [x, y, z].
      - 'color': value is a hex string (e.g., "#ff0000").
    `;

    // Add Context
    if (isRefining || lastError) {
      systemPrompt += `
      CONTEXT:
      - Current Vertex Shader: \`${currentVertexShader}\`
      - Current Fragment Shader: \`${currentFragmentShader}\`
      - Current Uniforms: ${JSON.stringify(currentUniforms)}
      ${lastError ? `- LAST ERROR: ${lastError}` : ""}
      `;
    }

    const userMessage = `
      SHADER GOAL: ${prompt || "Maintain current visual effect"}
      SCENE GOAL: ${sceneDescription || "Maintain current layout"}
      
      ${lastError ? "The previous shader failed to compile with the error above. Please fix it by following the CRITICAL GLSL RULES carefully." : "Generate the JSON object now."}
    `;

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
    
    const rawContent = result.content[0].text;
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
        throw new Error("AI did not return a valid JSON object: " + rawContent);
    }

    const shaderData = JSON.parse(jsonMatch[0]);

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
    console.error("CRITICAL ERROR in generate-shader handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", message: error.message, stack: error.stack }),
    };
  }
};
