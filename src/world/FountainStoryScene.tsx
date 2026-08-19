import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
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
export type StoryLocationId = FountainQuestionId | 'fountain' | 'workshop';
export type MissionTheme = 'fountain' | 'lighthouse' | 'parcel' | 'kite' | 'keys' | 'cinema' | 'seed' | 'card' | 'windmill' | 'orders' | 'fogbell' | 'festival';
type StoryReturnKind = 'fact' | 'detour' | 'confirmed' | 'reply' | 'refuted' | 'refined';
export type MemoryWindBeat = 'notice' | 'hold' | 'reframe';

export interface StoryRoutePresentation {
  target?: StoryLocationId;
  travelSeconds?: number;
  returnSeconds?: number;
  returnKind?: StoryReturnKind;
}

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

const HARBOR_LANDMARKS = [
  { model: 'arrival-harbor.glb', position: [-8.4, 0.2, -9.2] as Vec3, rotation: [0, .38, 0] as Vec3, scale: .72 },
  { model: 'session-archive.glb', position: [-1.0, 0.2, -10.6] as Vec3, rotation: [0, -.16, 0] as Vec3, scale: .86 },
  { model: 'model-core.glb', position: [7.4, 0.2, -9.4] as Vec3, rotation: [0, -.42, 0] as Vec3, scale: .62 },
] as const;

const LOCATIONS: Record<StoryLocationId, { position: Vec3; color: string; label: string }> = {
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

function missionCameraFocus(theme: MissionTheme): Vec3 {
  const focus: Record<MissionTheme, Vec3> = {
    fountain: [0, 1.05, 0], lighthouse: [-7.25, 1.3, -5.55], parcel: [4.82, .96, 4.7],
    kite: [-5.2, 1.1, -1.6], keys: [-1.0, 1.1, -8.8], cinema: [3.8, 1.0, 1.7],
    seed: [3.8, 1.0, -5.6], card: [4.82, 1.0, 4.7], windmill: [5.5, 1.4, -4.25],
    orders: [0, 1.05, 0], fogbell: [-5.2, 1.1, -1.6], festival: [0, 1.05, 0],
  };
  return focus[theme];
}

function easeInOut(value: number): number {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function journeyStateKey(state: FountainSessionState): string {
  return `${state.phase}:${state.pendingQuestion ?? 'fountain'}:${state.lastReturn?.fact?.id ?? 'none'}`;
}

function journeyTarget(state: FountainSessionState): StoryLocationId {
  if (state.pendingQuestion) return state.pendingQuestion;
  if (state.phase === 'action') return 'workshop';
  if (state.phase === 'complete') return 'full-song';
  return 'fountain';
}

export function FountainStoryScene({
  state,
  onSelectQuestion,
  missionTheme = 'fountain',
  missionFacts = [],
  storyRoute,
  memoryWind = false,
  memoryWindBeat = 'notice',
  heroPi = false,
  onSceneReady,
}: {
  state: FountainSessionState;
  onSelectQuestion: (questionId: FountainQuestionId) => void;
  missionTheme?: MissionTheme;
  missionFacts?: string[];
  storyRoute?: StoryRoutePresentation;
  memoryWind?: boolean;
  memoryWindBeat?: MemoryWindBeat;
  heroPi?: boolean;
  onSceneReady?: () => void;
}) {
  const available = availableFountainQuestions(state).map((question) => question.id);
  const presentation = useMemo(() => ({
    target: storyRoute?.target ?? journeyTarget(state),
    travelSeconds: storyRoute?.travelSeconds ?? JOURNEY_SECONDS,
    returnSeconds: storyRoute?.returnSeconds ?? RETURN_SECONDS,
    returnKind: storyRoute?.returnKind,
  }), [state, storyRoute]);
  return (
    <div className="fountain-scene" aria-label="暮色中的喷泉街，Pi 会在此出发调查">
      <Canvas shadows dpr={[1, 1.8]} gl={{ antialias: true, alpha: false }} camera={{ position: [9.15, 5.9, 13.1], fov: 41, near: 0.1, far: 110 }} onCreated={() => onSceneReady?.()}>
        <FountainRenderer cinematic={memoryWind && missionTheme === 'kite'} />
        {!memoryWind && <FountainPost state={state} memoryWind={memoryWind} />}
        <DuskSky cinematic={memoryWind && missionTheme === 'kite'} />
        <fog attach="fog" args={memoryWind && missionTheme === 'kite' ? ['#274a5a', 13, 31] : ['#24495a', 16, 35]} />
        <hemisphereLight args={memoryWind && missionTheme === 'kite' ? ['#9fb3c8', '#112b3b', 1.08] : ['#ffd9ad', '#152c43', 1.45]} />
        <directionalLight position={[-10, 14, 6]} intensity={memoryWind && missionTheme === 'kite' ? 2.05 : 3.25} color={memoryWind && missionTheme === 'kite' ? '#ffd09d' : '#ffbd79'} castShadow shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[11, 8, -10]} intensity={memoryWind && missionTheme === 'kite' ? .92 : .7} color={memoryWind && missionTheme === 'kite' ? '#78a9c5' : '#9bdce4'} />
        <pointLight position={[0, 5.3, 0]} intensity={memoryWind ? .2 : 2.8} color="#aaffee" distance={11} />
        {memoryWind && missionTheme === 'kite' && <><pointLight position={[-4.7, 2.2, 2.7]} intensity={1.12} color="#ffc36f" distance={5.2} /><pointLight position={[4.9, 2.1, -3.75]} intensity={1.18} color="#ffb96c" distance={4.8} /></>}
        <FountainCamera state={state} missionTheme={missionTheme} presentation={presentation} memoryWind={memoryWind} />
        <FountainTown state={state} available={available} onSelectQuestion={onSelectQuestion} missionTheme={missionTheme} missionFacts={missionFacts} presentation={presentation} memoryWind={memoryWind} memoryWindBeat={memoryWindBeat} heroPi={heroPi} />
      </Canvas>
    </div>
  );
}

function FountainRenderer({ cinematic = false }: { cinematic?: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = cinematic ? .82 : 1.18;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [cinematic, gl]);
  return null;
}

function FountainPost({ state, memoryWind }: { state: FountainSessionState; memoryWind: boolean }) {
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
    const target = memoryWind ? .12 : state.phase === 'complete' ? .52
      : state.phase === 'expedition' ? .40
        : state.phase === 'choose-question' ? .34
          : state.phase === 'return' ? .37
            : .26;
    composer.bloom.strength = THREE.MathUtils.damp(composer.bloom.strength, target, 2.2, delta);
    composer.next.render();
  }, 1);
  return null;
}

