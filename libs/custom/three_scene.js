(function () {
  'use strict';

  var canvas = document.getElementById('space-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  // ── Renderer ──────────────────────────────────────────────────────────────
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // ── Scene & Camera ────────────────────────────────────────────────────────
  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
  // Camera left-of-centre; solar system fills the lower-right of the taller hero
  var CAM  = { x: -1.0, y: 2.2, z: 9.0 };
  var LOOK = new THREE.Vector3(2.0, -1.5, 0);
  camera.position.set(CAM.x, CAM.y, CAM.z);
  camera.lookAt(LOOK);

  // ── Starfield ─────────────────────────────────────────────────────────────
  (function () {
    var pos = [];
    for (var i = 0; i < 3000; i++) {
      var r = 60 + Math.random() * 100;
      var t = Math.random() * Math.PI * 2;
      var p = Math.acos(2 * Math.random() - 1);
      pos.push(r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t), r * Math.cos(p));
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g,
      new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false })));
  })();

  // ── Helpers ───────────────────────────────────────────────────────────────
  function solid(r, col) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 32),
      new THREE.MeshBasicMaterial({ color: col }));
  }
  function wire(r, col, op) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(r, 20, 13),
      new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: op }));
  }
  function glowShell(r, col, op) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(r, 24, 24),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.BackSide }));
  }
  // LineLoop orbit path — always 1 px wide, visible at any scale
  function orbitLine(r, col, op) {
    var pts = [];
    for (var i = 0; i < 128; i++) {
      var a = (i / 128) * Math.PI * 2;
      pts.push(r * Math.cos(a), 0, r * Math.sin(a));
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineLoop(g,
      new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op }));
  }

  // ── Solar system group ────────────────────────────────────────────────────
  var solar = new THREE.Group();
  // Positioned lower-right so it occupies the empty area below the profile text
  solar.position.set(3.0, -2.8, 0);
  solar.rotation.x = 0.42;   // tilt ecliptic for 3-D perspective
  scene.add(solar);

  // ── Sun ──────────────────────────────────────────────────────────────────
  var sunCore = solid(0.52, 0xffdd00);
  solar.add(sunCore);
  solar.add(glowShell(0.72, 0xff9900, 0.14));
  solar.add(glowShell(0.98, 0xffbb00, 0.05));

  // ── Earth ────────────────────────────────────────────────────────────────
  var ED = 2.4;
  solar.add(orbitLine(ED, 0x4488ff, 0.35));

  var earthOrbit = new THREE.Object3D();
  solar.add(earthOrbit);

  var earthNode = new THREE.Object3D();
  earthNode.position.x = ED;
  earthOrbit.add(earthNode);

  var earthCore = solid(0.30, 0x020c18);
  earthNode.add(earthCore);
  var earthWire = wire(0.305, 0x1565c0, 0.55);
  earthNode.add(earthWire);
  earthNode.add(glowShell(0.37, 0x1e8fff, 0.09));

  // ── Moon ─────────────────────────────────────────────────────────────────
  var MD = 0.62;
  earthNode.add(orbitLine(MD, 0xcccccc, 0.30));

  var moonOrbit = new THREE.Object3D();
  earthNode.add(moonOrbit);

  var moonNode = new THREE.Object3D();
  moonNode.position.x = MD;
  moonOrbit.add(moonNode);

  moonNode.add(solid(0.10, 0x888888));
  moonNode.add(glowShell(0.13, 0xaaaaaa, 0.05));

  // ── Mars ─────────────────────────────────────────────────────────────────
  var RD = 3.9;
  solar.add(orbitLine(RD, 0xff5533, 0.28));

  var marsOrbit = new THREE.Object3D();
  marsOrbit.rotation.y = 1.3;   // start offset
  solar.add(marsOrbit);

  var marsNode = new THREE.Object3D();
  marsNode.position.x = RD;
  marsOrbit.add(marsNode);

  var marsCore = solid(0.22, 0x1a0500);
  marsNode.add(marsCore);
  var marsWire = wire(0.224, 0xcc3300, 0.60);
  marsNode.add(marsWire);
  marsNode.add(glowShell(0.27, 0xff4411, 0.07));

  // ── Spacecraft pool ───────────────────────────────────────────────────────
  var _wp = new THREE.Vector3();
  function wpos(node) { node.getWorldPosition(_wp); return _wp.clone(); }

  var TRAIL_LEN = 30;

  function buildCraft() {
    var g = new THREE.Group();

    // Fuselage — 2.5× larger than before
    g.add(new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 0.22),
      new THREE.MeshBasicMaterial({ color: 0xe0e0e0 })));

    // Wings
    [-0.075, 0.075].forEach(function (x) {
      var w = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.008, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xaaaaaa }));
      w.position.x = x;
      g.add(w);
    });

    // Engine glow sphere
    var eng = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x55aaff }));
    eng.position.z = 0.13;
    g.add(eng);

    // Exhaust cone (outer, blue-white)
    var cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.065, 0.32, 8),
      new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.55 }));
    cone.rotation.x = Math.PI / 2;
    cone.position.z = 0.13 + 0.16;   // tip at engine, cone extends backward
    g.add(cone);

    // Inner plume (brighter, narrower)
    var plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.22, 8),
      new THREE.MeshBasicMaterial({ color: 0xcceeff, transparent: true, opacity: 0.80 }));
    plume.rotation.x = Math.PI / 2;
    plume.position.z = 0.13 + 0.11;
    g.add(plume);

    // Trail line — dynamic buffer, 30 points
    var trailBuf = new Float32Array(TRAIL_LEN * 3);
    var trailGeo = new THREE.BufferGeometry();
    var trailAttr = new THREE.BufferAttribute(trailBuf, 3);
    trailAttr.setUsage(THREE.DynamicDrawUsage);
    trailGeo.setAttribute('position', trailAttr);
    trailGeo.setDrawRange(0, 0);
    var trailLine = new THREE.Line(trailGeo,
      new THREE.LineBasicMaterial({ color: 0x55aaff, transparent: true, opacity: 0.45 }));
    scene.add(trailLine);

    g.visible = false;
    scene.add(g);   // in scene space — matches wpos() coordinate frame
    return {
      mesh: g,
      trailLine: trailLine,
      trailBuf: trailBuf,
      trailAttr: trailAttr,
      trailGeo: trailGeo,
      trailCount: 0,
      curve: null,
      t: 0,
      speed: 0,
      active: false
    };
  }

  var pool = [buildCraft(), buildCraft()];

  var BODIES    = { earth: earthNode, mars: marsNode, moon: moonNode };
  var BODY_KEYS = ['earth', 'mars', 'moon'];
  var lastLaunch = -3.5;   // first craft ~3.5 s in
  var nextDelay  = 3.5;

  var _lk = new THREE.Vector3();
  function tickCraft(dt) {
    pool.forEach(function (c) {
      if (!c.active) return;
      c.t += c.speed * dt;
      if (c.t >= 1.0) {
        c.active = false;
        c.mesh.visible = false;
        c.trailLine.visible = false;
        c.trailCount = 0;
        c.trailGeo.setDrawRange(0, 0);
        return;
      }

      var pos = c.curve.getPoint(c.t);
      c.mesh.position.copy(pos);
      c.curve.getPoint(Math.min(c.t + 0.025, 1.0), _lk);
      c.mesh.lookAt(_lk);

      // Shift trail buffer and prepend current position
      var buf = c.trailBuf;
      // Shift existing points back by 1
      for (var i = TRAIL_LEN - 1; i > 0; i--) {
        buf[i * 3]     = buf[(i - 1) * 3];
        buf[i * 3 + 1] = buf[(i - 1) * 3 + 1];
        buf[i * 3 + 2] = buf[(i - 1) * 3 + 2];
      }
      buf[0] = pos.x;
      buf[1] = pos.y;
      buf[2] = pos.z;
      c.trailAttr.needsUpdate = true;
      if (c.trailCount < TRAIL_LEN) c.trailCount++;
      c.trailGeo.setDrawRange(0, c.trailCount);
    });
  }

  function launchCraft() {
    var craft = pool.find(function (c) { return !c.active; });
    if (!craft) return;

    var fromKey = BODY_KEYS[Math.floor(Math.random() * BODY_KEYS.length)];
    var rest    = BODY_KEYS.filter(function (k) { return k !== fromKey; });
    var toKey   = rest[Math.floor(Math.random() * rest.length)];

    var from = wpos(BODIES[fromKey]);
    var to   = wpos(BODIES[toKey]);
    var dist = from.distanceTo(to);

    // Bezier control point: arc outward perpendicular to the route
    var mid = from.clone().add(to).multiplyScalar(0.5);
    var dir = to.clone().sub(from).normalize();
    var perp = new THREE.Vector3(-dir.z, 0.5 + Math.random() * 0.5, dir.x).normalize();
    mid.addScaledVector(perp, dist * 0.50);

    craft.curve  = new THREE.QuadraticBezierCurve3(from, mid, to);
    craft.t      = 0;
    craft.speed  = 0.28 / Math.max(dist, 0.4);   // t-units per second
    craft.active = true;
    craft.trailCount = 0;
    craft.trailGeo.setDrawRange(0, 0);
    craft.mesh.visible = true;
    craft.trailLine.visible = true;
  }

  // ── Mouse parallax — move camera, not scene ───────────────────────────────
  var mxT = 0, myT = 0, mx = 0, my = 0;
  document.addEventListener('mousemove', function (e) {
    mxT = (e.clientX / window.innerWidth  - 0.5);
    myT = (e.clientY / window.innerHeight - 0.5);
  });

  // ── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    var hero = canvas.parentElement;
    var w = hero ? hero.offsetWidth  : 800;
    var h = hero ? hero.offsetHeight : 480;
    if (h < 200) h = 480;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ── Animation loop ────────────────────────────────────────────────────────
  var clock   = new THREE.Clock();
  var elapsed = 0;

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    // Smooth camera parallax
    mx += (mxT - mx) * 0.04;
    my += (myT - my) * 0.04;
    camera.position.x += (CAM.x + mx * 0.8  - camera.position.x) * 0.05;
    camera.position.y += (CAM.y - my * 0.4  - camera.position.y) * 0.05;
    camera.lookAt(LOOK);

    // Sun pulse
    var pulse = 1 + 0.02 * Math.sin(elapsed * 2.1);
    sunCore.scale.setScalar(pulse);

    // Orbits  (using real period ratios: Moon≈27d, Earth=365d, Mars=687d)
    earthOrbit.rotation.y += 0.0075;
    moonOrbit.rotation.y  += 0.031;
    marsOrbit.rotation.y  += 0.0040;

    // Axial spin
    sunCore.rotation.y   += 0.004;
    earthCore.rotation.y += 0.011;
    earthWire.rotation.y += 0.011;
    marsCore.rotation.y  += 0.008;
    marsWire.rotation.y  += 0.008;

    // Spacecraft
    if (elapsed - lastLaunch > nextDelay) {
      launchCraft();
      lastLaunch = elapsed;
      nextDelay  = 8 + Math.random() * 9;
    }
    tickCraft(dt);

    renderer.render(scene, camera);
  }
  animate();
})();
