import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
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
  fountain: { position: [0, 0, 0], color: '#91e8dc', label: '喷泉广场' },
  melody: { position: [-5.2, 0, -1.6], color: '#faad87', label: '乐手码头' },
  water: { position: [3.8, 0, 1.7], color: '#73d9e5', label: '水线小渠' },
  wind: { position: [5.5, 0, -4.25], color: '#b1a4f0', label: '风铃小巷' },
  workshop: { position: [-2.7, 0, 3.8], color: '#f3c16e', label: '工具坊' },
  'full-song': { position: [3.8, 0, -5.6], color: '#ffdc83', label: '晚风花园' },
  'stable-water': { position: [3.8, 0, 1.7], color: '#73d9e5', label: '水线小渠' },
};

const JOURNEY_SECONDS = 2.7;
const RETURN_SECONDS = 2.15;

function easeInOut(value: number): number {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function journeyStateKey(state: FountainSessionState): string {
  return `${state.phase}:${state.pendingQuestion ?? 'fountain'}:${state.lastReturn?.fact?.id ?? 'none'}`;
}

function journeyTarget(state: FountainSessionState): LocationId {
  if (state.pendingQuestion) return state.pendingQuestion;
  if (state.phase === 'action') return 'workshop';
  if (state.phase === 'complete') return 'full-song';
  return 'fountain';
}

export function FountainStoryScene({
  state,
  onSelectQuestion,
}: {
  state: FountainSessionState;
  onSelectQuestion: (questionId: FountainQuestionId) => void;
}) {
  const available = availableFountainQuestions(state).map((question) => question.id);
  return (
    <div className="fountain-scene" aria-label="暮色中的喷泉街，Pi 会在此出发调查">
      <Canvas shadows dpr={[1, 1.8]} gl={{ antialias: true, alpha: false }} camera={{ position: [9.15, 5.9, 13.1], fov: 41, near: 0.1, far: 110 }}>
        <FountainRenderer />
        <FountainPost state={state} />
        <DuskSky />
        <fog attach="fog" args={['#24495a', 16, 35]} />
        <hemisphereLight args={['#ffd9ad', '#152c43', 1.45]} />
        <directionalLight position={[-10, 14, 6]} intensity={3.25} color="#ffbd79" castShadow shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[11, 8, -10]} intensity={.7} color="#9bdce4" />
        <pointLight position={[0, 5.3, 0]} intensity={2.8} color="#aaffee" distance={11} />
        <FountainCamera state={state} />
        <FountainTown state={state} available={available} onSelectQuestion={onSelectQuestion} />
      </Canvas>
    </div>
  );
}

function FountainRenderer() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.18;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  return null;
}

function FountainPost({ state }: { state: FountainSessionState }) {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const next = new EffectComposer(gl);
    next.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), .26, .42, .84);
    next.addPass(bloom);
    next.addPass(new OutputPass());
    return { next, bloom };
  }, [gl, scene, camera]);
  useEffect(() => {
    composer.next.setSize(size.width, size.height);
    composer.bloom.setSize(size.width, size.height);
  }, [composer, size.width, size.height]);
  useEffect(() => () => composer.next.dispose(), [composer]);
  useFrame((_, delta) => {
    const target = state.phase === 'complete' ? .52
      : state.phase === 'expedition' ? .40
        : state.phase === 'choose-question' ? .34
          : state.phase === 'return' ? .37
            : .26;
    composer.bloom.strength = THREE.MathUtils.damp(composer.bloom.strength, target, 2.2, delta);
    composer.next.render();
  }, 1);
  return null;
}

function DuskSky() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uSun: { value: new THREE.Vector3(-.7, .42, -.5) } },
    vertexShader: 'varying vec3 vWorld; void main(){ vec4 world = modelMatrix * vec4(position, 1.0); vWorld = world.xyz; gl_Position = projectionMatrix * viewMatrix * world; }',
    fragmentShader: 'uniform vec3 uSun; varying vec3 vWorld; void main(){ float h = normalize(vWorld).y * .5 + .5; vec3 horizon = vec3(.92,.42,.28); vec3 teal = vec3(.08,.20,.31); vec3 dusk = mix(horizon, vec3(.25,.48,.58), smoothstep(.12,.58,h)); dusk = mix(dusk, teal, smoothstep(.48,1.,h)); float glow = pow(max(0., dot(normalize(vWorld), normalize(uSun))), 18.); dusk += vec3(1.,.42,.16) * glow * .75; gl_FragColor = vec4(dusk,1.); }',
  }), []);
  return <mesh scale={[-1, 1, 1]}><sphereGeometry args={[70, 48, 28]} /><primitive object={material} attach="material" /></mesh>;
}

