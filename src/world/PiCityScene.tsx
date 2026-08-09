import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { SemanticEvent } from '../semantic-trace/schema';
import type { RuntimeState } from '../semantic-trace/reducer';
import { toWorldCue, type WorldDistrict } from './cues';

const DISTRICTS: Record<Exclude<WorldDistrict, 'system'>, [number, number, number]> = {
  arrival: [-11.5, 0.35, 4.8],
  session: [-5.2, 0.35, 0.7],
  context: [1.0, 0.35, -4.6],
  model: [7.1, 0.35, -0.15],
  tool: [13.0, 0.35, 4.3],
};

const CAMERA_OFFSETS: Record<string, THREE.Vector3> = {
  world: new THREE.Vector3(19, 14, 24),
  follow: new THREE.Vector3(8.4, 6.2, 9.5),
  close: new THREE.Vector3(7.1, 5.5, 8.2),
  cutaway: new THREE.Vector3(7.3, 5.7, 8.5),
  hold: new THREE.Vector3(8.5, 6.4, 9.2),
  decision: new THREE.Vector3(7.0, 5.3, 7.8),
  pullback: new THREE.Vector3(21, 15.5, 26),
};

const MODELS = {
  arrival: '/assets/models/arrival-harbor.glb',
  session: '/assets/models/session-archive.glb',
  context: '/assets/models/context-works.glb',
  model: '/assets/models/model-core.glb',
  tool: '/assets/models/tool-works.glb',
} as const;

export function PiCityScene({ event, state }: { event?: SemanticEvent; state?: RuntimeState }) {
  return (
    <div className="three-world visual-beta-world">
      <Canvas shadows dpr={[1, 1.7]} gl={{ antialias: true, alpha: true }} camera={{ position: [19, 14, 24], fov: 36, near: 0.1, far: 150 }}>
        <CinematicRenderer />
        <fog attach="fog" args={['#b88f63', 32, 78]} />
        <hemisphereLight args={['#ffe0ad', '#24363a', 1.25]} />
        <directionalLight position={[-14, 22, 12]} intensity={3.5} color="#ffd09a" castShadow shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[18, 7, -18]} intensity={0.7} color="#7fa4ac" />
        <Harbor event={event} state={state} />
      </Canvas>
      <div className="three-legend visual-beta-legend">
        <span>{event ? toWorldCue(event).artifact : 'living harbor'}</span>
        <strong>{event ? toWorldCue(event).action : 'ambient'}</strong>
      </div>
      <div className="visual-beta-mark">PI CITY · VISUAL PROTOTYPE</div>
    </div>
  );
}

function CinematicRenderer() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.08;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  return null;
}

function Harbor({ event, state }: { event?: SemanticEvent; state?: RuntimeState }) {
  const cue = event ? toWorldCue(event) : undefined;
  const activeDistrict = cue?.district ?? 'system';
  return (
    <>
      <Water />
      <SunsetAtmosphere />
      <Landmass />
      <IndustrialFabric />
      <SmokePlumes />
      <HeroBuilding district="arrival" active={activeDistrict === 'arrival'}>
        <ArrivalRuntime active={activeDistrict === 'arrival'} />
      </HeroBuilding>
      <HeroBuilding district="session" active={activeDistrict === 'session'}>
        <SessionRuntime active={activeDistrict === 'session'} visibleEntries={state?.sessionEntries ?? 0} />
      </HeroBuilding>
      <HeroBuilding district="context" active={activeDistrict === 'context'}>
        <ContextRuntime active={activeDistrict === 'context'} cutaway={cue?.camera === 'cutaway'} />
      </HeroBuilding>
      <HeroBuilding district="model" active={activeDistrict === 'model'}>
        <ModelRuntime active={activeDistrict === 'model'} decision={event?.type === 'TOOL_CALL_CREATED'} />
      </HeroBuilding>
      <HeroBuilding district="tool" active={activeDistrict === 'tool'}>
        <ToolRuntime active={activeDistrict === 'tool'} toolName={String(event?.payload.toolName ?? 'read')} />
      </HeroBuilding>
      <ArtifactTransit event={event} />
      <CameraDirector event={event} />
    </>
  );
}

