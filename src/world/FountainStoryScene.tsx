import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  availableFountainQuestions,
  type FountainQuestionId,
  type FountainSessionState,
} from '../game';

type Vec3 = [number, number, number];

type LocationId = FountainQuestionId | 'fountain' | 'workshop';

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

const HARBOR_LANDMARKS = [
  { model: 'arrival-harbor.glb', position: [-8.4, 0.2, -9.2] as Vec3, rotation: [0, .38, 0] as Vec3, scale: .72 },
  { model: 'session-archive.glb', position: [-1.0, 0.2, -10.6] as Vec3, rotation: [0, -.16, 0] as Vec3, scale: .86 },
  { model: 'model-core.glb', position: [7.4, 0.2, -9.4] as Vec3, rotation: [0, -.42, 0] as Vec3, scale: .62 },
] as const;

const LOCATIONS: Record<LocationId, { position: Vec3; color: string; label: string }> = {
  fountain: { position: [0, 0, 0], color: '#85ddd6', label: '喷泉广场' },
  melody: { position: [-5.2, 0, -1.6], color: '#f19b7d', label: '乐手码头' },
  water: { position: [3.8, 0, 1.7], color: '#6ec8d2', label: '水线小渠' },
  wind: { position: [5.5, 0, -4.25], color: '#9a9ad7', label: '风铃小巷' },
  workshop: { position: [-2.7, 0, 3.8], color: '#e4b75d', label: '工具坊' },
  'full-song': { position: [3.8, 0, -5.6], color: '#ffcf71', label: '晚风花园' },
  'stable-water': { position: [3.8, 0, 1.7], color: '#6ec8d2', label: '水线小渠' },
};

export function FountainStoryScene({
  state,
  onSelectQuestion,
}: {
  state: FountainSessionState;
  onSelectQuestion: (questionId: FountainQuestionId) => void;
}) {
  const available = availableFountainQuestions(state).map((question) => question.id);
  return (
    <div className="fountain-scene" aria-hidden="true">
      <Canvas shadows dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }} camera={{ position: [8, 6.4, 12], fov: 41, near: 0.1, far: 100 }}>
        <color attach="background" args={['#294d66']} />
        <fog attach="fog" args={['#557990', 17, 34]} />
        <hemisphereLight args={['#c7e3e8', '#30435b', 1.35]} />
        <directionalLight position={[-7, 12, 7]} intensity={2.5} color="#ffd2a1" castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[0, 4.5, 0]} intensity={2.2} color="#a6fff4" distance={10} />
        <FountainCamera state={state} />
        <FountainTown state={state} available={available} onSelectQuestion={onSelectQuestion} />
      </Canvas>
    </div>
  );
}

function FountainCamera({ state }: { state: FountainSessionState }) {
  const { camera } = useThree();
  const lookAt = useRef(new THREE.Vector3(0, 1.1, 0));
  const desired = useMemo(() => new THREE.Vector3(), []);
  const nextLookAt = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    const targetId = state.phase === 'plan' || state.phase === 'expedition'
      ? state.pendingQuestion ?? 'fountain'
      : state.phase === 'action'
        ? 'workshop'
        : state.phase === 'complete'
          ? 'full-song'
          : 'fountain';
    const location = LOCATIONS[targetId];
    const close = state.phase === 'plan' || state.phase === 'expedition' || state.phase === 'action';
    desired.set(
      location.position[0] + (close ? 4.6 : 8.0),
      close ? 4.2 : 6.4,
      location.position[2] + (close ? 6.2 : 12.0),
    );
    nextLookAt.set(location.position[0], 1.05, location.position[2]);
    camera.position.lerp(desired, 1 - Math.exp(-delta * 1.6));
    lookAt.current.lerp(nextLookAt, 1 - Math.exp(-delta * 1.8));
    camera.lookAt(lookAt.current);
  });
  return null;
}

