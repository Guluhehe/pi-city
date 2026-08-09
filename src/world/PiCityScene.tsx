import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { SemanticEvent } from '../semantic-trace/schema';
import type { RuntimeState } from '../semantic-trace/reducer';
import { DISTRICT_MODELS, DISTRICT_POSITIONS, type ExperienceDistrict } from '../experience/districts';
import { EXPLORE_CAMERA_OFFSET } from '../experience/explore';
import { shotById, shotForEventType, type ShotId, type ShotSpec as SharedShotSpec } from '../experience/shots';
import { toWorldCue, type WorldDistrict } from './cues';

export type CameraPresentation = 'watch' | 'photo' | 'explore';

export interface PiCitySceneProps {
  event?: SemanticEvent;
  state?: RuntimeState;
  shotId?: ShotId;
  presentation?: CameraPresentation;
  exploreDistrict?: ExperienceDistrict | null;
  hideChrome?: boolean;
}

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

const DISTRICTS: Record<Exclude<WorldDistrict, 'system'>, [number, number, number]> = {
  arrival: [...DISTRICT_POSITIONS.arrival],
  session: [...DISTRICT_POSITIONS.session],
  context: [...DISTRICT_POSITIONS.context],
  model: [...DISTRICT_POSITIONS.model],
  tool: [...DISTRICT_POSITIONS.tool],
};

type ShotSpec = {
  offset: THREE.Vector3;
  lookShift: THREE.Vector3;
  fov: number;
  exposure: number;
  bloom: number;
  aperture: number;
  maxBlur: number;
  matte: number;
};

function toRuntimeShot(shared: SharedShotSpec): ShotSpec {
  return {
    offset: new THREE.Vector3(...shared.offset),
    lookShift: new THREE.Vector3(...shared.lookShift),
    fov: shared.fov,
    exposure: shared.exposure,
    bloom: shared.bloom,
    aperture: shared.aperture,
    maxBlur: shared.maxBlur,
    matte: shared.matte,
  };
}

function resolveShot(event?: SemanticEvent, shotId?: ShotId): ShotSpec {
  if (shotId) return toRuntimeShot(shotById(shotId));
  return toRuntimeShot(shotForEventType(event?.type));
}

const MODELS = {
  arrival: assetUrl(`assets/models/${DISTRICT_MODELS.arrival}`),
  session: assetUrl(`assets/models/${DISTRICT_MODELS.session}`),
  context: assetUrl(`assets/models/${DISTRICT_MODELS.context}`),
  model: assetUrl(`assets/models/${DISTRICT_MODELS.model}`),
  tool: assetUrl(`assets/models/${DISTRICT_MODELS.tool}`),
} as const;

const WEATHERED = new Set(['stone','stone_dark','stone_light','cream','wood','wood_light','paper','iron','iron_light','oxide','rust','red','bronze','brass','copper','roof','roof_warm']);