function DuskSky({ cinematic = false }: { cinematic?: boolean }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uSun: { value: new THREE.Vector3(-.7, cinematic ? .24 : .42, -.5) } },
    vertexShader: 'varying vec3 vWorld; void main(){ vec4 world = modelMatrix * vec4(position, 1.0); vWorld = world.xyz; gl_Position = projectionMatrix*viewMatrix*world; }',
    fragmentShader: cinematic
      ? 'uniform vec3 uSun; varying vec3 vWorld; void main(){ float h=normalize(vWorld).y*.5+.5; vec3 horizon=vec3(.16,.31,.40); vec3 upper=vec3(.025,.10,.18); vec3 dusk=mix(horizon,upper,smoothstep(.16,.9,h)); float glow=pow(max(0.,dot(normalize(vWorld),normalize(uSun))),22.); dusk+=vec3(1.,.50,.24)*glow*.42; gl_FragColor=vec4(dusk,1.); }'
      : 'uniform vec3 uSun; varying vec3 vWorld; void main(){ float h = normalize(vWorld).y * .5 + .5; vec3 horizon = vec3(.92,.42,.28); vec3 teal = vec3(.08,.20,.31); vec3 dusk = mix(horizon, vec3(.25,.48,.58), smoothstep(.12,.58,h)); dusk = mix(dusk, teal, smoothstep(.48,1.,h)); float glow = pow(max(0., dot(normalize(vWorld), normalize(uSun))), 18.); dusk += vec3(1.,.42,.16) * glow * .75; gl_FragColor = vec4(dusk,1.); }',
  }), [cinematic]);
  return <mesh scale={[-1, 1, 1]}><sphereGeometry args={[70, 48, 28]} /><primitive object={material} attach="material" /></mesh>;
}

function FountainCamera({ state, missionTheme, presentation, memoryWind }: { state: FountainSessionState; missionTheme: MissionTheme; presentation: Required<Omit<StoryRoutePresentation, 'returnKind'>> & Pick<StoryRoutePresentation, 'returnKind'>; memoryWind: boolean }) {
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
    const targetId = presentation.target;
    const target = LOCATIONS[targetId].position;
    const origin = new THREE.Vector3(1.42, .72, 1.26);
    const returnHome = new THREE.Vector3(-1.55, 1.02, 2.35);
    const departing = state.phase === 'expedition' && targetId !== 'fountain';
    const returning = state.phase === 'return' && targetId !== 'fountain';
    const progress = departing ? easeInOut(elapsed / presentation.travelSeconds) : returning ? easeInOut(elapsed / presentation.returnSeconds) : 0;

    if (departing) subject.copy(origin).lerp(new THREE.Vector3(target[0], .72, target[2]), progress);
    else if (returning) subject.set(target[0], .72, target[2]).lerp(returnHome, progress);
    else if (state.phase === 'plan') subject.copy(origin).add(new THREE.Vector3(0, .06, 0));
    else if (state.phase === 'action' || state.phase === 'complete') subject.set(target[0], .9, target[2]);
    else subject.set(origin.x, 1.05, origin.z);

    if (memoryWind) {
      const reveal = easeInOut(elapsed / 2.5);
      desired.set(7.85 - reveal * 2.15, 3.12 - reveal * .48, 10.45 - reveal * 1.3);
      nextLookAt.set(-.58, 1.28, .12);
    } else if (state.phase === 'plan') {
      desired.set(5.25, 3.55, 7.45);
      nextLookAt.set(.05, .88, .05);
    } else if (returning) {
      desired.set(subject.x + 4.25, 3.05, subject.z + 5.15);
      nextLookAt.copy(subject).add(new THREE.Vector3(0, .42, 0));
    } else if (departing) {
      desired.set(subject.x + 3.7, 3.35, subject.z + 5.55);
      nextLookAt.copy(subject).add(new THREE.Vector3(0, .12, 0));
    } else if (state.phase === 'action' || state.phase === 'complete') {
      desired.set(target[0] + 4.1, 3.95, target[2] + 5.85);
      nextLookAt.set(target[0], .95, target[2]);
    } else {
      const landmark = missionCameraFocus(missionTheme);
      desired.set(landmark[0] + 7.25, landmark[1] + 4.45, landmark[2] + 9.15);
      nextLookAt.set(landmark[0], landmark[1], landmark[2]);
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
  missionTheme,
  missionFacts,
  presentation,
  memoryWind,
  memoryWindBeat,
  heroPi,
}: {
  state: FountainSessionState;
  available: FountainQuestionId[];
  onSelectQuestion: (questionId: FountainQuestionId) => void;
  missionTheme: MissionTheme;
  missionFacts: string[];
  presentation: Required<Omit<StoryRoutePresentation, 'returnKind'>> & Pick<StoryRoutePresentation, 'returnKind'>;
  memoryWind: boolean;
  memoryWindBeat: MemoryWindBeat;
  heroPi: boolean;
}) {
  const hasFact = (fact: FountainSessionState['facts'][number]) => state.facts.includes(fact);
  const activeQuestion = state.phase === 'choose-question' ? available : [];
  const piTarget: StoryLocationId = state.phase === 'plan' || state.phase === 'expedition' || state.phase === 'return'
    ? presentation.target
    : state.phase === 'action'
      ? 'workshop'
      : state.phase === 'complete'
        ? presentation.target
        : 'fountain';
  const complete = state.phase === 'complete';
  return (
    <group>
      <HarborWater />
      <PavedPlaza cinematic={memoryWind && missionTheme === 'kite'} />
      {memoryWind && missionTheme === 'kite' && <MemoryWindHarborLayer />}
      <MissionSetDressing theme={missionTheme} facts={missionFacts} />
      {memoryWind && missionTheme === 'kite' && <MemoryWindPhenomenon beat={memoryWindBeat} />}
      <StreetDressing complete={complete} />
      <FountainPlaza state={state} memoryWind={memoryWind} />
      <MusicianDock visited={hasFact('melody-page')} complete={complete} active={activeQuestion.includes('melody')} onAsk={() => onSelectQuestion('melody')} />
      <WaterCanal visited={hasFact('pressure-pattern') || hasFact('stable-water')} active={activeQuestion.includes('water') || activeQuestion.includes('stable-water')} onAsk={() => onSelectQuestion(hasFact('sync-valve') ? 'stable-water' : 'water')} />
      <WindAlley visited={hasFact('wind-refuted')} active={activeQuestion.includes('wind')} onAsk={() => onSelectQuestion('wind')} />
      <Workshop unlocked={hasFact('melody-page') && hasFact('pressure-pattern')} installed={hasFact('sync-valve')} active={state.phase === 'action'} />
      <Garden visited={hasFact('full-song')} active={activeQuestion.includes('full-song')} onAsk={() => onSelectQuestion('full-song')} />
      <DeferredHarborLandmarks />
      <HarborHomes cinematic={memoryWind && missionTheme === 'kite'} />
      <HarborBoats />
      <PiCompanion state={state} target={piTarget} complete={complete} presentation={presentation} memoryWind={memoryWind && missionTheme === 'kite'} memoryWindBeat={memoryWindBeat} heroPi={heroPi} />
      <PathLanterns state={state} target={piTarget} presentation={presentation} />
      <LanternField complete={complete} />
      <Fireflies complete={complete} />
    </group>
  );
}

function MissionSetDressing({ theme, facts }: { theme: MissionTheme; facts: string[] }) {
  if (theme === 'lighthouse') return <LighthouseMissionLandmark adjusted={facts.includes('gear-adjusted')} confirmed={facts.includes('light-confirmed')} />;
  if (theme === 'parcel') return <ParcelMissionLandmark delivered={facts.includes('delivered')} hasOldAddress={facts.includes('old-address')} hasNewStreet={facts.includes('new-street')} />;
  if (theme !== 'fountain') return <ChapterLandmark theme={theme} facts={facts} />;
  return null;
}

