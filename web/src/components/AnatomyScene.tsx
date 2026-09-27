"use client";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Line,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import type { OrbitControls as Controls } from "three-stdlib";
import { useExplorer } from "@/lib/store";
import {
  voxelToWorld,
  worldToVoxel,
  type Organ,
  type Vec3,
} from "@/lib/geometry";
function OrganMesh({ organ }: { organ: Organ }) {
  const invalidate = useThree((s) => s.invalidate);
  const path = useExplorer((s) => s.assetPath);
  const url = `${path}/meshes/${organ.name}.glb`;
  const gltf = useGLTF(url);
  const release = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selected = useExplorer((s) => s.selected === organ.id);
  const visible = useExplorer((s) => s.visible.includes(organ.id));
  const scene = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((o) => {
      if (o instanceof Mesh)
        o.material = new MeshStandardMaterial({
          color: organ.color,
          roughness: 0.48,
          metalness: 0.05,
        });
    });
    return root;
  }, [gltf.scene, organ.color]);
  useEffect(() => {
    scene.traverse((o) => {
      if (o instanceof Mesh) {
        const m = o.material as MeshStandardMaterial;
        m.transparent = !selected;
        m.opacity = selected ? 1 : 0.28;
        m.depthWrite = selected;
        o.renderOrder = selected ? 2 : 1;
        m.needsUpdate = true;
      }
    });
    invalidate();
  }, [scene, selected, invalidate]);
  useEffect(
    () => () => {
      scene.traverse((o) => {
        if (o instanceof Mesh) {
          (o.material as MeshStandardMaterial).dispose();
        }
      });
      document.body.style.cursor = "";
    },
    [scene],
  );
  useEffect(() => {
    // React Strict Mode replays setup/cleanup on mount. Only a genuine unmount
    // releases the shared loader geometry; the replay cancels this timer.
    clearTimeout(release.current);
    return () => {
      release.current = setTimeout(() => {
        gltf.scene.traverse((o) => {
          if (o instanceof Mesh) {
            o.geometry.dispose();
            const materials = Array.isArray(o.material)
              ? o.material
              : [o.material];
            materials.forEach((m) => m.dispose());
          }
        });
        useGLTF.clear(url);
      }, 0);
    };
  }, [gltf, url]);
  // Three.js raycasting can hit invisible objects; removing the primitive also
  // removes its hit target, so isolated organs receive the intended clicks.
  if (!visible) return null;
  return (
    <primitive
      object={scene}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 5) return;
        e.stopPropagation();
        const s = useExplorer.getState();
        s.select(organ.id, worldToVoxel(e.point.toArray() as Vec3, s.meta!));
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    />
  );
}
function CrossPlanes() {
  const { meta, crosshair, planes } = useExplorer();
  if (!meta || !planes) return null;
  const [x, y, z] = voxelToWorld(crosshair, meta);
  const [w, d, h] = meta.shape.map((n, i) => n * meta.spacing_mm[i]);
  const edges: { points: Vec3[]; color: string }[] = [
    {
      points: [
        [-w / 2, y, -d / 2],
        [w / 2, y, -d / 2],
        [w / 2, y, d / 2],
        [-w / 2, y, d / 2],
        [-w / 2, y, -d / 2],
      ],
      color: "#c6b17d",
    },
    {
      points: [
        [-w / 2, -h / 2, z],
        [w / 2, -h / 2, z],
        [w / 2, h / 2, z],
        [-w / 2, h / 2, z],
        [-w / 2, -h / 2, z],
      ],
      color: "#a8b7c9",
    },
    {
      points: [
        [x, -h / 2, -d / 2],
        [x, -h / 2, d / 2],
        [x, h / 2, d / 2],
        [x, h / 2, -d / 2],
        [x, -h / 2, -d / 2],
      ],
      color: "#a6bba4",
    },
  ];
  return (
    <group>
      <mesh
        position={[0, y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={() => null}
      >
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial
          color="#c6b17d"
          transparent
          opacity={0.035}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, z]} raycast={() => null}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          color="#a8b7c9"
          transparent
          opacity={0.025}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh
        position={[x, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        raycast={() => null}
      >
        <planeGeometry args={[d, h]} />
        <meshBasicMaterial
          color="#a6bba4"
          transparent
          opacity={0.025}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      {edges.map((e, i) => (
        <Line
          key={i}
          points={e.points}
          color={e.color}
          transparent
          opacity={0.25}
          lineWidth={0.65}
          raycast={() => null}
        />
      ))}
      <mesh position={[x, y, z]} raycast={() => null} renderOrder={3}>
        <sphereGeometry args={[2, 12, 12]} />
        <meshBasicMaterial color="#fff9e8" depthTest={false} />
      </mesh>
    </group>
  );
}
function CameraControls({ distance }: { distance: number }) {
  const ref = useRef<Controls>(null);
  const reset = useExplorer((s) => s.cameraReset);
  useEffect(() => {
    const c = ref.current;
    if (c) {
      c.object.position.set(0, 0, distance);
      c.target.set(0, 0, 0);
      c.update();
    }
  }, [reset, distance]);
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={distance * 0.25}
      maxDistance={distance * 2}
      enablePan
    />
  );
}
class SceneBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-error" role="alert">
        Não foi possível abrir o modelo 3D. Verifique o suporte a WebGL e os
        arquivos de malha.
        <button onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function SceneReady({ ready }: { ready: () => void }) {
  useEffect(ready, [ready]);
  return null;
}
export default function AnatomyScene() {
  const meta = useExplorer((s) => s.meta);
  const [loaded, setLoaded] = useState(false);
  const ready = useCallback(() => setLoaded(true), []);
  if (!meta) return null;
  const distance =
    Math.max(...meta.shape.map((n, i) => n * meta.spacing_mm[i])) * 1.95;
  return (
    <div data-testid="scene" data-ready={loaded}>
      <SceneBoundary>
        <Canvas
          camera={{ position: [0, 0, distance], fov: 34, near: 1, far: 5000 }}
          dpr={[1, 1.75]}
          frameloop="demand"
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
          fallback={
            <div className="scene-error">
              Seu navegador não oferece WebGL. Os cortes 2D continuam
              disponíveis.
            </div>
          }
        >
          <ambientLight intensity={1.25} />
          <directionalLight position={[-250, 400, 500]} intensity={3} />
          <directionalLight
            position={[300, 50, -200]}
            color="#c4d6c5"
            intensity={1.5}
          />
          <hemisphereLight args={["#fff5e5", "#415442", 0.8]} />
          <Suspense fallback={null}>
            {meta.organs.map((o) => (
              <OrganMesh key={o.id} organ={o} />
            ))}
            <SceneReady ready={ready} />
          </Suspense>
          <CrossPlanes />
          <CameraControls distance={distance} />
          <GizmoHelper alignment="bottom-right" margin={[68, 52]}>
            <GizmoViewport
              axisColors={["#c6b17d", "#a6bba4", "#9aaec3"]}
              labels={["L", "S", "A"]}
              labelColor="#203449"
              hideNegativeAxes
            />
          </GizmoHelper>
        </Canvas>
        {!loaded && (
          <div className="scene-loading" role="status">
            Carregando {meta.organs.length} estruturas…
          </div>
        )}
      </SceneBoundary>
    </div>
  );
}
