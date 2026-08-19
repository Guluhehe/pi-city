import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type Vec3 = [number, number, number];

type Stone = { x: number; z: number; width: number; depth: number; lift: number; rotation: number; color: string };

const STONE_COLORS = ['#3c4b51', '#45555a', '#34464d', '#526168', '#3a5054'];

function roundedBox(width: number, height: number, depth: number, radius = .06, segments = 2) {
  return new RoundedBoxGeometry(width, height, depth, segments, radius);
}

function PitchedRoof({ width, depth, height, color = '#17252c' }: { width: number; depth: number; height: number; color?: string }) {
  const geometry = useMemo(() => {
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const positions = new Float32Array([
      -halfWidth, 0, -halfDepth, halfWidth, 0, -halfDepth, -halfWidth, 0, halfDepth, halfWidth, 0, halfDepth,
      0, height, -halfDepth, 0, height, halfDepth,
    ]);
    const indices = [0, 1, 4, 2, 5, 3, 0, 4, 5, 0, 5, 2, 1, 3, 5, 1, 5, 4, 0, 2, 3, 0, 3, 1];
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    next.setIndex(indices);
    next.computeVertexNormals();
    return next;
  }, [width, depth, height]);
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.78} metalness={.08} /></mesh>;
}

function Window({ position, scale = 1, lit = true }: { position: Vec3; scale?: number; lit?: boolean }) {
  return <group position={position} scale={scale}>
    <mesh position={[0, 0, -.035]}><boxGeometry args={[.66,.82,.07]} /><meshStandardMaterial color="#17252a" roughness={.67} /></mesh>
    <mesh><boxGeometry args={[.52,.66,.018]} /><meshStandardMaterial color={lit ? '#f6bd69' : '#3e5961'} emissive={lit ? '#c36b2b' : '#000'} emissiveIntensity={lit ? 1.18 : 0} roughness={.46} /></mesh>
    <mesh position={[0,0,.025]}><boxGeometry args={[.048,.76,.035]} /><meshStandardMaterial color="#5c3d2c" roughness={.76} /></mesh>
    <mesh position={[0,.01,.028]}><boxGeometry args={[.58,.045,.035]} /><meshStandardMaterial color="#5c3d2c" roughness={.76} /></mesh>
  </group>;
}

function NarrowHarborHouse({ position, width, height, wall, roof, windows = 2, door = false }: { position: Vec3; width: number; height: number; wall: string; roof: string; windows?: number; door?: boolean }) {
  const body = useMemo(() => roundedBox(width, height, 1.65, .12), [width, height]);
  return <group position={position}>
    <mesh geometry={body} position={[0,height/2,0]} castShadow receiveShadow><meshStandardMaterial color={wall} roughness={.82} metalness={.04} /></mesh>
    <PitchedRoof width={width + .28} depth={1.93} height={.54} color={roof} />
    <group position={[0,.07,.87]}>{Array.from({ length: windows }).map((_, index) => {
      const fraction = windows === 1 ? .5 : .25 + index / (windows - 1) * .5;
      return <Window key={index} position={[-width / 2 + width * fraction, height * .6, 0]} scale={width > 2.4 ? .88 : .72} lit={index % 3 !== 2} />;
    })}</group>
    {door && <group position={[0,.04,.89]}>
      <mesh position={[0,.68,0]}><boxGeometry args={[.72,1.34,.08]} /><meshStandardMaterial color="#8d3031" roughness={.63} metalness={.08} /></mesh>
      <mesh position={[0,.68,.055]}><boxGeometry args={[.52,1.09,.02]} /><meshStandardMaterial color="#b7443d" roughness={.72} /></mesh>
      <mesh position={[.23,.65,.08]}><sphereGeometry args={[.045,8,6]} /><meshStandardMaterial color="#d9a253" metalness={.76} roughness={.3} /></mesh>
      <mesh position={[0,1.47,.02]}><boxGeometry args={[.94,.14,.16]} /><meshStandardMaterial color="#67322d" roughness={.78} /></mesh>
    </group>}
    <mesh position={[0,.06,.94]}><boxGeometry args={[width + .3,.12,.32]} /><meshStandardMaterial color="#304044" roughness={.9} /></mesh>
  </group>;
}

function WetCobbleGround() {
  const stones = useMemo<Stone[]>(() => {
    const next: Stone[] = [];
    for (let row = 0; row < 11; row += 1) {
      const z = -4.25 + row * .78;
      for (let column = 0; column < 13; column += 1) {
        const baseX = -5.25 + column * .86 + (row % 2 ? .39 : 0);
        const seed = Math.sin((column + 1) * 17.13 + (row + 1) * 43.71) * 43758.545;
        const value = seed - Math.floor(seed);
        if (baseX > 4.9 || (baseX < -3.72 && z > 2.15)) continue;
        next.push({ x: baseX + (value - .5) * .06, z, width: .62 + value * .17, depth: .5 + (1 - value) * .18, lift: .045 + value * .025, rotation: (value - .5) * .08, color: STONE_COLORS[Math.floor(value * STONE_COLORS.length)] });
      }
    }
    return next;
  }, []);
  return <group>
    <mesh position={[0,-.13,-.1]} receiveShadow><boxGeometry args={[11.8,.22,10.5]} /><meshStandardMaterial color="#1a292f" roughness={.98} /></mesh>
    {stones.map((stone, index) => <mesh key={index} position={[stone.x,stone.lift,stone.z]} rotation={[0,stone.rotation,0]} castShadow receiveShadow geometry={roundedBox(stone.width,.09,stone.depth,.045,2)}><meshStandardMaterial color={stone.color} roughness={.48} metalness={.05} /></mesh>)}
    <mesh position={[0,.088,-.1]} rotation={[-Math.PI / 2,0,0]}><planeGeometry args={[10.9,9.7]} /><meshBasicMaterial color="#3d7782" transparent opacity={.055} depthWrite={false} /></mesh>
  </group>;
}

