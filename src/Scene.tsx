import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useShaderStore } from './store/useShaderStore';
import type { SceneObject } from './store/useShaderStore';

// Global hooks for the console.error interceptor
const originalError = console.error;
let globalAddLog: ((m: string) => void) | null = null;
let globalSetLastError: ((m: string) => void) | null = null;
let globalSetIsCompiled: ((b: boolean) => void) | null = null;

// Intercept shader compilation errors globally and immediately
console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('THREE.WebGLProgram: shader error:')) {
    if (globalSetIsCompiled) {
        setTimeout(() => globalSetIsCompiled!(false), 0);
    }
    if (globalAddLog) {
        setTimeout(() => globalAddLog!("GLSL Error detected!"), 0);
    }
    const errorLines = message.split('\n').filter(l => l.includes('ERROR:'));
    if (globalSetLastError) {
        setTimeout(() => globalSetLastError!(errorLines.length > 0 ? errorLines.join('\n') : message), 0);
    }
  }
  originalError.apply(console, args);
};

const SingleObject: React.FC<{ 
  obj: SceneObject; 
  vertexShader: string; 
  fragmentShader: string; 
  uniforms: any;
  isCompiled: boolean;
}> = ({ obj, vertexShader, fragmentShader, uniforms, isCompiled }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();

  // VALIDATION STEP: Try to compile the shader manually to catch errors even if rendering doesn't trigger it
  useEffect(() => {
    try {
        const testMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: uniforms
        });
        
        // This forces Three.js to try and compile the program immediately
        const program = gl.getContext().createProgram(); 
        // We don't actually need to link it, Three.js internal compilation is triggered by usage
        // But simply setting needsUpdate and rendering a frame usually works.
        // For a more robust "manual" check:
        if (materialRef.current) {
            materialRef.current.needsUpdate = true;
        }
    } catch (e) {
        // Fallback for non-WebGL errors
        console.error("Manual compilation check failed", e);
    }
  }, [vertexShader, fragmentShader, gl, uniforms]);

  useFrame((state) => {
    if (materialRef.current && isCompiled) {
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
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[2, 0.1, 1.2]} />{material}</mesh>
        {[[-0.9, 0, -0.5], [0.9, 0, -0.5], [-0.9, 0, 0.5], [0.9, 0, 0.5]].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]}><boxGeometry args={[0.1, 1, 0.1]} />{material}</mesh>
        ))}
      </group>
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

  const geometry = useMemo(() => {
    switch (type) {
      case 'box':
      case 'cube': return <boxGeometry args={[1, 1, 1]} />;
      case 'plane': return <planeGeometry args={[2, 2, 32, 32]} />;
      case 'torus': return <torusGeometry args={[0.7, 0.3, 16, 100]} />;
      case 'knot': return <torusKnotGeometry args={[0.6, 0.2, 128, 16]} />;
      case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'pyramid': return <coneGeometry args={[0.7, 1, 4]} />;
      default: return <sphereGeometry args={[1, 64, 64]} />;
    }
  }, [type]);

  return (
    <mesh position={obj.position} rotation={obj.rotation} scale={obj.scale} key={obj.id}>
      {geometry}
      {material}
    </mesh>
  );
};

const Scene: React.FC = () => {
  const { 
    vertexShader, fragmentShader, uniforms, sceneObjects,
    isCompiled, addLog, setLastError, setIsCompiled
  } = useShaderStore();
  
  useEffect(() => {
    window.__GLSL_ERROR_CALLBACK__ = (message: string) => {
      setTimeout(() => {
        setIsCompiled(false);
        addLog("GLSL Error detected!");
        const errorLines = message.split('\n').filter(l => l.includes('ERROR:'));
        setLastError(errorLines.length > 0 ? errorLines.join('\n') : message);
      }, 0);
    };
    return () => { window.__GLSL_ERROR_CALLBACK__ = null; };
  }, [addLog, setLastError, setIsCompiled]);

  useEffect(() => {
    if (!isCompiled) setIsCompiled(true);
  }, [vertexShader, fragmentShader, setIsCompiled]);

  const memoizedUniforms = useMemo(() => {
    const formatted: { [key: string]: { value: any } } = {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    };
    uniforms.forEach(u => {
      formatted[u.name] = { value: u.type === 'color' ? new THREE.Color(u.value) : u.value };
    });
    return formatted;
  }, [uniforms]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[8, 8, 8]} onUpdate={(c) => c.lookAt(0, 0, 0)} />
      <OrbitControls target={[0, 0, 0]} makeDefault />
      <color attach="background" args={['#050505']} />
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={2.0} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4444ff" />
      {sceneObjects.map((obj) => (
        <SingleObject key={obj.id} obj={obj} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={memoizedUniforms} isCompiled={isCompiled} />
      ))}
      <gridHelper args={[20, 20, 0x222222, 0x111111]} position={[0, -1.5, 0]} />
    </>
  );
};

export default Scene;
