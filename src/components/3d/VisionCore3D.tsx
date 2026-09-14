import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface VisionCoreMeshProps {
  isTransitioning: boolean;
  mousePosition: { x: number; y: number };
}

const CoreGeometry: React.FC<VisionCoreMeshProps> = ({ isTransitioning, mousePosition }) => {
  const coreRef = useRef<THREE.Group>(null);
  const innerIcoRef = useRef<THREE.Mesh>(null);
  const outerRing1Ref = useRef<THREE.Mesh>(null);
  const outerRing2Ref = useRef<THREE.Mesh>(null);
  const outerRing3Ref = useRef<THREE.Mesh>(null);
  const scannerBeamRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    if (coreRef.current) {
      // Dynamic mouse tilt parallax
      const targetRotationY = mousePosition.x * 0.4 + time * 0.15;
      const targetRotationX = -mousePosition.y * 0.3;
      coreRef.current.rotation.y = THREE.MathUtils.damp(coreRef.current.rotation.y, targetRotationY, 3, delta);
      coreRef.current.rotation.x = THREE.MathUtils.damp(coreRef.current.rotation.x, targetRotationX, 3, delta);

      if (isTransitioning) {
        coreRef.current.scale.lerp(new THREE.Vector3(4.5, 4.5, 4.5), delta * 3.5);
      }
    }

    if (innerIcoRef.current) {
      innerIcoRef.current.rotation.x += delta * 0.4;
      innerIcoRef.current.rotation.y += delta * 0.6;
      const pulse = 1 + Math.sin(time * 3) * 0.05;
      innerIcoRef.current.scale.set(pulse, pulse, pulse);
    }

    if (outerRing1Ref.current) {
      outerRing1Ref.current.rotation.x = time * 0.7;
      outerRing1Ref.current.rotation.y = time * 0.5;
    }

    if (outerRing2Ref.current) {
      outerRing2Ref.current.rotation.y = -time * 0.8;
      outerRing2Ref.current.rotation.z = time * 0.4;
    }

    if (outerRing3Ref.current) {
      outerRing3Ref.current.rotation.x = -time * 0.5;
      outerRing3Ref.current.rotation.z = -time * 0.7;
    }

    if (scannerBeamRef.current) {
      scannerBeamRef.current.position.y = Math.sin(time * 2.5) * 1.8;
    }
  });

  return (
    <group ref={coreRef}>
      {/* Central Glowing AI Nucleus */}
      <mesh ref={innerIcoRef}>
        <icosahedronGeometry args={[1.2, 2]} />
        <meshStandardMaterial
          color="#00f3ff"
          emissive="#00b4d8"
          emissiveIntensity={1.2}
          wireframe
          transparent
          opacity={0.85}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Solid Inner Core Sphere with Depth */}
      <mesh>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial
          color="#050e24"
          emissive="#00f3ff"
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Outer Holographic Energy Ring 1 */}
      <mesh ref={outerRing1Ref}>
        <torusGeometry args={[2.0, 0.025, 16, 100]} />
        <meshStandardMaterial
          color="#00f3ff"
          emissive="#00f3ff"
          emissiveIntensity={1.5}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Outer Holographic Energy Ring 2 */}
      <mesh ref={outerRing2Ref}>
        <torusGeometry args={[2.3, 0.02, 16, 100]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#a855f7"
          emissiveIntensity={1.6}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Outer Holographic Energy Ring 3 */}
      <mesh ref={outerRing3Ref}>
        <torusGeometry args={[2.6, 0.015, 16, 100]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={1.3}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* 3D Laser Scanning Disk */}
      <mesh ref={scannerBeamRef} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.4, 2.4, 0.02, 32]} />
        <meshBasicMaterial
          color="#00f3ff"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

// Swarm of Quantum Floating Particles
const FloatingParticleSwarm: React.FC<{ count?: number }> = ({ count = 800 }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 2.5 + Math.random() * 8.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    return positions;
  }, [count]);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.05;
      pointsRef.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <Points ref={pointsRef} positions={particles} stride={3}>
      <PointMaterial
        transparent
        color="#00f3ff"
        size={0.045}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.75}
      />
    </Points>
  );
};

// Cyber Grid Floor
const PerspectiveGrid: React.FC = () => {
  const gridRef = useRef<THREE.GridHelper>(null);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.getElapsedTime() * 0.5) % 1;
    }
  });

  return (
    <group position={[0, -3.2, 0]}>
      <gridHelper
        ref={gridRef}
        args={[30, 30, '#00f3ff', '#0d223a']}
        position={[0, 0, 0]}
      />
    </group>
  );
};

// Camera Controller during Transition
const CameraController: React.FC<{ isTransitioning: boolean }> = ({ isTransitioning }) => {
  useFrame((state, delta) => {
    if (isTransitioning) {
      state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, 0.8, 3.5, delta);
      state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, 0, 3.5, delta);
    }
  });
  return null;
};

export const VisionCore3D: React.FC<VisionCoreMeshProps> = ({ isTransitioning, mousePosition }) => {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00f3ff" />
        <pointLight position={[-10, -10, -10]} intensity={1.0} color="#a855f7" />
        <spotLight position={[0, 8, 4]} intensity={2.0} color="#ffffff" angle={0.6} penumbra={1} />

        <VisionCoreMeshPropsBridge
          isTransitioning={isTransitioning}
          mousePosition={mousePosition}
        />
        <FloatingParticleSwarm count={900} />
        <PerspectiveGrid />
        <CameraController isTransitioning={isTransitioning} />
      </Canvas>
    </div>
  );
};

const VisionCoreMeshPropsBridge: React.FC<VisionCoreMeshProps> = (props) => {
  return <CoreGeometry {...props} />;
};