function RopeFrame() {
  return <group>
    <mesh position={[-4.58,1.16,2.88]}><cylinderGeometry args={[.11,.14,2.22,10]} /><meshStandardMaterial color="#2a3437" roughness={.72} /></mesh>
    <mesh position={[-.78,1.05,2.88]}><cylinderGeometry args={[.1,.13,1.98,10]} /><meshStandardMaterial color="#2a3437" roughness={.72} /></mesh>
    <mesh position={[-2.68,2.1,2.88]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.022,.022,3.8,8]} /><meshStandardMaterial color="#6b5037" roughness={.86} /></mesh>
    {Array.from({ length: 7 }).map((_, index) => <mesh key={index} position={[-4.24 + index * .53,1.84 - Math.sin(index / 6 * Math.PI) * .18,2.88]} rotation={[0,0,Math.PI]}><coneGeometry args={[.1,.24,3]} /><meshStandardMaterial color={['#a54243','#e3b767','#456f6b','#8d6b9b'][index % 4]} roughness={.86} /></mesh>)}
  </group>;
}

function ForegroundLantern() {
  return <group position={[-4.5,.24,3.15]} rotation={[0,.38,0]}>
    <mesh position={[0,1.12,0]}><cylinderGeometry args={[.07,.09,1.95,10]} /><meshStandardMaterial color="#1c282d" roughness={.62} metalness={.42} /></mesh>
    <mesh position={[0,2.04,0]}><cylinderGeometry args={[.26,.21,.12,10]} /><meshStandardMaterial color="#523d2b" roughness={.48} metalness={.58} /></mesh>
    <mesh position={[0,1.82,0]}><cylinderGeometry args={[.16,.16,.38,10]} /><meshStandardMaterial color="#ffe0a1" emissive="#d88235" emissiveIntensity={1.45} roughness={.28} /></mesh>
    <mesh position={[0,1.57,0]}><cylinderGeometry args={[.22,.18,.08,10]} /><meshStandardMaterial color="#523d2b" roughness={.5} metalness={.58} /></mesh>
    <pointLight position={[0,1.8,0]} color="#ffd17c" intensity={2.2} distance={5.1} decay={1.9} />
  </group>;
}

function PierEdge() {
  return <group position={[-5.0,.03,-1.72]} rotation={[0,.05,0]}>
    <mesh><boxGeometry args={[2.5,.24,3.35]} /><meshStandardMaterial color="#243438" roughness={.84} /></mesh>
    {Array.from({ length: 7 }).map((_, index) => <mesh key={index} position={[0,.14,-1.38 + index * .46]}><boxGeometry args={[2.3,.06,.11]} /><meshStandardMaterial color={index % 2 ? '#72503a' : '#4e392e'} roughness={.84} /></mesh>)}
    {[-1,1].map((x) => [-1,1].map((z) => <mesh key={`${x}-${z}`} position={[x * 1.02,.55,z * 1.25]}><cylinderGeometry args={[.11,.14,1.05,10]} /><meshStandardMaterial color="#243136" roughness={.68} metalness={.22} /></mesh>))}
  </group>;
}

function RedDoorSteps() {
  return <group position={[2.85,.03,-.58]} rotation={[0,-.18,0]}>
    {[0,1,2].map((index) => <mesh key={index} position={[0,index * .16,-.37 + index * .11]}><boxGeometry args={[1.65,.17,.48]} /><meshStandardMaterial color={index === 2 ? '#536066' : '#46545a'} roughness={.63} /></mesh>)}
  </group>;
}

export function MemoryWindStreetLighting() {
  return <group>
    <pointLight position={[-1.35,3.3,2.35]} color="#5a8ab1" intensity={.78} distance={9.5} decay={1.7} />
    <pointLight position={[2.85,2.05,-.35]} color="#f3a85c" intensity={2.05} distance={5.1} decay={1.8} />
    <pointLight position={[-2.0,2.2,.72]} color="#d78549" intensity={.56} distance={4.3} decay={1.85} />
  </group>;
}

export function MemoryWindStreetCorner() {
  return <group>
    <WetCobbleGround />
    <PierEdge />
    <NarrowHarborHouse position={[-2.95,.08,-2.15]} width={2.55} height={2.55} wall="#43595b" roof="#1e2d32" windows={2} />
    <NarrowHarborHouse position={[-.18,.08,-2.75]} width={2.15} height={3.1} wall="#6a4b42" roof="#1b2a31" windows={1} />
    <NarrowHarborHouse position={[2.85,.08,-.82]} width={2.58} height={3.35} wall="#303e43" roof="#17252c" windows={1} door />
    <RedDoorSteps />
    <ForegroundLantern />
    <RopeFrame />
    <group position={[2.0,.22,2.5]}><mesh><cylinderGeometry args={[.22,.27,.48,10]} /><meshStandardMaterial color="#6b4835" roughness={.88} /></mesh><mesh position={[.38,.18,.16]}><boxGeometry args={[.52,.36,.42]} /><meshStandardMaterial color="#7c553c" roughness={.84} /></mesh><mesh position={[.06,.63,0]}><sphereGeometry args={[.34,12,10]} /><meshStandardMaterial color="#2f625b" roughness={.9} /></mesh></group>
  </group>;
}
