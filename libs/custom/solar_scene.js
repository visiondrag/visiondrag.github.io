(function () {
  'use strict';

  var canvas = document.getElementById('solar-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: false, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x020810);

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(65, 1, 0.1, 300);
  camera.position.set(0, 16, 8);
  camera.lookAt(0, 0, 0);

  // Stars
  (function () {
    var pos = [];
    for (var i = 0; i < 2500; i++) {
      var r = 40 + Math.random() * 60;
      var t = Math.random() * Math.PI * 2;
      var p = Math.acos(2 * Math.random() - 1);
      pos.push(r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t), r * Math.cos(p));
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g,
      new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false })));
  })();

  // Helpers
  function solid(r, col) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(r, 28, 28),
      new THREE.MeshBasicMaterial({ color: col }));
  }
  function glow(r, col, op) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(r, 20, 20),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.BackSide }));
  }
  function orbitRing(r) {
    var pts = [];
    for (var i = 0; i <= 128; i++) {
      var a = (i / 128) * Math.PI * 2;
      pts.push(r * Math.cos(a), 0, r * Math.sin(a));
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineLoop(g,
      new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.28 }));
  }

  // Sun
  var sunCore = solid(0.68, 0xffdd00);
  scene.add(sunCore);
  scene.add(glow(0.92, 0xff9900, 0.18));
  scene.add(glow(1.25, 0xffcc00, 0.06));

  // Asteroid belt (between Mars r=3.1 and Jupiter r=5.1)
  (function () {
    var pos = [];
    for (var i = 0; i < 300; i++) {
      var r = 3.7 + Math.random() * 0.85;
      var a = Math.random() * Math.PI * 2;
      pos.push(r * Math.cos(a), (Math.random() - 0.5) * 0.08, r * Math.sin(a));
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g,
      new THREE.PointsMaterial({ color: 0x887766, size: 1.5, sizeAttenuation: false })));
  })();

  // Planet definitions  [orbitR, visualSize, color, period_yrs, startAngle, extras]
  var defs = [
    { name: 'Mercury', r: 1.00, sz: 0.058, col: 0x9b9b9b, T: 0.241,   a0: 0.0 },
    { name: 'Venus',   r: 1.65, sz: 0.092, col: 0xe8cda0, T: 0.615,   a0: 1.2 },
    { name: 'Earth',   r: 2.30, sz: 0.100, col: 0x1a6ea8, T: 1.000,   a0: 2.8, moon: true },
    { name: 'Mars',    r: 3.10, sz: 0.072, col: 0xcc4422, T: 1.881,   a0: 0.8 },
    { name: 'Jupiter', r: 5.10, sz: 0.320, col: 0xc88b3a, T: 11.86,   a0: 4.2 },
    { name: 'Saturn',  r: 7.00, sz: 0.260, col: 0xe8d4a0, T: 29.46,   a0: 2.2, rings: true },
    { name: 'Uranus',  r: 8.70, sz: 0.170, col: 0x7de8e8, T: 84.01,   a0: 5.5 },
    { name: 'Neptune', r: 9.90, sz: 0.162, col: 0x3355ee, T: 164.8,   a0: 3.3 },
  ];

  // Earth's base speed: one orbit ≈ 55 s at 60 fps  →  2π / (55*60) ≈ 0.00190 rad/frame
  var EARTH_SPD = 0.00190;

  var planets = defs.map(function (d) {
    scene.add(orbitRing(d.r));

    var orbit = new THREE.Object3D();
    orbit.rotation.y = d.a0;
    scene.add(orbit);

    var node = new THREE.Object3D();
    node.position.x = d.r;
    orbit.add(node);

    var core = solid(d.sz, d.col);
    node.add(core);
    node.add(glow(d.sz * 1.35, d.col, 0.10));

    if (d.rings) {
      // Saturn rings
      var ringGeo = new THREE.RingGeometry(d.sz * 1.55, d.sz * 2.65, 40);
      var ring = new THREE.Mesh(ringGeo,
        new THREE.MeshBasicMaterial({
          color: 0xc8b070, side: THREE.DoubleSide, transparent: true, opacity: 0.60 }));
      ring.rotation.x = Math.PI / 2;   // lay flat in ecliptic plane
      node.add(ring);
    }

    var moonOrbit = null;
    if (d.moon) {
      moonOrbit = new THREE.Object3D();
      node.add(moonOrbit);
      var mn = new THREE.Object3D();
      mn.position.x = 0.26;
      moonOrbit.add(mn);
      mn.add(solid(0.027, 0x888888));
    }

    return {
      orbitObj: orbit,
      coreObj:  core,
      moonOrbit: moonOrbit,
      speed: EARTH_SPD / d.T,
    };
  });

  function resize() {
    var p = canvas.parentElement;
    var w = p ? p.offsetWidth  : 400;
    var h = p ? p.offsetHeight : 280;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  var clock    = new THREE.Clock();
  var elapsed  = 0;
  var camAngle = 0;

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    // Sun pulse
    sunCore.scale.setScalar(1 + 0.025 * Math.sin(elapsed * 2.0));
    sunCore.rotation.y += 0.004;

    // Orbit all planets; spin Earth's moon 13.4× faster
    planets.forEach(function (p) {
      p.orbitObj.rotation.y += p.speed;
      p.coreObj.rotation.y  += p.speed * 12;
      if (p.moonOrbit) p.moonOrbit.rotation.y += p.speed * 13.4;
    });

    // Slowly orbit camera for a cinematic rotating view
    camAngle += 0.00055;
    var cr = 6.0;
    camera.position.x = Math.sin(camAngle) * cr;
    camera.position.z = 8.0 + Math.cos(camAngle) * cr;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();
})();
