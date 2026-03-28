import { Amplify } from 'aws-amplify';

export const configureAmplify = async () => {
  // Use import.meta.glob to check if the file exists without breaking the build
  const outputsFiles = import.meta.glob('../amplify_outputs.json');
  
  const path = '../amplify_outputs.json';
  
  if (outputsFiles[path]) {
    try {
      const mod = await outputsFiles[path]() as any;
      Amplify.configure(mod.default);
      console.log("Amplify configured successfully from outputs file");
      return true;
    } catch (e) {
      console.warn("Failed to load Amplify outputs:", e);
    }
  } else {
    console.log("Amplify outputs not found, using local fallback");
  }
  return false;
};