function weatherMaterial(material: THREE.Material) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;
  const key=(material.name||'').toLowerCase();
  if (key.includes('glass')) {
    material.transparent=true;
    material.opacity=key.includes('dark') ? .62 : .48;
    material.depthWrite=false;
    material.roughness=.18;
    material.metalness=.02;
    return material;
  }
  if (key==='warm') {
    material.emissiveIntensity=1.35;
    return material;
  }
  if (!WEATHERED.has(key)) return material;
  const strength=['iron','iron_light','oxide','rust','red','bronze','brass','copper'].includes(key) ? .18 : key.startsWith('wood') ? .15 : .11;
  const streak=['oxide','rust','iron','iron_light','copper','bronze'].includes(key) ? .10 : .035;
  material.onBeforeCompile=(shader)=>{
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPiLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPiLocal = position;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vPiLocal;\nfloat piHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\nfloat piN=piHash(floor(vPiLocal*7.0));\nfloat piFine=piHash(floor(vPiLocal*23.0+2.7));\nfloat piWear=mix(.90,1.07,piN)*mix(.96,1.035,piFine);\ndiffuseColor.rgb*=mix(1.0,piWear,${strength.toFixed(3)});\nfloat piStreak=smoothstep(.72,.98,piHash(vec3(floor(vPiLocal.x*4.0),floor(vPiLocal.z*4.0),0.0)))*smoothstep(-1.5,2.5,vPiLocal.y);\ndiffuseColor.rgb*=1.0-piStreak*${streak.toFixed(3)};`);
  };
  material.customProgramCacheKey=()=>`pi-weather-v2-${key}`;
  material.needsUpdate=true;
  return material;
}

export function PiCityScene({
  event,
  state,
  shotId,
  presentation = 'watch',
  exploreDistrict = null,
  hideChrome = false,
}: PiCitySceneProps) {
  return (
    <div className="three-world visual-beta-world">
      <Canvas shadows dpr={[1, 1.7]} gl={{ antialias: true, alpha: true }} camera={{ position: [19, 14, 24], fov: 36, near: 0.1, far: 150 }}>
        <CinematicRenderer event={event} shotId={shotId} />
        <CinematicPost event={event} shotId={shotId} exploreDistrict={exploreDistrict} presentation={presentation} />
        <fog attach="fog" args={['#b88f63', 32, 78]} />
        <hemisphereLight args={['#ffe0ad', '#24363a', 1.25]} />
        <directionalLight position={[-14, 22, 12]} intensity={3.5} color="#ffd09a" castShadow shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[18, 7, -18]} intensity={0.7} color="#7fa4ac" />
        <Harbor event={event} state={state} exploreDistrict={exploreDistrict} presentation={presentation} shotId={shotId} />
      </Canvas>
      {!hideChrome && (
        <>
          <div className="three-legend visual-beta-legend">
            <span>{event ? toWorldCue(event).artifact : 'living harbor'}</span>
            <strong>{event ? toWorldCue(event).action : 'ambient'}</strong>
          </div>
          <div className="visual-beta-mark">PI CITY · CINEMATIC</div>
        </>
      )}
    </div>
  );
}

function CinematicRenderer({ event, shotId }: { event?: SemanticEvent; shotId?: ShotId }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  useFrame((_, delta) => {
    const shot = resolveShot(event, shotId);
    gl.toneMappingExposure = THREE.MathUtils.damp(gl.toneMappingExposure, shot.exposure, 2.4, delta);
  });
  return null;
}

function CinematicPost({
  event,
  shotId,
  exploreDistrict,
  presentation,
}: {
  event?: SemanticEvent;
  shotId?: ShotId;
  exploreDistrict?: ExperienceDistrict | null;
  presentation: CameraPresentation;
}) {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const next = new EffectComposer(gl);
    next.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), .22, .5, .9);
    next.addPass(bloom);
    const bokeh = new BokehPass(scene, camera, { focus: 12, aperture: .00002, maxblur: .003 });
    next.addPass(bokeh);
    next.addPass(new OutputPass());
    return { next, bloom, bokeh };
  }, [gl, scene, camera]);
  useEffect(() => {
    composer.next.setSize(size.width, size.height);
  }, [composer, size.width, size.height]);
  useEffect(() => () => composer.next.dispose(), [composer]);
  useFrame(() => {
    const shot = resolveShot(event, shotId);
    composer.bloom.strength = THREE.MathUtils.lerp(composer.bloom.strength, shot.bloom, .08);
    const focusDistrict = presentation === 'explore' && exploreDistrict
      ? exploreDistrict
      : event && toWorldCue(event).district !== 'system'
        ? (toWorldCue(event).district as Exclude<WorldDistrict, 'system'>)
        : null;
    const focus = focusDistrict
      ? new THREE.Vector3(...DISTRICTS[focusDistrict]).add(shot.lookShift)
      : new THREE.Vector3(0, 1, 0);
    const focusDistance = camera.position.distanceTo(focus);
    const bokehUniforms = composer.bokeh.uniforms as {
      focus: { value: number };
      aperture: { value: number };
      maxblur: { value: number };
    };
    bokehUniforms.focus.value = THREE.MathUtils.lerp(bokehUniforms.focus.value, focusDistance, .08);
    bokehUniforms.aperture.value = THREE.MathUtils.lerp(bokehUniforms.aperture.value, shot.aperture, .08);
    bokehUniforms.maxblur.value = THREE.MathUtils.lerp(bokehUniforms.maxblur.value, shot.maxBlur, .08);
    composer.next.render();
  }, 1);
  return null;
}

function Harbor({
  event,
  state,
  exploreDistrict,
  presentation,
  shotId,
}: {
  event?: SemanticEvent;
  state?: RuntimeState;
  exploreDistrict?: ExperienceDistrict | null;
  presentation: CameraPresentation;
  shotId?: ShotId;
}) {
  const cue = event ? toWorldCue(event) : undefined;
  const activeDistrict = presentation === 'explore' && exploreDistrict
    ? exploreDistrict
    : cue?.district ?? 'system';
  return (
    <>
      <SkyDome />
      <ConceptMatte event={event} shotId={shotId} />
      <Water />
      <SunsetAtmosphere />
      <HarborLightField />
      <AtmosphericDepth />
      <Landmass />
      <IndustrialFabric />
      <DistrictNeighborhoods />
      <ForegroundInfrastructure />
      <CinematicForeground event={event} shotId={shotId} />
      <HarborWorkers />
      <SmokePlumes />
      <HeroBuilding district="arrival" active={activeDistrict === 'arrival'}>
        <ArrivalRuntime active={activeDistrict === 'arrival'} />
      </HeroBuilding>
      <HeroBuilding district="session" active={activeDistrict === 'session'}>
        <SessionRuntime active={activeDistrict === 'session'} visibleEntries={state?.sessionEntries ?? 0} />
      </HeroBuilding>
      <HeroBuilding district="context" active={activeDistrict === 'context'}>
        <ContextRuntime
          active={activeDistrict === 'context'}
          cutaway={cue?.camera === 'cutaway' || (presentation === 'explore' && exploreDistrict === 'context')}
        />
      </HeroBuilding>
      <HeroBuilding district="model" active={activeDistrict === 'model'}>
        <ModelRuntime active={activeDistrict === 'model'} event={event} />
      </HeroBuilding>
      <HeroBuilding district="tool" active={activeDistrict === 'tool'}>
        <ToolRuntime active={activeDistrict === 'tool'} toolName={String(event?.payload.toolName ?? 'read')} />
      </HeroBuilding>
      <ArtifactTransit event={event} />
      <CameraDirector
        event={event}
        shotId={shotId}
        presentation={presentation}
        exploreDistrict={exploreDistrict}
      />
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
        if (Array.isArray(obj.material)) obj.material=obj.material.map(m=>weatherMaterial(m.clone()));
        else obj.material=weatherMaterial(obj.material.clone());
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

function SkyDome() {
  const vertex = `varying vec3 vWorld; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vWorld=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
  const fragment = `varying vec3 vWorld; void main(){ float h=normalize(vWorld).y*.5+.5; vec3 low=vec3(.39,.43,.40); vec3 mid=vec3(.71,.49,.32); vec3 high=vec3(.16,.24,.25); vec3 col=mix(low,mid,smoothstep(.05,.46,h)); col=mix(col,high,smoothstep(.5,1.,h)); float sun=pow(max(0.,dot(normalize(vWorld),normalize(vec3(-.55,.26,-.68)))),26.); col+=vec3(1.0,.60,.24)*sun*.9; gl_FragColor=vec4(col,1.); }`;
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[90, 48, 24]} />
      <shaderMaterial side={THREE.BackSide} vertexShader={vertex} fragmentShader={fragment} depthWrite={false} />
    </mesh>
  );
}

