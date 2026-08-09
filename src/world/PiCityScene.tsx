import { Html } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SemanticEvent } from '../semantic-trace/schema';
import type { RuntimeState } from '../semantic-trace/reducer';
import { toWorldCue, type WorldDistrict } from './cues';

const DISTRICTS: Record<Exclude<WorldDistrict, 'system'>, [number, number, number]> = {
  arrival: [-7, 0.45, 3.4],
  session: [-2.4, 0.5, 0.8],
  context: [0.7, 0.45, -3.5],
  model: [4.1, 0.5, 0.2],
  tool: [8, 0.45, 3.2],
};

const CAMERA_OFFSETS: Record<string, THREE.Vector3> = {
  world: new THREE.Vector3(13, 11, 17),
  follow: new THREE.Vector3(5.8, 4.8, 7),
  close: new THREE.Vector3(5.6, 4.7, 6.5),
  cutaway: new THREE.Vector3(5.2, 4.4, 5.8),
  hold: new THREE.Vector3(6.8, 5.2, 7.2),
  decision: new THREE.Vector3(5.4, 4.5, 6),
  pullback: new THREE.Vector3(14, 12, 18),
};

export function PiCityScene({ event, state }: { event?: SemanticEvent; state?: RuntimeState }) {
  return (
    <div className="three-world">
      <Canvas shadows camera={{ position: [13, 11, 17], fov: 38, near: 0.1, far: 120 }}>
        <color attach="background" args={['#bda983']} />
        <fog attach="fog" args={['#bda983', 25, 58]} />
        <hemisphereLight args={['#ffecc9', '#354249', 1.45]} />
        <directionalLight position={[-10, 17, 11]} intensity={3.1} color="#ffd19a" castShadow />
        <Harbor event={event} state={state} />
      </Canvas>
      <div className="three-legend">
        <span>{event ? toWorldCue(event).artifact : 'ambient harbor'}</span>
        <strong>{event ? toWorldCue(event).action : 'idle'}</strong>
      </div>
    </div>
  );
}

function Harbor({ event, state }: { event?: SemanticEvent; state?: RuntimeState }) {
  const cue = event ? toWorldCue(event) : undefined;
  const activeDistrict = cue?.district ?? 'system';

  return (
    <>
      <Water />
      <HarborAtmosphere />
      <Land />
      <ForegroundDocks />
      <AmbientCity />
      <Arrival active={activeDistrict === 'arrival'} />
      <SessionArchive active={activeDistrict === 'session'} visibleEntries={state?.sessionEntries ?? 0} />
      <ContextWorks active={activeDistrict === 'context'} cutaway={cue?.camera === 'cutaway'} />
      <ModelCore active={activeDistrict === 'model'} decision={event?.type === 'TOOL_CALL_CREATED'} />
      <ToolDistrict active={activeDistrict === 'tool'} toolName={String(event?.payload.toolName ?? 'read')} />
      <ArtifactTransit event={event} />
      <CameraDirector event={event} />
    </>
  );
}

function Water() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = -0.18 + Math.sin(clock.elapsedTime * 0.55) * 0.025;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]} receiveShadow>
      <planeGeometry args={[70, 50, 1, 1]} />
      <meshStandardMaterial color="#3f6267" roughness={0.38} metalness={0.05} />
    </mesh>
  );
}


function HarborAtmosphere() {
  const birds = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!birds.current) return;
    birds.current.rotation.y = clock.elapsedTime * 0.025;
    birds.current.position.y = 5.7 + Math.sin(clock.elapsedTime * 0.35) * 0.15;
  });
  return (
    <group>
      <mesh position={[-11, 7.6, -13]}>
        <sphereGeometry args={[3.2, 24, 16]} />
        <meshBasicMaterial color="#f0c77c" transparent opacity={0.22} />
      </mesh>
      <group ref={birds} position={[0, 5.7, 0]}>
        {[-5, -2.8, 1.3, 4.5].map((x, i) => (
          <group key={x} position={[x, Math.sin(i) * 0.35, -5 - i * 0.8]} scale={0.25 + i * 0.025}>
            <mesh rotation={[0, 0, 0.45]} position={[-0.22, 0, 0]}><boxGeometry args={[0.5, 0.025, 0.08]} /><meshBasicMaterial color="#493f34" /></mesh>
            <mesh rotation={[0, 0, -0.45]} position={[0.22, 0, 0]}><boxGeometry args={[0.5, 0.025, 0.08]} /><meshBasicMaterial color="#493f34" /></mesh>
          </group>
        ))}
      </group>
      <DistantCrane position={[-9, 0.2, -5.8]} scale={1.15} />
      <DistantCrane position={[7, 0.2, -6.5]} scale={0.9} />
      <DistantCrane position={[11, 0.2, -4.8]} scale={0.7} />
    </group>
  );
}