function MemoryWindPhenomenon({ beat }: { beat: MemoryWindBeat }) {
  const group = useRef<THREE.Group>(null);
  const sheets = useRef<THREE.Group>(null);
  const reframe = beat === 'reframe';
  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = clock.elapsedTime * .18;
      group.current.position.y = 1.45 + Math.sin(clock.elapsedTime * 1.35) * .11;
    }
    if (sheets.current) sheets.current.children.forEach((sheet, index) => {
      sheet.rotation.z = Math.sin(clock.elapsedTime * 1.8 + index * 1.7) * .18 + (reframe ? -.14 : .14);
      sheet.position.y = Math.sin(clock.elapsedTime * 1.35 + index) * .12;
    });
  });
  return <group position={[-1.72, 2.12, 1.18]} ref={group}>
    <group ref={sheets}>{Array.from({ length: 5 }).map((_, index) => {
      const angle = index / 5 * Math.PI * 2 + .2;
      const radius = 1.05 + (index % 2) * .22;
      return <mesh key={index} position={[Math.cos(angle) * radius, (index - 2) * .19, Math.sin(angle) * radius * .52]} rotation={[.22, angle + .6, .14]}><planeGeometry args={[.43,.29]} /><meshStandardMaterial color="#f2dfb2" emissive="#b88947" emissiveIntensity={.34} roughness={.82} side={THREE.DoubleSide} /></mesh>;
    })}</group>
    <group rotation={[.15, .22, -.78]}>
      <mesh position={[0,.12,0]}><torusGeometry args={[1.14,.05,8,72,Math.PI * 1.54]} /><meshStandardMaterial color="#b84f55" emissive="#7c252d" emissiveIntensity={.62} roughness={.52} /></mesh>
      <mesh position={[.95,.68,.03]} rotation={[0,0,.34]}><planeGeometry args={[.72,.72]} /><meshStandardMaterial color="#c95a5c" emissive="#7f2f35" emissiveIntensity={.4} side={THREE.DoubleSide} /></mesh>
      <mesh position={[.98,.19,.02]} rotation={[0,0,.34]}><cylinderGeometry args={[.018,.018,.86,6]} /><meshStandardMaterial color="#e9bd7f" /></mesh>
    </group>
    {[-.74,.82].map((x) => <group key={x} position={[x,.32,0]}><mesh><sphereGeometry args={[.105,12,10]} /><meshStandardMaterial color="#ffd789" emissive="#e7a347" emissiveIntensity={1.4} /></mesh><pointLight color="#ffd58a" intensity={.72} distance={2.35} /></group>)}
    <mesh position={[0,-1.3,0]} rotation={[0,.26,0]}><cylinderGeometry args={[.018,.018,1.9,6]} /><meshStandardMaterial color="#e6c47d" /></mesh>
    {reframe && <MemoryWindRoute />}
  </group>;
}

function MemoryWindHarborLayer() {
  return <group>
    <group position={[-4.7, .18, 2.7]} rotation={[0, .26, 0]}>
      <mesh castShadow><cylinderGeometry args={[.16,.2,1.5,10]} /><meshStandardMaterial color="#1d2b31" roughness={.58} metalness={.48} /></mesh>
      <mesh position={[0,1.05,0]}><cylinderGeometry args={[.32,.26,.42,10]} /><meshStandardMaterial color="#a26f39" roughness={.42} metalness={.55} /></mesh>
      <mesh position={[0,1.05,.01]}><cylinderGeometry args={[.22,.2,.27,10]} /><meshStandardMaterial color="#ffca72" emissive="#cc7628" emissiveIntensity={1.28} roughness={.24} /></mesh>
      <pointLight position={[0,1.05,.28]} intensity={1.16} distance={5.4} color="#ffc370" />
    </group>
    <group position={[-3.35,.24,1.92]} rotation={[0,.12,0]}>
      <mesh rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.48,.045,8,24]} /><meshStandardMaterial color="#7e512f" roughness={.42} metalness={.54} /></mesh>
      <mesh position={[.58,.14,.12]} rotation={[0,.18,0]}><cylinderGeometry args={[.09,.12,.42,8]} /><meshStandardMaterial color="#3e322a" roughness={.76} /></mesh>
    </group>
    <group position={[3.85,.22,-4.65]} rotation={[0,-.56,0]} scale={.78}>
      <mesh castShadow receiveShadow position={[0,1.35,0]}><boxGeometry args={[2.42,2.7,1.38]} /><meshStandardMaterial color="#52383a" roughness={.9} /></mesh>
      <mesh position={[0,2.76,0]} rotation={[0,0,.14]}><boxGeometry args={[2.7,.2,1.66]} /><meshStandardMaterial color="#202d36" roughness={.68} metalness={.08} /></mesh>
      <mesh position={[0,1.08,.705]}><boxGeometry args={[.62,1.36,.035]} /><meshStandardMaterial color="#a84b42" roughness={.72} /></mesh>
      <mesh position={[0,1.08,.733]}><boxGeometry args={[.12,.12,.035]} /><meshStandardMaterial color="#e8bb66" emissive="#a76829" emissiveIntensity={.72} roughness={.3} metalness={.34} /></mesh>
      {[-.72,.72].map((x) => <group key={x} position={[x,1.78,.715]}><mesh><boxGeometry args={[.38,.44,.035]} /><meshStandardMaterial color="#ffcb79" emissive="#b96827" emissiveIntensity={1.12} roughness={.28} /></mesh><mesh position={[0,.26,.01]}><boxGeometry args={[.44,.035,.05]} /><meshStandardMaterial color="#2b2322" /></mesh></group>)}
      <mesh position={[0,.22,.96]}><boxGeometry args={[1.22,.18,.64]} /><meshStandardMaterial color="#6d655c" roughness={.94} /></mesh>
      <mesh position={[0,.11,1.32]}><boxGeometry args={[.96,.18,.52]} /><meshStandardMaterial color="#777064" roughness={.94} /></mesh>
      <pointLight position={[0,1.62,.95]} intensity={1.34} distance={4.9} color="#ffb967" />
    </group>
  </group>;
}

function MemoryWindRoute() {
  const route = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!route.current) return;
    route.current.children.forEach((child, index) => {
      const pulse = .74 + Math.sin(clock.elapsedTime * 3.1 - index * .72) * .22;
      child.scale.setScalar(pulse);
    });
  });
  return <group ref={route} position={[.78,-.58,.18]} rotation={[.16,.32,0]}>
    {Array.from({ length: 6 }).map((_, index) => <group key={index} position={[.4 + index * .49, .02 + index * .13, -.08 - index * .08]}>
      <mesh><sphereGeometry args={[.075,10,8]} /><meshStandardMaterial color="#ffd88a" emissive="#e89b49" emissiveIntensity={1.48} /></mesh>
      {index === 5 && <mesh position={[.18,.12,0]} rotation={[0,0,-.7]}><planeGeometry args={[.26,.18]} /><meshStandardMaterial color="#f2dfb2" emissive="#b88947" emissiveIntensity={.46} side={THREE.DoubleSide} /></mesh>}
    </group>)}
  </group>;
}