function FountainTown({
  state,
  available,
  onSelectQuestion,
}: {
  state: FountainSessionState;
  available: FountainQuestionId[];
  onSelectQuestion: (questionId: FountainQuestionId) => void;
}) {
  const hasFact = (fact: FountainSessionState['facts'][number]) => state.facts.includes(fact);
  const activeQuestion = state.phase === 'choose-question' ? available : [];
  const piTarget: LocationId = state.phase === 'plan' || state.phase === 'expedition'
    ? state.pendingQuestion ?? 'fountain'
    : state.phase === 'action'
      ? 'workshop'
      : state.phase === 'complete'
        ? 'full-song'
        : 'fountain';
  return (
    <group>
      <WaterPlane />
      <TownFloor />
      <FountainPlaza state={state} />
      <MusicianDock visited={hasFact('melody-page')} active={activeQuestion.includes('melody')} onAsk={() => onSelectQuestion('melody')} />
      <WaterCanal visited={hasFact('pressure-pattern') || hasFact('stable-water')} active={activeQuestion.includes('water') || activeQuestion.includes('stable-water')} onAsk={() => onSelectQuestion(hasFact('sync-valve') ? 'stable-water' : 'water')} />
      <WindAlley visited={hasFact('wind-refuted')} active={activeQuestion.includes('wind')} onAsk={() => onSelectQuestion('wind')} />
      <Workshop unlocked={hasFact('melody-page') && hasFact('pressure-pattern')} installed={hasFact('sync-valve')} active={state.phase === 'action'} />
      <Garden visited={hasFact('full-song')} active={activeQuestion.includes('full-song')} onAsk={() => onSelectQuestion('full-song')} />
      <HarborLandmarks />
      <HarborHomes />
      <PiCompanion target={piTarget} active={state.phase === 'expedition'} />
      <PathRibbons target={piTarget} visible={state.phase === 'plan' || state.phase === 'expedition'} />
      <LanternField complete={state.phase === 'complete'} />
    </group>
  );
}

function WaterPlane() {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (material.current) material.current.emissiveIntensity = 0.15 + Math.sin(clock.elapsedTime * 1.2) * 0.04;
  });
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
    <planeGeometry args={[42, 38]} />
    <meshStandardMaterial ref={material} color="#315f73" emissive="#2d7782" emissiveIntensity={0.16} roughness={0.36} metalness={0.05} />
  </mesh>;
}

function TownFloor() {
  return <group>
    <mesh position={[0, 0, 0]} receiveShadow><cylinderGeometry args={[9.5, 10.2, .35, 64]} /><meshStandardMaterial color="#d9c4a4" roughness={.92} /></mesh>
    <mesh position={[-5.2, .15, -1.6]} receiveShadow><boxGeometry args={[4.4, .18, 3.2]} /><meshStandardMaterial color="#c7a885" roughness={.95} /></mesh>
    <mesh position={[4.0, .15, 1.8]} receiveShadow><boxGeometry args={[3.6, .18, 3.6]} /><meshStandardMaterial color="#b9c8b8" roughness={.95} /></mesh>
    <mesh position={[5.5, .15, -4.25]} receiveShadow><boxGeometry args={[3.5, .18, 3.2]} /><meshStandardMaterial color="#c9b39e" roughness={.95} /></mesh>
    <mesh position={[-2.7, .15, 3.8]} receiveShadow><boxGeometry args={[3.7, .18, 2.8]} /><meshStandardMaterial color="#c9ad8a" roughness={.95} /></mesh>
    <mesh position={[3.8, .15, -5.6]} receiveShadow><cylinderGeometry args={[2.5, 2.8, .18, 32]} /><meshStandardMaterial color="#b9b595" roughness={.95} /></mesh>
  </group>;
}

function FountainPlaza({ state }: { state: FountainSessionState }) {
  const complete = state.phase === 'complete';
  const synced = state.facts.includes('sync-valve');
  const water = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!water.current) return;
    water.current.rotation.y = clock.elapsedTime * .15;
    water.current.children.forEach((child, index) => {
      const scale = complete || synced || index !== 2 ? 1 : .42;
      child.scale.y = THREE.MathUtils.lerp(child.scale.y, scale, .08);
    });
  });
  return <group position={LOCATIONS.fountain.position}>
    <mesh receiveShadow><cylinderGeometry args={[2.08, 2.28, .42, 40]} /><meshStandardMaterial color="#8f8b7c" roughness={.9} /></mesh>
    <mesh position={[0,.31,0]}><cylinderGeometry args={[1.62, 1.85, .22, 40]} /><meshStandardMaterial color="#6caeb6" emissive="#2d7f89" emissiveIntensity={.4} roughness={.42} /></mesh>
    <mesh position={[0,1.08,0]} castShadow><cylinderGeometry args={[.42,.58,1.55,16]} /><meshStandardMaterial color="#b0ab98" roughness={.86} /></mesh>
    <group ref={water} position={[0,.58,0]}>
      {[[-.55,.36], [.55,.36], [-.42,-.45], [.42,-.45]].map(([x,z], index) => <group key={index} position={[x,0,z]}>
        <mesh position={[0,.78,0]}><cylinderGeometry args={[.07,.095,1.55,10]} /><meshStandardMaterial color="#9efff3" emissive="#53d4d2" emissiveIntensity={1.4} transparent opacity={.78} /></mesh>
        <pointLight position={[0,1.22,0]} intensity={complete ? 1.25 : .55} distance={3.2} color="#b5fff3" />
      </group>)}
    </group>
    <mesh position={[-1.2,.5,1.15]} rotation={[0,.5,.2]}><coneGeometry args={[.23,.5,4]} /><meshStandardMaterial color="#e8836e" roughness={.75} /></mesh>
  </group>;
}