function DistantCrane({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 2.0, 0]}><boxGeometry args={[0.16, 4, 0.16]} /><meshStandardMaterial color="#5a5145" roughness={0.85} /></mesh>
      <mesh position={[1.15, 3.75, 0]} rotation={[0, 0, -0.08]}><boxGeometry args={[2.6, 0.12, 0.12]} /><meshStandardMaterial color="#766344" roughness={0.68} metalness={0.15} /></mesh>
      <mesh position={[2.25, 3.0, 0]}><boxGeometry args={[0.05, 1.45, 0.05]} /><meshStandardMaterial color="#62543c" /></mesh>
    </group>
  );
}

function ForegroundDocks() {
  return (
    <group>
      <mesh position={[-4.8, 0.15, 5.7]} receiveShadow><boxGeometry args={[6.3, 0.28, 1.2]} /><meshStandardMaterial color="#4e3829" roughness={0.95} /></mesh>
      <mesh position={[5.7, 0.15, 5.5]} receiveShadow><boxGeometry args={[7.8, 0.28, 1.35]} /><meshStandardMaterial color="#4e3829" roughness={0.95} /></mesh>
      {[-7.2, -5.8, -4.4, -3, 3.2, 4.7, 6.2, 7.7, 9.1].map((x) => (
        <mesh key={x} position={[x, 0.0, 6.05]}><cylinderGeometry args={[0.08, 0.1, 1.25, 8]} /><meshStandardMaterial color="#3f3025" roughness={0.98} /></mesh>
      ))}
      {[-6.5, -5.5, 4, 5.1, 6.2, 7.3].map((x, i) => (
        <mesh key={`${x}-${i}`} position={[x, 0.6, i % 2 ? 5.2 : 5.5]} castShadow>
          <boxGeometry args={[0.55, 0.55, 0.55]} />
          <meshStandardMaterial color={i % 3 === 0 ? '#87633d' : '#69513a'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Land() {
  return (
    <group>
      <mesh position={[0.5, 0.05, 0]} receiveShadow>
        <boxGeometry args={[22, 0.5, 12]} />
        <meshStandardMaterial color="#6f6551" roughness={0.95} />
      </mesh>
      <mesh position={[-8, 0.03, 4.5]} receiveShadow>
        <boxGeometry args={[8, 0.42, 4]} />
        <meshStandardMaterial color="#59432f" roughness={0.96} />
      </mesh>
      <mesh position={[8.5, 0.03, 4.25]} receiveShadow>
        <boxGeometry args={[7, 0.42, 4]} />
        <meshStandardMaterial color="#59432f" roughness={0.96} />
      </mesh>
    </group>
  );
}

function BuildingShell({
  position,
  active,
  children,
  label,
}: {
  position: [number, number, number];
  active: boolean;
  children: React.ReactNode;
  label: string;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const target = active ? 1.06 : 1;
    const next = THREE.MathUtils.damp(ref.current.scale.x, target, 6, delta);
    ref.current.scale.setScalar(next);
    ref.current.position.y = position[1] + (active ? Math.sin(clock.elapsedTime * 2.1) * 0.025 : 0);
  });
  return (
    <group ref={ref} position={position}>
      {children}
      {active && (
        <Html position={[0, 3.7, 0]} center distanceFactor={14}>
          <div className="world-label">{label}</div>
        </Html>
      )}
    </group>
  );
}

function Arrival({ active }: { active: boolean }) {
  return (
    <BuildingShell position={DISTRICTS.arrival} active={active} label="Arrival Harbor">
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.7, 3.2, 16]} />
        <meshStandardMaterial color="#928169" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.18, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.35, 16]} />
        <meshStandardMaterial color="#967245" roughness={0.5} metalness={0.32} />
      </mesh>
      <mesh position={[0, 3.52, 0]}>
        <sphereGeometry args={[0.22, 14, 10]} />
        <meshStandardMaterial color="#d4b66e" emissive="#8c6b2d" emissiveIntensity={active ? 1.5 : 0.4} />
      </mesh>
      <mesh position={[1.2, 0.2, 1.5]} castShadow receiveShadow>
        <boxGeometry args={[3.3, 0.2, 1]} />
        <meshStandardMaterial color="#5a402d" roughness={0.92} />
      </mesh>
    </BuildingShell>
  );
}

function SessionArchive({ active, visibleEntries }: { active: boolean; visibleEntries: number }) {
  const lift = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (lift.current && active) lift.current.position.y = 0.45 + (Math.sin(clock.elapsedTime * 2.4) + 1) * 0.65;
  });
  return (
    <BuildingShell position={DISTRICTS.session} active={active} label="Session Archive">
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.1, 2.5, 2.4]} />
        <meshStandardMaterial color="#8a7b65" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.92, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.95, 0.8, 4]} />
        <meshStandardMaterial color="#354448" roughness={0.75} />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} position={[-1 + (i % 4) * 0.66, 0.55 + Math.floor(i / 4) * 0.38, 1.23]} scale={i < Math.max(1, visibleEntries) ? 1 : 0.12}>
          <boxGeometry args={[0.42, 0.14, 0.08]} />
          <meshStandardMaterial color={i < visibleEntries ? '#d9c895' : '#776d5d'} emissive={active && i === Math.max(0, visibleEntries - 1) ? '#6a5325' : '#000000'} emissiveIntensity={active && i === Math.max(0, visibleEntries - 1) ? 0.65 : 0} roughness={0.82} />
        </mesh>
      ))}
      <mesh ref={lift} position={[-1.2, 0.45, -1.3]} castShadow>
        <boxGeometry args={[0.5, 0.22, 0.5]} />
        <meshStandardMaterial color="#967245" metalness={0.25} roughness={0.55} />
      </mesh>
    </BuildingShell>
  );
}