function ChapterLandmark({ theme, facts }: { theme: Exclude<MissionTheme, 'fountain' | 'lighthouse' | 'parcel'>; facts: string[] }) {
  const animated = useRef<THREE.Group>(null);
  const completeFact: Record<typeof theme, string> = {
    kite: 'kite-home', keys: 'keys-open', cinema: 'cinema-ready', seed: 'seed-bloom', card: 'card-delivered', windmill: 'windmill-steady', orders: 'orders-evening', fogbell: 'fogbell-clear', festival: 'festival-lit',
  };
  const complete = facts.includes(completeFact[theme]);
  const palette: Record<typeof theme, { color: string; glow: string; position: Vec3 }> = {
    kite: { color: '#e76c72', glow: '#ffcf86', position: [-5.55, .38, -3.8] }, keys: { color: '#6d7698', glow: '#f5cc75', position: [-1.25, .3, -8.35] }, cinema: { color: '#7299b6', glow: '#dbefff', position: [2.55, .32, 3.9] },
    seed: { color: '#6d9d73', glow: '#ef8dc0', position: [3.8, .32, -5.6] }, card: { color: '#c66664', glow: '#ffe1a1', position: [4.82, .32, 4.7] }, windmill: { color: '#c49b66', glow: '#d8f0b9', position: [6.75, .32, -5.6] },
    orders: { color: '#bb7652', glow: '#ffdc8f', position: [-4.4, .32, 4.65] }, fogbell: { color: '#6f8890', glow: '#b3f1e9', position: [-7.45, .32, -2.55] }, festival: { color: '#795d9e', glow: '#ffe28d', position: [0, .42, -6.8] },
  };
  const { color, glow, position } = palette[theme];
  useFrame(({ clock }) => { if (animated.current) { animated.current.rotation.y = Math.sin(clock.elapsedTime * .45) * .08; animated.current.position.y = Math.sin(clock.elapsedTime * 1.4) * .035; } });
  if (theme === 'kite') return <group ref={animated} position={position}><mesh rotation={[0,0,Math.PI/4]}><planeGeometry args={[.92,.92]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={complete ? 1.35 : .35} side={THREE.DoubleSide} /></mesh><mesh position={[0,-.84,0]}><cylinderGeometry args={[.02,.02,1.35,6]} /><meshStandardMaterial color="#f4d09a" /></mesh><pointLight color={glow} intensity={complete ? 1.25 : .18} distance={3.6} /></group>;
  if (theme === 'keys') return <group ref={animated} position={position}><mesh><boxGeometry args={[1.7,2.35,.38]} /><meshStandardMaterial color={color} roughness={.88} /></mesh><mesh position={[0,.16,.23]}><torusGeometry args={[.55,.09,8,24,Math.PI]} /><meshStandardMaterial color={complete ? glow : '#2f3a46'} emissive={complete ? glow : '#000'} emissiveIntensity={complete ? 1.4 : 0} /></mesh><pointLight color={glow} intensity={complete ? 1.55 : .15} distance={4.4} /></group>;
  if (theme === 'cinema') return <group ref={animated} position={position}><mesh><boxGeometry args={[2.75,1.42,.12]} /><meshStandardMaterial color={complete ? '#f7f1d5' : color} emissive={complete ? glow : '#000'} emissiveIntensity={complete ? .55 : 0} /></mesh>{[-1,1].map((x) => <mesh key={x} position={[x*1.2,-.75,0]}><cylinderGeometry args={[.055,.075,1.45,8]} /><meshStandardMaterial color="#3c4c50" /></mesh>)}<mesh position={[0,1.02,0]}><coneGeometry args={[2.0,.54,4]} /><meshStandardMaterial color="#6b7d88" roughness={.85} /></mesh><pointLight color={glow} intensity={complete ? 1.3 : .2} distance={5} /></group>;
  if (theme === 'seed') return <group ref={animated} position={position}>{Array.from({ length: 7 }).map((_, index) => { const angle = index / 7 * Math.PI * 2; return <group key={index} position={[Math.cos(angle)*.7,.26,Math.sin(angle)*.58]}><mesh rotation={[Math.PI/2,0,angle]}><coneGeometry args={[.22,.62,8]} /><meshStandardMaterial color={complete ? '#f08ec4' : color} emissive={complete ? '#de669f' : '#000'} emissiveIntensity={complete ? .82 : 0} /></mesh></group>; })}<pointLight color={glow} intensity={complete ? 1.45 : .1} distance={4.3} /></group>;
  if (theme === 'card') return <group ref={animated} position={position}>{Array.from({length: 5}).map((_, index) => <mesh key={index} position={[-.65 + index*.33,.95 + (index%2)*.25,.12]} rotation={[0,.2,(index-2)*.09]}><planeGeometry args={[.27,.36]} /><meshStandardMaterial color={complete ? '#fff1c4' : color} emissive={complete ? glow : '#000'} emissiveIntensity={complete ? .5 : 0} side={THREE.DoubleSide} /></mesh>)}<pointLight color={glow} intensity={complete ? 1.25 : .15} distance={3.8} /></group>;
  if (theme === 'windmill') return <group ref={animated} position={position}><mesh><cylinderGeometry args={[.52,.72,2.45,8]} /><meshStandardMaterial color={color} roughness={.87} /></mesh><group position={[0,1.1,.43]} rotation={[0,0,complete ? performance.now()*.0008 : .1]}>{[0,Math.PI/2,Math.PI,Math.PI*1.5].map((angle) => <mesh key={angle} rotation={[0,0,angle]} position={[0,0,0]}><boxGeometry args={[.12,1.55,.06]} /><meshStandardMaterial color={complete ? '#eff0c7' : '#967857'} /></mesh>)}</group><pointLight color={glow} intensity={complete ? 1.05 : .1} distance={4} /></group>;
  if (theme === 'orders') return <group ref={animated} position={position}><mesh><boxGeometry args={[2.3,1.1,1.1]} /><meshStandardMaterial color={color} roughness={.85} /></mesh><mesh position={[0,1.1,0]}><coneGeometry args={[1.75,.58,4]} /><meshStandardMaterial color={complete ? '#efc072' : '#7b5c5c'} /></mesh>{complete && <pointLight color={glow} intensity={1.25} distance={4.4} />}</group>;
  if (theme === 'fogbell') return <group ref={animated} position={position}><mesh><cylinderGeometry args={[.38,.52,1.85,8]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0,1.2,0]}><sphereGeometry args={[.34,12,8]} /><meshStandardMaterial color={complete ? glow : '#708e92'} emissive={complete ? glow : '#000'} emissiveIntensity={complete ? 1.4 : 0} /></mesh><mesh position={[.62,.65,0]}><torusGeometry args={[.26,.06,8,14]} /><meshStandardMaterial color="#d3aa6a" /></mesh><pointLight color={glow} intensity={complete ? 1.55 : .18} distance={5.1} /></group>;
  return <group ref={animated} position={position}>{Array.from({length: 9}).map((_, index) => { const angle=index/9*Math.PI*2; return <mesh key={index} position={[Math.cos(angle)*1.25,.4+Math.sin(index)*.16,Math.sin(angle)*.8]}><sphereGeometry args={[.1,10,8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={complete ? 2 : .35} /></mesh>; })}<mesh position={[0,1.35,0]} rotation={[0,Math.PI/4,0]}><octahedronGeometry args={[.4,0]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={complete ? 2.8 : .35} /></mesh><pointLight color={glow} intensity={complete ? 2.3 : .2} distance={6.5} /></group>;
}

function LighthouseMissionLandmark({ adjusted, confirmed }: { adjusted: boolean; confirmed: boolean }) {
  const beacon = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (beacon.current) beacon.current.rotation.y = clock.elapsedTime * (confirmed ? .9 : .32); });
  const glow = confirmed ? 3.25 : adjusted ? 1.35 : .42;
  return <group position={[-7.25,.24,-5.55]} rotation={[0,.42,0]}>
    <mesh castShadow><cylinderGeometry args={[.62,.83,3.2,14]} /><meshStandardMaterial color="#ded1ae" roughness={.86} /></mesh>
    <mesh position={[0,1.8,0]}><cylinderGeometry args={[.82,.78,.32,14]} /><meshStandardMaterial color="#52666b" roughness={.68} /></mesh>
    <mesh position={[0,2.12,0]}><cylinderGeometry args={[.48,.48,.42,12]} /><meshStandardMaterial color={confirmed ? '#fff1a8' : '#f1c872'} emissive={confirmed ? '#f3b64c' : '#8a5c31'} emissiveIntensity={glow} roughness={.26} /></mesh>
    <mesh position={[0,2.55,0]}><coneGeometry args={[.92,.72,4]} /><meshStandardMaterial color="#3f4e55" roughness={.76} /></mesh>
    <group ref={beacon} position={[0,2.15,0]}><mesh rotation={[0,0,Math.PI/2]}><coneGeometry args={[.1,2.8,8,1,true]} /><meshBasicMaterial color="#fff0a1" transparent opacity={confirmed ? .22 : .08} side={THREE.DoubleSide} depthWrite={false} /></mesh></group>
    <pointLight position={[0,2.12,0]} color="#ffd77d" intensity={glow} distance={8} />
    <group position={[.88,.38,.48]}><mesh><boxGeometry args={[.5,.35,.08]} /><meshStandardMaterial color="#76533e" roughness={.88} /></mesh><mesh position={[0,.05,.05]}><planeGeometry args={[.33,.18]} /><meshBasicMaterial color={adjusted ? '#f6cb78' : '#e8d3a1'} /></mesh></group>
  </group>;
}

function ParcelMissionLandmark({ delivered, hasOldAddress, hasNewStreet }: { delivered: boolean; hasOldAddress: boolean; hasNewStreet: boolean }) {
  const letters = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (letters.current) letters.current.position.y = .92 + Math.sin(clock.elapsedTime * 2.5) * .04; });
  return <group position={[4.82,.28,4.7]} rotation={[0,-.54,0]}>
    <mesh castShadow><boxGeometry args={[2.25,1.65,1.55]} /><meshStandardMaterial color="#9d5d4b" roughness={.9} /></mesh>
    <mesh position={[0,.1,.79]}><boxGeometry args={[.72,1.06,.05]} /><meshStandardMaterial color="#b8463d" roughness={.82} /></mesh>
    <mesh position={[0,.74,.825]}><boxGeometry args={[.1,.16,.03]} /><meshStandardMaterial color="#f3d482" emissive="#a96d2e" emissiveIntensity={.55} /></mesh>
    <mesh position={[0,1.05,0]}><boxGeometry args={[2.46,.14,1.74]} /><meshStandardMaterial color="#454b50" roughness={.72} /></mesh>
    <group position={[-1.12,.62,.8]}><mesh><cylinderGeometry args={[.08,.1,1.05,8]} /><meshStandardMaterial color="#3a4748" /></mesh><mesh position={[0,.6,0]}><boxGeometry args={[.66,.3,.08]} /><meshStandardMaterial color={hasNewStreet ? '#6fa9b5' : '#7a7b72'} emissive={hasNewStreet ? '#3d6f80' : '#000'} emissiveIntensity={.55} /></mesh><mesh position={[0,.78,.05]}><boxGeometry args={[.42,.055,.02]} /><meshBasicMaterial color="#f0e1b8" /></mesh></group>
    <group position={[1.08,.5,.67]}><mesh><boxGeometry args={[.42,.72,.38]} /><meshStandardMaterial color="#d35b48" roughness={.8} /></mesh><mesh position={[0,.2,.205]}><boxGeometry args={[.2,.04,.012]} /><meshBasicMaterial color="#f5dfaa" /></mesh></group>
    <group ref={letters}>{(hasOldAddress || hasNewStreet || delivered) && <><mesh rotation={[0,.45,.14]}><planeGeometry args={[.45,.3]} /><meshStandardMaterial color="#fff0c9" emissive="#d9a859" emissiveIntensity={delivered ? 1.45 : .46} side={THREE.DoubleSide} /></mesh>{delivered && <pointLight color="#ffe18d" intensity={1.35} distance={3.6} />}</>}</group>
  </group>;
}

