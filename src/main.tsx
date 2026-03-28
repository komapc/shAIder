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
  if (message.includes('THREE.WebGLProgram: shader error:')) {
    if (window.__GLSL_ERROR_CALLBACK__) {
      window.__GLSL_ERROR_CALLBACK__(message);
    }
  }
  originalError.apply(console, args);
};

// Add general error listener as a backup
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('shader error')) {
    if (window.__GLSL_ERROR_CALLBACK__) {
      window.__GLSL_ERROR_CALLBACK__(event.message);
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