function FountainCamera({ state }: { state: FountainSessionState }) {
  const { camera } = useThree();
  const lookAt = useRef(new THREE.Vector3(0, 1.15, 0));
  const desired = useMemo(() => new THREE.Vector3(), []);
  const nextLookAt = useMemo(() => new THREE.Vector3(), []);
  const subject = useMemo(() => new THREE.Vector3(), []);
  const phaseStartedAt = useRef(0);
  const lastKey = useRef('');
  useFrame(({ clock }, delta) => {
    const key = journeyStateKey(state);
    if (key !== lastKey.current) {
      lastKey.current = key;
      phaseStartedAt.current = clock.elapsedTime;
    }
    const elapsed = clock.elapsedTime - phaseStartedAt.current;
    const targetId = journeyTarget(state);
    const target = LOCATIONS[targetId].position;
    const origin = new THREE.Vector3(1.42, .72, 1.26);
    const departing = state.phase === 'expedition' && targetId !== 'fountain';
    const returning = state.phase === 'return' && targetId !== 'fountain';
    const progress = departing ? easeInOut(elapsed / JOURNEY_SECONDS) : returning ? easeInOut(elapsed / RETURN_SECONDS) : 0;

    if (departing) subject.copy(origin).lerp(new THREE.Vector3(target[0], .72, target[2]), progress);
    else if (returning) subject.set(target[0], .72, target[2]).lerp(origin, progress);
    else if (state.phase === 'plan') subject.copy(origin).add(new THREE.Vector3(0, .06, 0));
    else if (state.phase === 'action' || state.phase === 'complete') subject.set(target[0], .9, target[2]);
    else subject.set(origin.x, 1.05, origin.z);

    if (state.phase === 'plan') {
      desired.set(5.25, 3.55, 7.45);
      nextLookAt.set(.05, .88, .05);
    } else if (returning) {
      desired.set(subject.x - 2.35, 2.18, subject.z + 3.25);
      nextLookAt.copy(subject).add(new THREE.Vector3(0, .34, 0));
    } else if (departing) {
      desired.set(subject.x + 3.7, 3.35, subject.z + 5.55);
      nextLookAt.copy(subject).add(new THREE.Vector3(0, .12, 0));
    } else if (state.phase === 'action' || state.phase === 'complete') {
      desired.set(target[0] + 4.1, 3.95, target[2] + 5.85);
      nextLookAt.set(target[0], .95, target[2]);
    } else {
      desired.set(9.15, 5.9, 13.1);
      nextLookAt.set(0, 1.06, 0);
    }

    camera.position.lerp(desired, 1 - Math.exp(-delta * (departing || returning ? 2.45 : 1.65)));
    lookAt.current.lerp(nextLookAt, 1 - Math.exp(-delta * (departing || returning ? 2.8 : 1.85)));
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
  const complete = state.phase === 'complete';
  return (
    <group>
      <HarborWater />
      <PavedPlaza />
      <StreetDressing complete={complete} />
      <FountainPlaza state={state} />
      <MusicianDock visited={hasFact('melody-page')} active={activeQuestion.includes('melody')} onAsk={() => onSelectQuestion('melody')} />
      <WaterCanal visited={hasFact('pressure-pattern') || hasFact('stable-water')} active={activeQuestion.includes('water') || activeQuestion.includes('stable-water')} onAsk={() => onSelectQuestion(hasFact('sync-valve') ? 'stable-water' : 'water')} />
      <WindAlley visited={hasFact('wind-refuted')} active={activeQuestion.includes('wind')} onAsk={() => onSelectQuestion('wind')} />
      <Workshop unlocked={hasFact('melody-page') && hasFact('pressure-pattern')} installed={hasFact('sync-valve')} active={state.phase === 'action'} />
      <Garden visited={hasFact('full-song')} active={activeQuestion.includes('full-song')} onAsk={() => onSelectQuestion('full-song')} />
      <HarborLandmarks />
      <HarborHomes />
      <HarborBoats />
      <PiCompanion state={state} target={piTarget} complete={complete} />
      <PathLanterns state={state} target={piTarget} />
      <LanternField complete={complete} />
      <Fireflies complete={complete} />
    </group>
  );
}

function HarborWater() {
  const material = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => { if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime; });
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.32, 0]} receiveShadow>
    <planeGeometry args={[46, 42, 64, 56]} />
    <shaderMaterial ref={material} transparent uniforms={{ uTime: { value: 0 } }}
      vertexShader={'uniform float uTime; varying vec2 vUv; varying float vWave; void main(){ vUv=uv; vec3 p=position; float wave=sin(p.x*.42+uTime*.62)*.11+sin(p.y*.58-uTime*.42)*.06; p.z+=wave; vWave=wave; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }'}
      fragmentShader={'uniform float uTime; varying vec2 vUv; varying float vWave; void main(){ vec3 deep=vec3(.035,.14,.22); vec3 shallow=vec3(.08,.38,.45); float shimmer=.5+.5*sin((vUv.x+vUv.y)*32.+uTime*1.1); vec3 col=mix(deep,shallow,.48+vWave*1.7); col+=vec3(.45,.33,.18)*pow(shimmer,22.)*.19; gl_FragColor=vec4(col,.98); }'} />
  </mesh>;
}

function PavedPlaza() {
  const stones = useMemo(() => {
    const next: { x: number; z: number; width: number; depth: number; rotation: number; color: string }[] = [];
    const palette = ['#a89f8d', '#c0b093', '#8f9189', '#b4a58e', '#9ba09a', '#c8b99e'];
    for (let row = 0, z = -8.55; z <= 8.3; row += 1, z += 1.02) {
      const rowOffset = row % 2 ? .44 : 0;
      for (let x = -9.15 + rowOffset; x <= 9.1; x += 1.03) {
        const radius = Math.hypot(x, z);
        if (radius < 2.5 || radius > 9.3 || (x < -3.15 && z > 2.35) || (x > 5.55 && z > 3.55)) continue;
        const key = Math.sin(x * 12.989 + z * 78.233) * 43758.5453;
        const noise = key - Math.floor(key);
        const keyTwo = Math.sin(x * 37.719 + z * 11.173) * 19347.27;
        const second = keyTwo - Math.floor(keyTwo);
        next.push({
          x: x + (noise - .5) * .14,
          z: z + (second - .5) * .12,
          width: .72 + noise * .27,
          depth: .69 + second * .3,
          rotation: (noise - .5) * .15,
          color: palette[Math.floor(noise * palette.length)],
        });
      }
    }
    return next;
  }, []);
  return <group>
    <mesh position={[0, -.02, 0]} receiveShadow><cylinderGeometry args={[10.25, 10.9, .42, 72]} /><meshStandardMaterial color="#76695e" roughness={.94} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,.205,0]} receiveShadow><ringGeometry args={[2.34,9.65,72]} /><meshStandardMaterial color="#c8b89d" roughness={.94} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,.218,0]}><ringGeometry args={[2.38,2.5,56]} /><meshStandardMaterial color="#80796f" roughness={.83} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,.22,0]}><ringGeometry args={[5.38,5.48,64]} /><meshStandardMaterial color="#a29481" roughness={.88} /></mesh>
    {stones.map((stone, index) => <mesh key={index} position={[stone.x,.23,stone.z]} rotation={[0,stone.rotation,0]} receiveShadow><boxGeometry args={[stone.width,.045,stone.depth]} /><meshStandardMaterial color={stone.color} roughness={.98} /></mesh>)}
    <DockDeck position={[-5.2,.25,-1.6]} size={[4.55,3.35]} />
    <DockDeck position={[-2.7,.25,3.8]} size={[3.85,2.95]} />
    <DockDeck position={[5.5,.25,-4.25]} size={[3.65,3.35]} />
  </group>;
}