function ContextWorks({ active, cutaway }: { active: boolean; cutaway: boolean }) {
  const sorters = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (sorters.current && active) sorters.current.rotation.y = Math.sin(clock.elapsedTime * 1.7) * 0.18;
  });
  return (
    <BuildingShell position={DISTRICTS.context} active={active} label="Context Works">
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.7, 2.15, 2.8]} />
        <meshStandardMaterial color="#aa986f" transparent opacity={cutaway ? 0.24 : 0.82} roughness={0.45} />
      </mesh>
      <group ref={sorters}>
        {[-1.0, -0.34, 0.34, 1.0].map((x) => (
          <mesh key={x} position={[x, 1.25, 0.2]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 1.2, 10]} />
            <meshStandardMaterial color="#967245" roughness={0.52} metalness={0.3} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 2.22, -0.55]}>
        <sphereGeometry args={[active ? 0.34 : 0.2, 16, 12]} />
        <meshStandardMaterial color="#d4b66e" emissive="#8b6d2f" emissiveIntensity={active ? 0.85 : 0.2} />
      </mesh>
    </BuildingShell>
  );
}

function ModelCore({ active, decision }: { active: boolean; decision: boolean }) {
  const wheel = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (wheel.current) wheel.current.rotation.z = clock.elapsedTime * (active ? 1.2 : 0.22);
  });
  return (
    <BuildingShell position={DISTRICTS.model} active={active} label="Model Core">
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[1.75, 1.95, 1.4, 24]} />
        <meshStandardMaterial color="#8d7d66" roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.55, 0]} scale={[1.15, 0.72, 1.15]} castShadow>
        <sphereGeometry args={[1.1, 22, 14]} />
        <meshStandardMaterial color="#354448" roughness={0.7} />
      </mesh>
      <mesh ref={wheel} position={[0, 1.55, 1.0]}>
        <torusGeometry args={[0.5, 0.09, 8, 28]} />
        <meshStandardMaterial color="#9a7648" metalness={0.32} roughness={0.48} />
      </mesh>
      {[-1.05, -0.35, 0.35, 1.05].map((x, i) => (
        <mesh key={x} position={[x, 0.62, -1.75 - (decision && i === 0 ? 0.38 : 0)]} castShadow>
          <boxGeometry args={[0.46, 0.75, 0.16]} />
          <meshStandardMaterial color={decision && i === 0 ? '#d4b66e' : '#967245'} emissive={decision && i === 0 ? '#8c6b2d' : '#000000'} emissiveIntensity={decision && i === 0 ? 1 : 0} />
        </mesh>
      ))}
    </BuildingShell>
  );
}