function ConceptMatte({ event, shotId }: { event?: SemanticEvent; shotId?: ShotId }) {
  const texture=useLoader(THREE.TextureLoader, assetUrl('assets/mattes/industrial-harbor-concept.jpg'));
  const material=useRef<THREE.ShaderMaterial>(null);
  const uniforms=useMemo(()=>({uMap:{value:texture},uOpacity:{value:.28},uHaze:{value:new THREE.Color('#c39a6e')}}),[texture]);
  useEffect(()=>{ texture.colorSpace=THREE.SRGBColorSpace; texture.anisotropy=8; },[texture]);
  useFrame((_,delta)=>{
    if(!material.current)return;
    const target=resolveShot(event, shotId).matte;
    material.current.uniforms.uOpacity.value=THREE.MathUtils.damp(material.current.uniforms.uOpacity.value,target,2.2,delta);
  });
  return <mesh position={[0,10.5,-34]} scale={[1.28,1.04,1]} renderOrder={-2}>
    <planeGeometry args={[34,28]} />
    <shaderMaterial ref={material} transparent depthWrite={false} toneMapped={false} fog={false} uniforms={uniforms}
      vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
      fragmentShader={`uniform sampler2D uMap;uniform float uOpacity;uniform vec3 uHaze;varying vec2 vUv;void main(){vec4 c=texture2D(uMap,vUv);float ex=smoothstep(0.,.12,vUv.x)*smoothstep(0.,.12,1.-vUv.x);float ey=smoothstep(0.,.20,vUv.y)*smoothstep(0.,.09,1.-vUv.y);float horizon=smoothstep(.02,.32,vUv.y);float edge=ex*ey*horizon;float haze=smoothstep(.02,.38,vUv.y)*.15;c.rgb=mix(c.rgb,uHaze,haze);gl_FragColor=vec4(c.rgb,uOpacity*edge);}`} />
  </mesh>;
}