function DockDeck({ position, size }: { position: Vec3; size: [number, number] }) {
  return <group position={position}>
    <mesh receiveShadow><boxGeometry args={[size[0], .18, size[1]]} /><meshStandardMaterial color="#6d5140" roughness={.94} /></mesh>
    {Array.from({ length: 8 }).map((_, index) => <mesh key={index} position={[0,.105,-size[1]/2+.24+index*(size[1]-.4)/7]}><boxGeometry args={[size[0]-.18,.035,.105]} /><meshStandardMaterial color={index % 2 ? '#9b7354' : '#815e49'} roughness={.9} /></mesh>)}
    {[-1,1].map((x) => [-1,1].map((z) => <mesh key={`${x}-${z}`} position={[x*(size[0]/2-.2),.5,z*(size[1]/2-.2)]}><cylinderGeometry args={[.08,.11,.7,8]} /><meshStandardMaterial color="#3a4644" roughness={.82} /></mesh>))}
  </group>;
}

function StreetDressing({ complete }: { complete: boolean }) {
  return <group>
    <BuntingLine position={[-1.0, 3.25, -4.1]} length={8.2} rotation={[0, -.08, 0]} />
    <BuntingLine position={[4.8, 2.9, 3.2]} length={4.2} rotation={[0, Math.PI / 2.2, 0]} />
    <PropCluster position={[-7.1, .35, 2.6]} flower="#ef896e" />
    <PropCluster position={[6.75, .35, 1.25]} flower="#f1c576" />
    <PropCluster position={[-4.55, .35, -4.55]} flower="#8ac2a1" />
    <StreetResident position={[-3.8, .42, -3.1]} jacket="#d67d5f" />
    <StreetResident position={[4.55, .42, 4.55]} jacket="#7797ac" flip />
    <HarborCat position={[-1.65, .36, -2.72]} />
    {complete && <CelebrationRibbons />}
  </group>;
}

function BuntingLine({ position, length, rotation }: { position: Vec3; length: number; rotation: Vec3 }) {
  const flags = ['#ef8b70', '#f3c46d', '#79b8a7', '#a79bd5', '#f0db9c'];
  return <group position={position} rotation={rotation}>
    <mesh position={[0,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.015,.015,length,6]} /><meshStandardMaterial color="#424d50" roughness={.72} /></mesh>
    {Array.from({ length: 7 }).map((_, index) => <mesh key={index} position={[-length/2+.52+index*(length-1.04)/6,-.2-(index%2)*.11,.01]} rotation={[0,0,Math.PI]}><coneGeometry args={[.16,.36,3]} /><meshStandardMaterial color={flags[index%flags.length]} roughness={.78} /></mesh>)}
  </group>;
}

function PropCluster({ position, flower }: { position: Vec3; flower: string }) {
  return <group position={position}>
    <mesh position={[-.32,.24,.12]}><cylinderGeometry args={[.22,.25,.48,10]} /><meshStandardMaterial color="#6d5040" roughness={.9} /></mesh>
    <mesh position={[.1,.2,-.14]}><boxGeometry args={[.43,.4,.43]} /><meshStandardMaterial color="#9f7048" roughness={.86} /></mesh>
    <group position={[.46,.28,.18]}><mesh><cylinderGeometry args={[.22,.25,.5,10]} /><meshStandardMaterial color="#b47656" roughness={.85} /></mesh><mesh position={[0,.47,0]}><sphereGeometry args={[.31,10,8]} /><meshStandardMaterial color="#61896f" roughness={.87} /></mesh>{[0,2.1,4.2].map((angle) => <mesh key={angle} position={[Math.cos(angle)*.21,.58,Math.sin(angle)*.21]}><sphereGeometry args={[.07,8,6]} /><meshStandardMaterial color={flower} emissive={flower} emissiveIntensity={.28} /></mesh>)}</group>
  </group>;
}

function StreetResident({ position, jacket, flip = false }: { position: Vec3; jacket: string; flip?: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (group.current) { group.current.position.y = position[1] + Math.sin(clock.elapsedTime*1.4 + position[0])*.035; group.current.rotation.y = flip ? -.52 : .5; } });
  return <group ref={group} position={position} scale={.82}>
    <mesh position={[0,.34,0]} castShadow><capsuleGeometry args={[.12,.34,4,8]} /><meshStandardMaterial color={jacket} roughness={.88} /></mesh>
    <mesh position={[0,.71,0]}><sphereGeometry args={[.13,12,8]} /><meshStandardMaterial color="#c99a73" roughness={.92} /></mesh>
    <mesh position={[.15,.37,.03]} rotation={[0,0,-.45]}><capsuleGeometry args={[.035,.18,4,6]} /><meshStandardMaterial color="#c99a73" roughness={.9} /></mesh>
    <mesh position={[-.07,.82,.1]}><sphereGeometry args={[.045,8,6]} /><meshBasicMaterial color="#f6d579" /></mesh>
  </group>;
}

