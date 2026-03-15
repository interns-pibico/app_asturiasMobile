const ROOT = document.getElementById('app-book').dataset.root || '';

import * as THREE from 'three';

// ── Dimensiones libro ──
const BW = 3.2;   // ancho pagina, eje X
const BD = 4.5;   // profundidad pagina, eje Z
const BT = 0.55;  // grosor total, eje Y
const SW = 0.35;  // ancho lomo
const CT = 0.07;  // grosor portada/contraportada
const PT = BT - 2 * CT;  // grosor bloque paginas = 0.41
const CORNER_RADIUS = 0.15;

// Para centrar el libro visualmente: el lomo esta en x=0 (bookGroup-local)
// el libro completo va de x=-(SW/2) a x=+(SW/2+BW) en bookGroup-local
// Para centrar en pantalla desplazamos: center = SW/2 + BW/2
const BOOK_CENTER_X = -(SW / 2 + BW / 2);

// ── Estado ──
let phase = 'idle';  // 'idle' | 'opening' | 'phase3'
let selectedMunicipioId = null;
let openStartTime = 0;
let coverPivotGroup = null;
let coverGeo = null;
let coverMesh = null;
let coverSlid = false;
let pages = [];
let leafletInited = false;
let leafletMapInstance = null;
let leafletZoomControl = null;
const IS_MOBILE = window.innerWidth < 1024;
let leftOpenMesh = null;
let rightOpenMesh = null;

// ── Renderer ──
const container = document.getElementById('threeCanvas');
const W = window.innerWidth;
const H = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(W, H);
renderer.setClearColor(0x3d1a06, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// ── Escena ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x3d1a06);
scene.fog = new THREE.Fog(0x3d1a06, 18, 35);

// ── Camara — vista en picado top-down con ligera perspectiva ──
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
camera.position.set(0, 10, 4);
camera.lookAt(0, 0, 0);

// ── Luces ──
const ambientLight = new THREE.AmbientLight(0xfff0d0, 1.1);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffe8b0, 1.0);
keyLight.position.set(4, 10, 3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 1024;
keyLight.shadow.mapSize.height = 1024;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffd0a0, 0.4);
fillLight.position.set(-4, 5, -2);
scene.add(fillLight);

