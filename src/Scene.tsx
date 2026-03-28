import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useShaderStore } from './store/useShaderStore';
import type { SceneObject, Uniform } from './store/useShaderStore';

// Global hooks for the console.error interceptor
const originalError = console.error;
const globalState = {
  addLog: null as ((m: string) => void) | null,
  setLastError: null as ((m: string) => void) | null,
  setIsCompiled: null as ((b: boolean) => void) | null
};

// Intercept shader compilation errors globally and immediately
console.error = (...args: unknown[]) => {
  const message = args.join(' ');
  if (message.includes('THREE.WebGLProgram: shader error:')) {
    if (globalState.setIsCompiled) {
        setTimeout(() => globalState.setIsCompiled?.(false), 0);
    }
    if (globalState.addLog) {
        setTimeout(() => globalState.addLog?.("GLSL Error detected!"), 0);
    }
    const errorLines = message.split('\n').filter(l => l.includes('ERROR:'));
    if (globalState.setLastError) {
        setTimeout(() => globalState.setLastError?.(errorLines.length > 0 ? errorLines.join('\n') : message), 0);
    }
  }
  originalError.apply(console, args);
};

const SingleObject: React.FC<{ 
  obj: SceneObject; 
  vertexShader: string; 
  fragmentShader: string; 
  uniforms: Record<string, { value: unknown }>;
  isCompiled: boolean;
}> = ({ obj, vertexShader, fragmentShader, uniforms, isCompiled }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();

  useEffect(() => {
    try {
        const testMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: uniforms
        });
        
        const dummyMesh = new THREE.Mesh(new THREE.BoxGeometry(), testMaterial);
        const dummyScene = new THREE.Scene();
        dummyScene.add(dummyMesh);
        const dummyCamera = new THREE.Camera();
        
        // This triggers compilation
        gl.compile(dummyScene, dummyCamera);
        
        if (materialRef.current) {
            materialRef.current.needsUpdate = true;
        }
    } catch (e) {
        console.error("Manual compilation check failed", e);
    }
  }, [vertexShader, fragmentShader, gl, uniforms]);

  useFrame((state) => {
    if (materialRef.current && isCompiled && materialRef.current.uniforms.time) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  const material = isCompiled ? (
    <shaderMaterial
      ref={materialRef}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
      transparent={true}
      side={THREE.DoubleSide}
    />
  ) : (
    <meshBasicMaterial color="red" wireframe={true} />
  );

  const type = (obj.objectType || 'sphere').toLowerCase();

  if (type === 'table') {
    return (
      <group position={obj.position} rotation={obj.rotation} scale={obj.scale}>
        {/* Table top: centered at y=0.5, height 0.1 -> top surface at 0.55 */}
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[2, 0.1, 1.2]} />{material}</mesh>
        {/* Legs: length 0.5, centered at 0.25 -> reaching from 0 to 0.5 */}
        {[[-0.9, 0.25, -0.5], [0.9, 0.25, -0.5], [-0.9, 0.25, 0.5], [0.9, 0.25, 0.5]].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]}><boxGeometry args={[0.1, 0.5, 0.1]} />{material}</mesh>
        ))}
      </group>
    );
  }

  if (type === 'floor' || type === 'ground') {
    return (
      <mesh position={[obj.position[0], obj.position[1], obj.position[2]]} rotation={[-Math.PI / 2, 0, 0]} key={obj.id}>
        <planeGeometry args={[20, 20]} />
        {material}
      </mesh>
    );
  }

  if (type === 'chair') {
    return (
      <group position={obj.position} rotation={obj.rotation} scale={obj.scale}>
        <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.5, 0.05, 0.5]} />{material}</mesh>
        <mesh position={[0, 0.7, -0.225]}><boxGeometry args={[0.5, 0.5, 0.05]} />{material}</mesh>
        {[[-0.2, 0.2, -0.2], [0.2, 0.2, -0.2], [-0.2, 0.2, 0.2], [0.2, 0.2, 0.2]].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]}><boxGeometry args={[0.05, 0.4, 0.05]} />{material}</mesh>
        ))}
      </group>
    );
  }

  return (
    <mesh position={obj.position} rotation={obj.rotation} scale={obj.scale} key={obj.id}>
      {type === 'box' || type === 'cube' ? <boxGeometry args={[1, 1, 1]} /> :
       type === 'plane' ? <planeGeometry args={[2, 2, 32, 32]} /> :
       type === 'torus' ? <torusGeometry args={[0.7, 0.3, 16, 100]} /> :
       type === 'knot' ? <torusKnotGeometry args={[0.6, 0.2, 128, 16]} /> :
       type === 'cylinder' ? <cylinderGeometry args={[0.5, 0.5, 1, 32]} /> :
       type === 'pyramid' ? <coneGeometry args={[0.7, 1, 4]} /> :
       <sphereGeometry args={[1, 64, 64]} />}
      {material}
    </mesh>
  );
};