function HarborCat({ position }: { position: Vec3 }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (group.current) group.current.rotation.y = Math.sin(clock.elapsedTime*1.8)*.2; });
  return <group ref={group} position={position} scale={.45}>
    <mesh position={[0,.2,0]}><sphereGeometry args={[.28,12,8]} /><meshStandardMaterial color="#d9a967" roughness={.9} /></mesh>
    <mesh position={[0,.46,0]}><sphereGeometry args={[.22,12,8]} /><meshStandardMaterial color="#d9a967" roughness={.9} /></mesh>
    {[-.12,.12].map((x) => <mesh key={x} position={[x,.64,0]}><coneGeometry args={[.09,.17,3]} /><meshStandardMaterial color="#c48557" /></mesh>)}
  </group>;
}

function CelebrationRibbons() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (group.current) group.current.rotation.y = clock.elapsedTime*.07; });
  return <group ref={group} position={[0,2.7,0]}>{Array.from({ length: 18 }).map((_, index) => { const angle=index/18*Math.PI*2; return <mesh key={index} position={[Math.cos(angle)*4.9,Math.sin(index*1.7)*.25,Math.sin(angle)*4.9]} rotation={[0,angle,0]}><planeGeometry args={[.06,.5]} /><meshBasicMaterial color={index%2?'#ffd274':'#a2f2dc'} transparent opacity={.72} side={THREE.DoubleSide} /></mesh>; })}</group>;
}

function FountainPlaza({ state }: { state: FountainSessionState }) {
  const complete = state.phase === 'complete';
  const synced = state.facts.includes('sync-valve');
  const water = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!water.current) return;
    water.current.rotation.y = clock.elapsedTime * .07;
    water.current.children.forEach((child, index) => {
      const scale = complete || synced || index !== 2 ? 1 : .36;
      child.scale.y = THREE.MathUtils.lerp(child.scale.y, scale, .075);
    });
  });
  return <group position={LOCATIONS.fountain.position}>
    <mesh receiveShadow><cylinderGeometry args={[2.22,2.5,.52,48]} /><meshStandardMaterial color="#716f69" roughness={.9} /></mesh>
    <mesh position={[0,.34,0]}><cylinderGeometry args={[1.88,2.1,.2,48]} /><meshStandardMaterial color="#3d96a5" emissive="#1d7280" emissiveIntensity={.48} roughness={.34} metalness={.08} /></mesh>
    <mesh position={[0,.58,0]}><cylinderGeometry args={[.88,1.04,.32,32]} /><meshStandardMaterial color="#929087" roughness={.88} /></mesh>
    <mesh position={[0,1.38,0]} castShadow><cylinderGeometry args={[.38,.55,1.38,16]} /><meshStandardMaterial color="#c0b39b" roughness={.78} /></mesh>
    <mesh position={[0,2.12,0]}><cylinderGeometry args={[.58,.38,.22,24]} /><meshStandardMaterial color="#e0c797" roughness={.62} metalness={.16} /></mesh>
    <group ref={water} position={[0,.52,0]}>
      {[0, Math.PI/2, Math.PI, Math.PI*1.5].map((angle, index) => <FountainJet key={index} angle={angle} bright={complete || synced} />)}
    </group>
    <mesh position={[-1.25,.54,1.15]} rotation={[0,.5,.2]} castShadow><coneGeometry args={[.23,.5,4]} /><meshStandardMaterial color="#e8836e" roughness={.75} /></mesh>
    <FountainRipples complete={complete || synced} />
  </group>;
}

function FountainJet({ angle, bright }: { angle: number; bright: boolean }) {
  const geometry = useMemo(() => {
    const x = Math.cos(angle), z = Math.sin(angle);
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x * .14, .18, z * .14),
      new THREE.Vector3(x * .35, 1.85, z * .35),
      new THREE.Vector3(x * 1.15, .35, z * 1.15),
    );
    return new THREE.TubeGeometry(curve, 18, .045, 6, false);
  }, [angle]);
  return <group>
    <mesh geometry={geometry}><meshStandardMaterial color="#b8fff3" emissive="#57d9d5" emissiveIntensity={bright ? 2.0 : .88} transparent opacity={.86} roughness={.16} /></mesh>
    <pointLight position={[Math.cos(angle)*.7,1.05,Math.sin(angle)*.7]} intensity={bright ? 1.25 : .45} distance={3.4} color="#aaffef" />
  </group>;
}

function FountainRipples({ complete }: { complete: boolean }) {
  const ripples = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ripples.current) ripples.current.rotation.z = Math.sin(clock.elapsedTime*.8)*.035; });
  return <group ref={ripples} position={[0,.47,0]}>{[.52,.92,1.32].map((radius, index) => <mesh key={radius} rotation={[-Math.PI/2,0,0]} scale={1+Math.sin(index+Date.now())*.01}><torusGeometry args={[radius,.018,5,32]} /><meshBasicMaterial color={complete ? '#f8e29a' : '#9af2e5'} transparent opacity={complete ? .48 : .28} /></mesh>)}</group>;
}

function MusicianDock({ visited, active, onAsk }: { visited: boolean; active: boolean; onAsk: () => void }) {
  const papers = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (papers.current) papers.current.rotation.y = Math.sin(clock.elapsedTime*.8)*.06; });
  return <group position={LOCATIONS.melody.position}>
    <DockHouse color="#9e634c" roof="#354554" />
    <mesh position={[-.42,.82,.68]} rotation={[0,.24,0]}><boxGeometry args={[.82,.06,.51]} /><meshStandardMaterial color="#f8e4b5" roughness={.9} /></mesh>
    <group ref={papers} position={[.62,1.32,.42]}>{[0,.28,.56].map((offset) => <group key={offset} position={[0,offset*.24,0]} rotation={[.12,offset*.8,0]}><mesh><planeGeometry args={[.48,.34]} /><meshStandardMaterial color="#f6dba3" emissive={visited ? '#9c5825' : '#000'} emissiveIntensity={visited?.26:0} side={THREE.DoubleSide} /></mesh><mesh position={[0,0,.012]}><boxGeometry args={[.28,.012,.02]} /><meshStandardMaterial color="#8e6450" /></mesh></group>)}</group>
    <DockLantern position={[-1.5,.28,.96]} color="#ffb968" />
    <DockMusician visited={visited} />
    <LocationHotspot position={[0,1.18,1.2]} color={LOCATIONS.melody.color} active={active} visited={visited} onClick={onAsk} />
  </group>;
}