function MusicianDock({ visited, active, onAsk }: { visited: boolean; active: boolean; onAsk: () => void }) {
  return <group position={LOCATIONS.melody.position}>
    <DockBuilding color="#a56e58" roof="#5d6670" />
    <mesh position={[-.35,.78,.55]} rotation={[0,.25,0]}><boxGeometry args={[.74,.06,.46]} /><meshStandardMaterial color="#f6e4bd" /></mesh>
    {[0, .55, 1.1].map((offset) => <mesh key={offset} position={[.75, 1.45 + offset * .2, .25]}><sphereGeometry args={[.07,12,8]} /><meshStandardMaterial color="#f3a17d" emissive="#b14d3f" emissiveIntensity={visited ? .5 : .16} /></mesh>)}
    <LocationHotspot position={[0,1.15,1.15]} color={LOCATIONS.melody.color} active={active} visited={visited} onClick={onAsk} />
  </group>;
}

function WaterCanal({ visited, active, onAsk }: { visited: boolean; active: boolean; onAsk: () => void }) {
  return <group position={LOCATIONS.water.position}>
    <mesh position={[0,.28,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[2.1,2.7]} /><meshStandardMaterial color="#4f9eab" emissive="#2d6d78" emissiveIntensity={.32} roughness={.28} /></mesh>
    {[-.7,0,.7].map((x) => <mesh key={x} position={[x,.65,.05]}><cylinderGeometry args={[.08,.08,.88,12]} /><meshStandardMaterial color="#dbd0ae" roughness={.82} /></mesh>)}
    <mesh position={[0,1.08,.02]}><boxGeometry args={[1.8,.08,.08]} /><meshStandardMaterial color="#c79858" /></mesh>
    <LocationHotspot position={[0,1.1,1.1]} color={LOCATIONS.water.color} active={active} visited={visited} onClick={onAsk} />
  </group>;
}

function WindAlley({ visited, active, onAsk }: { visited: boolean; active: boolean; onAsk: () => void }) {
  const ribbons = useRef<THREE.Group>(null);
  useFrame(({clock}) => { if (ribbons.current) ribbons.current.rotation.y = Math.sin(clock.elapsedTime * .9) * .17; });
  return <group position={LOCATIONS.wind.position}>
    <mesh position={[-.65,1.35,0]}><cylinderGeometry args={[.055,.075,2.7,8]} /><meshStandardMaterial color="#4c5960" /></mesh>
    <mesh position={[.65,1.35,0]}><cylinderGeometry args={[.055,.075,2.7,8]} /><meshStandardMaterial color="#4c5960" /></mesh>
    <mesh position={[0,2.55,0]}><boxGeometry args={[1.45,.07,.07]} /><meshStandardMaterial color="#52636a" /></mesh>
    <group ref={ribbons}>{[-.48,0,.48].map((x) => <group key={x} position={[x,2.24,0]}>
      <mesh><sphereGeometry args={[.16,12,8]} /><meshStandardMaterial color="#d7b46b" emissive="#8e642f" emissiveIntensity={.35} /></mesh>
      <mesh position={[.28,-.12,0]} rotation={[0,0,.26]}><boxGeometry args={[.62,.06,.035]} /><meshStandardMaterial color={visited ? '#c6c2bd' : '#a294db'} transparent opacity={.72} /></mesh>
    </group>)}</group>
    <LocationHotspot position={[0,1.08,1.15]} color={LOCATIONS.wind.color} active={active} visited={visited} onClick={onAsk} />
  </group>;
}

function Workshop({ unlocked, installed, active }: { unlocked: boolean; installed: boolean; active: boolean }) {
  const glow = useRef<THREE.PointLight>(null);
  useFrame(({clock}) => { if (glow.current) glow.current.intensity = unlocked ? 1.2 + Math.sin(clock.elapsedTime * 2) * .25 : .08; });
  return <group position={LOCATIONS.workshop.position}>
    <DockBuilding color="#8e7660" roof="#725447" />
    <mesh position={[0,.72,1.0]}><boxGeometry args={[1.7,.18,.65]} /><meshStandardMaterial color="#76523a" roughness={.82} /></mesh>
    <mesh position={[0,1.08,1.0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.28,.06,8,18]} /><meshStandardMaterial color={installed ? '#e8c86e' : '#8d7e69'} emissive={installed ? '#a66d24' : '#000'} emissiveIntensity={installed ? 1.35 : 0} /></mesh>
    <pointLight ref={glow} position={[0,1.8,.6]} distance={4.5} color="#ffc772" />
    {active && <LocationHotspot position={[0,1.18,1.18]} color="#f0bb62" active visited={installed} onClick={() => {}} />}
  </group>;
}

function Garden({ visited, active, onAsk }: { visited: boolean; active: boolean; onAsk: () => void }) {
  return <group position={LOCATIONS['full-song'].position}>
    {Array.from({length: 8}).map((_, index) => {
      const angle = index / 8 * Math.PI * 2;
      return <group key={index} position={[Math.cos(angle)*1.5,.2,Math.sin(angle)*1.5]}>
        <mesh><cylinderGeometry args={[.19,.22,.38,8]} /><meshStandardMaterial color="#c68d67" roughness={.85} /></mesh>
        <mesh position={[0,.42,0]}><sphereGeometry args={[.24,10,8]} /><meshStandardMaterial color={visited ? '#f4c576' : '#93b67d'} emissive={visited ? '#c88235' : '#2f6539'} emissiveIntensity={visited ? .8 : .2} /></mesh>
      </group>;
    })}
    <mesh position={[0,1.55,0]}><sphereGeometry args={[.18,12,8]} /><meshStandardMaterial color="#fff0ae" emissive="#ffbf59" emissiveIntensity={1.7} /></mesh>
    <LocationHotspot position={[0,1.12,1.7]} color={LOCATIONS['full-song'].color} active={active} visited={visited} onClick={onAsk} />
  </group>;
}

function DockBuilding({ color, roof }: { color: string; roof: string }) {
  return <group>
    <mesh position={[0,.7,0]} castShadow receiveShadow><boxGeometry args={[2.1,1.4,1.55]} /><meshStandardMaterial color={color} roughness={.9} /></mesh>
    <mesh position={[0,1.52,0]} rotation={[0,0,.12]}><boxGeometry args={[2.22,.12,1.7]} /><meshStandardMaterial color={roof} roughness={.74} /></mesh>
    <mesh position={[0,.82,.79]}><boxGeometry args={[.55,.46,.025]} /><meshStandardMaterial color="#ffd88e" emissive="#a96e30" emissiveIntensity={.74} /></mesh>
  </group>;
}

function LocationHotspot({ position, color, active, visited, onClick }: { position: Vec3; color: string; active: boolean; visited: boolean; onClick: () => void }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  useFrame(({clock}) => {
    if (!group.current) return;
    const scale = active || hovered ? 1 + Math.sin(clock.elapsedTime * 3) * .12 : visited ? .58 : .38;
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, scale, 7, 1/60));
    group.current.rotation.y = clock.elapsedTime * .7;
  });
  if (!active && !visited) return null;
  return <group ref={group} position={position} onClick={(event) => { event.stopPropagation(); if (active) onClick(); }} onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = active ? 'pointer' : 'default'; }} onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}>
    <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.32,.42,28]} /><meshBasicMaterial color={color} transparent opacity={active ? .9 : .3} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0,.1,0]}><sphereGeometry args={[.14,14,10]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.6 : .32} /></mesh>
    {active && <pointLight position={[0,.4,0]} color={color} intensity={1.7} distance={3.2} />}
  </group>;
}