function HeroBuilding({ district, active, children }: { district: keyof typeof MODELS; active: boolean; children?: React.ReactNode }) {
  const gltf = useLoader(GLTFLoader, MODELS[district]);
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return cloned;
  }, [gltf.scene]);
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const target = active ? 1.035 : 1;
    const scale = THREE.MathUtils.damp(group.current.scale.x, target, 7, delta);
    group.current.scale.setScalar(scale);
    group.current.position.y = DISTRICTS[district][1] + (active ? Math.sin(clock.elapsedTime * 2.0) * 0.018 : 0);
  });

  return (
    <group ref={group} position={DISTRICTS[district]}>
      <primitive object={scene} />
      {active && (
        <>
          <pointLight position={[0, 3.2, 1.2]} intensity={2.1} distance={8} color="#efbd6f" />
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.7, 2.82, 48]} />
            <meshBasicMaterial color="#d4b66e" transparent opacity={0.28} />
          </mesh>
        </>
      )}
      {children}
    </group>
  );
}

function Water() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = -0.23 + Math.sin(clock.elapsedTime * 0.5) * 0.025;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.23, 3]} receiveShadow>
      <planeGeometry args={[100, 65, 1, 1]} />
      <meshStandardMaterial color="#345a61" roughness={0.28} metalness={0.08} />
    </mesh>
  );
}

function SunsetAtmosphere() {
  const birds = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!birds.current) return;
    birds.current.rotation.y = clock.elapsedTime * 0.018;
    birds.current.position.y = 8.0 + Math.sin(clock.elapsedTime * 0.25) * 0.12;
  });
  return (
    <group>
      <mesh position={[-20, 13, -24]}>
        <sphereGeometry args={[5.4, 32, 18]} />
        <meshBasicMaterial color="#f2bd6e" transparent opacity={0.3} />
      </mesh>
      <group ref={birds} position={[0, 8, -6]}>
        {[-8, -4.5, 0, 5, 9].map((x, i) => (
          <group key={x} position={[x, Math.sin(i * 1.3) * 0.45, -i * 1.1]} scale={0.32 + i * 0.025}>
            <mesh rotation={[0, 0, 0.45]} position={[-0.22, 0, 0]}><boxGeometry args={[0.55, 0.025, 0.07]} /><meshBasicMaterial color="#3f3a32" /></mesh>
            <mesh rotation={[0, 0, -0.45]} position={[0.22, 0, 0]}><boxGeometry args={[0.55, 0.025, 0.07]} /><meshBasicMaterial color="#3f3a32" /></mesh>
          </group>
        ))}
      </group>
      <DistantSkyline />
    </group>
  );
}

function DistantSkyline() {
  return (
    <group position={[0, 0, -17]}>
      {Array.from({ length: 24 }).map((_, i) => {
        const x = -25 + i * 2.15;
        const h = 1.7 + ((i * 7) % 9) * 0.22;
        return <mesh key={i} position={[x, h / 2, 0]}><boxGeometry args={[1.35, h, 1.4]} /><meshStandardMaterial color={i % 4 === 0 ? '#4d4b42' : '#625a4b'} roughness={0.98} /></mesh>;
      })}
      {[-17, -4, 10, 20].map((x, i) => <DistantCrane key={x} position={[x, 0, i % 2 ? 1.3 : 0]} scale={1.3 - i * 0.1} />)}
    </group>
  );
}

function DistantCrane({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 2.3, 0]}><boxGeometry args={[0.16, 4.6, 0.16]} /><meshStandardMaterial color="#4d5049" roughness={0.8} /></mesh>
      <mesh position={[1.7, 4.35, 0]} rotation={[0, 0, -0.08]}><boxGeometry args={[3.7, 0.12, 0.12]} /><meshStandardMaterial color="#786441" roughness={0.62} metalness={0.18} /></mesh>
      <mesh position={[3.0, 3.1, 0]}><boxGeometry args={[0.045, 2.4, 0.045]} /><meshStandardMaterial color="#514638" /></mesh>
    </group>
  );
}

