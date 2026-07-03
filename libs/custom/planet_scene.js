(function () {
  'use strict';

  var canvas = document.getElementById('planet-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x020810);

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0.4, 8.5);
  camera.lookAt(0, 0, 0);

  // ── Stars ─────────────────────────────────────────────────────────────────
  (function () {
    var pos = [];
    for (var i = 0; i < 2000; i++) {
      var r = 30 + Math.random() * 50;
      var t = Math.random() * Math.PI * 2;
      var p = Math.acos(2 * Math.random() - 1);
      pos.push(r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t), r * Math.cos(p));
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g,
      new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false })));
  })();

  // ── Lighting ──────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x334455, 0.9));        // bright enough to see dark side
  var sunLight = new THREE.DirectionalLight(0xfff5e0, 1.4);
  sunLight.position.set(5, 3, 4);
  scene.add(sunLight);
  var fillLight = new THREE.DirectionalLight(0x223366, 0.25);
  fillLight.position.set(-3, -1, -2);
  scene.add(fillLight);

  // ── Mars procedural texture ───────────────────────────────────────────────
  var marsTex = (function () {
    var W = 1024, H = 512;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(W, H);
    var d   = img.data;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var u = x / W, v = y / H;
        var pN = Math.max(0, 1.0 - v / 0.075);
        var pS = Math.max(0, 1.0 - (1.0 - v) / 0.085);
        var pole = Math.max(pN, pS);
        var n  = 0.30 * Math.sin(u * 14.7 + 1.3) * Math.cos(v * 9.7  + 2.1)
               + 0.18 * Math.sin(u * 35.5 + 0.7) * Math.cos(v * 27.0 + 1.4)
               + 0.09 * Math.sin(u * 74.5 + 2.3) * Math.cos(v * 54.0 + 0.8)
               + 0.05 * Math.sin(u * 148  + 0.5) * Math.cos(v * 98.7 + 1.9);
        n = Math.max(0, Math.min(1, (n + 0.62) / 1.24));
        var sx = Math.min(Math.abs(u - 0.58), Math.abs(u - 0.58 + 1));
        var syrtis = Math.max(0, 1.0 - Math.sqrt(sx * sx * 80 + (v - 0.38) * (v - 0.38) * 50) * 5.5);
        var hx = Math.min(Math.abs(u - 0.66), Math.abs(u - 0.66 + 1));
        var hellas = Math.max(0, 1.0 - Math.sqrt(hx * hx * 280 + (v - 0.65) * (v - 0.65) * 400) * 7.0);
        var r2, g2, b2;
        if (pole > 0.1) {
          var t = Math.min(1, (pole - 0.1) / 0.9);
          r2 = 218 * t + (185 + n * 48) * (1 - t);
          g2 = 228 * t + (83  + n * 20) * (1 - t);
          b2 = 238 * t + (58  + n * 12) * (1 - t);
        } else {
          r2 = 185 + n * 48 - syrtis * 45 + hellas * 22;
          g2 = 83  + n * 20 - syrtis * 20 + hellas * 10;
          b2 = 58  + n * 12 - syrtis * 12 + hellas * 5;
        }
        var idx = (y * W + x) * 4;
        d[idx]     = Math.min(255, Math.max(0, r2));
        d[idx + 1] = Math.min(255, Math.max(0, g2));
        d[idx + 2] = Math.min(255, Math.max(0, b2));
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  })();

  // ── TextureLoader ─────────────────────────────────────────────────────────
  var loader = new THREE.TextureLoader();

  function mkSphere(r, segs) {
    return new THREE.SphereGeometry(r, segs || 64, 32);
  }
  function mkGlow(r, col, op, x) {
    var m = new THREE.Mesh(mkSphere(r, 32),
      new THREE.MeshPhongMaterial({
        color: col, transparent: true, opacity: op,
        side: THREE.BackSide, depthWrite: false,
      }));
    m.position.x = x;
    scene.add(m);
    return m;
  }

  // ── Earth  (x = -3.2) ────────────────────────────────────────────────────
  var EX = -3.2;

  var earthMesh = new THREE.Mesh(mkSphere(1.0),
    new THREE.MeshPhongMaterial({
      map: loader.load('/assets/textures/earth.jpg'),
      specular: new THREE.Color(0x334455),
      shininess: 18,
    }));
  earthMesh.position.x = EX;
  scene.add(earthMesh);

  var cloudMesh = new THREE.Mesh(mkSphere(1.028),
    new THREE.MeshPhongMaterial({
      map: loader.load('/assets/textures/earth_clouds.png'),
      transparent: true, opacity: 0.88, depthWrite: false,
    }));
  cloudMesh.position.x = EX;
  scene.add(cloudMesh);

  mkGlow(1.065, 0x4488ff, 0.13, EX);   // atmosphere

  // ── Moon  (x = 0.2) ──────────────────────────────────────────────────────
  var MX = 0.2;

  var moonMesh = new THREE.Mesh(mkSphere(0.55),
    new THREE.MeshPhongMaterial({
      map: loader.load('/assets/textures/moon.jpg'),
      shininess: 4,
    }));
  moonMesh.position.x = MX;
  moonMesh.rotation.y = 2.3;
  scene.add(moonMesh);

  // ── Mars  (x = 3.4) ──────────────────────────────────────────────────────
  var RX = 3.4;

  var marsMesh = new THREE.Mesh(mkSphere(0.78),
    new THREE.MeshPhongMaterial({ map: marsTex, shininess: 5 }));
  marsMesh.position.x = RX;
  scene.add(marsMesh);

  mkGlow(0.82, 0xcc5522, 0.08, RX);    // dust haze

  // ── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    var p = canvas.parentElement;
    var w = p ? p.offsetWidth  : 960;
    var h = p ? p.offsetHeight : 340;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ── Animate ───────────────────────────────────────────────────────────────
  var clock   = new THREE.Clock();
  var elapsed = 0;

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    earthMesh.rotation.y += 0.0018 * dt * 60;
    cloudMesh.rotation.y += 0.0022 * dt * 60;
    moonMesh.rotation.y  += 0.0007 * dt * 60;
    marsMesh.rotation.y  += 0.0019 * dt * 60;
    camera.position.y = 0.4 + 0.04 * Math.sin(elapsed * 0.3);
    renderer.render(scene, camera);
  }
  animate();
})();