function DeferredHarborLandmarks() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 1800);
    return () => window.clearTimeout(timer);
  }, []);
  return visible ? <Suspense fallback={null}><HarborLandmarks /></Suspense> : null;
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

function PavedPlaza({ cinematic = false }: { cinematic?: boolean }) {
  const stones = useMemo(() => {
    const next: { x: number; z: number; width: number; depth: number; rotation: number; color: string }[] = [];
    const palette = cinematic ? ['#5b5f60', '#726b61', '#4d5960', '#807465', '#616c6b', '#887968'] : ['#a89f8d', '#c0b093', '#8f9189', '#b4a58e', '#9ba09a', '#c8b99e'];
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
  }, [cinematic]);
  return <group>
    <mesh position={[0, -.02, 0]} receiveShadow><cylinderGeometry args={[10.25, 10.9, .42, 72]} /><meshStandardMaterial color={cinematic ? '#42494b' : '#76695e'} roughness={.94} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,.205,0]} receiveShadow><ringGeometry args={[2.34,9.65,72]} /><meshStandardMaterial color={cinematic ? '#5e625e' : '#c8b89d'} roughness={.94} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,.218,0]}><ringGeometry args={[2.38,2.5,56]} /><meshStandardMaterial color={cinematic ? '#494e4f' : '#80796f'} roughness={.83} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,.22,0]}><ringGeometry args={[5.38,5.48,64]} /><meshStandardMaterial color={cinematic ? '#62615a' : '#a29481'} roughness={.88} /></mesh>
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

