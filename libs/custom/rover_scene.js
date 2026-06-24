(function () {
  'use strict';

  var canvas = document.getElementById('rover-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: false, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x1a0500);

  var scene  = new THREE.Scene();
  scene.fog  = new THREE.Fog(0x3d0c00, 14, 32);

  var camera = new THREE.PerspectiveCamera(65, 1, 0.1, 100);
  camera.position.set(0, 1.6, 7.0);
  camera.lookAt(0, 0.3, 0);

  // Mars sky dome
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(55, 16, 8),
    new THREE.MeshBasicMaterial({ color: 0x1e0500, side: THREE.BackSide })));

  // Distant "sun" in sky
  var sunDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd080 }));
  sunDot.position.set(-8, 10, -25);
  scene.add(sunDot);
  var sunHalo = new THREE.Mesh(
    new THREE.SphereGeometry(0.30, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.20, side: THREE.BackSide }));
  sunDot.add(sunHalo);

  // Terrain
  var terrainMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshBasicMaterial({ color: 0x7a2e0e }));
  terrainMesh.rotation.x = -Math.PI / 2;
  scene.add(terrainMesh);

  var gridMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50, 22, 22),
    new THREE.MeshBasicMaterial({ color: 0x5a1e06, wireframe: true, transparent: true, opacity: 0.15 }));
  gridMesh.rotation.x = -Math.PI / 2;
  gridMesh.position.y = 0.003;
  scene.add(gridMesh);

  // Rocks
  [
    [ 3.2, 0.9, 0.22], [-2.6, 0.4, 0.17], [ 1.8, -1.8, 0.28],
    [-1.2, 2.8, 0.13], [ 5.0,  0.2, 0.19], [-4.5,  1.5, 0.16],
    [ 0.8, 4.2, 0.24], [-3.2, -0.8, 0.14], [ 4.0,  3.0, 0.11],
    [-5.5, 0.5, 0.20], [ 6.0,  2.0, 0.15], [ 1.5, -4.0, 0.18],
    [ 2.8, -3.0, 0.10],[-0.5,  5.5, 0.22], [ 7.0, -1.0, 0.13],
  ].forEach(function (r) {
    var rock = new THREE.Mesh(
      new THREE.SphereGeometry(r[2], 5, 4),
      new THREE.MeshBasicMaterial({ color: 0x5a2208 }));
    rock.position.set(r[0], r[2] * 0.55, r[1]);
    scene.add(rock);
  });

  // ── Rover ──────────────────────────────────────────────────────────────────
  var WHEEL_R    = 0.068;
  var BODY_W     = 0.46;
  var BODY_H     = 0.14;
  var BODY_D     = 0.30;
  var BODY_HALF  = BODY_H / 2;
  var BODY_Y     = WHEEL_R * 2 + BODY_HALF;   // 0.206

  var rover = new THREE.Group();
  rover.position.y = BODY_Y;
  scene.add(rover);

  // Body
  rover.add(new THREE.Mesh(
    new THREE.BoxGeometry(BODY_W, BODY_H, BODY_D),
    new THREE.MeshBasicMaterial({ color: 0xc8a870 })));

  // Solar panels (two side wings)
  [-0.02, 0.02].forEach(function (xOff) {
    var panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.010, 0.24),
      new THREE.MeshBasicMaterial({ color: 0x2244aa }));
    panel.position.set(xOff, BODY_HALF + 0.005, 0);
    rover.add(panel);
  });

  // Mast
  var MAST_H = 0.34;
  rover.add(function () {
    var m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, MAST_H, 8),
      new THREE.MeshBasicMaterial({ color: 0xbbbbbb }));
    m.position.set(0.12, BODY_HALF + MAST_H / 2, 0);
    return m;
  }());

  // Camera head on mast
  rover.add(function () {
    var h = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.060, 0.060),
      new THREE.MeshBasicMaterial({ color: 0x777777 }));
    h.position.set(0.12, BODY_HALF + MAST_H + 0.030, 0);
    return h;
  }());

  // Eyes on camera head
  [-0.016, 0.016].forEach(function (z) {
    var eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.013, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x111111 }));
    eye.position.set(0.12 - 0.045, BODY_HALF + MAST_H + 0.030, z);
    rover.add(eye);
  });

  // High-gain antenna dish
  var dish = new THREE.Mesh(
    new THREE.TorusGeometry(0.065, 0.008, 6, 18),
    new THREE.MeshBasicMaterial({ color: 0xdddddd }));
  dish.position.set(-0.18, BODY_HALF + 0.12, 0);
  dish.rotation.y = 0.5;
  dish.rotation.z = 0.4;
  rover.add(dish);

  // 6 wheels (3 per side) with spinning pivot groups
  var wheelPivots = [];
  [-BODY_W / 2 - 0.025, BODY_W / 2 + 0.025].forEach(function (x) {
    [-BODY_D / 2 + 0.02, 0, BODY_D / 2 - 0.02].forEach(function (z) {
      var pivot = new THREE.Group();
      pivot.position.set(x, -BODY_HALF - WHEEL_R, z);
      rover.add(pivot);
      wheelPivots.push(pivot);

      // Wheel cylinder (sideways)
      var wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.060, 12),
        new THREE.MeshBasicMaterial({ color: 0x222222 }));
      wheel.rotation.z = Math.PI / 2;
      pivot.add(wheel);

      // Tread pattern
      for (var i = 0; i < 8; i++) {
        var tread = new THREE.Mesh(
          new THREE.BoxGeometry(0.062, 0.012, 0.026),
          new THREE.MeshBasicMaterial({ color: 0x444444 }));
        var a = (i / 8) * Math.PI * 2;
        tread.position.set(0, Math.sin(a) * WHEEL_R, Math.cos(a) * WHEEL_R);
        tread.rotation.x = a;
        pivot.add(tread);
      }
    });
  });

  // ── Resize & animate ───────────────────────────────────────────────────────
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

  var clock   = new THREE.Clock();
  var elapsed = 0;

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    var SWEEP_SPD = 0.25;
    var SWEEP_AMP = 3.2;
    var roverX = Math.sin(elapsed * SWEEP_SPD) * SWEEP_AMP;
    rover.position.x = roverX;
    // Face direction of travel
    var vel = Math.cos(elapsed * SWEEP_SPD);
    rover.rotation.y = vel > 0 ? 0 : Math.PI;

    // Roll wheels
    var rollRate = SWEEP_SPD * SWEEP_AMP / WHEEL_R;
    wheelPivots.forEach(function (p) { p.rotation.x += rollRate * dt; });

    // Camera gently tracks rover with lag
    camera.position.x += (roverX * 0.18 - camera.position.x) * 0.025;
    camera.lookAt(roverX * 0.10, 0.3, 0);

    renderer.render(scene, camera);
  }
  animate();
})();
