import * as T from "three";
import { louisiana } from "./story";

export type World = {
  render: (seconds: number) => boolean;
  dispose: () => void;
};

/** Photographic relief planes live in one continuous 3D world, arranged inside Louisiana. */
export function createWorld(
  canvas: HTMLCanvasElement,
  onLost: () => void,
  allowSoftware = false,
): World {
  // Check capability before constructing Three.js, avoiding an expected console error on unsupported devices.
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!context) throw new Error("WebGL2 unavailable");
  const renderer = new T.WebGLRenderer({
    canvas,
    context,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  const gl = renderer.getContext();
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  if (
    !allowSoftware &&
    debug &&
    /swiftshader|llvmpipe|software/i.test(
      String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)),
    )
  ) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw new Error("Use the lightweight story for software rendering");
  }
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, innerWidth < 700 ? 1.25 : 1.5),
  );
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  scene.background = new T.Color("#061a2c");
  scene.fog = new T.FogExp2("#061a2c", 0.008);
  const camera = new T.PerspectiveCamera(40, 1, 0.05, 120);
  scene.add(new T.HemisphereLight(0xc9d8df, 0x061522, 0.65));
  const key = new T.DirectionalLight(0xffe4c2, 1.4);
  key.position.set(-8, 14, 6);
  scene.add(key);
  const v = (x: number, y: number, z: number) => new T.Vector3(x, y, z);
  const mesh = (
    geometry: T.BufferGeometry,
    material: T.Material,
    parent: T.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const object = new T.Mesh(geometry, material);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  };
  const blue = new T.MeshStandardMaterial({
    color: 0x0d2338,
    roughness: 0.75,
    metalness: 0.2,
  });
  const steel = new T.MeshStandardMaterial({
    color: 0x607c8d,
    roughness: 0.38,
    metalness: 0.55,
  });
  const gold = new T.MeshBasicMaterial({ color: 0xc79b63 });
  const glow = new T.MeshBasicMaterial({ color: 0xf0d5a8 });
  const landShape = new T.Shape(
    louisiana.map(([x, z]) => new T.Vector2(x, -z)),
  );
  const land = mesh(
    new T.ExtrudeGeometry(landShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.04,
    }),
    blue,
    scene,
    0,
    -0.25,
    0,
  );
  land.rotation.x = -Math.PI / 2;
  const borderCurve = new T.CatmullRomCurve3(
    louisiana.map(([x, z]) => v(x, 0, z)),
    false,
    "centripetal",
  );
  const border = mesh(
    new T.TubeGeometry(borderCurve, 200, 0.025, 5, false),
    gold,
    scene,
  );
  const centers = [
    [-4.6, -7.4],
    [-4.5, -2.5],
    [-4.4, 2.8],
    [0.1, 2.2],
    [4.25, 4.2],
  ];
  const plates: T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>[] = [];
  const rooms: T.Group[] = [];
  const textures = new Set<T.Texture>();
  let disposed = false;
  const loader = new T.TextureLoader();
  centers.forEach(([x, z], i) => {
    const room = new T.Group();
    room.position.set(x, 0, z);
    scene.add(room);
    rooms.push(room);
    mesh(new T.BoxGeometry(2.4, 0.14, 2.1), blue, room, 0, 0.05, 0);
    mesh(new T.BoxGeometry(2.4, 1.1, 0.08), blue, room, 0, 0.6, -1);
    for (const side of [-1, 1])
      mesh(
        new T.BoxGeometry(0.025, 1.1, 0.025),
        steel,
        room,
        side * 1.17,
        0.6,
        -0.95,
      );
    mesh(new T.BoxGeometry(2.3, 0.018, 0.018), glow, room, 0, 1.13, -0.94);
    mesh(new T.CylinderGeometry(0.12, 0.12, 0.04, 20), gold, room, 0, 0.15, 0);
    const material = new T.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    // Shallow curved relief gives the close-up a physical surface and subtle perspective travel.
    const geometry = new T.PlaneGeometry(8.1, 4.56, 32, 18);
    const positions = geometry.attributes.position;
    for (let p = 0; p < positions.count; p++) {
      const px = positions.getX(p),
        py = positions.getY(p);
      positions.setZ(p, -0.012 * px * px - 0.007 * py * py);
    }
    geometry.computeVertexNormals();
    const plate = mesh(geometry, material, scene, x, 1.75, z) as T.Mesh<
      T.PlaneGeometry,
      T.MeshBasicMaterial
    >;
    plates.push(plate);
    const texture = loader.load(
      `/restore/scene-${i + 1}.webp`,
      (loaded) => {
        if (disposed) {
          loaded.dispose();
          return;
        }
        loaded.colorSpace = T.SRGBColorSpace;
        material.map = loaded;
        material.opacity = 1;
        material.needsUpdate = true;
      },
      undefined,
      () => {},
    );
    textures.add(texture);
  });
  const threadPoints = [
    v(-5, 0.18, -8.4),
    v(-4.6, 0.28, -7.4),
    v(-4.5, 0.28, -2.5),
    v(-4.4, 0.28, 2.8),
    v(0.1, 0.28, 2.2),
    v(4.25, 0.28, 4.2),
  ];
  const curve = new T.CatmullRomCurve3(threadPoints);
  const threadGeo = new T.TubeGeometry(curve, 150, 0.012, 6, false);
  const thread = mesh(threadGeo, gold, scene);
  const total = threadGeo.index!.count;
  const spark = mesh(new T.SphereGeometry(0.045, 12, 8), glow, scene);
  const positions = new Float32Array(120 * 3);
  let seed = 57;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (random() - 0.5) * 23;
    positions[i + 1] = random() * 4;
    positions[i + 2] = (random() - 0.5) * 24;
  }
  const moteGeo = new T.BufferGeometry();
  moteGeo.setAttribute("position", new T.BufferAttribute(positions, 3));
  const motes = new T.Points(
    moteGeo,
    new T.PointsMaterial({
      color: 0xd2dce1,
      size: 0.022,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    }),
  );
  scene.add(motes);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  let lastWidth = 0,
    lastHeight = 0;
  const lost = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  canvas.addEventListener("webglcontextlost", lost);
  return {
    render(seconds) {
      if (disposed) return false;
      const width = canvas.clientWidth,
        height = canvas.clientHeight;
      if (!width || !height) return false;
      if (width !== lastWidth || height !== lastHeight) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        lastWidth = width;
        lastHeight = height;
      }
      const shot = Math.min(4, Math.max(0, Math.floor((seconds - 2) / 4)));
      const shotTime = shot === 0 ? seconds : seconds - (2 + shot * 4);
      const join = smooth(T.MathUtils.clamp(shotTime / 0.8, 0, 1));
      const previous = centers[Math.max(0, shot - 1)];
      const x = T.MathUtils.lerp(
        previous[0],
        centers[shot][0],
        shot === 0 ? 1 : join,
      );
      const z = T.MathUtils.lerp(
        previous[1],
        centers[shot][1],
        shot === 0 ? 1 : join,
      );
      const target = v(x, 1.75, z);
      const travel = T.MathUtils.clamp(shotTime / 4, 0, 1);
      camera.position.set(
        x - 0.12 + travel * 0.22,
        1.77 + travel * 0.035,
        z + 5.42 - travel * 0.27,
      );
      // The camera pulls physically out of the final room into the complete world.
      const pull = smooth(T.MathUtils.clamp((seconds - 20.7) / 2.8, 0, 1));
      if (pull > 0) {
        camera.position.lerp(v(0, width < 700 ? 42 : 28, 3.5), pull);
        target.lerp(v(0, 0, -1), pull);
      }
      camera.lookAt(target);
      plates.forEach((plate, i) => {
        plate.visible = i === shot || (i === shot - 1 && join < 1) || pull > 0;
        if (plate.material.map)
          plate.material.opacity =
            1 - smooth(T.MathUtils.clamp((seconds - 21.3) / 1.2, 0, 1));
        const scale = 1 - pull * 0.83;
        plate.scale.setScalar(scale);
        plate.rotation.x = (-pull * Math.PI) / 2;
        plate.position.y = 1.75 * (1 - pull) + 0.22 * pull;
      });
      rooms.forEach((room) => (room.visible = seconds > 20.7));
      land.visible = border.visible = seconds > 20.7;
      thread.visible = spark.visible = seconds > 20.7;
      const progress = T.MathUtils.clamp(seconds / 21, 0.001, 1);
      threadGeo.setDrawRange(0, Math.floor((total * progress) / 6) * 6);
      spark.position.copy(curve.getPointAt(progress));
      motes.rotation.y = seconds * 0.004;
      renderer.render(scene, camera);
      return Boolean(plates[shot].material.map) || seconds > 22.5;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>();
      scene.traverse((object) => {
        if (object instanceof T.Mesh || object instanceof T.Points) {
          geometries.add(object.geometry);
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((m: T.Material) => materials.add(m));
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