function FountainPlaza({ state, memoryWind }: { state: FountainSessionState; memoryWind: boolean }) {
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
  return     <group position={LOCATIONS.fountain.position} scale={memoryWind ? .64 : 1}>
    <mesh receiveShadow><cylinderGeometry args={[2.22,2.5,.52,48]} /><meshStandardMaterial color={memoryWind ? '#4b4e4d' : '#716f69'} roughness={.9} /></mesh>
    <mesh position={[0,.34,0]}><cylinderGeometry args={[1.88,2.1,.2,48]} /><meshStandardMaterial color={memoryWind ? '#20586b' : '#3d96a5'} emissive={memoryWind ? '#0d3340' : '#1d7280'} emissiveIntensity={memoryWind ? .14 : .48} roughness={memoryWind ? .64 : .34} metalness={.08} /></mesh>
    <mesh position={[0,.58,0]}><cylinderGeometry args={[.88,1.04,.32,32]} /><meshStandardMaterial color={memoryWind ? '#6a665d' : '#929087'} roughness={.88} /></mesh>
    <mesh position={[0,1.38,0]} castShadow><cylinderGeometry args={[.38,.55,1.38,16]} /><meshStandardMaterial color={memoryWind ? '#8f7b61' : '#c0b39b'} roughness={.78} /></mesh>
    <mesh position={[0,2.12,0]}><cylinderGeometry args={[.58,.38,.22,24]} /><meshStandardMaterial color="#e0c797" roughness={.62} metalness={.16} /></mesh>
    <group ref={water} position={[0,.52,0]}>
      {[0, Math.PI/2, Math.PI, Math.PI*1.5].map((angle, index) => <FountainJet key={index} angle={angle} bright={complete || synced} dim={memoryWind} />)}
    </group>
    <mesh position={[-1.25,.54,1.15]} rotation={[0,.5,.2]} castShadow><coneGeometry args={[.23,.5,4]} /><meshStandardMaterial color={complete ? '#f4cd7a' : '#e8836e'} emissive={complete ? '#b77a2b' : '#000'} emissiveIntensity={complete ? .75 : 0} roughness={.75} /></mesh>
    {complete && <mesh position={[-1.25,.82,1.15]} rotation={[0,.5,.2]}><planeGeometry args={[.22,.15]} /><meshBasicMaterial color="#fff2c8" /></mesh>}
    <FountainRipples complete={complete || synced} />
    <ThinkingTable melody={state.facts.includes('melody-page')} pressure={state.facts.includes('pressure-pattern')} rethink={state.phase === 'action' || synced || complete} />
  </group>;
}

function FountainJet({ angle, bright, dim }: { angle: number; bright: boolean; dim: boolean }) {
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
    <mesh geometry={geometry}><meshStandardMaterial color="#b8fff3" emissive="#57d9d5" emissiveIntensity={dim ? .22 : bright ? 2.0 : .88} transparent opacity={dim ? .3 : .86} roughness={.16} /></mesh>
    <pointLight position={[Math.cos(angle)*.7,1.05,Math.sin(angle)*.7]} intensity={dim ? .08 : bright ? 1.25 : .45} distance={3.4} color="#aaffef" />
  </group>;
}

function FountainRipples({ complete }: { complete: boolean }) {
  const ripples = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ripples.current) ripples.current.rotation.z = Math.sin(clock.elapsedTime*.8)*.035; });
  return <group ref={ripples} position={[0,.47,0]}>{[.52,.92,1.32].map((radius, index) => <mesh key={radius} rotation={[-Math.PI/2,0,0]} scale={1+Math.sin(index+Date.now())*.01}><torusGeometry args={[radius,.018,5,32]} /><meshBasicMaterial color={complete ? '#f8e29a' : '#9af2e5'} transparent opacity={complete ? .48 : .28} /></mesh>)}</group>;
}

function ThinkingTable({ melody, pressure, rethink }: { melody: boolean; pressure: boolean; rethink: boolean }) {
  const link = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!link.current) return;
    link.current.rotation.y = clock.elapsedTime * .34;
    link.current.position.y = .72 + Math.sin(clock.elapsedTime * 2.1) * .028;
  });
  const slots = [
    { filled: melody, position: [-.33, .78, 0] as Vec3, color: '#f2a76e' },
    { filled: pressure, position: [.33, .78, 0] as Vec3, color: '#73d9e5' },
  ];
  return <group position={[1.34, .26, 1.32]} rotation={[0, -.58, 0]}>
    <mesh receiveShadow><cylinderGeometry args={[.72, .78, .22, 10]} /><meshStandardMaterial color="#755d4b" roughness={.87} /></mesh>
    <mesh position={[0,.17,0]}><cylinderGeometry args={[.64,.64,.05,10]} /><meshStandardMaterial color="#d6c49e" roughness={.92} /></mesh>
    {slots.map((slot, index) => <group key={index} position={slot.position}>
      <mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.4,.28]} /><meshStandardMaterial color={slot.filled ? '#fff4d6' : '#9d937f'} emissive={slot.filled ? slot.color : '#000'} emissiveIntensity={slot.filled ? .38 : 0} roughness={.88} /></mesh>
      {slot.filled && <mesh position={[0,.03,.012]}><boxGeometry args={[.24,.028,.035]} /><meshStandardMaterial color={slot.color} emissive={slot.color} emissiveIntensity={1.1} /></mesh>}
    </group>)}
    {rethink && <group ref={link}><mesh rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.5,.025,6,28]} /><meshBasicMaterial color="#f6d37a" transparent opacity={.75} /></mesh><mesh position={[0,.16,0]} rotation={[0,Math.PI/4,0]}><octahedronGeometry args={[.13,0]} /><meshStandardMaterial color="#ffe4a0" emissive="#f4b850" emissiveIntensity={2.3} roughness={.2} /></mesh><pointLight position={[0,.32,0]} color="#ffd275" intensity={1.25} distance={3.2} /></group>}
  </group>;
}

function MusicianDock({ visited, complete, active, onAsk }: { visited: boolean; complete: boolean; active: boolean; onAsk: () => void }) {
  const papers = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (papers.current) papers.current.rotation.y = Math.sin(clock.elapsedTime*.8)*.06; });
  return <group position={LOCATIONS.melody.position}>
    <DockHouse color="#9e634c" roof="#354554" />
    <mesh position={[-.42,.82,.68]} rotation={[0,.24,0]}><boxGeometry args={[.82,.06,.51]} /><meshStandardMaterial color="#f8e4b5" roughness={.9} /></mesh>
    <group ref={papers} position={[.62,1.32,.42]}>{[0,.28,.56].map((offset) => <group key={offset} position={[0,offset*.24,0]} rotation={[.12,offset*.8,0]}><mesh><planeGeometry args={[.48,.34]} /><meshStandardMaterial color="#f6dba3" emissive={visited ? '#9c5825' : '#000'} emissiveIntensity={visited?.26:0} side={THREE.DoubleSide} /></mesh><mesh position={[-.08,.05,.012]}><boxGeometry args={[.21,.012,.02]} /><meshStandardMaterial color="#8e6450" /></mesh><mesh position={[.16,.05,.014]}><boxGeometry args={[visited ? .07 : .018,.012,.02]} /><meshStandardMaterial color={visited ? '#8e6450' : '#e56c5a'} emissive={visited ? '#000' : '#b83f2e'} emissiveIntensity={visited ? 0 : .9} /></mesh></group>)}</group>
    <DockLantern position={[-1.5,.28,.96]} color="#ffb968" />
    <DockMusician visited={visited} complete={complete} />
    <LocationHotspot position={[0,1.18,1.2]} color={LOCATIONS.melody.color} active={active} visited={visited} onClick={onAsk} />
  </group>;
}