function PiCompanion({ target, active }: { target: LocationId; active: boolean }) {
  const group = useRef<THREE.Group>(null);
  const desired = useMemo(() => new THREE.Vector3(), []);
  useFrame(({clock,}, delta) => {
    if (!group.current) return;
    const position = LOCATIONS[target].position;
    desired.set(position[0] + .85, .34, position[2] + .82);
    group.current.position.lerp(desired, 1 - Math.exp(-delta * (active ? 1.35 : 2.6)));
    group.current.rotation.y = Math.sin(clock.elapsedTime * 1.2) * .15;
  });
  return <group ref={group} position={[.9,.34,.85]}>
    <mesh castShadow><sphereGeometry args={[.38,18,14]} /><meshStandardMaterial color="#bbfbef" emissive="#64cfc7" emissiveIntensity={1.05} roughness={.38} /></mesh>
    <mesh position={[0,.1,.32]}><sphereGeometry args={[.075,10,8]} /><meshBasicMaterial color="#fff7b6" /></mesh>
    <mesh position={[.35,-.2,0]}><boxGeometry args={[.28,.24,.18]} /><meshStandardMaterial color="#b97952" roughness={.76} /></mesh>
    <pointLight position={[0,.1,0]} color="#adfff0" intensity={1.35} distance={3.2} />
  </group>;
}

