import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Line, Float, Sparkles, Stars } from '@react-three/drei';

function StreamTrail({ curve, isReversed, onComplete }: { curve: THREE.Curve<THREE.Vector3>, isReversed: boolean, onComplete: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const lineRef = useRef<any>(null);
  const progress = useRef(0);
  const speed = 0.18;
  const trailLength = 0.25;
  
  useFrame((state, delta) => {
    if (!ref.current) return;
    
    progress.current += delta * speed;
    
    if (progress.current >= 1) {
      onComplete();
      return;
    }
    
    const t = isReversed ? 1 - progress.current : progress.current;
    const pos = curve.getPoint(Math.min(Math.max(t, 0), 1));
    ref.current.position.copy(pos);
    
    const scale = Math.sin(progress.current * Math.PI) * 1.5;
    ref.current.scale.setScalar(Math.max(scale, 0.01));

    if (lineRef.current) {
      const positions: number[] = [];
      const numSegments = 30;
      for (let i = 0; i <= numSegments; i++) {
        const offset = (i / numSegments) * trailLength;
        let ptT = isReversed ? t + offset : t - offset;
        ptT = Math.min(Math.max(ptT, 0), 1);
        
        const pt = curve.getPoint(ptT);
        positions.push(pt.x, pt.y, pt.z);
      }
      lineRef.current.geometry.setPositions(positions);
      if (lineRef.current.geometry.boundingSphere === null) {
        lineRef.current.geometry.computeBoundingSphere();
      }
    }

    const worldPos = new THREE.Vector3();
    ref.current.getWorldPosition(worldPos);
    
    const targetCamPos = worldPos.clone().normalize().multiplyScalar(9);
    targetCamPos.y += 1.5;
    targetCamPos.normalize().multiplyScalar(9);
    
    state.camera.position.lerp(targetCamPos, delta * 2.5);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group>
      <Line
        ref={lineRef}
        points={Array(31).fill(new THREE.Vector3(0,0,0))} 
        color="#FFAA00"
        lineWidth={4.5} 
        transparent={false}
        frustumCulled={false}
      />
      <mesh ref={ref} frustumCulled={false}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
    </group>
  );
}

function SingleDataStream({ arcs }: { arcs: any[] }) {
  const [streamState, setStreamState] = useState({ index: 0, isReversed: false });

  const handleComplete = () => {
    const currentArc = arcs[streamState.index];
    const endPoint = streamState.isReversed ? currentArc.p1 : currentArc.p2;

    const nextArcs: {idx: number, reverse: boolean}[] = [];
    arcs.forEach((arc, i) => {
      if (i !== streamState.index) {
        if (arc.p1.distanceTo(endPoint) < 0.1) nextArcs.push({ idx: i, reverse: false });
        else if (arc.p2.distanceTo(endPoint) < 0.1) nextArcs.push({ idx: i, reverse: true });
      }
    });

    if (nextArcs.length > 0) {
      const next = nextArcs[Math.floor(Math.random() * nextArcs.length)];
      setStreamState({ index: next.idx, isReversed: next.reverse });
    } else {
      setStreamState({ index: Math.floor(Math.random() * arcs.length), isReversed: false });
    }
  };

  if (arcs.length === 0) return null;

  return <StreamTrail key={`${streamState.index}-${streamState.isReversed}`} curve={arcs[streamState.index].curve} isReversed={streamState.isReversed} onComplete={handleComplete} />;
}

function ConnectionArcs({ radius }: { radius: number }) {
  const ObjectConnections = useMemo(() => {
    const arcs = [];
    const numPoints = 40;
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const phi = Math.acos(-1 + (2 * i) / numPoints);
      const theta = Math.sqrt(numPoints * Math.PI) * phi;
      points.push(
        new THREE.Vector3(
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.sin(theta) * Math.sin(phi),
          radius * Math.cos(phi)
        )
      );
    }

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const p1 = points[i];
        const p2 = points[j];
        const distance = p1.distanceTo(p2);
        
        if (distance < radius * 1.5 && Math.random() > 0.45) {
          const midPoint = p1.clone().add(p2).multiplyScalar(0.5);
          midPoint.normalize().multiplyScalar(radius + Math.max(distance * 0.3, 0.4)); 
          
          const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
          arcs.push({ 
            curvePoints: curve.getPoints(20), 
            curve,
            p1,
            p2
          }); 
        }
      }
    }
    return { arcs, points };
  }, [radius]);

  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {ObjectConnections.points.map((p, idx) => (
        <mesh key={`p-${idx}`} position={p}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
      ))}

      {ObjectConnections.arcs.map((arc, idx) => (
        <Line 
          key={`arc-line-${idx}`}
          points={arc.curvePoints} 
          color="#FFD700" 
          lineWidth={1} 
          transparent 
          opacity={0.25} 
        />
      ))}

      {ObjectConnections.arcs.length > 0 && (
        <SingleDataStream arcs={ObjectConnections.arcs} />
      )}

      <group scale={[radius * 0.91, radius * 0.91, radius * 0.91]}>
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial 
            color="#050a15" 
            emissive="#001133" 
            emissiveIntensity={0.8} 
            roughness={0.2} 
            metalness={0.8} 
          />
        </mesh>
        
        <mesh>
          <icosahedronGeometry args={[1.001, 4]} />
          <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.03} />
        </mesh>
        
        <Sparkles count={800} scale={2} size={0.6} speed={0.2} opacity={0.3} color="#0088ff" />
      </group>
    </group>
  );
}

function BackgroundTechElements() {
  return (
    <group>
      <Sparkles count={500} scale={25} size={1.2} speed={0.4} opacity={0.5} color="#00ffff" />
      <Stars radius={30} depth={20} count={2000} factor={3} saturation={0} fade speed={2} />

      <Float speed={1.5} rotationIntensity={2} floatIntensity={2}>
        <mesh position={[-8, 5, -10]}>
          <icosahedronGeometry args={[1.5, 0]} />
          <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.2} />
        </mesh>
      </Float>

      <Float speed={1} rotationIntensity={1.5} floatIntensity={2}>
        <mesh position={[9, -4, -12]}>
          <octahedronGeometry args={[2, 0]} />
          <meshBasicMaterial color="#0066ff" wireframe transparent opacity={0.15} />
        </mesh>
      </Float>

      <Float speed={2} rotationIntensity={3} floatIntensity={1}>
        <mesh position={[-6, -6, -8]}>
          <torusGeometry args={[1.2, 0.05, 8, 16]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.1} />
        </mesh>
      </Float>
    </group>
  );
}

export default function AwardsWebGL() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 65 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#0c1222']} />
      <fog attach="fog" args={['#0c1222', 6, 25]} />
      
      <BackgroundTechElements />

      <ConnectionArcs radius={4.5} />
    </Canvas>
  );
}
