import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Define a global way to report errors to the app before React is even fully ready
declare global {
  interface Window {
    __GLSL_ERROR_CALLBACK__: ((message: string) => void) | null;
  }
}

const originalError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  const isShaderError = 
    message.includes('THREE.WebGLProgram') || 
    message.includes('shader error') || 
    message.includes('Shader Error');

  if (isShaderError) {
    if (window.__GLSL_ERROR_CALLBACK__) {
      window.__GLSL_ERROR_CALLBACK__(message);
    }
  }
  originalError.apply(console, args);
};

// Add general error listener as a backup
window.addEventListener('error', (event) => {
  const message = event.message || "";
  if (message.includes('shader error') || message.includes('Shader Error')) {
    if (window.__GLSL_ERROR_CALLBACK__) {
      window.__GLSL_ERROR_CALLBACK__(message);
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