function DockMusician({ visited, complete }: { visited: boolean; complete: boolean }) {
  const group = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = .54 + Math.sin(clock.elapsedTime*1.35)*.028;
    if (arm.current) arm.current.rotation.z = -.55 + Math.sin(clock.elapsedTime * (complete ? 6.4 : 4.2)) * (complete ? .34 : .22);
  });
  return <group ref={group} position={[-.92,.54,.1]} rotation={[0,.62,0]} scale={.82}>
    <mesh position={[0,.36,0]}><capsuleGeometry args={[.12,.32,4,8]} /><meshStandardMaterial color="#426a78" roughness={.88} /></mesh>
    <mesh position={[0,.74,0]}><sphereGeometry args={[.13,12,8]} /><meshStandardMaterial color="#cb9a72" roughness={.92} /></mesh>
    <mesh position={[0,.88,.02]}><sphereGeometry args={[.145,12,8]} /><meshStandardMaterial color="#4e413a" roughness={.9} /></mesh>
    <group ref={arm} position={[.12,.47,.08]}><mesh rotation={[0,0,-.5]}><capsuleGeometry args={[.035,.2,4,6]} /><meshStandardMaterial color="#cb9a72" /></mesh></group>
    <mesh position={[.15,.4,.15]} rotation={[0,.35,.3]}><sphereGeometry args={[.17,12,8]} scale={[1,.18,1.25]} /><meshStandardMaterial color="#c98b48" roughness={.58} metalness={.08} /></mesh>
    {visited && <pointLight position={[0,.62,.18]} intensity={complete ? 1.15 : .6} distance={complete ? 3.2 : 2.4} color="#ffc975" />}
    {complete && <group position={[.58,.68,.15]}>{[0,.24,.48].map((x, index) => <mesh key={x} position={[x,Math.sin(index)*.12,0]} rotation={[0,0,.35]}><sphereGeometry args={[.055,8,6]} /><meshBasicMaterial color="#ffe39a" /></mesh>)}</group>}
  </group>;
}

function WaterCanal({ visited, active, onAsk }: { visited: boolean; active: boolean; onAsk: () => void }) {
  const buoys = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (buoys.current) buoys.current.children.forEach((item,index) => { item.position.y = .65 + Math.sin(clock.elapsedTime*2+index)*.065 - (index === 2 && !visited ? .16 : 0); }); });
  return <group position={LOCATIONS.water.position}>
    <mesh position={[0,.27,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[2.35,2.85]} /><meshStandardMaterial color="#2e8694" emissive="#17636d" emissiveIntensity={visited ? .72 : .32} roughness={.22} metalness={.08} /></mesh>
    <mesh position={[0,.36,.05]}><boxGeometry args={[1.95,.09,.1]} /><meshStandardMaterial color="#d2a267" roughness={.8} /></mesh>
    {[-.9,.9].map((x) => <group key={x} position={[x,.38,.05]}><mesh><boxGeometry args={[.12,.38,2.7]} /><meshStandardMaterial color="#86634b" roughness={.86} /></mesh><mesh position={[0,.27,-.95]}><cylinderGeometry args={[.06,.08,.52,8]} /><meshStandardMaterial color="#3c4540" /></mesh></group>)}
    <group ref={buoys}>{[-.7,0,.7].map((x,index) => <group key={x} position={[x,.65,-.5+index*.36]}><mesh><sphereGeometry args={[.105,12,8]} /><meshStandardMaterial color={visited ? '#f8d36b' : index === 2 ? '#f3c96c' : '#f29b72'} emissive={visited ? '#c58a32' : index === 2 ? '#ae762f' : '#9d4e37'} emissiveIntensity={visited ? 1.15 : index === 2 ? .92 : .34} /></mesh><mesh position={[0,-.36,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.22,.013,5,24]} /><meshBasicMaterial color="#a4f5e8" transparent opacity={.38} /></mesh></group>)}</group>
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
    {visited && <group position={[.96,.72,.46]} rotation={[0,.3,.18]}><mesh><octahedronGeometry args={[.13,0]} /><meshStandardMaterial color="#d2d3d5" emissive="#a9b8c8" emissiveIntensity={.72} roughness={.3} /></mesh><mesh position={[0,-.15,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.2,.012,5,18]} /><meshBasicMaterial color="#e4b27b" transparent opacity={.6} /></mesh></group>}
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

function PiCompanion({ state, target, complete, presentation, memoryWind, memoryWindBeat, heroPi }: { state: FountainSessionState; target: StoryLocationId; complete: boolean; presentation: Required<Omit<StoryRoutePresentation, 'returnKind'>> & Pick<StoryRoutePresentation, 'returnKind'>; memoryWind: boolean; memoryWindBeat: MemoryWindBeat; heroPi: boolean }) {
  const group = useRef<THREE.Group>(null);
  const satchel = useRef<THREE.Group>(null);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const origin = useMemo(() => new THREE.Vector3(memoryWind ? -1.18 : 1.42, memoryWind ? .54 : .5, memoryWind ? 1.92 : 1.26), [memoryWind]);
  const memoryTarget = useMemo(() => new THREE.Vector3(-1.72, 1.72, 1.18), []);
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
    const progress = departing ? easeInOut(elapsed / presentation.travelSeconds) : returning ? easeInOut(elapsed / presentation.returnSeconds) : 0;
    const destinationPoint = new THREE.Vector3(destination[0] + .35, .5, destination[2] + .4);
    const returnHome = new THREE.Vector3(-1.55, .82, 2.35);
    if (memoryWind) {
      desired.copy(origin);
      if (memoryWindBeat === 'notice') desired.x += Math.sin(clock.elapsedTime * 1.45) * .05;
      if (memoryWindBeat === 'hold') desired.z -= .12;
      if (memoryWindBeat === 'reframe') desired.x += .16;
      desired.y += Math.sin(clock.elapsedTime * 2.6) * .045;
      group.current.position.lerp(desired, 1 - Math.exp(-delta * 3.2));
      const toWind = memoryTarget.clone().sub(group.current.position);
      const facingWind = Math.atan2(toWind.x, toWind.z);
      const targetRotation = memoryWindBeat === 'notice' ? 0 : memoryWindBeat === 'hold' ? facingWind - .28 : facingWind - .08;
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetRotation, 5.8, delta);
      if (satchel.current) satchel.current.rotation.z = Math.sin(clock.elapsedTime * 2.8) * (memoryWindBeat === 'hold' ? .2 : .09);
      return;
    }
    if (departing) desired.copy(origin).lerp(destinationPoint, progress);
    else if (returning) desired.copy(destinationPoint).lerp(returnHome, progress);
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
  const returnKind = presentation.returnKind ?? state.lastReturn?.kind;
  const tokenColor = returnKind === 'refuted' || returnKind === 'detour' ? '#c9c7d8' : returnKind === 'refined' || returnKind === 'fact' ? '#7ed5eb' : returnKind === 'confirmed' ? '#ffe287' : returnKind === 'reply' ? '#ffc896' : '#f5b879';
  const styledHero = heroPi || memoryWind;
  return <group ref={group} position={origin} scale={memoryWind ? 1.55 : 1}>
    <mesh scale={state.phase === 'plan' ? 1.5 : returning ? 1.48 : 1.32}><sphereGeometry args={[.43,20,16]} /><meshBasicMaterial color={returning ? '#7cc7b3' : '#93fff0'} transparent opacity={styledHero ? .035 : state.phase === 'plan' ? .22 : returning ? .14 : .13} depthWrite={false} /></mesh>
    <mesh castShadow scale={styledHero ? [.86,1.06,.78] : [1,1,1]}><sphereGeometry args={[.37,20,16]} /><meshStandardMaterial color={styledHero ? '#175b61' : returning ? '#8fcbb4' : '#c8fff0'} emissive={styledHero ? '#123b41' : complete ? '#ffe398' : returning ? '#3c8c7d' : '#56d7c8'} emissiveIntensity={styledHero ? .45 : complete ? 1.55 : returning ? .28 : state.phase === 'plan' ? 1.58 : 1.14} roughness={styledHero ? .72 : .44} metalness={styledHero ? .16 : 0} /></mesh>
    {styledHero && <PiHeroSilhouette />}
    <mesh position={[-.12,.06,.34]} scale={styledHero ? [1.42,1.42,1] : [1,1,1]}><sphereGeometry args={[.035,10,8]} /><meshBasicMaterial color={styledHero ? '#ffe38b' : '#34585a'} /></mesh>
    <mesh position={[.12,.06,.34]} scale={styledHero ? [1.42,1.42,1] : [1,1,1]}><sphereGeometry args={[.035,10,8]} /><meshBasicMaterial color={styledHero ? '#ffe38b' : '#34585a'} /></mesh>
    {styledHero ? <PiLanternCap /> : <mesh position={[0,.48,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.1,.018,6,16,Math.PI]} /><meshStandardMaterial color="#f4d77e" emissive="#b97d2e" emissiveIntensity={.75} /></mesh>}
    <group ref={satchel} position={styledHero ? [.39,-.14,.02] : [.34,-.18,.02]} scale={styledHero ? 1.24 : 1}><mesh><boxGeometry args={[.24,.22,.17]} /><meshStandardMaterial color="#5e382a" roughness={.78} /></mesh><mesh position={[0,.17,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.085,.015,6,12,Math.PI]} /><meshStandardMaterial color="#e2bd7b" /></mesh>{(returning || (memoryWind && memoryWindBeat !== 'notice')) && <><mesh position={[.01,.48,.08]} rotation={[0,.24,.12]}><planeGeometry args={[.24,.17]} /><meshStandardMaterial color="#f2dfb2" emissive="#b88947" emissiveIntensity={memoryWind ? .66 : .24} side={THREE.DoubleSide} /></mesh>{returning && <pointLight position={[.01,.48,.08]} color={tokenColor} intensity={.26} distance={1.6} />}</>}</group>
    {returning && <mesh position={[0,.9,.02]} rotation={[0,Math.PI/4,0]}><octahedronGeometry args={[.12,0]} /><meshStandardMaterial color={tokenColor} emissive={tokenColor} emissiveIntensity={.58} roughness={.3} /></mesh>}
    <pointLight position={[0,.1,0]} color={styledHero ? '#ffd57d' : complete ? '#ffe3a3' : returning ? '#72b9a7' : '#adfff0'} intensity={styledHero ? .95 : state.phase === 'plan' ? 2.15 : returning ? .38 : 1.45} distance={returning ? 1.8 : 3.4} />
  </group>;
}

