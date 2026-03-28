import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useShaderStore } from './store/useShaderStore';
import type { SceneObject } from './store/useShaderStore';

const SingleObject: React.FC<{ 
  obj: SceneObject; 
  vertexShader: string; 
  fragmentShader: string; 
  uniforms: any;
  isCompiled: boolean;
}> = ({ obj, vertexShader, fragmentShader, uniforms, isCompiled }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (materialRef.current && isCompiled) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  const geometry = useMemo(() => {
    const type = (obj.objectType || 'sphere').toLowerCase();
    switch (type) {
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
  }, [obj.objectType]);

  return (
    <mesh 
      position={obj.position}
      rotation={obj.rotation}
      scale={obj.scale}
      key={obj.id}
    >
      {geometry}
      {isCompiled ? (
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
      )}
    </mesh>
  );
};

const Scene: React.FC = () => {
  const { 
    vertexShader, 
    fragmentShader, 
    uniforms, 
    sceneObjects,
    isCompiled,
    addLog,
    setLastError,
    setIsCompiled
  } = useShaderStore();
  
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('THREE.WebGLProgram: shader error:')) {
        setIsCompiled(false);
        addLog("GLSL Error detected!");
        const errorLines = message.split('\n').filter(l => l.includes('ERROR:'));
        setLastError(errorLines.length > 0 ? errorLines.join('\n') : message);
      }
      originalError.apply(console, args);
    };
    return () => { console.error = originalError; };
  }, [addLog, setLastError, setIsCompiled]);

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
      <OrbitControls target={[0, 0, 0]} />
      <color attach="background" args={['#050505']} />
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={2.0} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4444ff" />
      
      {sceneObjects.map((obj) => (
        <SingleObject 
          key={obj.id} 
          obj={obj} 
          vertexShader={vertexShader} 
          fragmentShader={fragmentShader} 
          uniforms={memoizedUniforms}
          isCompiled={isCompiled}
        />
      ))}
      
      <gridHelper args={[20, 20, 0x222222, 0x111111]} position={[0, -1.5, 0]} />
    </>
  );
};

export default Scene;