function Landmass() {
  return (
    <group>
      <mesh position={[0.8, 0, -0.4]} receiveShadow><boxGeometry args={[34, 0.55, 15.5]} /><meshStandardMaterial color="#6c604d" roughness={0.96} /></mesh>
      <mesh position={[-12, -0.02, 5.5]} receiveShadow><boxGeometry args={[9, 0.42, 5]} /><meshStandardMaterial color="#4d392b" roughness={0.98} /></mesh>
      <mesh position={[13, -0.02, 5.4]} receiveShadow><boxGeometry args={[9, 0.42, 5.4]} /><meshStandardMaterial color="#4d392b" roughness={0.98} /></mesh>
      <Canal x={-2.1} z={1.6} length={15} />
      <Canal x={6.0} z={2.7} length={10} />
      <Bridge position={[-2.1, .28, -.3]} />
      <Bridge position={[6.0, .28, 1.1]} />
    </group>
  );
}

function Canal({ x, z, length }: { x: number; z: number; length: number }) {
  return <mesh position={[x, 0.18, z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}><planeGeometry args={[1.3, length]} /><meshStandardMaterial color="#33575d" roughness={0.32} /></mesh>;
}

function Bridge({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh receiveShadow><boxGeometry args={[2.4, .22, 1.45]} /><meshStandardMaterial color="#4b4540" roughness={.9} /></mesh>
      {[-.95,.95].map(x => <mesh key={x} position={[x,.35,0]}><boxGeometry args={[.08,.7,1.5]} /><meshStandardMaterial color="#7b6242" /></mesh>)}
    </group>
  );
}

function IndustrialFabric() {
  return (
    <group>
      <DockForeground />
      <WarehouseRow position={[-1, .28, 5.9]} count={6} />
      <WarehouseRow position={[3, .28, -8.4]} count={8} small />
      <TankFarm position={[15, .25, -4.8]} />
      <PipeRack position={[10.3, .3, -4.0]} />
      <RailYard />
      <AmbientBoats />
    </group>
  );
}

function SmokePlumes() {
  return (
    <group>
      {[[-15, 4.7, -9], [15.7, 5.3, -4.8], [12.3, 4.2, -8.5], [-7.2, 3.8, -12]].map((p, i) => (
        <SmokeColumn key={i} position={p as [number, number, number]} phase={i * 1.7} />
      ))}
    </group>
  );
}

function SmokeColumn({ position, phase }: { position: [number, number, number]; phase: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = Math.sin(clock.elapsedTime * .12 + phase) * .18;
  });
  return (
    <group ref={ref} position={position}>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[Math.sin(i * 1.4 + phase) * .22, i * .55, Math.cos(i * 1.2) * .18]} scale={1 + i * .18}>
          <sphereGeometry args={[.3, 10, 8]} />
          <meshBasicMaterial color="#69706a" transparent opacity={.13 - i * .012} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function DockForeground() {
  return (
    <group>
      <mesh position={[0, .15, 8.3]} receiveShadow><boxGeometry args={[34, .3, 1.9]} /><meshStandardMaterial color="#493326" roughness={.98} /></mesh>
      {Array.from({ length: 18 }).map((_, i) => <mesh key={i} position={[-16+i*1.9, -.2, 8.8]}><cylinderGeometry args={[.08,.11,1.4,8]} /><meshStandardMaterial color="#332820" roughness={1} /></mesh>)}
      {[-13,-10,-7,7,10,13].map((x,i)=><mesh key={x} position={[x,.55,7.75]} castShadow><boxGeometry args={[.8,.8,.8]} /><meshStandardMaterial color={i%2 ? '#74543b':'#93693e'} roughness={.9} /></mesh>)}
      {[-14,-8,9,14].map(x => <DockLamp key={x} x={x} />)}
    </group>
  );
}

function DockLamp({ x }: { x: number }) {
  return <group position={[x,0,7.3]}><mesh position={[0,1.35,0]}><cylinderGeometry args={[.035,.045,2.7,8]} /><meshStandardMaterial color="#303633" /></mesh><mesh position={[0,2.72,0]}><sphereGeometry args={[.11,12,8]} /><meshStandardMaterial color="#f0bd69" emissive="#c48532" emissiveIntensity={1.4} /></mesh></group>;
}

function WarehouseRow({ position, count, small=false }: { position: [number, number, number]; count: number; small?: boolean }) {
  return <group position={position}>{Array.from({length:count}).map((_,i)=>{
    const w=small?1.15:1.45, h=small?.8:1.05;
    const lit=i%3===1;
    return <group key={i} position={[(i-(count-1)/2)*(w+.18),0,0]}><mesh position={[0,h/2,0]} castShadow><boxGeometry args={[w,h,1.5]} /><meshStandardMaterial color={i%3===0?'#6e5844':'#80715a'} roughness={.96} /></mesh><mesh position={[0,h+.16,0]} rotation={[0,0,i%2?.12:-.12]}><boxGeometry args={[w*1.02,.12,1.7]} /><meshStandardMaterial color="#354543" roughness={.78} /></mesh><mesh position={[0,h*.55,.76]}><boxGeometry args={[w*.46,h*.22,.025]} /><meshStandardMaterial color={lit?'#e2b56c':'#394c4b'} emissive={lit?'#9e6426':'#000'} emissiveIntensity={lit?.9:0} /></mesh></group>
  })}</group>;
}

function TankFarm({ position }: { position: [number, number, number] }) {
  return <group position={position}>{[[0,0],[1.5,0],[0,1.5],[1.5,1.5]].map(([x,z],i)=><group key={i} position={[x,0,z]}><mesh position={[0,.72,0]} castShadow><cylinderGeometry args={[.62,.62,1.35,20]} /><meshStandardMaterial color="#73756b" metalness={.12} roughness={.78} /></mesh><mesh position={[0,1.45,0]}><cylinderGeometry args={[.65,.58,.18,20]} /><meshStandardMaterial color="#4c5653" /></mesh></group>)}</group>;
}

function PipeRack({ position }: { position: [number, number, number] }) {
  return <group position={position}>{[-1,0,1].map((z,zi)=><group key={z}>{[-2,0,2].map((x,xi)=><mesh key={x} position={[x,1.1,z]}><boxGeometry args={[.08,2.2,.08]} /><meshStandardMaterial color="#3e4542" /></mesh>)}<mesh position={[0,2.05,z]}><boxGeometry args={[4.2,.08,.08]} /><meshStandardMaterial color="#7f6544" /></mesh><mesh position={[0,1.7,z]}><cylinderGeometry args={[.075,.075,4.1,8]} /><meshStandardMaterial color={zi===1?'#8a593f':'#936f42'} /></mesh></group>)}</group>;
}

function RailYard() {
  return <group position={[1,.23,3.5]}>{[-1.1,-.6,.6,1.1].map(z=><group key={z}>{[-12,12].map(x=><mesh key={x} position={[0,.02,z]}><boxGeometry args={[25,.04,.04]} /><meshStandardMaterial color="#383b38" metalness={.35} roughness={.55} /></mesh>)}</group>)}</group>;
}

function AmbientBoats() {
  return <>{<AmbientBoat start={[-17, 0, 10.5]} speed={0.38} />}{<AmbientBoat start={[-5, 0, 11.5]} speed={0.29} />}{<AmbientBoat start={[7, 0, 10.2]} speed={0.24} />}</>;
}

function AmbientBoat({ start, speed }: { start: [number, number, number]; speed: number }) {
  const ref=useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(!ref.current)return;ref.current.position.x=((start[0]+clock.elapsedTime*speed+22)%44)-22;ref.current.position.z=start[2]+Math.sin(clock.elapsedTime*.3+start[0])*.25;});
  return <group ref={ref} position={start}><mesh position={[0,.12,0]}><boxGeometry args={[1.4,.22,.5]} /><meshStandardMaterial color="#4a3327" roughness={.9} /></mesh><mesh position={[.12,.4,0]}><boxGeometry args={[.48,.34,.32]} /><meshStandardMaterial color="#82735e" roughness={.9} /></mesh><mesh position={[-.28,.65,0]}><boxGeometry args={[.035,.8,.035]} /><meshStandardMaterial color="#383c38" /></mesh></group>;
}