function DockMusician({ visited }: { visited: boolean }) {
  const group = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = .54 + Math.sin(clock.elapsedTime*1.35)*.028;
    if (arm.current) arm.current.rotation.z = -.55 + Math.sin(clock.elapsedTime*4.2)*.22;
  });
  return <group ref={group} position={[-.92,.54,.1]} rotation={[0,.62,0]} scale={.82}>
    <mesh position={[0,.36,0]}><capsuleGeometry args={[.12,.32,4,8]} /><meshStandardMaterial color="#426a78" roughness={.88} /></mesh>
    <mesh position={[0,.74,0]}><sphereGeometry args={[.13,12,8]} /><meshStandardMaterial color="#cb9a72" roughness={.92} /></mesh>
    <mesh position={[0,.88,.02]}><sphereGeometry args={[.145,12,8]} /><meshStandardMaterial color="#4e413a" roughness={.9} /></mesh>
    <group ref={arm} position={[.12,.47,.08]}><mesh rotation={[0,0,-.5]}><capsuleGeometry args={[.035,.2,4,6]} /><meshStandardMaterial color="#cb9a72" /></mesh></group>
    <mesh position={[.15,.4,.15]} rotation={[0,.35,.3]}><sphereGeometry args={[.17,12,8]} scale={[1,.18,1.25]} /><meshStandardMaterial color="#c98b48" roughness={.58} metalness={.08} /></mesh>
    {visited && <pointLight position={[0,.62,.18]} intensity={.6} distance={2.4} color="#ffc975" />}
  </group>;
}

function WaterCanal({ visited, active, onAsk }: { visited: boolean; active: boolean; onAsk: () => void }) {
  const buoys = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (buoys.current) buoys.current.children.forEach((item,index) => { item.position.y = .65 + Math.sin(clock.elapsedTime*2+index)*.065; }); });
  return <group position={LOCATIONS.water.position}>
    <mesh position={[0,.27,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[2.35,2.85]} /><meshStandardMaterial color="#2e8694" emissive="#17636d" emissiveIntensity={visited ? .72 : .32} roughness={.22} metalness={.08} /></mesh>
    <mesh position={[0,.36,.05]}><boxGeometry args={[1.95,.09,.1]} /><meshStandardMaterial color="#d2a267" roughness={.8} /></mesh>
    {[-.9,.9].map((x) => <group key={x} position={[x,.38,.05]}><mesh><boxGeometry args={[.12,.38,2.7]} /><meshStandardMaterial color="#86634b" roughness={.86} /></mesh><mesh position={[0,.27,-.95]}><cylinderGeometry args={[.06,.08,.52,8]} /><meshStandardMaterial color="#3c4540" /></mesh></group>)}
    <group ref={buoys}>{[-.7,0,.7].map((x,index) => <group key={x} position={[x,.65,-.5+index*.36]}><mesh><sphereGeometry args={[.105,12,8]} /><meshStandardMaterial color={visited ? '#f8d36b' : '#f29b72'} emissive={visited ? '#c58a32' : '#9d4e37'} emissiveIntensity={visited ? 1.15 : .34} /></mesh><mesh position={[0,-.36,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.22,.013,5,24]} /><meshBasicMaterial color="#a4f5e8" transparent opacity={.38} /></mesh></group>)}</group>
    <LocationHotspot position={[0,1.18,1.18]} color={LOCATIONS.water.color} active={active} visited={visited} onClick={onAsk} />
  </group>;
}

function WindAlley({ visited, active, onAsk }: { visited: boolean; active: boolean; onAsk: () => void }) {
  const ribbons = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ribbons.current) ribbons.current.rotation.y = Math.sin(clock.elapsedTime*.86)*.16; });
  return <group position={LOCATIONS.wind.position}>
    <mesh position={[-.72,1.4,0]}><cylinderGeometry args={[.06,.085,2.8,8]} /><meshStandardMaterial color="#3f5054" roughness={.72} metalness={.2} /></mesh>
    <mesh position={[.72,1.4,0]}><cylinderGeometry args={[.06,.085,2.8,8]} /><meshStandardMaterial color="#3f5054" roughness={.72} metalness={.2} /></mesh>
    <mesh position={[0,2.66,0]}><boxGeometry args={[1.62,.1,.12]} /><meshStandardMaterial color="#555c5b" roughness={.72} /></mesh>
    <group ref={ribbons}>{[-.5,0,.5].map((x,index) => <group key={x} position={[x,2.35,0]}>
      <mesh><sphereGeometry args={[.18,12,8]} /><meshStandardMaterial color="#e7c16b" emissive="#a06c2e" emissiveIntensity={visited ? .82 : .38} metalness={.18} /></mesh>
      <mesh position={[.33,-.16,0]} rotation={[0,0,.28]}><boxGeometry args={[.72,.075,.045]} /><meshStandardMaterial color={visited ? '#c8c4bc' : '#a99ada'} transparent opacity={.78} /></mesh>
      {index === 1 && <pointLight position={[0,.1,.18]} intensity={visited ? .8 : .22} color="#f7d581" distance={3} />}
    </group>)}</group>
    <DockLantern position={[1.22,.28,.72]} color="#d7b9f0" />
    <LocationHotspot position={[0,1.14,1.2]} color={LOCATIONS.wind.color} active={active} visited={visited} onClick={onAsk} />
  </group>;
}