function PiHeroSilhouette() {
  return <group>
    <mesh position={[-.17,-.38,.02]} scale={[1,.72,1]} castShadow><sphereGeometry args={[.125,12,10]} /><meshStandardMaterial color="#123d47" roughness={.82} /></mesh>
    <mesh position={[.17,-.38,.02]} scale={[1,.72,1]} castShadow><sphereGeometry args={[.125,12,10]} /><meshStandardMaterial color="#123d47" roughness={.82} /></mesh>
    <mesh position={[-.39,-.03,.02]} rotation={[0,0,-.34]} scale={[.72,1.45,.72]}><sphereGeometry args={[.105,10,8]} /><meshStandardMaterial color="#1d6970" roughness={.68} /></mesh>
    <mesh position={[.39,-.03,.02]} rotation={[0,0,.34]} scale={[.72,1.45,.72]}><sphereGeometry args={[.105,10,8]} /><meshStandardMaterial color="#1d6970" roughness={.68} /></mesh>
    <mesh position={[0,.19,.305]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.36,.018,8,32,Math.PI*1.76]} /><meshStandardMaterial color="#7d4a2f" roughness={.56} metalness={.14} /></mesh>
  </group>;
}

function PiLanternCap() {
  return <group position={[0,.47,0]}>
    <mesh><cylinderGeometry args={[.18,.21,.075,12]} /><meshStandardMaterial color="#8f6336" roughness={.52} metalness={.62} /></mesh>
    <mesh position={[0,.15,0]}><cylinderGeometry args={[.125,.125,.24,10]} /><meshStandardMaterial color="#ffcf78" emissive="#df8b38" emissiveIntensity={1.25} roughness={.32} /></mesh>
    <mesh position={[0,.3,0]}><cylinderGeometry args={[.17,.14,.065,12]} /><meshStandardMaterial color="#8f6336" roughness={.5} metalness={.62} /></mesh>
    <mesh position={[0,.36,0]}><sphereGeometry args={[.052,10,8]} /><meshStandardMaterial color="#c58d4b" metalness={.72} roughness={.42} /></mesh>
  </group>;
}

function PathLanterns({ state, target, presentation }: { state: FountainSessionState; target: StoryLocationId; presentation: Required<Omit<StoryRoutePresentation, 'returnKind'>> & Pick<StoryRoutePresentation, 'returnKind'> }) {
  const group = useRef<THREE.Group>(null);
  const targetPosition = LOCATIONS[target].position;
  const visible = (state.phase === 'plan' || state.phase === 'expedition' || state.phase === 'return') && target !== 'fountain';
  useFrame(({ clock }) => {
    if (!group.current) return;
    const reversing = state.phase === 'return';
    group.current.children.forEach((child, index) => {
      const tempo = 5.2 * (JOURNEY_SECONDS / presentation.travelSeconds);
      const wave = .5 + .5 * Math.sin(clock.elapsedTime * tempo + (reversing ? index : 12 - index) * .72);
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

function HarborHomes({ cinematic = false }: { cinematic?: boolean }) {
  const walls = cinematic ? ['#334a54', '#6a4943', '#405e59', '#665646', '#3e4d5d'] : ['#536b79', '#9e6f59', '#708d77'];
  return <group position={[0,0,-10]}>{Array.from({length: 15}).map((_, index) => {
    const x = -12 + index * 1.7;
    const height = 1.45 + (index % 4) * .38;
    const color = walls[index % walls.length];
    return <group key={index} position={[x,height/2,0]}>
      <mesh castShadow receiveShadow><boxGeometry args={[1.38,height,1.22]} /><meshStandardMaterial color={color} roughness={.88} /></mesh>
      <mesh position={[0,height/2+.14,0]} rotation={[0,0,index%2?.12:-.12]}><boxGeometry args={[1.48,.16,1.36]} /><meshStandardMaterial color={cinematic ? '#17242e' : '#334353'} roughness={.68} metalness={.08} /></mesh>
      {cinematic && <><mesh position={[-.42,height/2-.38,.625]}><boxGeometry args={[.22,.36,.028]} /><meshStandardMaterial color="#f5bd67" emissive="#9d5426" emissiveIntensity={.76} roughness={.24} /></mesh><mesh position={[.42,height/2-.38,.625]}><boxGeometry args={[.22,.36,.028]} /><meshStandardMaterial color="#f5bd67" emissive="#9d5426" emissiveIntensity={.76} roughness={.24} /></mesh>{index % 3 === 0 && <mesh position={[.38,height/2+.56,-.18]}><cylinderGeometry args={[.09,.12,.72,8]} /><meshStandardMaterial color="#202b30" roughness={.84} /></mesh>}</>}
      {!cinematic && index%2===0 && <mesh position={[0,.1,.63]}><boxGeometry args={[.35,.28,.025]} /><meshStandardMaterial color="#ffcf7b" emissive="#b66d28" emissiveIntensity={1.15} /></mesh>}
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