function PathRibbons({ target, visible }: { target: LocationId; visible: boolean }) {
  const targetPosition = LOCATIONS[target].position;
  if (!visible || target === 'fountain') return null;
  const segments = 12;
  return <group>{Array.from({length:segments}).map((_, index) => {
    const t = (index + 1) / (segments + 1);
    const x = THREE.MathUtils.lerp(.8, targetPosition[0], t);
    const z = THREE.MathUtils.lerp(.8, targetPosition[2], t) + Math.sin(t*Math.PI) * .35;
    return <mesh key={index} position={[x,.23,z]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.055 + index*.004,12]} /><meshBasicMaterial color="#baf7e9" transparent opacity={.75 - index*.035} /></mesh>;
  })}</group>;
}

function HarborLandmarks() {
  return <group>
    {HARBOR_LANDMARKS.map((landmark) => (
      <HarborLandmark key={landmark.model} {...landmark} />
    ))}
  </group>;
}

function HarborLandmark({
  model,
  position,
  rotation,
  scale,
}: {
  model: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
}) {
  const gltf = useLoader(GLTFLoader, assetUrl(`assets/models/${model}`));
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        if (Array.isArray(object.material)) object.material = object.material.map((material) => material.clone());
        else object.material = object.material.clone();
      }
    });
    return clone;
  }, [gltf.scene]);
  return <group position={position} rotation={rotation} scale={scale}>
    <primitive object={scene} />
  </group>;
}

function HarborHomes() {
  return <group position={[0,0,-10]}>
    {Array.from({length: 15}).map((_, index) => {
      const x = -12 + index * 1.7;
      const height = 1.5 + (index % 4) * .38;
      return <group key={index} position={[x,height/2,0]}>
        <mesh castShadow><boxGeometry args={[1.38,height,1.22]} /><meshStandardMaterial color={index % 3 === 0 ? '#7a7c90' : index % 3 === 1 ? '#996e5a' : '#829578'} roughness={.93} /></mesh>
        <mesh position={[0,height/2+.14,0]} rotation={[0,0,index%2?.12:-.12]}><boxGeometry args={[1.48,.16,1.36]} /><meshStandardMaterial color="#394b5b" roughness={.78} /></mesh>
        {index%2===0 && <mesh position={[0,.1, .63]}><boxGeometry args={[.35,.28,.025]} /><meshStandardMaterial color="#ffcf7b" emissive="#a96023" emissiveIntensity={.8} /></mesh>}
      </group>;
    })}
  </group>;
}

function LanternField({ complete }: { complete: boolean }) {
  const lights = useRef<THREE.Group>(null);
  useFrame(({clock}) => { if(lights.current) lights.current.rotation.y = clock.elapsedTime*.04; });
  return <group ref={lights}>{[[-6,2,-4],[-2,2.4,-6],[1,2,-7],[5,2.2,-3],[7,2,1],[-7,2,3]].map((position, index) => <group key={index} position={position as Vec3}>
    <mesh><sphereGeometry args={[.11,12,8]} /><meshStandardMaterial color={complete?'#fff0ae':'#ffc976'} emissive={complete?'#d79c38':'#9e6225'} emissiveIntensity={complete?1.5:.7} /></mesh>
    <pointLight color={complete?'#ffe09a':'#ffbd6d'} intensity={complete?1.05:.45} distance={3.1} />
  </group>)}</group>;
}
