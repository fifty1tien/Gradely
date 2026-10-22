(() => {
  const canvas = document.querySelector(".rocket-background");
  const THREE = window.THREE;

  if (
    !canvas ||
    !THREE ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
  } catch {
    canvas.hidden = true;
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8, 8, 5.5, -5.5, 0.1, 100);
  camera.position.z = 18;

  scene.add(new THREE.AmbientLight(0xc6efff, 1.8));

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(-4, 6, 9);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x55f5d4, 2.2);
  rimLight.position.set(4, -3, 5);
  scene.add(rimLight);

  const rocket = new THREE.Group();
  scene.add(rocket);

  const hullMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8dce8,
    metalness: 0.76,
    roughness: 0.24,
  });
  const darkMetalMaterial = new THREE.MeshStandardMaterial({
    color: 0x21434e,
    metalness: 0.62,
    roughness: 0.32,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x42e7c4,
    emissive: 0x0d6659,
    metalness: 0.42,
    roughness: 0.28,
  });
  const noseMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb86b,
    emissive: 0x65320f,
    metalness: 0.28,
    roughness: 0.32,
  });

  const hull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.31, 1.42, 12),
    hullMaterial,
  );
  rocket.add(hull);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.26, 0.7, 12),
    noseMaterial,
  );
  nose.position.y = 1.03;
  rocket.add(nose);

  const centerStripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.315, 0.315, 0.15, 12),
    accentMaterial,
  );
  centerStripe.position.y = -0.32;
  rocket.add(centerStripe);

  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.28, 0.3, 10),
    darkMetalMaterial,
  );
  nozzle.position.y = -0.78;
  rocket.add(nozzle);

  const finShape = new THREE.Shape();
  finShape.moveTo(-0.08, -0.43);
  finShape.lineTo(-0.62, -0.91);
  finShape.lineTo(-0.31, -0.28);
  finShape.closePath();

  const finGeometry = new THREE.ShapeGeometry(finShape);
  const finMaterial = new THREE.MeshStandardMaterial({
    color: 0x287e77,
    emissive: 0x0b2425,
    metalness: 0.45,
    roughness: 0.35,
    side: THREE.DoubleSide,
  });

  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(finGeometry, finMaterial);
    fin.position.z = side * 0.16;
    rocket.add(fin);
  }

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x83eaff,
    emissive: 0x16748c,
    metalness: 0.4,
    roughness: 0.16,
  });
  const porthole = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 16, 12),
    windowMaterial,
  );
  porthole.position.set(0, 0.25, 0.255);
  rocket.add(porthole);

  const outerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.23, 0.9, 10),
    new THREE.MeshBasicMaterial({
      color: 0xff8b48,
      transparent: true,
      opacity: 0.88,
    }),
  );
  outerFlame.rotation.z = Math.PI;
  outerFlame.position.y = -1.28;
  rocket.add(outerFlame);

  const innerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.62, 10),
    new THREE.MeshBasicMaterial({
      color: 0xffe79a,
      transparent: true,
      opacity: 0.96,
    }),
  );
  innerFlame.rotation.z = Math.PI;
  innerFlame.position.set(0, -1.3, 0.02);
  rocket.add(innerFlame);

  const engineGlow = new THREE.PointLight(0xff894b, 2.2, 3.5);
  engineGlow.position.set(0, -1.12, 0.08);
  rocket.add(engineGlow);

  const world = { width: 16, height: 11 };

  function resizeScene() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    world.height = 11;
    world.width = world.height * aspect;
    camera.left = -world.width / 2;
    camera.right = world.width / 2;
    camera.top = world.height / 2;
    camera.bottom = -world.height / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    rocket.scale.setScalar(aspect < 0.75 ? 0.78 : 1.05);
  }

  resizeScene();
  window.addEventListener("resize", resizeScene, { passive: true });

  const randomBetween = (minimum, maximum) =>
    minimum + Math.random() * (maximum - minimum);
  const edges = ["left", "right", "top", "bottom"];
  const flight = {
    active: false,
    startedAt: 0,
    duration: 0,
    start: new THREE.Vector2(),
    end: new THREE.Vector2(),
    arc: 0,
    nextAt: performance.now() + randomBetween(900, 2400),
  };

  function pointOnEdge(edge) {
    const horizontalLimit = Math.max(0.6, world.width / 2 - 1.5);
    const verticalLimit = world.height / 2 - 1.5;
    const margin = 1.6;

    if (edge === "left") {
      return new THREE.Vector2(
        -world.width / 2 - margin,
        randomBetween(-verticalLimit, verticalLimit),
      );
    }

    if (edge === "right") {
      return new THREE.Vector2(
        world.width / 2 + margin,
        randomBetween(-verticalLimit, verticalLimit),
      );
    }

    if (edge === "top") {
      return new THREE.Vector2(
        randomBetween(-horizontalLimit, horizontalLimit),
        world.height / 2 + margin,
      );
    }

    return new THREE.Vector2(
      randomBetween(-horizontalLimit, horizontalLimit),
      -world.height / 2 - margin,
    );
  }

  function launchRocket(now) {
    const startIndex = Math.floor(Math.random() * edges.length);
    const endOffset = 1 + Math.floor(Math.random() * (edges.length - 1));
    const endIndex = (startIndex + endOffset) % edges.length;

    flight.start.copy(pointOnEdge(edges[startIndex]));
    flight.end.copy(pointOnEdge(edges[endIndex]));
    flight.startedAt = now;
    flight.duration = randomBetween(3000, 4800);
    flight.arc = randomBetween(-1.1, 1.1);
    flight.active = true;
  }

  function animate(now) {
    requestAnimationFrame(animate);

    if (!flight.active && now >= flight.nextAt) {
      launchRocket(now);
    }

    rocket.visible = flight.active;

    if (flight.active) {
      const progress = Math.min(1, (now - flight.startedAt) / flight.duration);
      const easedProgress = progress * progress * (3 - 2 * progress);
      const directionX = flight.end.x - flight.start.x;
      const directionY = flight.end.y - flight.start.y;
      const directionLength = Math.hypot(directionX, directionY);
      const arcOffset = Math.sin(progress * Math.PI) * flight.arc;
      const x =
        THREE.MathUtils.lerp(flight.start.x, flight.end.x, easedProgress) -
        (directionY / directionLength) * arcOffset;
      const y =
        THREE.MathUtils.lerp(flight.start.y, flight.end.y, easedProgress) +
        (directionX / directionLength) * arcOffset;

      rocket.position.set(x, y, 0);
      rocket.rotation.z = Math.atan2(-directionX, directionY);
      rocket.rotation.y = Math.sin(now * 0.004) * 0.08;
      outerFlame.scale.setScalar(0.82 + Math.random() * 0.34);
      innerFlame.scale.setScalar(0.84 + Math.random() * 0.28);
      engineGlow.intensity = 1.5 + Math.random() * 1.2;

      if (progress >= 1) {
        flight.active = false;
        flight.nextAt = now + randomBetween(5000, 11500);
      }
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