function ArrivalRuntime({ active }: { active: boolean }) {
  return active ? <pointLight position={[-1.55, 4.1, .15]} intensity={2.6} distance={7} color="#f1c06d" /> : null;
}

function SessionRuntime({ active, visibleEntries }: { active: boolean; visibleEntries: number }) {
  const lift = useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(lift.current&&active) lift.current.position.y=.45+(Math.sin(clock.elapsedTime*2.4)+1)*.55;});
  return <group>{Array.from({length:12}).map((_,i)=><mesh key={i} position={[-1.42+(i%5)*.7,.72+Math.floor(i/5)*.38,1.83]} scale={i<Math.max(1,visibleEntries)?1:.06}><boxGeometry args={[.42,.13,.08]} /><meshStandardMaterial color={i<visibleEntries?'#dccb91':'#746b5c'} emissive={active&&i===Math.max(0,visibleEntries-1)?'#7a5e27':'#000'} emissiveIntensity={.8} /></mesh>)}<group ref={lift} position={[-2.15,.45,-.8]}><mesh><boxGeometry args={[.55,.22,.55]} /><meshStandardMaterial color="#a17342" metalness={.25} roughness={.5} /></mesh></group></group>;
}

function ContextRuntime({ active, cutaway }: { active: boolean; cutaway: boolean }) {
  const sorter=useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(sorter.current&&active) sorter.current.rotation.y=clock.elapsedTime*.6;});
  return <group ref={sorter}>{[-1.25,-.42,.42,1.25].map(x=><mesh key={x} position={[x,1.25,.25]}><torusGeometry args={[.31,.045,8,24]} /><meshStandardMaterial color="#c18e4c" emissive={active?'#5b3e18':'#000'} emissiveIntensity={active?.45:0} metalness={.35} roughness={.42} /></mesh>)}{cutaway&&<mesh position={[0,1.25,-.85]}><sphereGeometry args={[.35,18,12]} /><meshStandardMaterial color="#e0ba69" emissive="#8e6326" emissiveIntensity={1.2} /></mesh>}</group>;
}