// Helper component to load textures and pass them to Scene
const UniformsManager: React.FC<{ 
  uniforms: Uniform[]; 
  children: (formattedUniforms: Record<string, { value: unknown }>) => React.ReactNode 
}> = ({ uniforms, children }) => {
  const { size } = useThree();
  
  // Identify all texture URLs
  const textureUrls = useMemo(() => 
    uniforms.filter(u => u.type === 'texture' && typeof u.value === 'string').map(u => u.value as string),
    [uniforms]
  );

  // Pre-load all textures
  const loadedTextures = useLoader(THREE.TextureLoader, textureUrls.length > 0 ? textureUrls : []);
  
  // Create a mapping of URL -> Texture
  const textureMap = useMemo(() => {
    const map: Record<string, THREE.Texture> = {};
    textureUrls.forEach((url, i) => {
      map[url] = Array.isArray(loadedTextures) ? loadedTextures[i] : loadedTextures;
    });
    return map;
  }, [textureUrls, loadedTextures]);

  const formattedUniforms = useMemo(() => {
    const formatted: Record<string, { value: unknown }> = {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(size.width, size.height) }
    };
    
    uniforms.forEach(u => {
      if (u.type === 'color') {
        formatted[u.name] = { value: new THREE.Color(u.value as string) };
      } else if (u.type === 'texture') {
        formatted[u.name] = { value: textureMap[u.value as string] || null };
      } else {
        formatted[u.name] = { value: u.value };
      }
    });
    
    return formatted;
  }, [uniforms, textureMap, size]);

  return <>{children(formattedUniforms)}</>;
};

const Scene: React.FC = () => {
  const { 
    vertexShader, fragmentShader, uniforms, sceneObjects,
    isCompiled, addLog, setLastError, setIsCompiled
  } = useShaderStore();
  
  // Register the global error callback defined in main.tsx
  useEffect(() => {
    window.__GLSL_ERROR_CALLBACK__ = (message: string) => {
      setTimeout(() => {
        setIsCompiled(false);
        addLog("GLSL Error detected!");
        const errorLines = message.split('\n').filter(l => l.includes('ERROR:'));
        setLastError(errorLines.length > 0 ? errorLines.join('\n') : message);
      }, 0);
    };
    
    // Also connect to local globalState for the interceptor defined in this file
    globalState.addLog = addLog;
    globalState.setLastError = setLastError;
    globalState.setIsCompiled = setIsCompiled;

    return () => { 
      window.__GLSL_ERROR_CALLBACK__ = null;
      globalState.addLog = null;
      globalState.setLastError = null;
      globalState.setIsCompiled = null;
    };
  }, [addLog, setLastError, setIsCompiled]);

  useEffect(() => {
    if (!isCompiled) setIsCompiled(true);
  }, [vertexShader, fragmentShader, setIsCompiled, isCompiled]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[8, 8, 8]} onUpdate={(c) => c.lookAt(0, 0, 0)} />
      <OrbitControls target={[0, 0, 0]} makeDefault />
      <color attach="background" args={['#050505']} />
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={2.0} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4444ff" />
      
      <UniformsManager uniforms={uniforms}>
        {(formattedUniforms) => (
          <>
            {sceneObjects.map((obj) => (
              <SingleObject 
                key={obj.id} 
                obj={obj} 
                vertexShader={vertexShader} 
                fragmentShader={fragmentShader} 
                uniforms={formattedUniforms} 
                isCompiled={isCompiled} 
              />
            ))}
          </>
        )}
      </UniformsManager>
      
      <gridHelper args={[20, 20, 0x222222, 0x111111]} position={[0, -1.5, 0]} />
    </>
  );
};

export default Scene;
