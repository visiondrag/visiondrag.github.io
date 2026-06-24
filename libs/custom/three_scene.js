(function () {
  'use strict';

  var canvas = document.getElementById('space-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  // ── Renderer ──────────────────────────────────────────────────────────────
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // ── Scene & Camera ────────────────────────────────────────────────────────
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500);
  camera.position.set(-1.5, 0.4, 8);
  camera.lookAt(0, 0, 0);

  // ── Starfield ─────────────────────────────────────────────────────────────
  (function () {
    var pos = [];
    for (var i = 0; i < 3000; i++) {
      var r = 55 + Math.random() * 90;
      var t = Math.random() * Math.PI * 2;
      var p = Math.acos(2 * Math.random() - 1);
      pos.push(
        r * Math.sin(p) * Math.cos(t),
        r * Math.sin(p) * Math.sin(t),
        r * Math.cos(p)
      );
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false })));
  })();

  // ── Earth group ───────────────────────────────────────────────────────────
  var EARTH_R   = 1.4;
  var ORBIT_R   = 2.55;
  var ORBIT_TILT = 0.52; // ~30°

  var earthGroup = new THREE.Group();
  earthGroup.position.set(2.6, -0.2, 0);
  scene.add(earthGroup);

  // Deep-space ocean core
  earthGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x020c18 })
  ));

  // Lat/lon wireframe grid
  earthGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.006, 22, 14),
    new THREE.MeshBasicMaterial({ color: 0x1565c0, wireframe: true, transparent: true, opacity: 0.45 })
  ));

  // Thin atmospheric glow (backside)
  earthGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.18, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x1e8fff, transparent: true, opacity: 0.07, side: THREE.BackSide })
  ));

  // ── Orbit ring (static inside earthGroup) ─────────────────────────────────
  var orbitRingMesh = new THREE.Mesh(
    new THREE.TorusGeometry(ORBIT_R, 0.009, 8, 128),
    new THREE.MeshBasicMaterial({ color: 0x58a6ff, transparent: true, opacity: 0.3 })
  );
  // Torus default is XY plane; rotate to XZ plane then tilt to match orbital plane
  orbitRingMesh.rotation.x = Math.PI / 2;
  orbitRingMesh.rotation.z = ORBIT_TILT;
  earthGroup.add(orbitRingMesh);

  // ── Orbital plane pivot (only satellite inside, tilted same angle) ─────────
  var orbitPlane = new THREE.Object3D();
  orbitPlane.rotation.z = ORBIT_TILT;
  earthGroup.add(orbitPlane);

  // ── Satellite ─────────────────────────────────────────────────────────────
  var sat = new THREE.Group();
  sat.position.set(ORBIT_R, 0, 0);
  orbitPlane.add(sat);

  // Bus body
  sat.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.27),
    new THREE.MeshBasicMaterial({ color: 0xcccccc })
  ));

  // Solar panels
  var panelMat = new THREE.MeshBasicMaterial({ color: 0x1a3fa0 });
  [-0.35, 0.35].forEach(function (x) {
    var p = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.006, 0.16), panelMat);
    p.position.x = x;
    sat.add(p);
  });

  // Panel struts
  var strutMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
  [-0.17, 0.17].forEach(function (x) {
    var s = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.013, 0.013), strutMat);
    s.position.x = x;
    sat.add(s);
  });

  // Dish antenna (cone pointing up)
  var dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.035, 0.1, 8),
    new THREE.MeshBasicMaterial({ color: 0xeeeeee })
  );
  dish.position.y = 0.1;
  sat.add(dish);

  // ── Mouse parallax ────────────────────────────────────────────────────────
  var mxT = 0, myT = 0, mx = 0, my = 0;
  document.addEventListener('mousemove', function (e) {
    mxT = (e.clientX / window.innerWidth  - 0.5);
    myT = (e.clientY / window.innerHeight - 0.5);
  });

  // ── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    var hero = canvas.parentElement;
    var w = hero ? hero.offsetWidth  : 800;
    var h = hero ? hero.offsetHeight : 340;
    if (h < 180) h = 340;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ── Animation loop ────────────────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);

    mx += (mxT - mx) * 0.04;
    my += (myT - my) * 0.04;

    earthGroup.rotation.y += 0.0022;   // earth spin
    orbitPlane.rotation.y += 0.013;    // satellite orbit
    sat.rotation.z          += 0.022;  // slow panel tumble

    // Gentle scene parallax on mouse
    scene.rotation.y = mx * 0.18;
    scene.rotation.x = -my * 0.09;

    renderer.render(scene, camera);
  }
  animate();
})();