function ModelRuntime({ active, decision }: { active: boolean; decision: boolean }) {
  const wheel=useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(wheel.current)wheel.current.rotation.z=clock.elapsedTime*(active?1.0:.16)});
  return <group>{<group ref={wheel} position={[0,1.95,1.95]}><mesh><torusGeometry args={[.72,.065,8,28]} /><meshStandardMaterial color="#d2a45f" emissive={active?'#71501d':'#000'} emissiveIntensity={active?.6:0} /></mesh></group>}{[-1.25,-.42,.42,1.25].map((x,i)=><mesh key={x} position={[x,.88,1.98+(decision&&i===0?.18:0)]}><boxGeometry args={[.38,.66,.06]} /><meshStandardMaterial color={decision&&i===0?'#e0ba69':'#8c704c'} emissive={decision&&i===0?'#b27427':'#000'} emissiveIntensity={decision&&i===0?1.4:0} /></mesh>)}</group>;
}

function ToolRuntime({ active, toolName }: { active: boolean; toolName: string }) {
  const normalized=['read','grep','find','ls'].includes(toolName.toLowerCase())?'inspect':toolName.toLowerCase();
  const names=['inspect','edit','bash','write'];
  return <group>{[-2,-.67,.67,2].map((x,i)=>{const lit=active&&names[i]===normalized;return <pointLight key={x} position={[x,1.25,1.55]} intensity={lit?2.2:0} distance={3.2} color="#f0b85e" />})}</group>;
}