function Water() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const vertex = `uniform float uTime; varying vec3 vWorld; varying float vWave; void main(){ vec3 p=position; float w=sin(p.x*.32+uTime*.55)*.10+sin(p.y*.47-uTime*.35)*.055; p.z+=w; vWave=w; vec4 world=modelMatrix*vec4(p,1.); vWorld=world.xyz; gl_Position=projectionMatrix*viewMatrix*world; }`;
  const fragment = `uniform float uTime; varying vec3 vWorld; varying float vWave; void main(){ vec3 deep=vec3(.075,.20,.22); vec3 shallow=vec3(.18,.34,.35); float shimmer=.5+.5*sin(vWorld.x*.9+vWorld.z*.5+uTime*1.2); vec3 col=mix(deep,shallow,.45+vWave*1.8); col+=vec3(.34,.28,.16)*pow(shimmer,18.)*.22; gl_FragColor=vec4(col,.98); }`;
  useFrame(({ clock }) => { if(material.current) material.current.uniforms.uTime.value=clock.elapsedTime; });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.26, 3]} receiveShadow>
      <planeGeometry args={[100, 65, 80, 52]} />
      <shaderMaterial ref={material} transparent uniforms={{uTime:{value:0}}} vertexShader={vertex} fragmentShader={fragment} />
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

function HarborLightField() {
  const points=useMemo(()=>{
    const positions:number[]=[];
    for(let i=0;i<96;i++){
      const band=i%3;
      const x=-25+((i*37)%100)/100*50;
      const z=-11-band*3.4+(((i*19)%17)/17)*1.5;
      const y=.65+(((i*13)%11)/11)*(1.8+band*.7);
      positions.push(x,y,z);
    }
    return new Float32Array(positions);
  },[]);
  return <points renderOrder={1}><bufferGeometry><bufferAttribute attach="attributes-position" args={[points,3]} /></bufferGeometry><pointsMaterial color="#e7b967" size={.085} transparent opacity={.72} sizeAttenuation depthWrite={false} /></points>;
}

function AtmosphericDepth() {
  return <group>
    {[[0,4.5,-12,28,8,.07],[0,7,-24,39,12,.10]] .map((v,i)=><mesh key={i} position={[v[0] as number,v[1] as number,v[2] as number]} renderOrder={-1}><planeGeometry args={[v[3] as number,v[4] as number]} /><shaderMaterial transparent depthWrite={false} uniforms={{uOpacity:{value:v[5] as number}}} vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`uniform float uOpacity;varying vec2 vUv;void main(){float a=sin(vUv.y*3.14159)*sin(vUv.x*3.14159);gl_FragColor=vec4(.72,.58,.43,uOpacity*a);}`} /></mesh>)}
  </group>;
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


function DistrictNeighborhoods() {
  const sheds:[number,number,number,number,number,string][]=[
    [-8.9,.25,3.2,1.25,.78,'#695845'],[-7.3,.25,2.7,1.05,.68,'#776a54'],[-3.2,.25,-1.2,1.2,.82,'#665b49'],
    [-1.1,.25,-2.7,1.15,.72,'#675946'],[3.65,.25,-5.7,1.0,.72,'#78634e'],[4.15,.25,-3.2,1.25,.78,'#665c4d'],
    [8.9,.25,-2.5,1.0,.66,'#6f604c'],[9.9,.25,2.0,1.15,.75,'#655846'],[10.7,.25,5.8,1.0,.7,'#755e47']
  ];
  return <group>{sheds.map((s,i)=><group key={i} position={[s[0] as number,s[1] as number,s[2] as number]} rotation={[0,(i%3-.8)*.09,0]}>
    <mesh position={[0,(s[4] as number)/2,0]} castShadow receiveShadow><boxGeometry args={[s[3] as number,s[4] as number,.95]} /><meshStandardMaterial color={s[5] as string} roughness={.96} /></mesh>
    <mesh position={[0,(s[4] as number)+.08,0]} rotation={[0,0,i%2?.10:-.10]}><boxGeometry args={[(s[3] as number)*1.04,.10,1.08]} /><meshStandardMaterial color="#37413e" roughness={.78} metalness={.08} /></mesh>
    {i%2===0&&<mesh position={[(s[3] as number)*.34,(s[4] as number)+.62,-.18]}><cylinderGeometry args={[.08,.10,1.15,10]} /><meshStandardMaterial color="#414844" metalness={.13} roughness={.72} /></mesh>}
    {i%3===1&&<mesh position={[0,(s[4] as number)*.55,.49]}><boxGeometry args={[(s[3] as number)*.34,.18,.025]} /><meshStandardMaterial color="#d9a75e" emissive="#84521f" emissiveIntensity={.72} roughness={.74} /></mesh>}
  </group>)}</group>;
}

