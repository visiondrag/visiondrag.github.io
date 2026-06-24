(function () {
  'use strict';

  var canvas = document.getElementById('space-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);

  // Starfield
  var pos = [];
  for (var i = 0; i < 4000; i++) {
    var r = 30 + Math.random() * 90;
    var t = Math.random() * Math.PI * 2;
    var p = Math.acos(2 * Math.random() - 1);
    pos.push(r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t), r * Math.cos(p));
  }
  var sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  scene.add(new THREE.Points(sg,
    new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false })));

  // Mouse parallax
  var mxT = 0, myT = 0, mx = 0, my = 0;
  document.addEventListener('mousemove', function (e) {
    mxT = (e.clientX / window.innerWidth  - 0.5);
    myT = (e.clientY / window.innerHeight - 0.5);
  });

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

  var clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    clock.getDelta();
    mx += (mxT - mx) * 0.04;
    my += (myT - my) * 0.04;
    camera.position.x = mx * 1.5;
    camera.position.y = -my * 1.0;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  animate();
})();