// ── Mesa — textura procedural madera ──
function makeWoodTexture() {
  const size = 512;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = '#5c3010';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 18; i++) {
    const x = Math.random() * size;
    const w = 6 + Math.random() * 20;
    const col = Math.random() > 0.5 ? '#7a4520' : '#4a2008';
    const grad = ctx.createLinearGradient(x, 0, x + w, size);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.2, col + 'aa');
    grad.addColorStop(0.8, col + '88');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, w, size);
  }

  for (let n = 0; n < 4000; n++) {
    const nx = Math.random() * size;
    const ny = Math.random() * size;
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
    ctx.fillRect(nx, ny, 2, 2);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const tableGeo = new THREE.PlaneGeometry(20, 20);
const tableMat = new THREE.MeshStandardMaterial({
  map: makeWoodTexture(),
  roughness: 0.85,
  metalness: 0.0,
});
const table = new THREE.Mesh(tableGeo, tableMat);
table.rotation.x = -Math.PI / 2;
// El libro esta en Y=0, su fondo en Y = -BT/2 = -0.275
// La mesa toca el fondo del libro: table.y = -(BT/2 + 0.01)
table.position.y = -(BT / 2 + 0.01);
table.receiveShadow = true;
scene.add(table);

// ── Cruz de la Victoria — Alpha y Omega como COLGANTES ──
function drawVictoriaCross(ctx, cx, cy, size) {
  const s = size;
  const aw = s * 0.18;   // ancho de brazo
  const ah = s * 0.9;    // altura total (brazo vertical)
  const hw = s * 0.72;   // ancho del brazo horizontal

  ctx.save();

  // Sombra de la cruz
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  const grad = ctx.createLinearGradient(cx - aw / 2, cy - ah / 2, cx + aw / 2, cy + ah / 2);
  grad.addColorStop(0, '#f5d060');
  grad.addColorStop(0.5, '#c8900a');
  grad.addColorStop(1, '#8b5e0a');
  ctx.fillStyle = grad;

  // Brazo vertical
  ctx.beginPath();
  ctx.roundRect(cx - aw / 2, cy - ah / 2, aw, ah, 4);
  ctx.fill();

  // Brazo horizontal
  ctx.beginPath();
  ctx.roundRect(cx - hw / 2, cy - aw * 1.5, hw, aw, 4);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // T-caps (terminaciones de los extremos de los brazos)
  const capW = aw * 2.0, capH = aw * 0.55;
  // Cap superior
  ctx.beginPath(); ctx.roundRect(cx - capW / 2, cy - ah / 2 - capH + 2, capW, capH, 2); ctx.fill();
  // Cap inferior
  ctx.beginPath(); ctx.roundRect(cx - capW / 2, cy + ah / 2 - 2, capW, capH, 2); ctx.fill();
  // Cap izquierdo (horizontal)
  ctx.beginPath(); ctx.roundRect(cx - hw / 2 - capH + 2, cy - aw * 1.5 - (capW - aw) / 2, capH, capW, 2); ctx.fill();
  // Cap derecho (horizontal)
  ctx.beginPath(); ctx.roundRect(cx + hw / 2 - 2, cy - aw * 1.5 - (capW - aw) / 2, capH, capW, 2); ctx.fill();

  // Medallon central (interseccion de brazos)
  ctx.beginPath();
  ctx.arc(cx, cy - aw * 1.0, aw * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = '#f0c040';
  ctx.fill();
  ctx.strokeStyle = '#8b5e0a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Highlight del brazo vertical
  ctx.strokeStyle = 'rgba(255,245,180,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - aw * 0.25, cy - ah / 2 + 8);
  ctx.lineTo(cx - aw * 0.25, cy + ah / 2 - 8);
  ctx.stroke();

  // ── ALPHA cuelga del extremo IZQUIERDO del brazo horizontal ──
  // Y del centro del brazo horizontal
  const armCenterY = cy - aw * 1.5;
  // X del extremo izquierdo (centro del cap izquierdo)
  const leftArmX = cx - hw / 2 + aw * 0.5;
  // X del extremo derecho (centro del cap derecho)
  const rightArmX = cx + hw / 2 - aw * 0.5;
  // Punto de inicio de la cadena: borde inferior del brazo horizontal
  const chainStartY = armCenterY + aw / 2;
  const chainLen = s * 0.16;
  const medalR = s * 0.075;
  const medalCenterY = chainStartY + chainLen + medalR;

  // Cadena izquierda (Alpha)
  ctx.strokeStyle = '#c8900a';
  ctx.lineWidth = Math.max(1.5, s * 0.013);
  ctx.beginPath();
  ctx.moveTo(leftArmX, chainStartY);
  ctx.lineTo(leftArmX, chainStartY + chainLen);
  ctx.stroke();

  // Medallon Alpha
  ctx.beginPath();
  ctx.arc(leftArmX, medalCenterY, medalR, 0, Math.PI * 2);
  ctx.fillStyle = '#f0c040';
  ctx.fill();
  ctx.strokeStyle = '#8b5e0a';
  ctx.lineWidth = Math.max(1.0, s * 0.009);
  ctx.stroke();
  ctx.fillStyle = '#3a1000';
  ctx.font = `bold ${Math.round(medalR * 1.4)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u0391', leftArmX, medalCenterY); // Α (Alpha griega)

  // Cadena derecha (Omega)
  ctx.strokeStyle = '#c8900a';
  ctx.lineWidth = Math.max(1.5, s * 0.013);
  ctx.beginPath();
  ctx.moveTo(rightArmX, chainStartY);
  ctx.lineTo(rightArmX, chainStartY + chainLen);
  ctx.stroke();

  // Medallon Omega
  ctx.beginPath();
  ctx.arc(rightArmX, medalCenterY, medalR, 0, Math.PI * 2);
  ctx.fillStyle = '#f0c040';
  ctx.fill();
  ctx.strokeStyle = '#8b5e0a';
  ctx.lineWidth = Math.max(1.0, s * 0.009);
  ctx.stroke();
  ctx.fillStyle = '#3a1000';
  ctx.font = `bold ${Math.round(medalR * 1.4)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u03A9', rightArmX, medalCenterY); // Ω (Omega griega)

  ctx.restore();
}

// ── Cruz pequena para la textura de la pagina izquierda abierta ──
function drawVictoriaCrossSmall(ctx, cx, cy, s) {
  const aw = s * 0.18;
  const ah = s * 0.85;
  const hw = s * 0.68;

  ctx.save();

  const grad = ctx.createLinearGradient(cx, cy - ah / 2, cx, cy + ah / 2);
  grad.addColorStop(0, '#c8900a');
  grad.addColorStop(1, '#8b5e0a');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.roundRect(cx - aw / 2, cy - ah / 2, aw, ah, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx - hw / 2, cy - aw * 1.5, hw, aw, 3);
  ctx.fill();

  // Colgantes Alpha y Omega pequenos
  const armCY = cy - aw * 1.5;
  const lX = cx - hw / 2 + aw * 0.5;
  const rX = cx + hw / 2 - aw * 0.5;
  const cStartY = armCY + aw / 2;
  const cLen = s * 0.14;
  const mR = s * 0.07;
  const mCY = cStartY + cLen + mR;

  ctx.strokeStyle = '#c8900a'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(lX, cStartY); ctx.lineTo(lX, cStartY + cLen); ctx.stroke();
  ctx.beginPath(); ctx.arc(lX, mCY, mR, 0, Math.PI * 2);
  ctx.fillStyle = '#f0c040'; ctx.fill();
  ctx.strokeStyle = '#8b5e0a'; ctx.lineWidth = 1.0; ctx.stroke();
  ctx.fillStyle = '#3a1000';
  ctx.font = `bold ${Math.round(mR * 1.3)}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('\u0391', lX, mCY);

  ctx.strokeStyle = '#c8900a'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(rX, cStartY); ctx.lineTo(rX, cStartY + cLen); ctx.stroke();
  ctx.beginPath(); ctx.arc(rX, mCY, mR, 0, Math.PI * 2);
  ctx.fillStyle = '#f0c040'; ctx.fill();
  ctx.strokeStyle = '#8b5e0a'; ctx.lineWidth = 1.0; ctx.stroke();
  ctx.fillStyle = '#3a1000';
  ctx.font = `bold ${Math.round(mR * 1.3)}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('\u03A9', rX, mCY);

  ctx.restore();
}

// ── Rosa de los vientos 2D para la hoja izquierda ──
function drawCompassRose(ctx, cx, cy, size) {
  const r = size;
  ctx.save();

  // 4 puntas cardinales grandes (N, E, S, W)
  const cardinalAngles = [
    { angle: -Math.PI / 2, isNorth: true  },  // N (arriba)
    { angle:  Math.PI / 2, isNorth: false },  // S (abajo)
    { angle:  0,           isNorth: false },  // E (derecha)
    { angle:  Math.PI,     isNorth: false },  // W (izquierda)
  ];

  cardinalAngles.forEach(({ angle, isNorth }) => {
    const tipX = cx + Math.cos(angle) * r;
    const tipY = cy + Math.sin(angle) * r;
    const perpA = angle + Math.PI / 2;
    const perpB = angle - Math.PI / 2;
    const base = r * 0.26;
    const tailX = cx - Math.cos(angle) * r * 0.18;
    const tailY = cy - Math.sin(angle) * r * 0.18;

    // Mitad izquierda (oscura)
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(cx + Math.cos(perpA) * base, cy + Math.sin(perpA) * base);
    ctx.lineTo(tailX, tailY);
    ctx.closePath();
    ctx.fillStyle = isNorth ? '#c8900a' : '#8b5e2a';
    ctx.fill();

    // Mitad derecha (clara)
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(cx + Math.cos(perpB) * base, cy + Math.sin(perpB) * base);
    ctx.lineTo(tailX, tailY);
    ctx.closePath();
    ctx.fillStyle = isNorth ? '#f5d060' : '#c8900a';
    ctx.fill();
  });

  // 4 puntas diagonales pequeñas (NE, SE, SW, NW)
  const diagAngles = [-Math.PI / 4, Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4];
  diagAngles.forEach(angle => {
    const tipX = cx + Math.cos(angle) * r * 0.58;
    const tipY = cy + Math.sin(angle) * r * 0.58;
    const perpA = angle + Math.PI / 2;
    const perpB = angle - Math.PI / 2;
    const base = r * 0.16;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(cx + Math.cos(perpA) * base, cy + Math.sin(perpA) * base);
    ctx.lineTo(cx + Math.cos(perpB) * base, cy + Math.sin(perpB) * base);
    ctx.closePath();
    ctx.fillStyle = '#c8900a';
    ctx.fill();
    ctx.strokeStyle = '#8b5e2a';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });

  // Círculo exterior
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.08, 0, Math.PI * 2);
  ctx.strokeStyle = '#8b5e2a';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Círculo central
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = '#f0c040';
  ctx.fill();
  ctx.strokeStyle = '#8b5e0a';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Punto central
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = '#3a1000';
  ctx.fill();

  // "N" en la punta norte
  ctx.fillStyle = '#3a1000';
  ctx.font = `bold ${Math.round(r * 0.38)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - r * 0.62);
  ctx.fillText('S', cx, cy + r * 0.62);
  ctx.fillText('E', cx + r * 0.62, cy);
  ctx.fillText('W', cx - r * 0.62, cy);

  ctx.restore();
}

// ── Textura portada del libro ──
function makeBookCoverTexture(img) {
  const size = 512;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');

  // Fondo oscuro calido
  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, '#3a1a00');
  bgGrad.addColorStop(1, '#1a0800');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Imagen de fondo si disponible
  if (img) {
    ctx.globalAlpha = 0.35;
    ctx.drawImage(img, 0, 0, size, size);
    ctx.globalAlpha = 1.0;
  }

  // Overlay oscuro para legibilidad
  const overlay = ctx.createLinearGradient(0, 0, 0, size);
  overlay.addColorStop(0, 'rgba(20,5,0,0.55)');
  overlay.addColorStop(0.5, 'rgba(20,5,0,0.25)');
  overlay.addColorStop(1, 'rgba(20,5,0,0.65)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, size, size);

  // Borde decorativo dorado
  ctx.strokeStyle = '#c8900a';
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, size - 32, size - 32);
  ctx.strokeStyle = '#f5d060';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, size - 48, size - 48);

  // Titulo
  ctx.fillStyle = '#f5d060';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillText('Descubriendo', size / 2, 44);
  ctx.font = 'bold 32px Georgia, serif';
  ctx.fillText('Asturias', size / 2, 80);
  ctx.shadowBlur = 0;

  // Cruz de la Victoria con colgantes — centrada, un poco hacia arriba
  // para que los medallones queden dentro del borde
  drawVictoriaCross(ctx, size / 2, size / 2 - 10, size * 0.44);

  // Subtitulo inferior
  ctx.fillStyle = '#e8c060';
  ctx.font = 'italic 17px Georgia, serif';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText('Guia del Principado', size / 2, size - 44);
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = '#c8a040';
  ctx.fillText('Paraiso Natural', size / 2, size - 24);
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── Textura de pagina con texto Lorem Ipsum visible ──
function makePageTexture(pageNum) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 640;
  const ctx = canvas.getContext('2d');

  // Fondo pergamino
  ctx.fillStyle = '#f5f0e4';
  ctx.fillRect(0, 0, 512, 640);

  // Degradado de margen izquierdo (sombra de encuadernacion)
  const marginGrad = ctx.createLinearGradient(0, 0, 50, 0);
  marginGrad.addColorStop(0, 'rgba(160,120,60,0.14)');
  marginGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = marginGrad;
  ctx.fillRect(0, 0, 50, 640);

  // Lineas de cuaderno suaves
  ctx.strokeStyle = 'rgba(180,160,120,0.28)';
  ctx.lineWidth = 1;
  for (let y = 48; y < 640; y += 28) {
    ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(492, y); ctx.stroke();
  }

  // Numero de pagina
  ctx.fillStyle = '#8b6040';
  ctx.font = 'italic 14px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('\u2014 ' + (pageNum * 2 - 1) + ' \u2014', 256, 22);

  // Titulo de seccion
  const titles = ['Descubriendo Asturias', 'Los Concejos', 'Tradiciones'];
  ctx.fillStyle = '#5c2a00';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(titles[(pageNum - 1) % 3], 256, 52);

  // Linea ornamental bajo el titulo
  ctx.strokeStyle = '#8b5e2a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 66); ctx.lineTo(452, 66); ctx.stroke();

  // Texto de la pagina — fuente grande y contrastada para visibilidad en 3D
  ctx.fillStyle = '#1a0800';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'left';

  const pageContents = [
    [
      'Asturias, Paraiso Natural,',
      'tierra de sidra y montanas',
      'verdes junto al Cantabrico.',
      '',
      'Lorem ipsum dolor sit amet,',
      'consectetur adipiscing elit.',
      'Sed do eiusmod tempor magna.',
      '',
      'Los 78 concejos asturianos',
      'guardan historia y tradicion',
      'entre horreos e iglesias.',
      '',
      'Ut enim ad minim veniam,',
      'quis nostrud exercitation',
      'ullamco laboris nisi ut.',
      '',
      'Fabada, sidra, queso Cabrales',
      'y el Camino de Santiago:',
      'destino sin igual en el norte.',
      '',
      'Duis aute irure dolor in',
      'reprehenderit in voluptate.',
    ],
  ];

  const lines = pageContents[(pageNum - 1) % 3];
  let lineY = 92;
  lines.forEach(line => {
    if (line === '') { lineY += 12; return; }
    ctx.fillText(line, 24, lineY);
    lineY += 26;
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── Textura reverso de pagina animada (cara inferior visible al doblar) ──
/*function makePageBackTexture(pageNum) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 640;
  const ctx = canvas.getContext('2d');

  // Pre-mirror: BackSide invierte UV, esto lo compensa (doble inversión = correcto)
  ctx.translate(512, 0);
  ctx.scale(-1, 1);

  ctx.fillStyle = '#f5f0e4';
  ctx.fillRect(0, 0, 512, 640);

  // Sombra en borde derecho (cuando la pagina llega al lado izquierdo)
  const marginGrad = ctx.createLinearGradient(462, 0, 512, 0);
  marginGrad.addColorStop(0, 'transparent');
  marginGrad.addColorStop(1, 'rgba(160,120,60,0.14)');
  ctx.fillStyle = marginGrad;
  ctx.fillRect(462, 0, 50, 640);

  ctx.strokeStyle = 'rgba(180,160,120,0.28)';
  ctx.lineWidth = 1;
  for (let y = 48; y < 640; y += 28) {
    ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(492, y); ctx.stroke();
  }

  ctx.fillStyle = '#8b6040';
  ctx.font = 'italic 14px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('\u2014 ' + (pageNum * 2) + ' \u2014', 256, 22);

  const backTitles = ['Gastronomia', 'Naturaleza', 'Historia'];
  ctx.fillStyle = '#5c2a00';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(backTitles[(pageNum - 1) % 3], 256, 52);

  ctx.strokeStyle = '#8b5e2a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 66); ctx.lineTo(452, 66); ctx.stroke();

  ctx.fillStyle = '#1a0800';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';

  const backContents = [
    [
      'La fabada asturiana es el',
      'plato mas representativo:',
      'alubias blancas con chorizo,',
      'morcilla, lacon y tocino.',
      '',
      'La sidra natural se escancia',
      'desde lo alto para airearla.',
      'Es bebida y cultura a la vez.',
      '',
      'El queso Cabrales, azul y',
      'curado en cuevas, es tesoro',
      'gastronomico de fama mundial.',
    ],
    [
      'Los Picos de Europa ofrecen',
      'paisajes de roca y nieve,',
      'rios verdes y valles remotos.',
      '',
      'La costa cantabrica guarda',
      'playas virgenes entre acantilados',
      'y puertos pesqueros historicos.',
      '',
      'Los bosques de roble y castano',
      'cubren las laderas del interior,',
      'refugio de osos y urogallos.',
    ],
    [
      'En Covadonga, el ano 722,',
      'Don Pelayo vencio al islam',
      'e inicio la Reconquista.',
      '',
      'El preromanico asturiano,',
      'del siglo IX, es Patrimonio',
      'de la Humanidad por la UNESCO.',
      '',
      'Los castros celtas, los puertos',
      'romanos y las iglesias goticas',
      'narran siglos de historia viva.',
    ],
  ];

  const lines = backContents[(pageNum - 1) % 3];
  let lineY = 92;
  lines.forEach(line => {
    if (line === '') { lineY += 12; return; }
    ctx.fillText(line, 24, lineY);
    lineY += 26;
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}*/

// ── Textura reverso de la última página (igual que leftOpen pero pre-invertida para BackSide) ──
function makeLeftOpenBackTexture() {
  const src = makeLeftOpenTexture();
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 640;
  const ctx = canvas.getContext('2d');
  ctx.translate(512, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src.image, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── Alpha maps para esquinas redondeadas ──
// makeRightRoundedAlphaMap: esquinas derechas redondeadas (portada cerrada, hoja derecha)
function makeRightRoundedAlphaMap() {
  const cw = 256, ch = Math.round(256 * BD / BW);
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, cw, ch);
  const rx = Math.round(CORNER_RADIUS * cw / BW);
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.roundRect(0, 0, cw, ch, [0, rx, rx, 0]);
  ctx.fill();
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}
// makeLeftRoundedAlphaMap: esquinas izquierdas redondeadas (hoja izquierda, reverso portada)
function makeLeftRoundedAlphaMap() {
  const cw = 256, ch = Math.round(256 * BD / BW);
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, cw, ch);
  const rx = Math.round(CORNER_RADIUS * cw / BW);
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.roundRect(0, 0, cw, ch, [rx, 0, 0, rx]);
  ctx.fill();
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

// ── Textura de la hoja izquierda del libro abierto (FASE 3) ──
function makeLeftOpenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 640;
  const ctx = canvas.getContext('2d');

  // Fondo pergamino
  ctx.fillStyle = '#f5f0e4';
  ctx.fillRect(0, 0, 512, 640);

  // Sombra de lomo en borde derecho (esta hoja esta a la izquierda del lomo)
  const lomoGrad = ctx.createLinearGradient(462, 0, 512, 0);
  lomoGrad.addColorStop(0, 'transparent');
  lomoGrad.addColorStop(1, 'rgba(100,60,20,0.22)');
  ctx.fillStyle = lomoGrad;
  ctx.fillRect(462, 0, 50, 640);

  // Lineas de cuaderno suaves
  ctx.strokeStyle = 'rgba(180,160,120,0.28)';
  ctx.lineWidth = 1;
  for (let y = 48; y < 640; y += 28) {
    ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(492, y); ctx.stroke();
  }

  // Numero de pagina
  ctx.fillStyle = '#8b6040';
  ctx.font = 'italic 14px Georgia, serif';
  ctx.textAlign = 'center';
  //ctx.fillText('\u2014 6 \u2014', 256, 22);
  ctx.fillText('\u2014 2 \u2014', 256, 22);

  // Titulo
  ctx.fillStyle = '#5c2a00';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Asturias, Paraiso Natural', 256, 52);

  // Linea ornamental
  ctx.strokeStyle = '#8b5e2a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 66); ctx.lineTo(452, 66); ctx.stroke();

  // Tres parrafos en castellano, sin Lorem
  ctx.fillStyle = '#1a0800';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';

  const paragraphs = [
    [
      'Asturias, tierra verde donde',
      'la montana abraza el mar',
      'Cantabrico. Un paraiso natural',
      'con 78 concejos, cada uno',
      'con su propia historia.',
    ],
    [
      'Los horreos guardan el maiz,',
      'la sidra alegra los coros,',
      'y la fabada calienta el alma',
      'en los inviernos cantabricos.',
    ],
    [
      'El Camino de Santiago, las',
      'playas, los Lagos de Covadonga,',
      'el Naranco y los Picos de',
      'Europa: toda una region para',
      'descubrir sin prisa.',
    ],
  ];

  let lineY = 92;
  paragraphs.forEach(para => {
    para.forEach(line => {
      ctx.fillText(line, 24, lineY);
      lineY += 26;
    });
    lineY += 16;
  });

  // Rosa de los vientos decorativa
  drawCompassRose(ctx, 256, 580, 40);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── Textura de la hoja derecha (base pergamino; el Leaflet se superpone) ──
function makeRightOpenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 640;
  const ctx = canvas.getContext('2d');

  // Fondo pergamino
  ctx.fillStyle = '#f5f0e4';
  ctx.fillRect(0, 0, 512, 640);

  // Sombra de lomo en borde izquierdo (esta hoja esta a la derecha del lomo)
  const lomoGrad = ctx.createLinearGradient(0, 0, 50, 0);
  lomoGrad.addColorStop(0, 'rgba(100,60,20,0.22)');
  lomoGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = lomoGrad;
  ctx.fillRect(0, 0, 50, 640);

  // Lineas de cuaderno suaves
  ctx.strokeStyle = 'rgba(180,160,120,0.28)';
  ctx.lineWidth = 1;
  for (let y = 48; y < 640; y += 28) {
    ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(492, y); ctx.stroke();
  }

  // Numero de pagina
  ctx.fillStyle = '#8b6040';
  ctx.font = 'italic 14px Georgia, serif';
  ctx.textAlign = 'center';
  //ctx.fillText('\u2014 2 \u2014', 256, 22);
  ctx.fillText('\u2014 3 \u2014', 256, 22);

  // Titulo
  ctx.fillStyle = '#5c2a00';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Mapa de Asturias', 256, 52);

  // Linea ornamental
  ctx.strokeStyle = '#8b5e2a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 66); ctx.lineTo(452, 66); ctx.stroke();

  // Subtitulo
  ctx.fillStyle = '#8b5e2a';
  ctx.font = 'italic 14px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Explora los 78 concejos', 256, 90);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── rootGroup: contiene todo el libro — se desplaza al abrir para centrar ──
const rootGroup = new THREE.Group();
scene.add(rootGroup);

// ── Grupo principal del libro ──
const bookGroup = new THREE.Group();
bookGroup.position.x = BOOK_CENTER_X;
bookGroup.position.y = 0;  // libro en Y=0; mesa en -(BT/2+0.01)
rootGroup.add(bookGroup);

const leatherDarkMat = new THREE.MeshStandardMaterial({ color: 0x3a1f0a, roughness: 0.9, metalness: 0.05 });
const leatherMat     = new THREE.MeshStandardMaterial({ color: 0x2a1006, roughness: 0.85, metalness: 0.05 });
const pagesMat       = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.95, metalness: 0.0 });

// Lomo (spine)
const spineGeo = new THREE.BoxGeometry(SW, BT, BD);
const spineMesh = new THREE.Mesh(spineGeo, leatherDarkMat);
spineMesh.castShadow = true;
spineMesh.receiveShadow = true;
bookGroup.add(spineMesh);

// Contraportada
const backCoverGeo = new THREE.BoxGeometry(BW, CT, BD);
const backCover = new THREE.Mesh(backCoverGeo, leatherMat);
backCover.position.set(SW / 2 + BW / 2, -(BT - CT) / 2, 0);
backCover.castShadow = true;
bookGroup.add(backCover);

// Bloque de paginas
const pagesBlockGeo = new THREE.BoxGeometry(BW, PT, BD);
const pagesStack = new THREE.Mesh(pagesBlockGeo, pagesMat);
pagesStack.position.set(SW / 2 + BW / 2, 0, 0);
pagesStack.castShadow = true;
pagesStack.receiveShadow = true;
bookGroup.add(pagesStack);

// ── Portada como PlaneGeometry — se desliza igual que las paginas pero sin curvatura ──
// El pivot esta en el borde del lomo, misma posicion que las paginas
const rightRoundedAlpha = makeRightRoundedAlphaMap();  // esquinas derechas (portada, hoja derecha, FrontSide paginas)
const leftRoundedAlpha = makeLeftRoundedAlphaMap();    // esquinas izquierdas (hoja izq, BackSide paginas)

coverPivotGroup = new THREE.Group();
coverPivotGroup.position.set(-BW / 2, BT / 2 + 0.011, 0);  // Y=0.286, debajo de Page 0 (Y=0.287)
rootGroup.add(coverPivotGroup);

coverGeo = new THREE.PlaneGeometry(BW, BD, 20, 1);
coverGeo.userData.origPositions = coverGeo.attributes.position.array.slice();

const coverInitMat = new THREE.MeshStandardMaterial({
  color: 0x2a1006,
  roughness: 0.85,
  metalness: 0.05,
  side: THREE.FrontSide,
  transparent: true,
  alphaMap: rightRoundedAlpha,
  polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
});
coverMesh = new THREE.Mesh(coverGeo, coverInitMat);
coverMesh.rotation.x = -Math.PI / 2;
coverMesh.position.set(BW / 2, 0, 0);
coverMesh.castShadow = true;
coverPivotGroup.add(coverMesh);

// Reverso de la portada — marrón sólido visible al llegar al lado izquierdo
const backCoverMesh = new THREE.Mesh(coverGeo, new THREE.MeshStandardMaterial({
  color: 0x2a1006, roughness: 0.85, metalness: 0.05,
  side: THREE.BackSide, transparent: true, alphaMap: rightRoundedAlpha,
  polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
}));
backCoverMesh.rotation.x = -Math.PI / 2;
backCoverMesh.position.set(BW / 2, 0, 0);
coverPivotGroup.add(backCoverMesh);

// Cargar textura de portada
const texLoader = new THREE.TextureLoader();
texLoader.load(
  ROOT + '/static/images/libro.jpg',
  (imgTex) => {
    const coverTex = makeBookCoverTexture(imgTex.image);
    coverMesh.material = new THREE.MeshStandardMaterial({
      map: coverTex, roughness: 0.7, metalness: 0.05,
      side: THREE.FrontSide, transparent: true, alphaMap: rightRoundedAlpha,
      polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
    });
  },
  undefined,
  () => {
    const coverTex = makeBookCoverTexture(null);
    coverMesh.material = new THREE.MeshStandardMaterial({
      map: coverTex, roughness: 0.7, metalness: 0.05,
      side: THREE.FrontSide, transparent: true, alphaMap: rightRoundedAlpha,
      polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
    });
  }
);

// ── Crear 3 paginas para la animacion de paso ──
// El pivot de cada pagina esta en el borde del lomo (en coordenadas de escena)
// bookGroup.position.x = BOOK_CENTER_X = -(SW/2 + BW/2)
// Borde derecho del lomo en escena = BOOK_CENTER_X + SW/2 = -BW/2
for (let i = 0; i < 1; i++) {
  const pivotGroup = new THREE.Group();
  pivotGroup.position.set(-BW / 2, BT / 2 + 0.012 + i * 0.005, 0);
  rootGroup.add(pivotGroup);

  // PlaneGeometry con 20 segmentos en X para la deformacion de curvatura
  const pageGeo = new THREE.PlaneGeometry(BW, BD, 20, 1);
  pageGeo.userData.origPositions = pageGeo.attributes.position.array.slice();

  // Cara superior (FrontSide) — textura pagina N
  const frontMat = new THREE.MeshStandardMaterial({
    map: makePageTexture(i + 1),
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.FrontSide,
    transparent: true,
    alphaMap: rightRoundedAlpha,
  });
  const frontMesh = new THREE.Mesh(pageGeo, frontMat);
  frontMesh.rotation.x = -Math.PI / 2;
  frontMesh.position.set(BW / 2, 0, 0);
  pivotGroup.add(frontMesh);

  // Cara inferior (BackSide) — textura pagina N+1, visible al doblar
  const backMat = new THREE.MeshStandardMaterial({
    map: makeLeftOpenBackTexture(),
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.BackSide,
    transparent: true,
    alphaMap: rightRoundedAlpha,
  });
  const backMesh = new THREE.Mesh(pageGeo, backMat);
  backMesh.rotation.x = -Math.PI / 2;
  backMesh.position.set(BW / 2, 0, 0);
  pivotGroup.add(backMesh);

  pivotGroup.visible = false;
  pages.push({ pivotGroup, frontMesh, backMesh, pageGeo, turned: false });
}

// ── Hojas del libro abierto (FASE 3 — se muestran al terminar la animacion) ──
// Posiciones en rootGroup-local (en phase3, rootGroup.x = -BOOK_CENTER_X = +1.775)
// leftOpenMesh: centro en escena = -1.675 → en rootGroup = -1.675 - 1.775 = -3.45
// rightOpenMesh: centro en escena = +1.675 → en rootGroup = +1.675 - 1.775 = -0.1
{
  const geo = new THREE.PlaneGeometry(BW, BD);
  const mat = new THREE.MeshStandardMaterial({
    map: makeLeftOpenTexture(),
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.FrontSide,
    transparent: true,
    alphaMap: leftRoundedAlpha,
  });
  leftOpenMesh = new THREE.Mesh(geo, mat);
  leftOpenMesh.rotation.x = -Math.PI / 2;
  leftOpenMesh.position.set(-BW, BT / 2 + 0.022, 0);  // -3.2 = centro exacto de página 3 final
  leftOpenMesh.visible = false;
  rootGroup.add(leftOpenMesh);
}

{
  const geo = new THREE.PlaneGeometry(BW, BD);
  const mat = new THREE.MeshStandardMaterial({
    map: makeRightOpenTexture(),
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.FrontSide,
    transparent: true,
    alphaMap: rightRoundedAlpha,
  });
  rightOpenMesh = new THREE.Mesh(geo, mat);
  rightOpenMesh.rotation.x = -Math.PI / 2;
  rightOpenMesh.position.set(BOOK_CENTER_X + SW / 2 + BW / 2 - 0.1, BT / 2 + 0.004, 0);  // -0.1
  rightOpenMesh.visible = false;
  rootGroup.add(rightOpenMesh);
}

// ── Raycaster para click / touch ──
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function getClickableObjects() {
  return [coverMesh, spineMesh, backCover, pagesStack];
}

renderer.domElement.addEventListener('click', (e) => {
  if (phase !== 'idle') return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  if (raycaster.intersectObjects(getClickableObjects(), true).length > 0) startOpening();
});

renderer.domElement.addEventListener('touchend', (e) => {
  if (phase !== 'idle') return;
  const touch = e.changedTouches[0];
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  if (raycaster.intersectObjects(getClickableObjects(), true).length > 0) startOpening();
});

function startOpening() {
  phase = 'opening';
  openStartTime = performance.now() / 1000;
  document.getElementById('hint').style.opacity = '0';
}

// ── Deformacion de la pagina: movimiento de derecha a izquierda con curvatura ──
// progress: 0 = pagina intacta a la derecha; 1 = pagina completamente a la izquierda
//
// IMPORTANTE sobre ejes locales vs mundo:
// PlaneGeometry crea vertices en el plano XY local.
// Tras pageMesh.rotation.x = -PI/2:
//   Local X  →  Mundo X  (movimiento horizontal — OK usar setX)
//   Local Y  →  Mundo -Z (profundidad — no tocar)
//   Local Z  →  Mundo Y  (arriba/abajo — aqui va el bend)
// Por eso la curvatura usa setZ (no setY).
function applyPageTurn(geo, progress) {
  const pos = geo.attributes.position;
  const orig = geo.userData.origPositions;

  for (let i = 0; i < pos.count; i++) {
    const origX = orig[i * 3];
    const origY = orig[i * 3 + 1];
    // orig Z es siempre 0 en PlaneGeometry

    // t: 0 en el borde del lomo (origX = -BW/2), 1 en el borde exterior (origX = +BW/2)
    const t = (origX + BW / 2) / BW;

    // Movimiento horizontal: el borde exterior (t=1) va de derecha (+BW) a izquierda (-BW)
    const xOffset = -(progress * 2.0 * BW) * t;

    // Curvatura: en Z local (= Y mundo = hacia arriba)
    // Sube en el centro de la animacion y en la zona media de la pagina
    const bend = Math.sin(progress * Math.PI) * Math.sin(t * Math.PI) * 0.6;

    pos.setX(i, origX + xOffset);
    pos.setY(i, origY);   // Y local (= profundidad Z mundo): no modificar
    pos.setZ(i, bend);    // Z local (= altura Y mundo): la curvatura visible desde arriba
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ── Deslizamiento plano (portada): igual que applyPageTurn pero sin curvatura ──
function applyPageSlide(geo, progress) {
  const pos = geo.attributes.position;
  const orig = geo.userData.origPositions;

  for (let i = 0; i < pos.count; i++) {
    const origX = orig[i * 3];
    const origY = orig[i * 3 + 1];
    const t = (origX + BW / 2) / BW;
    const xOffset = -(progress * 2.0 * BW) * t;

    pos.setX(i, origX + xOffset);
    pos.setY(i, origY);
    pos.setZ(i, 0);  // sin curvatura
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ── Calcular posicion 2D de la hoja derecha y posicionar el div Leaflet ──
function updateLeafletPosition() {
  const leafletDiv = document.getElementById('leafletContainer');
  if (!leafletDiv) return;

  // Usar canvas bounding rect para offset correcto en viewport
  const rect = renderer.domElement.getBoundingClientRect();
  const screenW = rect.width;
  const screenH = rect.height;

  // Calcular posicion mundial de rightOpenMesh (tiene en cuenta el offset de rootGroup)
  const rightPos = new THREE.Vector3();
  rightOpenMesh.getWorldPosition(rightPos);

  // Borde izquierdo = borde derecho de la hoja izquierda (evita overlap con la pagina izq)
  const leftPos = new THREE.Vector3();
  leftOpenMesh.getWorldPosition(leftPos);
  const leftEdgeX = leftPos.x + BW / 2;

  const corners = [
    new THREE.Vector3(leftEdgeX,            rightPos.y, -BD / 2),
    new THREE.Vector3(rightPos.x + BW / 2,  rightPos.y, -BD / 2),
    new THREE.Vector3(rightPos.x + BW / 2,  rightPos.y,  BD / 2),
    new THREE.Vector3(leftEdgeX,            rightPos.y,  BD / 2),
  ];

  const screenCorners = corners.map(v => {
    const c = v.clone().project(camera);
    return {
      x: rect.left + (c.x + 1) / 2 * screenW,
      y: rect.top  + (1 - c.y) / 2 * screenH,
    };
  });

  const minX = Math.min(...screenCorners.map(c => c.x));
  const maxX = Math.max(...screenCorners.map(c => c.x));
  const minY = Math.min(...screenCorners.map(c => c.y));
  const maxY = Math.max(...screenCorners.map(c => c.y));

  leafletDiv.style.left   = Math.round(minX) + 'px';
  leafletDiv.style.top    = Math.round(minY) + 'px';
  leafletDiv.style.width  = Math.round(maxX - minX) + 'px';
  leafletDiv.style.height = Math.round(maxY - minY) + 'px';

  // border-radius proporcional — solo esquinas derechas (hoja derecha)
  const projectedWidth = maxX - minX;
  const radiusPx = Math.round(projectedWidth * (CORNER_RADIUS / BW));
  leafletDiv.style.borderRadius = '0 ' + radiusPx + 'px ' + radiusPx + 'px 0';
}

// ── Resize ──
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  if (phase === 'phase3' && !mapExpanded) updateLeafletPosition();
});

// ── showCard ──
function showCard(props) {
  selectedMunicipioId = props.id || props.municipio_id || '';
  document.getElementById('catMenuName').textContent = props.nombre || props.name || '';
  document.getElementById('municipioCard').style.display = 'none';
  document.getElementById('categoryMenu').style.display = 'block';
}

document.getElementById('cardClose').addEventListener('click', () => {
  document.getElementById('municipioCard').style.display = 'none';
});

document.getElementById('catMenuClose').addEventListener('click', () => {
  document.getElementById('categoryMenu').style.display = 'none';
});

document.querySelectorAll('.cat-menu-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.cat;
    if (!selectedMunicipioId) return;
    document.getElementById('categoryMenu').style.display = 'none';
    window.location.href = ROOT + '/explorar/' + selectedMunicipioId + '?cat=' + cat;
  });
});

// ── initLeaflet ──
function initLeaflet() {
  if (leafletInited) return;
  leafletInited = true;

  leafletMapInstance = L.map('leafletMap', {
    center: [43.35, -6.0],
    zoom: IS_MOBILE ? 6 : 8,
    attributionControl: false,
    zoomControl: !IS_MOBILE,
  });
  const map = leafletMapInstance;

  if (IS_MOBILE) {
    leafletZoomControl = L.control.zoom();
  }

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 12,
  }).addTo(map);

  fetch(ROOT + '/api/municipios/geojson')
    .then(r => r.json())
    .then(data => {
      L.geoJSON(data, {
        style: {
          fillColor: '#8b4513',
          fillOpacity: 0.08,
          color: '#5c3010',
          weight: 1.5,
          dashArray: '3,2',
        },
        onEachFeature: (feature, layer) => {
          layer.on('click', () => showCard(feature.properties));
          layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.3 }));
          layer.on('mouseout',  () => layer.setStyle({ fillOpacity: 0.08 }));
        },
      }).addTo(map);
    })
    .catch(() => {});

  setTimeout(() => map.invalidateSize(), 350);
}

// ── Transicion a FASE 3 ──
// El canvas Three.js se mantiene activo — no se hace fade.
// Se muestran las hojas del libro abierto en la escena 3D.
// El div Leaflet se superpone sobre la hoja derecha.
function transitionToPhase3() {
  if (phase === 'phase3') return; // evitar doble llamada
  phase = 'phase3';

  // Mostrar hojas del libro abierto
  if (leftOpenMesh)  leftOpenMesh.visible  = true;
  if (rightOpenMesh) rightOpenMesh.visible = true;

  // Ocultar el bloque de paginas y la contraportada (queda bajo la hoja derecha)
  pagesStack.visible = false;
  backCover.visible = false;
  if (coverPivotGroup) coverPivotGroup.visible = false;

  // Ocultar paginas de animacion
  pages.forEach(pg => { pg.pivotGroup.visible = false; });

  // Calcular posicion del div Leaflet
  updateLeafletPosition();

  // Mostrar el div con fade in
  const leafletDiv = document.getElementById('leafletContainer');
  leafletDiv.style.display  = 'block';
  leafletDiv.style.opacity  = '0';
  leafletDiv.style.transition = 'opacity 0.8s ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { leafletDiv.style.opacity = '1'; });
  });

  // Inicializar Leaflet tras el fade in
  setTimeout(initLeaflet, 450);

  // Notificar AstuGuía que el libro está abierto
  window.dispatchEvent(new CustomEvent('book:fase3ready'));
}

// ── Orientation overlay (solo en movil portrait) ──
const isMobile = navigator.maxTouchPoints > 0;
const orientOverlay = document.getElementById('orientationOverlay');

function checkOrientation() {
  if (!isMobile) return;
  const isPortrait = window.matchMedia('(orientation: portrait)').matches;
  orientOverlay.style.display = isPortrait ? 'flex' : 'none';
}
checkOrientation();
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);

// ── Expand / collapse mapa ──
let mapExpanded = false;

document.getElementById('expandBtn').addEventListener('click', () => {
  const leafletDiv = document.getElementById('leafletContainer');
  const btn = document.getElementById('expandBtn');
  mapExpanded = !mapExpanded;
  leafletDiv.classList.toggle('is-expanded', mapExpanded);
  btn.innerHTML = mapExpanded ? '&#x2715;' : '&#x2922;';
  btn.title = mapExpanded ? 'Volver al libro' : 'Expandir mapa';
  if (mapExpanded) {
    // Limpiar inline styles para que el CSS tome control total
    leafletDiv.style.left = '';
    leafletDiv.style.top = '';
    leafletDiv.style.width = '';
    leafletDiv.style.height = '';
    leafletDiv.style.borderRadius = '';
  }
  if (leafletMapInstance) {
    if (mapExpanded) {
      if (leafletZoomControl) leafletZoomControl.addTo(leafletMapInstance);
      setTimeout(() => leafletMapInstance.invalidateSize(), 320);
    } else {
      if (leafletZoomControl && leafletZoomControl._map) leafletZoomControl.remove();
      setTimeout(() => {
        leafletMapInstance.invalidateSize();
        leafletMapInstance.setView([43.35, -6.0], 6, { animate: false });
        updateLeafletPosition();
      }, 350);
    }
  }
});

// ── Animation loop ──
renderer.setAnimationLoop((timestamp) => {
  const t = timestamp / 1000;

  // FASE IDLE: libro cerrado, balanceo suave
  if (phase === 'idle') {
    bookGroup.rotation.y = 0;
  }

  // FASE OPENING: animacion de apertura
  if (phase === 'opening') {
    const elapsed = t - openStartTime;

    // Desplazar rootGroup a la derecha para centrar el libro al abrirse
    //const shiftProgress = Math.min(1, elapsed / 6.5);
    const shiftProgress = Math.min(1, elapsed / 3.5);
    const easeShift = shiftProgress < 0.5
      ? 2 * shiftProgress * shiftProgress
      : 1 - Math.pow(-2 * shiftProgress + 2, 2) / 2;
    rootGroup.position.x = -BOOK_CENTER_X * easeShift;

    // Portada: deslizamiento plano sin curvatura (0 → 1.5s)
    if (elapsed <= 1.5) {
      const p = elapsed / 1.5;
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      applyPageSlide(coverGeo, eased);
    } else if (!coverSlid) {
      coverSlid = true;
      applyPageSlide(coverGeo, 1.0);
    }

    // Paso de paginas solapado — 2.0s por pagina, solape 0.5s
    const pageTimings = [
      { start: 1.5, end: 3.5 },   // Pagina 1 — 2.0s
      
    ];

    pageTimings.forEach(({ start, end }, i) => {
      const pg = pages[i];
      if (!pg) return;

      // Mostrar la pagina antes de que empiece su animacion
      if (elapsed >= start - 0.15) {
        pg.pivotGroup.visible = true;
      }

      if (elapsed >= start && elapsed <= end) {
        const raw = (elapsed - start) / (end - start);
        // Ease in-out cuadratica
        const eased = raw < 0.5
          ? 2 * raw * raw
          : 1 - Math.pow(-2 * raw + 2, 2) / 2;
        applyPageTurn(pg.pageGeo, eased);
      } else if (elapsed > end && !pg.turned) {
        pg.turned = true;
        applyPageTurn(pg.pageGeo, 1.0);
      }
    });

    // Transicion a FASE 3 tras 5.5s
    if (elapsed > 3.5) {
      transitionToPhase3();
    }
  }

  // FASE 3: rootGroup fijo centrado
  if (phase === 'phase3') {
    rootGroup.position.x = -BOOK_CENTER_X;
  }

  renderer.render(scene, camera);
});

// ── Saltar animación si venimos de explorar ──
if (sessionStorage.getItem('bookReady')) {
  sessionStorage.removeItem('bookReady');
  rootGroup.position.x = -BOOK_CENTER_X;  // centrar antes de calcular posición Leaflet
  requestAnimationFrame(() => transitionToPhase3());
}