function Workshop({ unlocked, installed, active }: { unlocked: boolean; installed: boolean; active: boolean }) {
  const glow = useRef<THREE.PointLight>(null);
  const smoke = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.intensity = unlocked ? 1.45 + Math.sin(clock.elapsedTime * 2) * .3 : .08;
    if (smoke.current) smoke.current.position.x = Math.sin(clock.elapsedTime*.22)*.16;
  });
  return <group position={LOCATIONS.workshop.position}>
    <DockHouse color="#7b6252" roof="#604a43" />
    <mesh position={[-.72,2.08,-.32]}><cylinderGeometry args={[.17,.22,.9,10]} /><meshStandardMaterial color="#584943" roughness={.9} /></mesh>
    <group ref={smoke} position={[-.72,2.58,-.32]}>{[0,.38,.78].map((y,index) => <mesh key={y} position={[Math.sin(index)*.08,y,0]} scale={.78+index*.3}><sphereGeometry args={[.22,10,8]} /><meshBasicMaterial color="#8f9ba0" transparent opacity={.1-index*.015} depthWrite={false} /></mesh>)}</group>
    <mesh position={[0,.76,1.02]}><boxGeometry args={[1.85,.18,.72]} /><meshStandardMaterial color="#704d37" roughness={.82} /></mesh>
    <mesh position={[0,1.12,1.02]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.31,.07,8,20]} /><meshStandardMaterial color={installed ? '#f3cc6d' : '#847768'} emissive={installed ? '#b3732d' : '#000'} emissiveIntensity={installed ? 1.6 : 0} metalness={.22} /></mesh>
    <pointLight ref={glow} position={[0,1.85,.65]} distance={4.8} color="#ffc56e" />
    {active && <LocationHotspot position={[0,1.2,1.2]} color="#f0bb62" active visited={installed} onClick={() => {}} />}
  </group>;
}

function Garden({ visited, active, onAsk }: { visited: boolean; active: boolean; onAsk: () => void }) {
  const lights = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (lights.current) lights.current.rotation.y = clock.elapsedTime*.07; });
  return <group position={LOCATIONS['full-song'].position}>
    <mesh position={[0,.2,0]} receiveShadow><cylinderGeometry args={[2.42,2.7,.2,32]} /><meshStandardMaterial color="#758665" roughness={.93} /></mesh>
    {Array.from({length: 10}).map((_, index) => {
      const angle = index / 10 * Math.PI * 2;
      return <group key={index} position={[Math.cos(angle)*1.7,.2,Math.sin(angle)*1.7]}>
        <mesh><cylinderGeometry args={[.2,.23,.42,8]} /><meshStandardMaterial color="#b77c58" roughness={.85} /></mesh>
        <mesh position={[0,.45,0]}><sphereGeometry args={[.28,10,8]} /><meshStandardMaterial color={visited ? '#f4c576' : index%2 ? '#6eaa77' : '#8cad70'} emissive={visited ? '#d18a38' : '#2b613d'} emissiveIntensity={visited ? 1.05 : .24} /></mesh>
      </group>;
    })}
    <group ref={lights}>{[0,Math.PI/2,Math.PI,Math.PI*1.5].map((angle) => <group key={angle} position={[Math.cos(angle)*1.32,1.2,Math.sin(angle)*1.32]}><mesh><sphereGeometry args={[.11,12,8]} /><meshStandardMaterial color="#fff1a7" emissive="#ffbd5a" emissiveIntensity={visited ? 2 : .62} /></mesh>{visited && <pointLight intensity={.8} distance={2.7} color="#ffd98b" />}</group>)}</group>
    <LocationHotspot position={[0,1.16,1.72]} color={LOCATIONS['full-song'].color} active={active} visited={visited} onClick={onAsk} />
  </group>;
}

function DockHouse({ color, roof }: { color: string; roof: string }) {
  return <group>
    <mesh position={[0,.76,0]} castShadow receiveShadow><boxGeometry args={[2.16,1.52,1.6]} /><meshStandardMaterial color={color} roughness={.92} /></mesh>
    <mesh position={[0,1.6,0]} rotation={[0,0,.12]}><boxGeometry args={[2.34,.14,1.82]} /><meshStandardMaterial color={roof} roughness={.72} metalness={.04} /></mesh>
    <mesh position={[0,.9,.815]}><boxGeometry args={[.58,.52,.03]} /><meshStandardMaterial color="#ffe1a1" emissive="#bd722c" emissiveIntensity={.88} /></mesh>
    <mesh position={[-.74,.72,.825]}><boxGeometry args={[.25,.25,.028]} /><meshStandardMaterial color="#efbb72" emissive="#9a5923" emissiveIntensity={.4} /></mesh>
  </group>;
}

function DockLantern({ position, color }: { position: Vec3; color: string }) {
  return <group position={position}><mesh position={[0,.82,0]}><cylinderGeometry args={[.045,.06,1.45,8]} /><meshStandardMaterial color="#33403f" roughness={.72} /></mesh><mesh position={[0,1.55,0]}><sphereGeometry args={[.13,12,8]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.65} /></mesh><pointLight position={[0,1.48,0]} intensity={.72} distance={3.2} color={color} /></group>;
}

