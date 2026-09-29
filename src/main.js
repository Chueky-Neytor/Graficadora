const THREE = window.THREE;
const OrbitControls = THREE.OrbitControls;
const math = window.math;

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121212);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(6, 6, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

let currentMesh = null;
let currentTraces = [];

function analyzeSurface(type, exprString) {
  const infoBox = document.getElementById('info-box');
  
  if (type === 'paraboloide' || exprString === '(x^2 + y^2)/4') {
    infoBox.innerHTML = `
      <b>Análisis Algorítmico (5 Pasos):</b><br/>
      <b>1. Intersección con Ejes:</b> Origen (0, 0, 0)<br/>
      <b>2. Trazas:</b><br/>
      • Plano xz (y=0): Parábola x² = 4z<br/>
      • Plano yz (x=0): Parábola y² = 4z<br/>
      <b>3. Simetría:</b> Simétrica respecto a planos xz, yz y eje z.<br/>
      <b>4. Secciones Paralelas:</b> Círculos x² + y² = 4k para z = k (k > 0)<br/>
      <b>5. Extensión:</b> D_f = ℝ², Rango_f = [0, ∞)
    `;
  } else if (type === 'silla' || exprString === 'x^2 - y^2') {
    infoBox.innerHTML = `
      <b>Análisis Algorítmico (5 Pasos):</b><br/>
      <b>1. Intersección con Ejes:</b> Punto de silla en (0, 0, 0)<br/>
      <b>2. Trazas:</b><br/>
      • Plano xz (y=0): Parábola z = x²<br/>
      • Plano yz (x=0): Parábola z = -y²<br/>
      <b>3. Simetría:</b> Simétrica respecto al eje z y plano xz/yz.<br/>
      <b>4. Secciones Paralelas:</b> Hipérbolas x² - y² = k<br/>
      <b>5. Extensión:</b> D_f = ℝ², Rango_f = (-∞, ∞)
    `;
  } else {
    infoBox.innerHTML = `
      <b>Análisis de Función Personalizada:</b><br/>
      <b>Ecuación:</b> z = ${exprString}<br/>
      <b>Estatus:</b> Malla y trazas generadas.
    `;
  }
}

function plotSurface(exprString, selectedType = 'custom') {
  if (currentMesh) scene.remove(currentMesh);
  currentTraces.forEach(t => scene.remove(t));
  currentTraces = [];

  const compiledExpr = math.compile(exprString);
  const range = 4;
  const segments = 50;
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const x = -range + (i / segments) * (2 * range);
    for (let j = 0; j <= segments; j++) {
      const y = -range + (j / segments) * (2 * range);
      let z = 0;
      try {
        z = compiledExpr.evaluate({ x, y });
        if (isNaN(z)) z = 0;
      } catch (e) {
        z = 0;
      }
      vertices.push(x, y, z);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (segments + 1) + j;
      const d = c + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x0088ff,
    side: THREE.DoubleSide,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85
  });

  currentMesh = new THREE.Mesh(geometry, material);
  scene.add(currentMesh);

  if (document.getElementById('check-traces').checked) {
    createTraces(compiledExpr, range);
  }

  analyzeSurface(selectedType, exprString);
}

function createTraces(compiledExpr, range) {
  const pointsXZ = [];
  const pointsYZ = [];
  const steps = 100;

  for (let i = 0; i <= steps; i++) {
    const v = -range + (i / steps) * (2 * range);
    try {
      const zX = compiledExpr.evaluate({ x: v, y: 0 });
      if (!isNaN(zX)) pointsXZ.push(new THREE.Vector3(v, 0, zX));
    } catch(e){}

    try {
      const zY = compiledExpr.evaluate({ x: 0, y: v });
      if (!isNaN(zY)) pointsYZ.push(new THREE.Vector3(0, v, zY));
    } catch(e){}
  }

  const matLineXZ = new THREE.LineBasicMaterial({ color: 0xff3366, linewidth: 3 });
  const matLineYZ = new THREE.LineBasicMaterial({ color: 0x33ff66, linewidth: 3 });

  const lineXZ = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsXZ), matLineXZ);
  const lineYZ = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsYZ), matLineYZ);

  scene.add(lineXZ);
  scene.add(lineYZ);
  currentTraces.push(lineXZ, lineYZ);
}

// Generador de script Manim (Python)
document.getElementById('btn-gen-manim').addEventListener('click', () => {
  const expr = document.getElementById('eq-input').value;
  const manimBox = document.getElementById('manim-box');
  const manimCode = document.getElementById('manim-code');

  const pyExpr = expr.replace(/\^/g, '**');

  manimCode.value = `from manim import *

class SurfaceAnimation(ThreeDScene):
    def construct(self):
        axes = ThreeDAxes(x_range=[-3,3,1], y_range=[-3,3,1], z_range=[-3,3,1])
        surface = Surface(
            lambda u, v: np.array([u, v, ${pyExpr}]),
            u_range=[-2, 2], v_range=[-2, 2], resolution=(30, 30)
        )
        surface.set_style(fill_opacity=0.8, stroke_color=BLUE)
        self.set_camera_orientation(phi=75 * DEGREES, theta=30 * DEGREES)
        self.play(Create(axes))
        self.play(Create(surface), run_time=3)
        self.begin_ambient_camera_rotation(rate=0.2)
        self.wait(2)
`;

  manimBox.style.display = 'block';
});

document.getElementById('btn-plot').addEventListener('click', () => {
  const expr = document.getElementById('eq-input').value;
  const type = document.getElementById('eq-select').value;
  plotSurface(expr, type);
});

document.getElementById('eq-select').addEventListener('change', (e) => {
  const input = document.getElementById('eq-input');
  const type = e.target.value;
  if (type === 'paraboloide') input.value = '(x^2 + y^2)/4';
  if (type === 'silla') input.value = 'x^2 - y^2';
  if (type === 'cono') input.value = 'sqrt(x^2 + y^2)';
  if (type === 'elipsoide') input.value = 'sqrt(1 - (x^2)/4 - (y^2)/9)';
  plotSurface(input.value, type);
});

plotSurface('x^2 - y^2', 'silla');

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