function routeForEvent(event?: SemanticEvent): [THREE.Vector3, THREE.Vector3] | undefined {
  if (!event) return undefined;
  const sea=new THREE.Vector3(-18, .05, 10.6);
  const arrival=new THREE.Vector3(...DISTRICTS.arrival);
  const session=new THREE.Vector3(...DISTRICTS.session);
  const context=new THREE.Vector3(...DISTRICTS.context);
  const model=new THREE.Vector3(...DISTRICTS.model);
  const tool=new THREE.Vector3(...DISTRICTS.tool);
  switch(event.type){
    case 'REQUEST_ARRIVED': return [sea,arrival];
    case 'SESSION_NODE_ADDED': {const role=String(event.payload.role??'');if(role==='assistant')return [model,session];if(role==='toolResult')return undefined;return [arrival,session];}
    case 'CONTEXT_COMPILE_STARTED': return [session,context];
    case 'CONTEXT_COMPILED': return [context,context.clone().add(new THREE.Vector3(1.8,.2,.5))];
    case 'MODEL_REQUEST_STARTED': return [context,model];
    case 'TOOL_CALL_CREATED': return [model,model.clone().add(new THREE.Vector3(1.4,.2,.6))];
    case 'TOOL_EXECUTION_STARTED': return [model,tool];
    case 'TOOL_RESULT_ATTACHED': return [tool,session];
    case 'AGENT_SETTLED': return [model,arrival];
    default:return undefined;
  }
}

function ArtifactTransit({ event }: { event?: SemanticEvent }) {
  const cue=event?toWorldCue(event):undefined;
  const route=useMemo(()=>routeForEvent(event),[event?.id]);
  const ref=useRef<THREE.Group>(null);const progress=useRef(0);
  useEffect(()=>{progress.current=0},[event?.id]);
  useFrame((_,delta)=>{if(!ref.current||!route)return;progress.current=Math.min(1,progress.current+delta*.38);const t=progress.current*progress.current*(3-2*progress.current);ref.current.position.lerpVectors(route[0],route[1],t);ref.current.position.y+=Math.sin(Math.PI*t)*.55+.28;ref.current.lookAt(route[1]);});
  if(!cue||cue.artifact==='none'||!route)return null;
  return <group ref={ref}>{cue.artifact==='request-vessel'?<RequestVessel/>:cue.artifact==='context-capsule'?<ContextCapsule/>:<CargoArtifact result={cue.artifact==='tool-result'} />}</group>;
}

function RequestVessel(){return <group><mesh position={[0,.13,0]} castShadow><boxGeometry args={[1.65,.28,.55]} /><meshStandardMaterial color="#4a3025" roughness={.9} /></mesh><mesh position={[.18,.48,0]} castShadow><boxGeometry args={[.52,.38,.34]} /><meshStandardMaterial color="#8b7a63" roughness={.88} /></mesh><mesh position={[-.35,.85,0]}><boxGeometry args={[.035,.9,.035]} /><meshStandardMaterial color="#343a37" /></mesh></group>}
function ContextCapsule(){return <group><mesh castShadow><sphereGeometry args={[.38,20,14]} /><meshStandardMaterial color="#e3bd6d" emissive="#7e5923" emissiveIntensity={.9} metalness={.18} roughness={.3} /></mesh><mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[.47,.035,8,24]} /><meshStandardMaterial color="#855f35" /></mesh></group>}
function CargoArtifact({result}:{result:boolean}){return <group><mesh position={[0,.2,0]} castShadow><boxGeometry args={[.86,.34,.55]} /><meshStandardMaterial color={result?'#594032':'#9d7242'} roughness={.82} /></mesh><mesh position={[0,.53,0]} castShadow><boxGeometry args={[.52,.18,.4]} /><meshStandardMaterial color="#d5c394" roughness={.8} /></mesh></group>}

function CameraDirector({ event }: { event?: SemanticEvent }) {
  const {camera}=useThree();
  const desired=useRef(new THREE.Vector3(19,14,24));
  const lookAt=useRef(new THREE.Vector3(0,1,0));
  useFrame((_,delta)=>{
    const cue=event?toWorldCue(event):undefined;
    const focus=cue&&cue.district!=='system'?new THREE.Vector3(...DISTRICTS[cue.district]):new THREE.Vector3(0,.8,0);
    const offset=CAMERA_OFFSETS[cue?.camera??'world']??CAMERA_OFFSETS.world;
    desired.current.copy(focus).add(offset);
    lookAt.current.lerp(focus.clone().add(new THREE.Vector3(0,1.4,0)),1-Math.pow(.001,delta));
    camera.position.lerp(desired.current,1-Math.pow(.004,delta));
    camera.lookAt(lookAt.current);
  });
  return null;
}