function ForegroundInfrastructure() {
  return (
    <group>
      <group position={[-18.5, 0, 6.8]} rotation={[0, -.18, 0]}>
        <mesh position={[0,4.2,0]} castShadow><boxGeometry args={[.34,8.4,.34]} /><meshStandardMaterial color="#2c3432" roughness={.72} metalness={.16} /></mesh>
        <mesh position={[3.1,7.7,0]} rotation={[0,0,-.12]} castShadow><boxGeometry args={[6.6,.2,.22]} /><meshStandardMaterial color="#6d5738" roughness={.64} metalness={.18} /></mesh>
        <mesh position={[5.4,5.5,0]}><boxGeometry args={[.045,4.2,.045]} /><meshStandardMaterial color="#2b302f" /></mesh>
      </group>
      <group position={[18.5,0,10.6]} rotation={[0,-.32,0]}>
        <mesh position={[0,.3,0]} castShadow><boxGeometry args={[5.8,.62,1.55]} /><meshStandardMaterial color="#2e302c" roughness={.94} /></mesh>
        <mesh position={[-1.4,.88,0]} castShadow><boxGeometry args={[1.4,.82,1.08]} /><meshStandardMaterial color="#706653" roughness={.86} /></mesh>
        <mesh position={[.45,1.3,0]}><boxGeometry args={[.06,1.45,.06]} /><meshStandardMaterial color="#363b38" /></mesh>
      </group>
      {[-15.2,-9.6,4.8,16.4].map((x,i)=><mesh key={x} position={[x,.08,7.75+i*.35]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.12,.2,16]} /><meshStandardMaterial color="#282d2b" roughness={.72} metalness={.2} /></mesh>)}
    </group>
  );
}


function ForegroundMaterial() { return <meshStandardMaterial color="#1f2927" roughness={.93} metalness={.08} />; }

function CinematicForeground({ event, shotId }: { event?: SemanticEvent; shotId?: ShotId }) {
  const cue = event ? toWorldCue(event) : undefined;
  const showArrival = event?.type === 'REQUEST_ARRIVED' || shotId === 'arrival-wide';
  const showContext = cue?.district === 'context' || shotId === 'context-cut' || shotId === 'context-sealed';
  const showModel = cue?.district === 'model' || shotId === 'model-decision' || shotId === 'model-gate' || shotId === 'model-answer';
  return (
    <group>
      <group visible={showArrival} position={[-6.1, 0, 10.0]} rotation={[0, -.18, 0]}>
        <mesh position={[-1.4, 2.4, 0]} castShadow><boxGeometry args={[.28, 4.8, .28]} /><ForegroundMaterial /></mesh>
        <mesh position={[-.1, 4.45, 0]} rotation={[0,0,-.08]} castShadow><boxGeometry args={[3.0,.18,.18]} /><ForegroundMaterial /></mesh>
        <mesh position={[1.35, .45, -.2]} castShadow><boxGeometry args={[1.9,.7,.95]} /><ForegroundMaterial /></mesh>
      </group>
      <group visible={showContext} position={[5.15, 0, -1.2]} rotation={[0, -.42, 0]}>
        {[-1.25, 1.25].map((x) => <mesh key={x} position={[x, 2.1, 0]} castShadow><cylinderGeometry args={[.13,.16,4.2,10]} /><ForegroundMaterial /></mesh>)}
        <mesh position={[0,4.12,0]} castShadow><boxGeometry args={[2.8,.16,.18]} /><ForegroundMaterial /></mesh>
        <mesh position={[0,3.55,.1]} rotation={[0,0,.04]} castShadow><cylinderGeometry args={[.10,.10,3.0,10]} /><ForegroundMaterial /></mesh>
      </group>
      <group visible={showModel} position={[11.0, 0, 3.35]} rotation={[0, -.62, 0]}>
        <mesh position={[-1.55,2.0,0]} castShadow><boxGeometry args={[.4,4,.55]} /><ForegroundMaterial /></mesh>
        <mesh position={[1.55,2.0,0]} castShadow><boxGeometry args={[.4,4,.55]} /><ForegroundMaterial /></mesh>
        <mesh position={[0,4.0,0]} castShadow><boxGeometry args={[3.5,.38,.55]} /><ForegroundMaterial /></mesh>
      </group>
    </group>
  );
}