function LocationHotspot({ position, color, active, visited, onClick }: { position: Vec3; color: string; active: boolean; visited: boolean; onClick: () => void }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const scale = active || hovered ? 1 + Math.sin(clock.elapsedTime * 3) * .11 : visited ? .56 : .38;
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, scale, 7, 1/60));
    group.current.rotation.y = clock.elapsedTime * .62;
  });
  if (!active && !visited) return null;
  return <group ref={group} position={position} onClick={(event) => { event.stopPropagation(); if (active) onClick(); }} onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = active ? 'pointer' : 'default'; }} onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}>
    <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.34,.42,28]} /><meshBasicMaterial color={color} transparent opacity={active ? .94 : .26} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0,.07,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.62,.655,28]} /><meshBasicMaterial color={color} transparent opacity={active ? .38 : .12} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0,.45,0]} rotation={[0,Math.PI/4,0]}><octahedronGeometry args={[.17,0]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.9 : .36} roughness={.24} /></mesh>
    {active && <><pointLight position={[0,.52,0]} color={color} intensity={1.55} distance={3.4} />{[0,Math.PI*2/3,Math.PI*4/3].map((angle) => <mesh key={angle} position={[Math.cos(angle)*.48,.24,Math.sin(angle)*.48]}><sphereGeometry args={[.045,8,6]} /><meshBasicMaterial color={color} /></mesh>)}</>}
  </group>;
}

function PiCompanion({ state, target, complete }: { state: FountainSessionState; target: LocationId; complete: boolean }) {
  const group = useRef<THREE.Group>(null);
  const satchel = useRef<THREE.Group>(null);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const origin = useMemo(() => new THREE.Vector3(1.42, .5, 1.26), []);
  const phaseStartedAt = useRef(0);
  const lastKey = useRef('');
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const key = journeyStateKey(state);
    if (key !== lastKey.current) {
      lastKey.current = key;
      phaseStartedAt.current = clock.elapsedTime;
    }
    const elapsed = clock.elapsedTime - phaseStartedAt.current;
    const destination = LOCATIONS[target].position;
    const departing = state.phase === 'expedition' && target !== 'fountain';
    const returning = state.phase === 'return' && target !== 'fountain';
    const progress = departing ? easeInOut(elapsed / JOURNEY_SECONDS) : returning ? easeInOut(elapsed / RETURN_SECONDS) : 0;
    const destinationPoint = new THREE.Vector3(destination[0] + .35, .5, destination[2] + .4);
    if (departing) desired.copy(origin).lerp(destinationPoint, progress);
    else if (returning) desired.copy(destinationPoint).lerp(origin, progress);
    else if (state.phase === 'plan') desired.copy(origin);
    else desired.copy(destinationPoint);
    desired.y += Math.sin(clock.elapsedTime * 2.3) * .055;
    group.current.position.lerp(desired, 1 - Math.exp(-delta * (departing || returning ? 7.5 : 2.5)));
    const direction = desired.clone().sub(group.current.position);
    if (direction.lengthSq() > .0002) group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, Math.atan2(direction.x, direction.z), .14);
    else group.current.rotation.y = Math.sin(clock.elapsedTime * 1.15) * .17;
    if (satchel.current) satchel.current.rotation.z = Math.sin(clock.elapsedTime * (departing || returning ? 7.2 : 2.2)) * (returning ? .24 : .13);
  });
  const returning = state.phase === 'return' && target !== 'fountain';
  const tokenColor = state.lastReturn?.kind === 'refuted' ? '#c9c7d8' : state.lastReturn?.kind === 'refined' ? '#7ed5eb' : state.lastReturn?.kind === 'confirmed' ? '#ffe287' : '#f5b879';
  return <group ref={group} position={origin}>
    <mesh scale={state.phase === 'plan' ? 1.5 : 1.32}><sphereGeometry args={[.43,20,16]} /><meshBasicMaterial color="#93fff0" transparent opacity={state.phase === 'plan' ? .22 : .13} depthWrite={false} /></mesh>
    <mesh castShadow><sphereGeometry args={[.37,20,16]} /><meshStandardMaterial color={returning ? '#fff0be' : '#c8fff0'} emissive={complete ? '#ffe398' : returning ? tokenColor : '#56d7c8'} emissiveIntensity={complete ? 1.55 : returning ? 1.85 : state.phase === 'plan' ? 1.58 : 1.14} roughness={.32} /></mesh>
    <mesh position={[-.12,.06,.34]}><sphereGeometry args={[.035,10,8]} /><meshBasicMaterial color="#34585a" /></mesh>
    <mesh position={[.12,.06,.34]}><sphereGeometry args={[.035,10,8]} /><meshBasicMaterial color="#34585a" /></mesh>
    <mesh position={[0,.48,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.1,.018,6,16,Math.PI]} /><meshStandardMaterial color="#f4d77e" emissive="#b97d2e" emissiveIntensity={.75} /></mesh>
    <group ref={satchel} position={[.34,-.18,.02]}><mesh><boxGeometry args={[.24,.22,.17]} /><meshStandardMaterial color="#ad6c48" roughness={.77} /></mesh><mesh position={[0,.17,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.085,.015,6,12,Math.PI]} /><meshStandardMaterial color="#e2bd7b" /></mesh>{returning && <><mesh position={[.01,.48,.08]}><octahedronGeometry args={[.16,0]} /><meshStandardMaterial color={tokenColor} emissive={tokenColor} emissiveIntensity={2.35} roughness={.18} /></mesh><pointLight position={[.01,.48,.08]} color={tokenColor} intensity={1.45} distance={3.1} /></>}</group>
    {returning && <group position={[0,.92,.02]}><mesh rotation={[0,Math.PI/4,0]}><octahedronGeometry args={[.18,0]} /><meshStandardMaterial color={tokenColor} emissive={tokenColor} emissiveIntensity={2.9} roughness={.16} /></mesh><mesh rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.31,.016,6,24]} /><meshBasicMaterial color={tokenColor} transparent opacity={.62} /></mesh><pointLight color={tokenColor} intensity={1.75} distance={3.8} /></group>}
    <pointLight position={[0,.1,0]} color={complete ? '#ffe3a3' : returning ? tokenColor : '#adfff0'} intensity={state.phase === 'plan' ? 2.15 : returning ? 2.1 : 1.45} distance={3.4} />
  </group>;
}

