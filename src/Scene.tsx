import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useShaderStore } from './store/useShaderStore';

/**
 * Scene Component
 * Renders a dynamic 3D object with a custom ShaderMaterial.
 */
const Scene: React.FC = () => {
  const { 
    vertexShader, 
    fragmentShader, 
    uniforms, 
    sceneConfig,
    addLog,
    setLastError
  } = useShaderStore();
  
  const { gl } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Intercept shader compilation errors
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('THREE.WebGLProgram: shader error:')) {
        addLog("GLSL Error detected!");
        setLastError(message);
      }
      originalError.apply(console, args);
    };
    return () => {
      console.error = originalError;
    };
  }, [addLog, setLastError]);

  // Memoize uniforms
  const memoizedUniforms = useMemo(() => {
    const formatted: { [key: string]: { value: any } } = {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    };
    
    uniforms.forEach(u => {
      if (u.type === 'color') {
        formatted[u.name] = { value: new THREE.Color(u.value) };
      } else {
        formatted[u.name] = { value: u.value };
      }
    });
    
    return formatted;
  }, [uniforms]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.getElapsedTime();
    }
  });

  const geometry = useMemo(() => {
    switch (sceneConfig.objectType.toLowerCase()) {
      case 'box':
      case 'cube':
        return <boxGeometry args={[1, 1, 1]} />;
      case 'plane':
        return <planeGeometry args={[2, 2, 32, 32]} />;
      case 'torus':
        return <torusGeometry args={[0.7, 0.3, 16, 100]} />;
      case 'sphere':
      case 'ball':
      default:
        return <sphereGeometry args={[1, 64, 64]} />;
    }
  }, [sceneConfig.objectType]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <OrbitControls />
      
      <color attach="background" args={['#050505']} />
      
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      
      <mesh 
        ref={meshRef} 
        position={sceneConfig.position}
        rotation={sceneConfig.rotation}
        scale={sceneConfig.scale}
        key={`${vertexShader}-${fragmentShader}`}
      >
        {geometry}
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={memoizedUniforms}
          transparent={true}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <gridHelper args={[20, 20, 0x222222, 0x111111]} position={[0, -1.5, 0]} />
    </>
  );
};

export default Scene;