function HarborWorkers() {
  const workers:[number,number,number][]=[[-10.6,.58,5.9],[-9.8,.58,5.25],[-4.6,.58,1.7],[.1,.58,-3.1],[1.7,.58,-3.4],[11.7,.58,5.2],[13.6,.58,5.5]];
  return <group>{workers.map((p,i)=><group key={i} position={p} scale={.72}><mesh position={[0,.22,0]} castShadow><capsuleGeometry args={[.075,.28,4,8]} /><meshStandardMaterial color={i%3===0?'#6f4a36':'#2f3532'} roughness={.88} /></mesh><mesh position={[0,.51,0]}><sphereGeometry args={[.085,10,8]} /><meshStandardMaterial color="#b6a17b" roughness={.92} /></mesh></group>)}</group>;
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
    const w=small?1.15:1.45, h=small ? .8 : 1.05;
    const lit=i%3===1;
    return <group key={i} position={[(i-(count-1)/2)*(w+.18),0,0]}><mesh position={[0,h/2,0]} castShadow><boxGeometry args={[w,h,1.5]} /><meshStandardMaterial color={i%3===0?'#6e5844':'#80715a'} roughness={.96} /></mesh><mesh position={[0,h+.16,0]} rotation={[0,0,i%2 ? .12 : -.12]}><boxGeometry args={[w*1.02,.12,1.7]} /><meshStandardMaterial color="#354543" roughness={.78} /></mesh><mesh position={[0,h*.55,.76]}><boxGeometry args={[w*.46,h*.22,.025]} /><meshStandardMaterial color={lit?'#e2b56c':'#394c4b'} emissive={lit?'#9e6426':'#000'} emissiveIntensity={lit ? .9 : 0} /></mesh></group>
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
  const beacon = useRef<THREE.PointLight>(null);
  const hook = useRef<THREE.Group>(null);
  const sweep = useRef<THREE.Group>(null);
  useFrame(({clock})=>{
    if(beacon.current) beacon.current.intensity = active ? 2.2 + Math.sin(clock.elapsedTime*3.2)*.7 : .35;
    if(hook.current) hook.current.position.y = active ? 1.28 + Math.sin(clock.elapsedTime*1.55)*.22 : 1.28;
    if(sweep.current) sweep.current.rotation.y=clock.elapsedTime*(active?.38:.12);
  });
  return <group>
    <pointLight ref={beacon} position={[-1.55,4.15,.15]} intensity={.35} distance={8} color="#f1c06d" />
    <group ref={sweep} position={[-1.55,4.07,.15]}>
      <mesh position={[2.25,0,0]} rotation={[0,0,-Math.PI/2]} renderOrder={3}>
        <coneGeometry args={[.44,4.5,24,1,true]} />
        <meshBasicMaterial color="#f3d28c" transparent opacity={active?.075:.035} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
    <group ref={hook} position={[4.35,1.28,1]}>
      <mesh><boxGeometry args={[.24,.28,.18]} /><meshStandardMaterial color="#9f7040" metalness={.3} roughness={.5} /></mesh>
      <mesh position={[0,-.28,0]}><torusGeometry args={[.12,.025,8,18,Math.PI*1.6]} /><meshStandardMaterial color="#353936" metalness={.5} roughness={.42} /></mesh>
    </group>
  </group>;
}

