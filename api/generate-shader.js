const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

/**
 * AWS Lambda function to generate or refine shader code from a text prompt.
 */
exports.handler = async (event) => {
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "eu-central-1" });
  
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
      - Primitives: 'sphere', 'box' (or 'cube'), 'plane', 'torus', 'knot', 'cylinder', 'pyramid'.
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

      SCENE CONFIGURATION:
      - id: unique string.
      - position: [x, y, z] (array of 3 numbers)
      - scale: [x, y, z] (array of 3 numbers)
      - rotation: [x, y, z] (array of 3 numbers in radians)
      - Note: 'table' and 'chair' are composite objects; specify their overall position/scale.

      CRITICAL GLSL RULES:
      - DO NOT include "#version" directives.
      - DO NOT use "layout (location = X)" syntax.
      - In the Fragment Shader, always declare "precision highp float;".
      - Ensure "time" (float) and "resolution" (vec2) uniforms are declared if used.

      UNIFORM TYPES:
      - 'float', 'vec3', 'color' (hex string).
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
    } else if (result.text) {
        rawContent = result.text;
    }

    if (!rawContent) {
        throw new Error("Empty response from Bedrock model.");
    }

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error("AI Response without JSON:", rawContent);
        throw new Error("AI did not return a valid JSON object. Check logs for raw output.");
    }

    // Aggressively clean the string: remove non-printable chars and ensure it ends at the last closing brace
    let jsonString = jsonMatch[0].trim();
    jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    
    let shaderData;
    try {
        shaderData = JSON.parse(jsonString);
    } catch (parseError) {
        console.error("JSON Parse Error. String attempted:", jsonString);
        throw new Error("Failed to parse AI-generated JSON: " + parseError.message);
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
    console.error("SHaider API Error:", error);
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
        message: error.message,
        details: "Check backend logs for full stack trace."
      }),
    };
  }
};