function PathLanterns({ state, target }: { state: FountainSessionState; target: LocationId }) {
  const group = useRef<THREE.Group>(null);
  const targetPosition = LOCATIONS[target].position;
  const visible = (state.phase === 'plan' || state.phase === 'expedition' || state.phase === 'return') && target !== 'fountain';
  useFrame(({ clock }) => {
    if (!group.current) return;
    const reversing = state.phase === 'return';
    group.current.children.forEach((child, index) => {
      const wave = .5 + .5 * Math.sin(clock.elapsedTime * 5.2 + (reversing ? index : 12 - index) * .72);
      child.scale.setScalar(.82 + wave * .55);
      const light = child.children.find((item) => item instanceof THREE.PointLight) as THREE.PointLight | undefined;
      if (light) light.intensity = .12 + wave * .7;
    });
  });
  if (!visible) return null;
  return <group ref={group}>{Array.from({length: 13}).map((_, index) => {
    const t = (index + 1) / 14;
    const x = THREE.MathUtils.lerp(1.42, targetPosition[0], t);
    const z = THREE.MathUtils.lerp(1.26, targetPosition[2], t) + Math.sin(t*Math.PI) * .44;
    return <group key={index} position={[x,.3,z]}><mesh><sphereGeometry args={[.07 + index*.003,10,8]} /><meshStandardMaterial color="#fff0a7" emissive="#e5a54f" emissiveIntensity={1.75} /></mesh><pointLight intensity={.45} distance={2.0} color="#ffd37b" /></group>;
  })}</group>;
}

function HarborLandmarks() {
  return <group>{HARBOR_LANDMARKS.map((landmark) => <HarborLandmark key={landmark.model} {...landmark} />)}</group>;
}

function HarborLandmark({ model, position, rotation, scale }: { model: string; position: Vec3; rotation: Vec3; scale: number }) {
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
  return <group position={position} rotation={rotation} scale={scale}><primitive object={scene} /></group>;
}

function HarborHomes() {
  return <group position={[0,0,-10]}>{Array.from({length: 15}).map((_, index) => {
    const x = -12 + index * 1.7;
    const height = 1.45 + (index % 4) * .38;
    return <group key={index} position={[x,height/2,0]}>
      <mesh castShadow><boxGeometry args={[1.38,height,1.22]} /><meshStandardMaterial color={index % 3 === 0 ? '#536b79' : index % 3 === 1 ? '#9e6f59' : '#708d77'} roughness={.93} /></mesh>
      <mesh position={[0,height/2+.14,0]} rotation={[0,0,index%2?.12:-.12]}><boxGeometry args={[1.48,.16,1.36]} /><meshStandardMaterial color="#334353" roughness={.78} /></mesh>
      {index%2===0 && <mesh position={[0,.1,.63]}><boxGeometry args={[.35,.28,.025]} /><meshStandardMaterial color="#ffcf7b" emissive="#b66d28" emissiveIntensity={1.15} /></mesh>}
    </group>;
  })}</group>;
}

function HarborBoats() {
  const boat = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (boat.current) { boat.current.position.x = -8.7 + Math.sin(clock.elapsedTime*.15)*1.4; boat.current.rotation.z = Math.sin(clock.elapsedTime*.7)*.035; } });
  return <group ref={boat} position={[-8.7,.02,6.7]} rotation={[0,.32,0]}><mesh position={[0,.18,0]}><boxGeometry args={[1.5,.28,.58]} /><meshStandardMaterial color="#60443a" roughness={.9} /></mesh><mesh position={[.1,.58,0]}><boxGeometry args={[.5,.48,.34]} /><meshStandardMaterial color="#e0b16a" emissive="#85501f" emissiveIntensity={.45} /></mesh><mesh position={[-.24,.92,0]}><boxGeometry args={[.04,.95,.04]} /><meshStandardMaterial color="#343b3d" /></mesh></group>;
}

function LanternField({ complete }: { complete: boolean }) {
  const lights = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (lights.current) lights.current.rotation.y = clock.elapsedTime*.025; });
  return <group ref={lights}>{[[-6,2,-4],[-2,2.4,-6],[1,2,-7],[5,2.2,-3],[7,2,1],[-7,2,3]].map((position, index) => <group key={index} position={position as Vec3}>
    <mesh><sphereGeometry args={[.12,12,8]} /><meshStandardMaterial color={complete?'#fff0ae':'#ffc976'} emissive={complete?'#d79c38':'#9e6225'} emissiveIntensity={complete?1.65:.92} /></mesh>
    <pointLight color={complete?'#ffe09a':'#ffbd6d'} intensity={complete?1.15:.52} distance={3.3} />
  </group>)}</group>;
}

function Fireflies({ complete }: { complete: boolean }) {
  const points = useMemo(() => {
    const values: number[] = [];
    for (let i=0;i<70;i+=1) {
      const angle = i * 2.399;
      const radius = 2.8 + (i % 10) * .62;
      values.push(Math.cos(angle)*radius, .65+(i%7)*.31, Math.sin(angle)*radius-.7);
    }
    return new Float32Array(values);
  }, []);
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (group.current) { group.current.rotation.y = clock.elapsedTime*.018; group.current.position.y = Math.sin(clock.elapsedTime*.8)*.06; } });
  return <group ref={group}><points><bufferGeometry><bufferAttribute attach="attributes-position" args={[points,3]} /></bufferGeometry><pointsMaterial color={complete ? '#fff2a6' : '#ffd981'} size={.07} transparent opacity={complete ? .85 : .48} sizeAttenuation depthWrite={false} /></points></group>;
}