function SessionRuntime({ active, visibleEntries }: { active: boolean; visibleEntries: number }) {
  const lift = useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(lift.current&&active) lift.current.position.y=.45+(Math.sin(clock.elapsedTime*2.4)+1)*.55;});
  return <group>{Array.from({length:12}).map((_,i)=><mesh key={i} position={[-1.42+(i%5)*.7,.72+Math.floor(i/5)*.38,1.83]} scale={i<Math.max(1,visibleEntries)?1:.06}><boxGeometry args={[.42,.13,.08]} /><meshStandardMaterial color={i<visibleEntries?'#dccb91':'#746b5c'} emissive={active&&i===Math.max(0,visibleEntries-1)?'#7a5e27':'#000'} emissiveIntensity={.8} /></mesh>)}<group ref={lift} position={[-2.15,.45,-.8]}><mesh><boxGeometry args={[.55,.22,.55]} /><meshStandardMaterial color="#a17342" metalness={.25} roughness={.5} /></mesh></group></group>;
}

function ContextRuntime({ active, cutaway }: { active: boolean; cutaway: boolean }) {
  const sorter=useRef<THREE.Group>(null);
  const cargo=useRef<THREE.Group>(null);
  const press=useRef<THREE.Mesh>(null);
  const capsule=useRef<THREE.Mesh>(null);
  useFrame(({clock},delta)=>{
    if(sorter.current) sorter.current.rotation.y += active ? delta*.8 : delta*.08;
    if(press.current) press.current.position.y = 2.35 + (active ? Math.sin(clock.elapsedTime*2.2)*.17 : 0);
    if(capsule.current){ const s=cutaway ? 1.08+Math.sin(clock.elapsedTime*2.7)*.08 : .7; capsule.current.scale.setScalar(THREE.MathUtils.damp(capsule.current.scale.x,s,5,delta)); }
    if(cargo.current){
      cargo.current.children.forEach((item,i)=>{
        const selected=i<3;
        const phase=(clock.elapsedTime*.17+i*.12)%1;
        if(!active){ item.position.set(-2.05+i*.23,.9,1.05); return; }
        if(phase<.42){ const t=phase/.42; item.position.set(THREE.MathUtils.lerp(-2.15,-.55,t),.92,THREE.MathUtils.lerp(.92,.28,t)); }
        else if(selected){ const t=(phase-.42)/.58; item.position.set(THREE.MathUtils.lerp(-.55,0,t),THREE.MathUtils.lerp(.92,1.25,t),THREE.MathUtils.lerp(.28,-.85,t)); }
        else { const t=(phase-.42)/.58; item.position.set(THREE.MathUtils.lerp(-.55,2.22,t),THREE.MathUtils.lerp(.92,.55,t),THREE.MathUtils.lerp(.28,1.48,t)); }
      });
    }
  });
  return <group>
    <group ref={sorter}>{[-1.25,-.42,.42,1.25].map(x=><mesh key={x} position={[x,1.25,.25]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.31,.045,8,24]} /><meshStandardMaterial color="#c18e4c" emissive={active?'#5b3e18':'#000'} emissiveIntensity={active ? .5 : 0} metalness={.35} roughness={.42} /></mesh>)}</group>
    <group ref={cargo}>{Array.from({length:6}).map((_,i)=><mesh key={i} castShadow><boxGeometry args={[.32,.18,.23]} /><meshStandardMaterial color={i<3?'#d6c38e':'#665c4f'} emissive={active&&i<3?'#4c3819':'#000'} emissiveIntensity={.36} roughness={.8} /></mesh>)}</group>
    <mesh ref={press} position={[0,2.35,-.85]} castShadow><boxGeometry args={[1.2,.22,.74]} /><meshStandardMaterial color="#a27843" metalness={.32} roughness={.47} /></mesh>
    <mesh ref={capsule} position={[0,1.25,-.85]}><sphereGeometry args={[.34,20,14]} /><meshStandardMaterial color="#e0ba69" emissive={cutaway?'#8e6326':'#3b2a13'} emissiveIntensity={cutaway?1.25:.25} metalness={.16} roughness={.28} /></mesh>
    {active&&<pointLight position={[0,1.8,-.4]} intensity={2.1} distance={4.5} color="#efbc65" />}
  </group>;
}