function ToolDistrict({ active, toolName }: { active: boolean; toolName: string }) {
  const hook = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (hook.current && active) hook.current.position.y = 1.6 + (Math.sin(clock.elapsedTime * 2.2) + 1) * 0.3;
  });
  return (
    <BuildingShell position={DISTRICTS.tool} active={active} label={`Tool District · ${toolName}`}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[3.8, 1.45, 2.6]} />
        <meshStandardMaterial color="#5b402d" roughness={0.9} />
      </mesh>
      {[-1.2, -0.4, 0.4, 1.2].map((x, i) => {
        const shops = ['inspect', 'edit', 'bash', 'write'];
        const normalizedTool = ['read', 'grep', 'find', 'ls'].includes(toolName.toLowerCase()) ? 'inspect' : toolName.toLowerCase();
        const lit = active && shops[i] === normalizedTool;
        return (
          <group key={x}>
            <mesh position={[x, 0.62, -1]} castShadow>
              <boxGeometry args={[0.67, 0.9, 0.55]} />
              <meshStandardMaterial color={lit ? '#b08954' : '#796c59'} emissive={lit ? '#6c4b22' : '#000000'} emissiveIntensity={lit ? 0.8 : 0} />
            </mesh>
            <mesh position={[x, 1.16, -1.02]}>
              <boxGeometry args={[0.46, 0.08, 0.05]} />
              <meshStandardMaterial color={lit ? '#d7c17f' : '#4d5149'} emissive={lit ? '#7e6128' : '#000000'} emissiveIntensity={lit ? 0.6 : 0} />
            </mesh>
          </group>
        );
      })}
      {[-1.15, 0, 1.15].map((x) => (
        <mesh key={x} position={[x, 2.0, 0.7]} castShadow>
          <cylinderGeometry args={[0.15, 0.23, 2.15, 10]} />
          <meshStandardMaterial color="#80715e" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 2.55, -0.55]} castShadow>
        <boxGeometry args={[3, 0.15, 0.15]} />
        <meshStandardMaterial color="#997448" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh ref={hook} position={[0, 1.85, -0.55]}>
        <cylinderGeometry args={[0.05, 0.05, 1.05, 8]} />
        <meshStandardMaterial color="#997448" />
      </mesh>
    </BuildingShell>
  );
}

function AmbientCity() {
  const houses = useMemo(() => {
    return Array.from({ length: 90 }).map((_, i) => {
      const ring = 7 + (i % 7) * 0.72;
      const angle = (i * 0.87) % (Math.PI * 2);
      return [
        Math.cos(angle) * ring + Math.sin(i * 2.1) * 1.3,
        0.35,
        Math.sin(angle) * ring * 0.7 + Math.cos(i * 1.4) * 1.15,
        0.45 + (i % 4) * 0.06,
        0.6 + (i % 5) * 0.12,
      ] as const;
    });
  }, []);

  return (
    <group>
      {houses.map(([x, y, z, w, h], i) => (
        <mesh key={i} position={[x, y + h / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[w, h, w]} />
          <meshStandardMaterial color={i % 5 === 0 ? '#5d432f' : '#81735e'} roughness={0.94} />
        </mesh>
      ))}
      <AmbientBoat start={[-13, 0, 8]} speed={0.45} />
      <AmbientBoat start={[-5, 0, 9.5]} speed={0.35} />
      <AmbientBoat start={[5, 0, 8.7]} speed={0.28} />
    </group>
  );
}

function AmbientBoat({ start, speed }: { start: [number, number, number]; speed: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.x = ((start[0] + clock.elapsedTime * speed + 18) % 36) - 18;
    ref.current.position.z = start[2] + Math.sin(clock.elapsedTime * 0.35 + start[0]) * 0.22;
  });
  return (
    <group ref={ref} position={start}>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[1.1, 0.22, 0.42]} />
        <meshStandardMaterial color="#4e3628" roughness={0.9} />
      </mesh>
      <mesh position={[0.05, 0.38, 0]}>
        <boxGeometry args={[0.38, 0.28, 0.28]} />
        <meshStandardMaterial color="#857762" roughness={0.9} />
      </mesh>
    </group>
  );
}

