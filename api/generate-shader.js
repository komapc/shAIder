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
      currentSceneObjects = [],
      lastError = "",
      modelId = "anthropic.claude-3-haiku-20240307-v1:0" 
    } = body;
    
    if (!prompt && !sceneDescription && !lastError) {
      return { statusCode: 400, body: JSON.stringify({ error: "No prompt provided" }) };
    }

    // Library Context for AI
    const libraryContext = `
      LIBRARY MATERIALS:
      - 'Iridescent Metal': Pulsing, flowing wave patterns.
      - 'Molten Lava': Glowing orange-red noise-based magma.
      - 'Frosted Glass': Semi-transparent blurred refraction.
      - 'Digital Hologram': Sci-fi blue glowing flickers.
      - 'Voronoi Cells': Shifting geometric organic patterns.

      AVAILABLE GEOMETRIES:
      - 'sphere', 'box', 'plane', 'torus', 'knot'.
    `;

    // Comprehensive System Prompt
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

      INSTRUCTIONS:
      - Use the user's SHADER GOAL to write the GLSL code.
      - Use the user's SCENE GOAL to arrange objects in the sceneObjects array.
      - If the user mentions a material from the library (e.g., "lava"), implement its logic in the shader.
      - If the user mentions a geometry from the library, use it in sceneObjects.

      CRITICAL GLSL RULES:
      - DO NOT include "#version" directives.
      - DO NOT use "layout (location = X)" syntax.
      - In the Fragment Shader, always declare "precision highp float;".
      - Ensure "time" (float) and "resolution" (vec2) uniforms are declared if used.

      UNIFORM TYPES:
      - 'float', 'vec3', 'color' (hex string).
    `;

    // Add Context
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
      
      ${lastError ? "The previous shader failed to compile. Please fix it based on the error provided." : "Generate the JSON object now."}
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
    
    let rawContent = "";
    if (result.content && Array.isArray(result.content)) {
        rawContent = result.content[0].text;
    } else if (result.completion) {
        rawContent = result.completion;
    }

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return valid JSON");

    const shaderData = JSON.parse(jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, ""));

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
    console.error("CRITICAL ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", message: error.message }),
    };
  }
};