function ModelRuntime({ active, event }: { active: boolean; event?: SemanticEvent }) {
  const wheel=useRef<THREE.Group>(null);
  const gateName=String(event?.payload.toolName??'').toLowerCase();
  const gateIndex=event?.type==='AGENT_SETTLED'?3:gateName==='edit'||gateName==='write'?1:gateName==='bash'?2:event?.type==='TOOL_CALL_CREATED'?0:-1;
  useFrame(({clock})=>{if(wheel.current)wheel.current.rotation.z=clock.elapsedTime*(active?1.05:.14)});
  return <group>
    <group ref={wheel} position={[0,1.95,1.95]}><mesh><torusGeometry args={[.72,.065,8,28]} /><meshStandardMaterial color="#d2a45f" emissive={active?'#71501d':'#000'} emissiveIntensity={active ? .62 : 0} /></mesh>{Array.from({length:8}).map((_,i)=><mesh key={i} position={[Math.cos(i*Math.PI/4)*.5,Math.sin(i*Math.PI/4)*.5,0]} rotation={[0,0,i*Math.PI/4]}><boxGeometry args={[.48,.035,.04]} /><meshStandardMaterial color="#9e7340" metalness={.42} roughness={.4} /></mesh>)}</group>
    {[-1.25,-.42,.42,1.25].map((x,i)=>{const open=active&&gateIndex===i;return <group key={x} position={[x,.88,1.98]}><mesh position={[0,0,open ? .2 : 0]}><boxGeometry args={[.38,.66,.06]} /><meshStandardMaterial color={open?'#e0ba69':'#8c704c'} emissive={open?'#b27427':'#000'} emissiveIntensity={open?1.5:0} /></mesh>{open&&<pointLight position={[0,.1,.5]} intensity={2.8} distance={3.5} color="#efbc69" />}</group>})}
  </group>;
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

function CameraDirector({
  event,
  shotId,
  presentation,
  exploreDistrict,
}: {
  event?: SemanticEvent;
  shotId?: ShotId;
  presentation: CameraPresentation;
  exploreDistrict?: ExperienceDistrict | null;
}) {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3(19, 14, 24));
  const lookAt = useRef(new THREE.Vector3(0, 1, 0));
  useFrame(({ clock }, delta) => {
    if (presentation === 'explore' && exploreDistrict) {
      const focus = new THREE.Vector3(...DISTRICTS[exploreDistrict]);
      const offset = new THREE.Vector3(...EXPLORE_CAMERA_OFFSET[exploreDistrict]);
      const drift = new THREE.Vector3(
        Math.sin(clock.elapsedTime * 0.18) * 0.18,
        Math.sin(clock.elapsedTime * 0.12) * 0.06,
        Math.cos(clock.elapsedTime * 0.16) * 0.14,
      );
      desired.current.copy(focus).add(offset).add(drift);
      lookAt.current.lerp(focus.clone().add(new THREE.Vector3(0, 1.3, 0)), 1 - Math.pow(0.0015, delta));
      camera.position.lerp(desired.current, 1 - Math.pow(0.004, delta));
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = THREE.MathUtils.damp(camera.fov, 32, 3.2, delta);
        camera.updateProjectionMatrix();
      }
      camera.lookAt(lookAt.current);
      return;
    }

    const cue = event ? toWorldCue(event) : undefined;
    const focus = cue && cue.district !== 'system'
      ? new THREE.Vector3(...DISTRICTS[cue.district])
      : new THREE.Vector3(0, 0.8, 0);
    const shot = resolveShot(event, shotId);
    const driftScale = presentation === 'photo'
      ? 0
      : event?.type === 'REQUEST_ARRIVED'
        ? 0.24
        : (event?.type === 'CONTEXT_COMPILED' || event?.type === 'MODEL_REQUEST_STARTED')
          ? 0.075
          : 0.13;
    const drift = new THREE.Vector3(
      Math.sin(clock.elapsedTime * 0.16) * driftScale,
      Math.sin(clock.elapsedTime * 0.11) * driftScale * 0.36,
      Math.cos(clock.elapsedTime * 0.14) * driftScale * 0.32,
    );
    desired.current.copy(focus).add(shot.offset).add(drift);
    const lookTarget = focus.clone().add(shot.lookShift);
    if (presentation === 'photo') {
      camera.position.copy(desired.current);
      lookAt.current.copy(lookTarget);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = shot.fov;
        camera.updateProjectionMatrix();
      }
      camera.lookAt(lookAt.current);
      return;
    }
    lookAt.current.lerp(lookTarget, 1 - Math.pow(0.0012, delta));
    camera.position.lerp(desired.current, 1 - Math.pow(0.0035, delta));
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.damp(camera.fov, shot.fov, 3.2, delta);
      camera.updateProjectionMatrix();
    }
    camera.lookAt(lookAt.current);
  });
  return null;
}