function routeForEvent(event?: SemanticEvent): [THREE.Vector3, THREE.Vector3] | undefined {
  if (!event) return undefined;
  const sea = new THREE.Vector3(-13, 0.05, 5.2);
  const arrival = new THREE.Vector3(...DISTRICTS.arrival);
  const session = new THREE.Vector3(...DISTRICTS.session);
  const context = new THREE.Vector3(...DISTRICTS.context);
  const model = new THREE.Vector3(...DISTRICTS.model);
  const tool = new THREE.Vector3(...DISTRICTS.tool);

  switch (event.type) {
    case 'REQUEST_ARRIVED': return [sea, arrival];
    case 'SESSION_NODE_ADDED': {
      const role = String(event.payload.role ?? '');
      if (role === 'assistant') return [model, session];
      if (role === 'toolResult') return undefined;
      return [arrival, session];
    }
    case 'CONTEXT_COMPILE_STARTED': return [session, context];
    case 'MODEL_REQUEST_STARTED': return [context, model];
    case 'TOOL_EXECUTION_STARTED': return [model, tool];
    case 'TOOL_RESULT_ATTACHED': return [tool, session];
    case 'AGENT_SETTLED': return [model, arrival];
    default: return undefined;
  }
}

function ArtifactTransit({ event }: { event?: SemanticEvent }) {
  const cue = event ? toWorldCue(event) : undefined;
  const route = useMemo(() => routeForEvent(event), [event?.id]);
  const ref = useRef<THREE.Group>(null);
  const progress = useRef(0);

  useEffect(() => { progress.current = 0; }, [event?.id]);

  useFrame((_, delta) => {
    if (!ref.current || !route) return;
    progress.current = Math.min(1, progress.current + delta * 0.42);
    const eased = progress.current * progress.current * (3 - 2 * progress.current);
    ref.current.position.lerpVectors(route[0], route[1], eased);
    ref.current.position.y += Math.sin(Math.PI * eased) * 0.45 + 0.2;
    ref.current.lookAt(route[1]);
  });

  if (!cue || cue.artifact === 'none' || !route) return null;

  return (
    <group ref={ref}>
      {cue.artifact === 'request-vessel' ? (
        <>
          <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[1.2, 0.25, 0.46]} /><meshStandardMaterial color="#4e3728" /></mesh>
          <mesh position={[0.1, 0.42, 0]} castShadow><boxGeometry args={[0.42, 0.3, 0.3]} /><meshStandardMaterial color="#8a7b66" /></mesh>
        </>
      ) : cue.artifact === 'context-capsule' ? (
        <mesh castShadow><sphereGeometry args={[0.33, 16, 12]} /><meshStandardMaterial color="#d4b66e" emissive="#7c5d26" emissiveIntensity={0.7} /></mesh>
      ) : (
        <>
          <mesh position={[0, 0.2, 0]} castShadow><boxGeometry args={[0.72, 0.3, 0.48]} /><meshStandardMaterial color={cue.artifact === 'tool-result' ? '#5d422f' : '#9a7648'} /></mesh>
          <mesh position={[0, 0.52, 0]} castShadow><boxGeometry args={[0.45, 0.2, 0.34]} /><meshStandardMaterial color="#d4c6a5" /></mesh>
        </>
      )}
    </group>
  );
}

function CameraDirector({ event }: { event?: SemanticEvent }) {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3(13, 11, 17));
  const lookAt = useRef(new THREE.Vector3(0, 1, 0));

  useFrame((_, delta) => {
    const cue = event ? toWorldCue(event) : undefined;
    const focus = cue && cue.district !== 'system'
      ? new THREE.Vector3(...DISTRICTS[cue.district])
      : new THREE.Vector3(0, 0.7, 0);
    const offset = CAMERA_OFFSETS[cue?.camera ?? 'world'] ?? CAMERA_OFFSETS.world;
    desired.current.copy(focus).add(offset);
    lookAt.current.lerp(focus.clone().add(new THREE.Vector3(0, 1.1, 0)), 1 - Math.pow(0.001, delta));
    camera.position.lerp(desired.current, 1 - Math.pow(0.004, delta));
    camera.lookAt(lookAt.current);
  });
  return null;
}
