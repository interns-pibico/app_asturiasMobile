import * as THREE from '/static/vendor/three/three.module.js';
import { stampPassport } from './passport.js';

// ── Datos desde template ──
const appEl = document.getElementById('app-explorar');
const ROOT            = appEl.dataset.root || '';
const MUNICIPIO_ID    = parseInt(appEl.dataset.municipioId, 10);
const MUNICIPIO_NOMBRE = appEl.dataset.municipioNombre || '';
let   CAT             = appEl.dataset.cat || 'comer';
const ES_COSTERO      = appEl.dataset.costero === 'true';
const GEOJSON_RAW     = JSON.parse(appEl.dataset.geojson || 'null');

// ── Paleta pastel ──
const PASTEL = {
  skyInterior:  0xc8e6f5,
  skyCoast:     0xc4dff0,
  fogColor:     0xd4eaf7,
  grassSurface: 0xa8d8a8,
  sandSurface:  0xe8d8b0,
  grassSide:    0xc8b878,
  sandSide:     0xd4b86a,
  ciclismo:      0x90d4a0,
  senderismo:    0xf0d080,
  sendas_verdes: 0x80cbc4,
  carril_bici:   0xffc947,
  paseos:        0xce93d8,
  comer:        0xf0b0a0,
  ocio:         0xa0d0d0,
  tiendas:      0xf0c898,
  mercado:      0xd0b0e8,
  outline:      0x3a2010,
  dustColor:    0xd4c4a8,
};

// ── Config categorías ──
const CAT_CONFIG = {
  ciclismo:      { url: ROOT + '/api/rutas/{id}?tipo=ciclismo',         color: PASTEL.ciclismo,      label: 'Rutas en Bici' },
  senderismo:    { url: ROOT + '/api/rutas/{id}?tipo=senderismo',       color: PASTEL.senderismo,    label: 'Senderismo' },
  sendas_verdes: { url: ROOT + '/api/rutas/{id}?tipo=sendas_verdes',    color: PASTEL.sendas_verdes, label: 'Sendas Verdes' },
  carril_bici:   { url: ROOT + '/api/rutas/{id}?tipo=carril_bici',      color: PASTEL.carril_bici,   label: 'Carril Bici' },
  paseos:        { url: ROOT + '/api/rutas/{id}?tipo=paseos',           color: PASTEL.paseos,        label: 'Paseos' },
  comer:        { url: ROOT + '/api/pois/{id}?categoria=comer',        color: PASTEL.comer,        label: 'Comer' },
  ocio:         { url: ROOT + '/api/pois/{id}?categoria=ocio',         color: PASTEL.ocio,         label: 'Ocio' },
  tiendas:      { url: ROOT + '/api/pois/{id}?categoria=tiendas',      color: PASTEL.tiendas,      label: 'Tiendas' },
  mercado:      { url: ROOT + '/api/mercado/{id}',                     color: PASTEL.mercado,      label: 'Mercado Local' },
};

// ── Emojis por categoría POI ──
const CAT_EMOJI = {
  comer: '🍽️',
  ocio:         '🎭',
  tiendas:      '🛍️',
  mercado:      '🛒',
};

// ── Emojis por subtipo de comer ──
const COMER_EMOJI = {
  restaurant: '🍽️',
  pub:        '🍹',
  cafe:       '☕',
  bar:        '🥃',
  fast_food:  '🍔',
};

// ── Emojis por subtipo de ocio ──
const OCIO_EMOJI = {
  viewpoint:   '🔭',
  museum:      '🖼️',
  theatre:     '🎭',
  arts_centre: '🎨',
  castle:      '🏰',
  monument:    '🏛️',
  cinema:      '🎬',
  memorial:    '🗿',
};

// ── Emojis por subtipo de tiendas ──
const TIENDAS_EMOJI = {
  bakery:      '🥖',
  supermarket: '🧺',
  clothes:     '👕',
  fashion:     '👗',
  kiosk:       '🏪',
  deli:        '🧑‍🍳',
  cheese:      '🧀',
  wine:        '🍷',
};

// ── Emoji mercado por keyword match en nombre ──
function getMercadoEmoji(nombre) {
  const n = (nombre || '').toLowerCase();
  if (n.includes('llagar') || n.includes('sidrería') || n.includes('sidreria'))  return '🍾';
  if (n.includes('sidra'))                                                        return '🍾';
  if (n.includes('cerveza') || n.includes('cervecería') || n.includes('cerveceria') || n.includes('lúpulo') || n.includes('lupulo')) return '🍺';
  if (n.includes('queso') || n.includes('quesería') || n.includes('queseria'))   return '🧀';
  if (n.includes('embutido') || n.includes('chorizo') || n.includes('salchich') || n.includes('charcuter')) return '🥩';
  if (n.includes('artesanía') || n.includes('artesania') || n.includes('cerámica') || n.includes('ceramica')) return '🏺';
  if (n.includes('vino') || n.includes('vinoteca') || n.includes('bodega'))      return '🍷';
  return '🛒';
}

// ── Tags de filtro por subcategoría (hardcoded en JS) ──
const CAT_FILTER_TAGS = {
  comer: [['restaurant','Restaurante'],['pub','Pub'],['cafe','Cafetería'],['bar','Bar'],['fast_food','Comida rápida']],
  ocio: [['viewpoint','Mirador'],['museum','Museo'],['theatre','Teatro'],['arts_centre','Centro de arte'],['castle','Castillo'],['monument','Monumento'],['cinema','Cine'],['memorial','Memorial']],
  tiendas: [['bakery','Panadería'],['supermarket','Supermercado'],['clothes','Tienda de ropa'],['fashion','Moda'],['kiosk','Kiosco'],['deli','Delicatessen'],['cheese','Quesería'],['wine','Vinoteca']],
};

// ── Categorías de rutas ──
const ROUTE_CATS = new Set(['ciclismo', 'senderismo', 'sendas_verdes', 'carril_bici', 'paseos']);
const ROUTE_COLORS = {
  ciclismo:      0x1565ff,
  senderismo:    0x00e676,
  sendas_verdes: 0x00bfa5,
  carril_bici:   0xff8f00,
  paseos:        0xaa00ff,
};

// ── Plataforma — transformación lon/lat → XZ ──
let platformGeoCenter = { lon: 0, lat: 0, scaleX: 1, scaleZ: 1 };

function computePlatformTransform(geojson) {
  let ring = null;
  if (geojson.type === 'MultiPolygon') {
    ring = geojson.coordinates[0][0];
  } else if (geojson.type === 'Polygon') {
    ring = geojson.coordinates[0];
  }
  if (!ring || ring.length === 0) return null;

  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const lonSpan = maxLon - minLon;
  const latSpan = maxLat - minLat;

  const targetSize = 28;
  const cosLat = Math.cos(centerLat * Math.PI / 180);
  const lonPhysical = lonSpan * cosLat;
  const latPhysical = latSpan;
  const maxSpan = Math.max(lonPhysical, latPhysical);
  const scale = maxSpan > 0 ? targetSize / maxSpan : 1;

  platformGeoCenter = {
    lon: centerLon,
    lat: centerLat,
    scaleX: scale * cosLat,
    scaleZ: scale,
  };

  // Calcular bbox en espacio Three.js para clamping
  let bboxMinX = Infinity, bboxMaxX = -Infinity;
  let bboxMinZ = Infinity, bboxMaxZ = -Infinity;
  for (const [lon, lat] of ring) {
    const p = geoToXZ(lon, lat);
    if (p.x < bboxMinX) bboxMinX = p.x;
    if (p.x > bboxMaxX) bboxMaxX = p.x;
    if (p.z < bboxMinZ) bboxMinZ = p.z;
    if (p.z > bboxMaxZ) bboxMaxZ = p.z;
  }
  platformGeoCenter.bboxMinX = bboxMinX;
  platformGeoCenter.bboxMaxX = bboxMaxX;
  platformGeoCenter.bboxMinZ = bboxMinZ;
  platformGeoCenter.bboxMaxZ = bboxMaxZ;

  return ring;
}

function geoToXZ(lon, lat) {
  const x = (lon - platformGeoCenter.lon) * platformGeoCenter.scaleX;
  const z = -(lat - platformGeoCenter.lat) * platformGeoCenter.scaleZ;
  return { x, z };
}

// ── Ray-casting: punto en ring (coordenadas XZ de Three.js) ──
function pointInRing(px, pz, ringXZ) {
  let inside = false;
  for (let i = 0, j = ringXZ.length - 1; i < ringXZ.length; j = i++) {
    const [xi, zi] = ringXZ[i];
    const [xj, zj] = ringXZ[j];
    if ((zi > pz) !== (zj > pz) &&
        px < (xj - xi) * (pz - zi) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ── Punto aleatorio dentro del polígono del municipio ──
let _polygonRingXZ = null;
function getPolygonRingXZ() {
  if (_polygonRingXZ) return _polygonRingXZ;
  if (!GEOJSON_RAW) return null;
  let ring = null;
  if (GEOJSON_RAW.type === 'MultiPolygon') ring = GEOJSON_RAW.coordinates[0][0];
  else if (GEOJSON_RAW.type === 'Polygon') ring = GEOJSON_RAW.coordinates[0];
  if (!ring) return null;
  _polygonRingXZ = ring.map(([lon, lat]) => { const p = geoToXZ(lon, lat); return [p.x, p.z]; });
  return _polygonRingXZ;
}

function randomPointInPolygon() {
  const ringXZ = getPolygonRingXZ();
  if (!ringXZ) return null;
  const bbox = platformGeoCenter;
  const MARGIN = 0.5;
  const w = bbox.bboxMaxX - bbox.bboxMinX - MARGIN * 2;
  const h = bbox.bboxMaxZ - bbox.bboxMinZ - MARGIN * 2;
  for (let attempt = 0; attempt < 60; attempt++) {
    const tx = bbox.bboxMinX + MARGIN + Math.random() * w;
    const tz = bbox.bboxMinZ + MARGIN + Math.random() * h;
    if (pointInRing(tx, tz, ringXZ)) return { x: tx, z: tz };
  }
  return { x: 0, z: 0 };
}

// ── Renderer + Escena ──
const canvas = document.getElementById('explorar-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const bgColor = ES_COSTERO ? PASTEL.skyCoast : PASTEL.skyInterior;
renderer.setClearColor(bgColor, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(bgColor);
scene.fog = new THREE.Fog(PASTEL.fogColor, 40, 80);

// ── Cámara ortográfica isométrica — C-3: viewSize dinámico ──
function getViewSize() {
  if (window.innerWidth >= 1024) return 22;
  if (window.innerWidth >= 768)  return 20;
  return 18;
}

const aspect = window.innerWidth / window.innerHeight;
let viewSize = getViewSize();
const camera = new THREE.OrthographicCamera(
  -viewSize * aspect, viewSize * aspect,
  viewSize, -viewSize, 0.1, 200
);
camera.position.set(30, 30, 30);
camera.lookAt(0, 0, 0);

// ── Luces ──
const ambient = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfffde0, 0.9);
sun.position.set(20, 40, 20);
scene.add(sun);

// ── Día/Noche ──
const DAYNIGHT_ZONES = [
  { h:[0,6],  name:'madrugada', ambient:[0x101828,0.25], sun:[0x1a2840,0.05], sunPos:[-10,5,-10],  sky:0x0a0f1a, fog:[0x0d1520,30,60] },
  { h:[6,8],  name:'amanecer',  ambient:[0xffb347,0.45], sun:[0xff7518,0.60], sunPos:[-20,8,20],   sky:0xe8804a, fog:[0xd4785a,35,70] },
  { h:[8,18], name:'dia',       ambient:[0xffffff,0.80], sun:[0xfffde0,0.90], sunPos:[20,40,20],   sky:ES_COSTERO?0xc4dff0:0xc8e6f5, fog:[0xd4eaf7,40,80] },
  { h:[18,20],name:'atardecer', ambient:[0xff9060,0.50], sun:[0xff6030,0.70], sunPos:[20,10,-20],  sky:0xd4603a, fog:[0xc85030,35,70] },
  { h:[20,24],name:'noche',     ambient:[0x0a1428,0.30], sun:[0x304060,0.10], sunPos:[0,30,0],     sky:0x060c18, fog:[0x080e20,25,55] },
];

// Estrellas para noche/madrugada
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(200 * 3);
for (let i = 0; i < 200; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi   = Math.acos(2 * Math.random() - 1);
  starPos[i*3]   = 60 * Math.sin(phi) * Math.cos(theta);
  starPos[i*3+1] = Math.abs(60 * Math.cos(phi));
  starPos[i*3+2] = 60 * Math.sin(phi) * Math.sin(theta);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false }));
stars.visible = false;
scene.add(stars);

function applyDayNight() {
  const h    = new Date().getHours();
  const zone = DAYNIGHT_ZONES.find(z => h >= z.h[0] && h < z.h[1]) || DAYNIGHT_ZONES[2];
  ambient.color.setHex(zone.ambient[0]);
  ambient.intensity = zone.ambient[1];
  sun.color.setHex(zone.sun[0]);
  sun.intensity = zone.sun[1];
  sun.position.set(...zone.sunPos);
  scene.background.setHex(zone.sky);
  renderer.setClearColor(zone.sky, 1);
  scene.fog.color.setHex(zone.fog[0]);
  scene.fog.near = zone.fog[1];
  scene.fog.far  = zone.fog[2];
  stars.visible  = zone.name === 'noche' || zone.name === 'madrugada';
  appEl.dataset.daynight = zone.name;
}

// ── Outline BackSide helper ──
function OL(mesh, color = PASTEL.outline, scale = 1.04) {
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  const ol = new THREE.Mesh(mesh.geometry, mat);
  ol.scale.setScalar(scale);
  mesh.add(ol);
}

// ── Construir plataforma ──
function buildPlatform(geojson) {
  const ring = computePlatformTransform(geojson);
  if (!ring) return;

  const shape = new THREE.Shape();
  const first = geoToXZ(ring[0][0], ring[0][1]);
  shape.moveTo(first.x, -first.z);
  for (let i = 1; i < ring.length; i++) {
    const p = geoToXZ(ring[i][0], ring[i][1]);
    shape.lineTo(p.x, -p.z);
  }
  shape.closePath();

  const extrudeSettings = {
    depth: 1.5,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.15,
    bevelSegments: 2,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.rotateX(-Math.PI / 2);

  const surfaceColor = ES_COSTERO ? PASTEL.sandSurface : PASTEL.grassSurface;
  const sideColor    = ES_COSTERO ? PASTEL.sandSide    : PASTEL.grassSide;

  const matSurface = new THREE.MeshToonMaterial({ color: surfaceColor });
  const matSide    = new THREE.MeshToonMaterial({ color: sideColor });

  const mesh = new THREE.Mesh(geo, [matSurface, matSide]);
  mesh.position.y = -0.75;
  scene.add(mesh);

  const outlineGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  outlineGeo.rotateX(-Math.PI / 2);
  const outlineMesh = new THREE.Mesh(
    outlineGeo,
    new THREE.MeshBasicMaterial({ color: PASTEL.outline, side: THREE.BackSide })
  );
  outlineMesh.scale.setScalar(1.02);
  outlineMesh.position.y = -0.75;
  scene.add(outlineMesh);
}

// ── Sprite emoji en círculo (comer por subtipo) ──
function buildEmojiSprite(emoji, color) {
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const hex = '#' + color.toString(16).padStart(6, '0');
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.font = `${Math.round(size * 0.48)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + 2);
  const texture = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.1, 1.1, 1.1);
  return sprite;
}

// ── Pin sprite (poste delgado con cabeza emoji) ──
function buildPinSprite(cat, tipo, color, nombre = '') {
  const group = new THREE.Group();

  // Poste delgado
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1.4, 6),
    new THREE.MeshToonMaterial({ color: 0x998877 })
  );
  pole.position.y = 0.7;
  group.add(pole);

  // Cabeza emoji en la punta (pequeña por defecto, escala 0.35)
  let emoji;
  if      (cat === 'comer')        emoji = COMER_EMOJI[tipo]       || '🍽️';
  else if (cat === 'ocio')         emoji = OCIO_EMOJI[tipo]        || '🎭';
  else if (cat === 'tiendas')      emoji = TIENDAS_EMOJI[tipo]     || '🛍️';
  else if (cat === 'mercado')      emoji = getMercadoEmoji(nombre);
  else                             emoji = CAT_EMOJI[cat]          || '📍';
  const head = buildEmojiSprite(emoji, color);
  head.scale.setScalar(0.35);
  head.position.y = 1.55;
  group.add(head);

  group.userData.pinHead = head;
  return group;
}

// ── Sprites procedurales ──
function buildSprite(cat, color, tipo = '') {
  if (cat === 'comer') {
    const emoji = COMER_EMOJI[tipo] || '🍽️';
    return buildEmojiSprite(emoji, color);
  }

  const group = new THREE.Group();

  if (cat === 'ciclismo') {
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.1, 6, 16),
      new THREE.MeshToonMaterial({ color })
    );
    torus.rotation.y = Math.PI / 2;
    torus.position.y = 0.5;
    group.add(torus);
    OL(torus);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6),
      new THREE.MeshToonMaterial({ color: 0xc0c0b0 })
    );
    pole.position.y = -0.1;
    group.add(pole);

  } else if (cat === 'senderismo') {
    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.35, 0.7),
      new THREE.MeshToonMaterial({ color })
    );
    boot.position.y = 0.4;
    group.add(boot);
    OL(boot);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6),
      new THREE.MeshToonMaterial({ color: 0xc0c0b0 })
    );
    pole.position.y = -0.05;
    group.add(pole);

  } else if (cat === 'ocio') {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 1.0, 8),
      new THREE.MeshToonMaterial({ color })
    );
    col.position.y = 0.5;
    group.add(col);
    OL(col);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.12, 0.6),
      new THREE.MeshToonMaterial({ color: 0xe8e0c8 })
    );
    cap.position.y = 1.06;
    group.add(cap);

  } else if (cat === 'tiendas') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshToonMaterial({ color })
    );
    dome.position.y = 0.8;
    group.add(dome);
    OL(dome);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.7, 0.7),
      new THREE.MeshToonMaterial({ color: 0xf0e8d8 })
    );
    base.position.y = 0.35;
    group.add(base);
    OL(base);

  } else {
    // mercado
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.7, 0.9),
      new THREE.MeshToonMaterial({ color })
    );
    body.position.y = 0.45;
    group.add(body);
    OL(body);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.12, 1.0),
      new THREE.MeshToonMaterial({ color: 0xc8a080 })
    );
    roof.position.y = 0.86;
    roof.rotation.z = 0.12;
    group.add(roof);
  }

  group.scale.setScalar(0.7);
  return group;
}

// ── C-5: Rutas 3D con efecto glow estilo Strava ──
function buildRouteGlow(coords, colorHex) {
  const allPts = [];
  for (const seg of coords) {
    if (Array.isArray(seg[0])) {
      for (const [lon, lat] of seg) {
        const p = geoToXZ(lon, lat);
        allPts.push(new THREE.Vector3(p.x, 1.1, p.z));
      }
    } else {
      const [lon, lat] = seg;
      const p = geoToXZ(lon, lat);
      allPts.push(new THREE.Vector3(p.x, 1.1, p.z));
    }
  }
  if (allPts.length < 3) return null;

  // Decimation: máx 60 puntos para rendimiento mobile
  const step = Math.max(1, Math.floor(allPts.length / 60));
  const pts = allPts.filter((_, i) => i % step === 0);
  if (pts[pts.length - 1] !== allPts[allPts.length - 1]) pts.push(allPts[allPts.length - 1]);

  const curve = new THREE.CatmullRomCurve3(pts);
  const tSeg = Math.min(pts.length * 3, 150);
  const group = new THREE.Group();

  // Capa 1: core sólido
  const gCore = new THREE.TubeGeometry(curve, tSeg, 0.035, 4, false);
  group.add(new THREE.Mesh(gCore, new THREE.MeshBasicMaterial({ color: colorHex, fog: false })));

  // Capa 2: halo mid
  const gMid = new THREE.TubeGeometry(curve, tSeg, 0.09, 4, false);
  group.add(new THREE.Mesh(gMid, new THREE.MeshBasicMaterial({
    color: colorHex, transparent: true, opacity: 0.35, depthWrite: false, fog: false
  })));

  // Capa 3: halo outer
  const gOut = new THREE.TubeGeometry(curve, tSeg, 0.19, 4, false);
  group.add(new THREE.Mesh(gOut, new THREE.MeshBasicMaterial({
    color: colorHex, transparent: true, opacity: 0.12, depthWrite: false, fog: false
  })));

  group.userData._origColor = colorHex;
  return group;
}

function highlightRoute(group, selected) {
  const [core, mid, outer] = group.children;
  core.material.color.setHex(selected ? 0xffd700 : group.userData._origColor);
  mid.material.color.setHex(selected ? 0xffd700 : group.userData._origColor);
  mid.material.opacity  = selected ? 0.7  : 0.35;
  outer.material.color.setHex(selected ? 0xffd700 : group.userData._origColor);
  outer.material.opacity = selected ? 0.25 : 0.12;
}

// ── Polvo al aterrizar ──
const dustParticles = [];

function spawnDust(pos) {
  for (let i = 0; i < 6; i++) {
    const geo = new THREE.SphereGeometry(0.06, 4, 3);
    const mat = new THREE.MeshBasicMaterial({
      color: PASTEL.dustColor,
      transparent: true,
      opacity: 0.7,
    });
    const p = new THREE.Mesh(geo, mat);
    const angle = (i / 6) * Math.PI * 2;
    const r = 0.3 + Math.random() * 0.3;
    p.position.set(
      pos.x + Math.cos(angle) * r,
      pos.y + 0.1,
      pos.z + Math.sin(angle) * r
    );
    p.userData.age = 0;
    p.userData.maxAge = 0.5;
    p.userData.vy = 0.08 + Math.random() * 0.06;
    scene.add(p);
    dustParticles.push(p);
  }
}

// ── Items en vuelo + rutas ──
const fallingItems = [];
const routeObjects = [];
let totalItems = 0;
const posGrid = new Set();   // ocupación de celdas para anti-solapamiento
let hoveredPin = null;

// Estado mercado
let allMercadoItems = [];
let mercadoQuery = '';
let mercadoCat   = '';   // slug categoría servidor: gastro|sidra-bebidas|artesania|dulce|huerta-campo

// ── Baliza sugerida por AstuGuía ──
let suggestedPin   = null;   // sprite destacado (POI)
let suggestRing    = null;   // anillo pulsante en la escena
let suggestTime    = 0;      // tiempo acumulado para animación
let suggestRoute   = null;   // ruta destacada (route category)
let suggestRouteOrigColor = null;

// Label HTML flotante anclado al item sugerido
const suggestLabel = document.createElement('div');
suggestLabel.id = 'guia-suggest-label';
suggestLabel.innerHTML = '<div class="gsb-bubble"><span class="gsb-name"></span></div><div class="gsb-arrow"></div>';
document.getElementById('app-explorar').appendChild(suggestLabel);
const suggestLabelName = suggestLabel.querySelector('.gsb-name');

// Posición 3D del item sugerido para seguimiento en el loop
let suggestWorldPos = null;  // THREE.Vector3

// Pan suave de cámara hacia el item sugerido
let camPanTarget = null;     // THREE.Vector3 (camOffset destino)

function worldToScreen(worldPos) {
  const v = worldPos.clone().project(camera);
  const rect = renderer.domElement.getBoundingClientRect();
  return {
    x: (v.x * 0.5 + 0.5) * rect.width  + rect.left,
    y: (-v.y * 0.5 + 0.5) * rect.height + rect.top
  };
}

function showSuggestLabel(nombre, worldPos) {
  suggestLabelName.textContent = nombre;
  suggestLabel.style.display = 'block';
  suggestWorldPos = worldPos.clone();
}

function hideSuggestLabel() {
  suggestLabel.style.display = 'none';
  suggestWorldPos = null;
}

function clearSuggestedPin() {
  if (suggestRing) { scene.remove(suggestRing); suggestRing = null; }
  if (suggestedPin) {
    suggestedPin.scale.setScalar(1.0);
    suggestedPin = null;
  }
  if (suggestRoute) {
    highlightRoute(suggestRoute, false);
    suggestRoute = null;
    suggestRouteOrigColor = null;
  }
  hideSuggestLabel();
  camPanTarget = null;
  suggestTime = 0;
}

function highlightSuggestedPin(nombre) {
  clearSuggestedPin();

  // ── Caso 1: categoría de rutas ──
  if (ROUTE_CATS.has(CAT)) {
    const found = routeObjects.find(r => r.userData.nombre === nombre);
    if (!found) return;
    suggestRoute = found;
    suggestRouteOrigColor = found.userData._origColor;
    highlightRoute(found, true);  // color dorado

    // Centroide de la ruta para pan y label
    const lat = found.userData.lat;
    const lon = found.userData.lon;
    if (lat && lon) {
      const p = geoToXZ(lon, lat);
      const wp = new THREE.Vector3(p.x, 1.5, p.z);
      // No hacemos pan automático — solo label visual para evitar que el terreno salga del encuadre
      showSuggestLabel(nombre, wp);
    }
    return;
  }

  // ── Caso 2: POI sprite (todas las demás categorías) ──
  const found = fallingItems.find(
    item => !item.userData.isCluster && item.userData.nombre === nombre
  );
  if (!found) return;
  suggestedPin = found;

  // Anillo plano bajo el sprite
  const ringGeo = new THREE.RingGeometry(0.55, 0.85, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffd700, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false
  });
  suggestRing = new THREE.Mesh(ringGeo, ringMat);
  suggestRing.position.set(found.position.x, 0.82, found.position.z);
  scene.add(suggestRing);

  const wp = new THREE.Vector3(found.position.x, found.userData.targetY + 0.5, found.position.z);
  // No hacemos pan automático — solo label + anillo para evitar que el terreno salga del encuadre
  showSuggestLabel(nombre, wp);
}

// Escuchar sugerencia del monigote
window.addEventListener('guia:suggestPoi', ({ detail }) => {
  if (detail?.nombre) highlightSuggestedPin(detail.nombre);
});
window.addEventListener('guia:clearSuggest', clearSuggestedPin);

// Estado filtro por subcategoría (comer / ocio / tiendas)
let catFilterTipo  = '';

function spawnItem(item, index) {
  const cfg = CAT_CONFIG[CAT];
  const color = cfg ? cfg.color : 0xffffff;
  const sprite = ROUTE_CATS.has(CAT)
    ? buildSprite(CAT, color, item.tipo || '')
    : buildPinSprite(CAT, item.tipo || '', color, item.nombre || '');

  const MARGIN = 1.5;
  const bbox = platformGeoCenter;

  let tx = 0, tz = 0;
  if (item._x !== undefined) {
    tx = item._x; tz = item._z;
  } else if (item.lat && item.lon && !ROUTE_CATS.has(CAT)) {
    // POIs: posición aleatoria dentro del polígono (lat/lon real se conserva en userData)
    const rnd = randomPointInPolygon();
    if (rnd) { tx = rnd.x; tz = rnd.z; }
  } else if (item.lat && item.lon) {
    const p = geoToXZ(item.lon, item.lat);
    tx = p.x; tz = p.z;
  } else {
    tx = bbox.bboxMinX + MARGIN + Math.random() * (bbox.bboxMaxX - bbox.bboxMinX - MARGIN * 2);
    tz = bbox.bboxMinZ + MARGIN + Math.random() * (bbox.bboxMaxZ - bbox.bboxMinZ - MARGIN * 2);
  }

  // ── OCCUPANCY GRID: garantiza celda libre para cada item ──
  if (item._x === undefined) {
    const STEP = 0.65;
    outer: for (let ring = 0; ring <= 10; ring++) {
      const nPts = ring === 0 ? 1 : ring * 6;
      for (let i = 0; i < nPts; i++) {
        const angle = (i / nPts) * Math.PI * 2;
        const cx = tx + ring * STEP * Math.cos(angle);
        const cz = tz + ring * STEP * Math.sin(angle);
        const key = `${Math.round(cx / STEP * 2)},${Math.round(cz / STEP * 2)}`;
        if (!posGrid.has(key)) {
          posGrid.add(key);
          tx = cx; tz = cz;
          break outer;
        }
      }
    }
  }

  // Clamp al bbox con margen
  if (bbox.bboxMinX !== undefined) {
    tx = Math.max(bbox.bboxMinX + MARGIN, Math.min(bbox.bboxMaxX - MARGIN, tx));
    tz = Math.max(bbox.bboxMinZ + MARGIN, Math.min(bbox.bboxMaxZ - MARGIN, tz));
  }

  const targetY = 1.0;
  sprite.position.set(tx, 20, tz);
  sprite.userData.falling = true;
  sprite.userData.targetY = targetY;
  sprite.userData = {
    ...sprite.userData,
    tipo:             item.tipo || '',
    nombre:           item.nombre || '',
    tipo_label:       item.tipo_label || item.tipo || '',
    descripcion:      item.descripcion || '',
    website:          item.website || '',
    cuisine:          item.cuisine || '',
    lat:              item.lat || null,
    lon:              item.lon || null,
    distancia_km:     item.distancia_km || null,
    dificultad_label: item.dificultad_label || '',
    opening_hours:    item.opening_hours || '',
    direccion:        item.direccion || '',
  };
  scene.add(sprite);
  fallingItems.push(sprite);
}

// ── Loop de animación ──
let lastTime = 0;

renderer.setAnimationLoop((time) => {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  for (const item of fallingItems) {
    if (item.userData.flyingUp) {
      item.position.y += (25 - item.position.y) * (1 - Math.exp(-dt * 8));
      continue;
    }
    if (!item.userData.falling) continue;
    const tY = item.userData.targetY;
    item.position.y += (tY - item.position.y) * (1 - Math.exp(-dt * 4));
    if (Math.abs(item.position.y - tY) < 0.05) {
      item.position.y = tY;
      item.userData.falling = false;
      spawnDust(item.position);
    }
  }

  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const p = dustParticles[i];
    p.userData.age += dt;
    const t = p.userData.age / p.userData.maxAge;
    p.material.opacity = 0.7 * (1 - t);
    p.position.y += p.userData.vy * dt;
    if (p.userData.age >= p.userData.maxAge) {
      scene.remove(p);
      dustParticles.splice(i, 1);
    }
  }

  // Animar baliza sugerida por AstuGuía
  if (suggestedPin || suggestRoute) {
    suggestTime += dt;

    if (suggestedPin && suggestRing && !suggestedPin.userData.falling) {
      const pulse = 0.6 + 0.4 * Math.sin(suggestTime * 4);
      suggestRing.material.opacity = 0.4 + 0.45 * pulse;
      suggestRing.scale.setScalar(0.85 + 0.3 * pulse);
      const tY = suggestedPin.userData.targetY;
      suggestedPin.position.y = tY + 0.18 * Math.abs(Math.sin(suggestTime * 3));
      // Actualizar posición del label en pantalla
      if (suggestWorldPos) {
        suggestWorldPos.y = tY + 0.18 * Math.abs(Math.sin(suggestTime * 3)) + 0.5;
      }
    }
  }



  // Actualizar posición del label flotante en pantalla
  if (suggestWorldPos && suggestLabel.style.display !== 'none') {
    const sc = worldToScreen(suggestWorldPos);
    suggestLabel.style.left = sc.x + 'px';
    suggestLabel.style.top  = sc.y + 'px';
  }

  renderer.render(scene, camera);
});

// ── Touch controls: pinch-zoom + pan isométrico ──
let camZoom = viewSize;
const camOffset = new THREE.Vector3();
const CAM_BASE  = new THREE.Vector3(30, 30, 30);
const CAM_RIGHT = new THREE.Vector3(-0.707, 0,      0.707);
const CAM_UP    = new THREE.Vector3(-0.408, 0.816, -0.408);
const ZOOM_MIN = 5, ZOOM_MAX = 35;

function applyCamZoom() {
  const asp = window.innerWidth / window.innerHeight;
  camera.left   = -camZoom * asp;
  camera.right  =  camZoom * asp;
  camera.top    =  camZoom;
  camera.bottom = -camZoom;
  camera.updateProjectionMatrix();
}

function applyCamOffset() {
  // Clampear offset dentro del bbox del terreno para que la cámara no salga del municipio
  if (platformGeoCenter?.bboxMinX !== undefined) {
    const pad = camZoom * 0.5;
    camOffset.x = Math.max(platformGeoCenter.bboxMinX - pad, Math.min(platformGeoCenter.bboxMaxX + pad, camOffset.x));
    camOffset.z = Math.max(platformGeoCenter.bboxMinZ - pad, Math.min(platformGeoCenter.bboxMaxZ + pad, camOffset.z));
  }
  camera.position.copy(CAM_BASE).add(camOffset);
  camera.lookAt(camOffset);
}

function getTouchDist(t1, t2) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

function poiPanelOpen() {
  return document.getElementById('poi-sidebar').classList.contains('open');
}

let tcState    = null;
let lastTapTime = 0;
let touchMoved  = false;

canvas.addEventListener('touchstart', (e) => {
  if (poiPanelOpen()) return;
  camPanTarget = null;   // cancelar pan del guía al interactuar
  touchMoved = false;
  if (e.touches.length === 1) {
    const now = Date.now();
    if (now - lastTapTime < 300) {
      camZoom = viewSize; camOffset.set(0, 0, 0);
      applyCamZoom(); applyCamOffset();
      lastTapTime = 0; return;
    }
    lastTapTime = now;
    tcState = { type: 'pan', x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2) {
    tcState = { type: 'pinch', dist: getTouchDist(e.touches[0], e.touches[1]) };
    e.preventDefault();
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (poiPanelOpen() || !tcState) return;
  if (tcState.type === 'pinch' && e.touches.length === 2) {
    const dist = getTouchDist(e.touches[0], e.touches[1]);
    camZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camZoom * tcState.dist / dist));
    tcState.dist = dist;
    applyCamZoom();
    e.preventDefault();
  } else if (tcState.type === 'pan' && e.touches.length === 1) {
    const dx = e.touches[0].clientX - tcState.x;
    const dy = e.touches[0].clientY - tcState.y;
    if (!touchMoved && Math.hypot(dx, dy) < 6) return;
    touchMoved = true;
    const asp = window.innerWidth / window.innerHeight;
    const scaleH = (camZoom * 2 * asp) / window.innerWidth;
    const scaleV = (camZoom * 2)       / window.innerHeight;
    camOffset.addScaledVector(CAM_RIGHT, -dx * scaleH);
    camOffset.addScaledVector(CAM_UP,     dy * scaleV);
    tcState.x = e.touches[0].clientX;
    tcState.y = e.touches[0].clientY;
    applyCamOffset();
    e.preventDefault();
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  if (e.touches.length === 0) tcState = null;
  else if (e.touches.length === 1 && tcState?.type === 'pinch') {
    tcState = { type: 'pan', x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
});

// ── Desktop controls: mouse wheel zoom + drag pan ──
let isDragging = false, lastMX = 0, lastMY = 0;

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  camZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camZoom + e.deltaY * 0.05));
  applyCamZoom();
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  camPanTarget = null;   // cancelar pan del guía al interactuar
  isDragging = true; lastMX = e.clientX; lastMY = e.clientY;
  canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - lastMX, dy = e.clientY - lastMY;
  lastMX = e.clientX; lastMY = e.clientY;
  const asp = window.innerWidth / window.innerHeight;
  const scaleH = (camZoom * 2 * asp) / window.innerWidth;
  const scaleV = (camZoom * 2)       / window.innerHeight;
  camOffset.addScaledVector(CAM_RIGHT,  dx * scaleH);
  camOffset.addScaledVector(CAM_UP,     dy * scaleV);
  applyCamOffset();
});

canvas.addEventListener('mouseup', () => { isDragging = false; canvas.style.cursor = 'grab'; });
canvas.addEventListener('mouseleave', () => {
  isDragging = false; canvas.style.cursor = 'grab';
  if (hoveredPin?.userData.pinHead) hoveredPin.userData.pinHead.scale.setScalar(0.35);
  hoveredPin = null;
  document.getElementById('poi-tooltip').style.display = 'none';
});

canvas.addEventListener('mousemove', (e) => {
  if (isDragging) return;
  const rect = canvas.getBoundingClientRect();
  pointerNDC.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  pointerNDC.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(fallingItems, true);

  let newHover = null;
  if (hits.length > 0) {
    let obj = hits[0].object;
    while (obj.parent && !fallingItems.includes(obj)) obj = obj.parent;
    if (fallingItems.includes(obj) && !obj.userData.isCluster) newHover = obj;
  }

  if (newHover !== hoveredPin) {
    if (hoveredPin?.userData.pinHead) hoveredPin.userData.pinHead.scale.setScalar(0.35);
    hoveredPin = newHover;
    if (hoveredPin?.userData.pinHead) hoveredPin.userData.pinHead.scale.setScalar(1.0);
  }

  const tooltip = document.getElementById('poi-tooltip');
  if (hoveredPin) {
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top  = (e.clientY - 10) + 'px';
    const badge = hoveredPin.userData.tipo_label
      ? `<span>${hoveredPin.userData.tipo_label}</span>` : '';
    tooltip.innerHTML = `<strong>${hoveredPin.userData.nombre}</strong>${badge}`;
  } else {
    tooltip.style.display = 'none';
  }
});

// ── C-3: Resize con viewSize dinámico ──
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  viewSize = getViewSize();
  camZoom = viewSize; camOffset.set(0, 0, 0);
  applyCamZoom(); applyCamOffset();
});

// ── Bug-4: Raycaster + panel de info POI ──
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
let miniLeaflet = null;

function openPoiPanel(data) {
  const panel = document.getElementById('poi-sidebar');
  document.getElementById('poi-subcat').textContent = data.tipo_label || data.tipo || '';
  document.getElementById('poi-tipo').textContent   = data.tipo_label || '';
  document.getElementById('poi-nombre').textContent = data.nombre;
  document.getElementById('poi-desc').textContent   = data.descripcion || '';
  document.getElementById('poi-extra').textContent  = data.cuisine || data.dificultad_label || '';
  const addrEl  = document.getElementById('poi-address');
  const hoursEl = document.getElementById('poi-hours');
  addrEl.textContent  = data.direccion     ? '📍 ' + data.direccion     : '';
  hoursEl.textContent = data.opening_hours ? '🕐 ' + data.opening_hours : '';
  addrEl.style.display  = data.direccion     ? '' : 'none';
  hoursEl.style.display = data.opening_hours ? '' : 'none';
  const webLink = document.getElementById('poi-web');
  webLink.href         = data.website || '#';
  webLink.style.display = data.website ? '' : 'none';
  panel.classList.add('open');

  // Notificar AstuGuía
  window.dispatchEvent(new CustomEvent('explorar:poiSelected', {
    detail: { poi: { nombre: data.nombre, tipo: data.tipo_label || data.tipo, tags: data.tags } }
  }));

  if (data.lat && data.lon) {
    document.getElementById('poi-minimap').style.display = 'block';
    setTimeout(() => {
      if (miniLeaflet) { miniLeaflet.remove(); miniLeaflet = null; }
      miniLeaflet = L.map('poi-minimap', {
        zoomControl: true, attributionControl: false,
        dragging: true, touchZoom: true, scrollWheelZoom: false,
        tap: false,
        bounceAtZoomLimits: false
      });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd', maxZoom: 18,
      }).addTo(miniLeaflet);
      miniLeaflet.setView([data.lat, data.lon], 16);
      L.marker([data.lat, data.lon]).addTo(miniLeaflet);
      miniLeaflet.invalidateSize();
    }, 50);
  } else {
    document.getElementById('poi-minimap').style.display = 'none';
  }
}

function closePoiPanel() {
  document.getElementById('poi-sidebar').classList.remove('open');
  if (miniLeaflet) { miniLeaflet.remove(); miniLeaflet = null; }
  clearSuggestedPin();
}

// ── Rutas clickeables ──
const SURFACE_LABELS = {
  asphalt:       'Asfalto',
  concrete:      'Hormigón',
  paving_stones: 'Adoquines',
  sett:          'Adoquines antiguos',
  cobblestone:   'Adoquines',
  compacted:     'Tierra compactada',
  gravel:        'Grava',
  fine_gravel:   'Gravilla fina',
  dirt:          'Tierra',
  ground:        'Tierra natural',
  grass:         'Hierba',
  wood:          'Madera',
  metal:         'Metal',
  sand:          'Arena',
  mud:           'Barro',
  rock:          'Roca',
  paved:         'Pavimentado',
  unpaved:       'Sin pavimentar',
  boardwalk:     'Pasarela de madera',
};

const TIPO_LABELS = {
  ciclismo:      'Ciclismo',
  senderismo:    'Senderismo',
  sendas_verdes: 'Senda Verde',
  carril_bici:   'Carril Bici',
  paseos:        'Paseo',
};

const NETWORK_LABELS = {
  lwn: 'Local', rwn: 'Regional', nwn: 'Nacional', iwn: 'Internacional',
  lcn: 'Local', rcn: 'Regional', ncn: 'Nacional', icn: 'Internacional',
};

let selectedRoute = null;
let routeMiniLeaflet = null;

function selectRoute(group) {
  if (selectedRoute && selectedRoute !== group) highlightRoute(selectedRoute, false);
  clearSuggestedPin();   // siempre limpia sugerencia al abrir detalle de ruta
  selectedRoute = group;
  highlightRoute(group, true);
  openRoutePanel(group.userData);
}

function deselectRoute() {
  if (selectedRoute) { highlightRoute(selectedRoute, false); selectedRoute = null; }
  closeRoutePanel();
}

function coordsToLatLngs(coords) {
  if (!coords || coords.length === 0) return [];
  const flat = Array.isArray(coords[0][0]) ? coords.flat(1) : coords;
  return flat.map(([lon, lat]) => [lat, lon]);
}

function renderElevationProfile(svgEl, ascenso, descenso, distKm) {
  svgEl.innerHTML = '';
  const total = ascenso + descenso;
  if (total <= 0) return;
  const maxH   = Math.max(ascenso, descenso);
  const peakX  = 200 * ascenso / total;
  const peakY  = 55 - (ascenso / maxH) * 45;
  const endY   = Math.max(0, Math.min(55, 55 - ((ascenso - descenso) / maxH) * 45));
  const col    = '#' + (ROUTE_COLORS[CAT] || 0x00e676).toString(16).padStart(6, '0');
  const NS     = 'http://www.w3.org/2000/svg';

  const area = document.createElementNS(NS, 'path');
  area.setAttribute('d', `M 0 55 L ${peakX} ${peakY} L 200 ${endY} L 200 55 Z`);
  area.setAttribute('fill', col); area.setAttribute('fill-opacity', '0.25');
  svgEl.appendChild(area);

  const line = document.createElementNS(NS, 'path');
  line.setAttribute('d', `M 0 55 L ${peakX} ${peakY} L 200 ${endY}`);
  line.setAttribute('fill', 'none'); line.setAttribute('stroke', col);
  line.setAttribute('stroke-width', '2'); line.setAttribute('stroke-opacity', '0.9');
  svgEl.appendChild(line);

  const lblPeak = document.createElementNS(NS, 'text');
  lblPeak.setAttribute('x', peakX); lblPeak.setAttribute('y', Math.max(peakY - 4, 8));
  lblPeak.setAttribute('text-anchor', 'middle'); lblPeak.setAttribute('font-size', '8');
  lblPeak.setAttribute('fill', '#f5ead0'); lblPeak.textContent = `↑${ascenso}m`;
  svgEl.appendChild(lblPeak);

  const lblDist = document.createElementNS(NS, 'text');
  lblDist.setAttribute('x', '196'); lblDist.setAttribute('y', '54');
  lblDist.setAttribute('text-anchor', 'end'); lblDist.setAttribute('font-size', '7');
  lblDist.setAttribute('fill', 'rgba(200,160,80,0.7)'); lblDist.textContent = `${distKm}km`;
  svgEl.appendChild(lblDist);
}

function openRoutePanel(data) {
  const sidebar = document.getElementById('route-sidebar');

  // Badge de categoría
  const badge = document.getElementById('rds-cat-badge');
  badge.textContent = TIPO_LABELS[CAT] || CAT;
  const col = (ROUTE_COLORS[CAT] || 0x888888).toString(16).padStart(6, '0');
  badge.style.color = `#${col}`;
  badge.style.borderColor = `#${col}`;
  badge.style.background = `#${col}22`;

  document.getElementById('rds-nombre').textContent = data.nombre || 'Sin nombre';
  document.getElementById('rds-distancia').textContent = data.distancia_km ? data.distancia_km + ' km' : '—';
  document.getElementById('rds-dificultad').textContent = data.dificultad_label || '—';

  // Desnivel
  const desnivelRow = document.getElementById('rds-desnivel-row');
  if (data.ascenso_m) {
    document.getElementById('rds-ascenso').textContent = data.ascenso_m;
    document.getElementById('rds-descenso').textContent = data.descenso_m || 0;
    desnivelRow.style.display = 'flex';
  } else {
    desnivelRow.style.display = 'none';
  }

  // Perfil de elevación esquemático
  const elevEl = document.getElementById('rds-elevation-profile');
  if (data.ascenso_m && data.distancia_km) {
    renderElevationProfile(
      document.getElementById('rds-elevation-svg'),
      data.ascenso_m, data.descenso_m || 0, data.distancia_km
    );
    elevEl.style.display = '';
  } else {
    elevEl.style.display = 'none';
  }

  // Filas meta — ocultar las vacías
  const networkLabel = NETWORK_LABELS[data.network] || data.network;
  const metaRows = [
    ['rds-row-superficie', 'rds-superficie', SURFACE_LABELS[data.surface] || data.surface],
    ['rds-row-desde',      'rds-desde',      data.desde],
    ['rds-row-hasta',      'rds-hasta',      data.hasta],
    ['rds-row-operador',   'rds-operador',   data.operador],
    ['rds-row-network',    'rds-network',    networkLabel],
  ];
  for (const [rowId, valId, val] of metaRows) {
    document.getElementById(rowId).style.display = val ? '' : 'none';
    document.getElementById(valId).textContent = val || '';
  }

  // Descripción (Wikidata o OSM)
  const desc = data.wikidata_desc || data.descripcion || '';
  const descEl = document.getElementById('rds-descripcion');
  descEl.textContent = desc;
  descEl.style.display = desc ? '' : 'none';

  // Enlace web
  const webLink = document.getElementById('rds-website');
  if (data.website) {
    webLink.href = data.website;
    webLink.style.display = 'inline';
  } else {
    webLink.style.display = 'none';
  }

  sidebar.classList.add('open');

  // Minimap Leaflet con el trazado de la ruta
  setTimeout(() => {
    if (routeMiniLeaflet) { routeMiniLeaflet.remove(); routeMiniLeaflet = null; }
    routeMiniLeaflet = L.map('route-minimap', {
      zoomControl: true, attributionControl: false,
      dragging: true, touchZoom: true, scrollWheelZoom: false,
      tap: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd', maxZoom: 18,
    }).addTo(routeMiniLeaflet);

    const latlngs = coordsToLatLngs(data.coords);
    if (latlngs.length > 0) {
      const routeColor = '#' + (ROUTE_COLORS[CAT] || 0x1565ff).toString(16).padStart(6, '0');
      const poly = L.polyline(latlngs, { color: routeColor, weight: 3, opacity: 0.85 });
      poly.addTo(routeMiniLeaflet);
      routeMiniLeaflet.fitBounds(poly.getBounds(), { padding: [10, 10] });
    } else if (data.lat && data.lon) {
      routeMiniLeaflet.setView([data.lat, data.lon], 13);
    }
    routeMiniLeaflet.invalidateSize();
  }, 50);
}

function closeRoutePanel() {
  document.getElementById('route-sidebar')?.classList.remove('open');
  if (routeMiniLeaflet) { routeMiniLeaflet.remove(); routeMiniLeaflet = null; }
  clearSuggestedPin();
}
window.closeRoutePanel = closeRoutePanel;

canvas.addEventListener('click', (e) => {
  if (touchMoved) return;
  const rect = canvas.getBoundingClientRect();
  pointerNDC.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  pointerNDC.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);

  // 1. POIs tienen prioridad
  const poiHits = raycaster.intersectObjects(fallingItems, true);
  if (poiHits.length > 0) {
    let obj = poiHits[0].object;
    while (obj.parent && !fallingItems.includes(obj)) obj = obj.parent;
    if (fallingItems.includes(obj)) {
      if (obj.userData.isCluster && !obj.userData.expanded) {
        obj.userData.expanded = true;
        obj.visible = false;
        const items = obj.userData.items;
        const radius = 0.9;
        items.forEach((item, idx) => {
          const angle = (idx / items.length) * Math.PI * 2;
          const expanded = {
            ...item,
            _x: obj.userData.cx + Math.cos(angle) * radius,
            _z: obj.userData.cz + Math.sin(angle) * radius,
          };
          setTimeout(() => { totalItems++; spawnItem(expanded, fallingItems.length - 1); }, idx * 60);
        });
      } else if (!obj.userData.isCluster) {
        clearSuggestedPin();   // siempre limpia sugerencia al abrir detalle de POI
        deselectRoute();
        openPoiPanel(obj.userData);
      }
      return;
    }
  }

  // 2. Rutas (solo cuando hay rutas activas)
  if (ROUTE_CATS.has(CAT) && routeObjects.length > 0) {
    const routeHits = raycaster.intersectObjects(routeObjects, true);
    if (routeHits.length > 0) {
      let hitObj = routeHits[0].object;
      while (hitObj.parent && !routeObjects.includes(hitObj)) hitObj = hitObj.parent;
      if (routeObjects.includes(hitObj)) { selectRoute(hitObj); return; }
    }
  }

  // 3. Click en vacío
  deselectRoute();
  closePoiPanel();
});

document.getElementById('poi-close').addEventListener('click', closePoiPanel);
document.getElementById('route-sidebar-close').addEventListener('click', closeRoutePanel);

// ── C-1: Volver con sessionStorage ──
document.getElementById('btn-back').addEventListener('click', () => {
  sessionStorage.setItem('bookReady', '1');
  window.location.href = ROOT + '/';
});

// ── Loading bar ──
function setLoadingProgress(p) {
  document.getElementById('loading-bar').style.width = (p * 100) + '%';
}

function hideLoading() {
  const ls = document.getElementById('loading-screen');
  ls.classList.add('hidden');
  setTimeout(() => { ls.style.display = 'none'; }, 500);
}

// ── C-6: Mercado filter ──
function applyMercadoFilter() {
  posGrid.clear();
  for (const s of fallingItems) scene.remove(s);
  fallingItems.length = 0;

  const filtered = mercadoQuery
    ? allMercadoItems.filter(it =>
        (it.nombre || '').toLowerCase().includes(mercadoQuery) ||
        (it.direccion || '').toLowerCase().includes(mercadoQuery)
      )
    : allMercadoItems;

  totalItems = Math.min(filtered.length, 30);
  filtered.slice(0, 30).forEach((item, i) => {
    setTimeout(() => spawnItem(item, i), i * 120);
  });
}

// ── Helpers de paneles de filtro ──
function closePanels() {
  const fp  = document.getElementById('cat-filter-panel');
  const mfp = document.getElementById('mercado-filter-panel');
  const wasOpen = fp?.classList.contains('panel-open') || mfp?.classList.contains('panel-open');
  fp?.classList.remove('panel-open');
  mfp?.classList.remove('panel-open');
  appEl.classList.remove('filter-open');
  if (wasOpen) window.dispatchEvent(new CustomEvent('explorar:filterClose'));
}

function openPanel(panelEl) {
  closePanels();
  panelEl.classList.add('panel-open');
  appEl.classList.add('filter-open');
  window.dispatchEvent(new CustomEvent('explorar:filterOpen'));
}

// ── Filtro subcategoría server-side (comer / ocio / tiendas) ──
function reloadWithFilter() {
  posGrid.clear();
  for (const s of fallingItems) scene.remove(s);
  fallingItems.length = 0;
  loadedOffset = 0; serverTotal = 0; totalItems = 0;
  closePanels();
  loadCategory();
}

// ── Filter panel dinámico ──
function updateFilterPanel(cat) {
  const tags = CAT_FILTER_TAGS[cat];
  if (tags) {
    const title = document.getElementById('cfp-title');
    if (title) title.textContent = 'Filtrar ' + (CAT_CONFIG[cat]?.label || cat);
    const tagsEl = document.getElementById('cfp-tags');
    if (tagsEl) {
      tagsEl.innerHTML = '<button class="cfp-tag active" data-tipo="">Todos</button>' +
        tags.map(([t, l]) => `<button class="cfp-tag" data-tipo="${t}">${l}</button>`).join('');
      tagsEl.querySelectorAll('.cfp-tag').forEach(tag => {
        tag.addEventListener('click', () => {
          tagsEl.querySelectorAll('.cfp-tag').forEach(t => t.classList.remove('active'));
          tag.classList.add('active');
          catFilterTipo = tag.dataset.tipo;
          reloadWithFilter();
        });
      });
    }
  }
  const filterBtn = document.getElementById('cat-sb-filter-btn');
  if (filterBtn) filterBtn.style.visibility = (tags || cat === 'mercado') ? 'visible' : 'hidden';
  const filterBarBtn = document.getElementById('cat-filter-bar-btn');
  if (filterBarBtn) filterBarBtn.style.display = (tags || cat === 'mercado') ? 'flex' : 'none';
}

// ── initAllFilterPanels — listeners globales (una sola vez) ──
function initAllFilterPanels() {
  document.getElementById('cfp-close')?.addEventListener('click', closePanels);
  document.getElementById('cfp-apply')?.addEventListener('click', () => { reloadWithFilter(); });

  document.getElementById('mfp-close')?.addEventListener('click', closePanels);
  document.querySelectorAll('.mfp-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      document.querySelectorAll('.mfp-tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      mercadoCat = tag.dataset.cat || '';
      reloadWithFilter();
    });
  });
}

// ── Clustering de POIs en world-space ──
function clusterItems(rawItems, threshold = 0.55) {
  const grid = {};
  const singles = [];

  for (const item of rawItems) {
    if (!item.lat || !item.lon) { singles.push(item); continue; }
    const p = geoToXZ(item.lon, item.lat);
    const gx = Math.floor(p.x / threshold);
    const gz = Math.floor(p.z / threshold);
    const key = gx + ',' + gz;
    if (!grid[key]) grid[key] = [];
    grid[key].push({ item, x: p.x, z: p.z });
  }

  const clusters = [];
  for (const entries of Object.values(grid)) {
    if (entries.length === 1) {
      singles.push(entries[0].item);
    } else {
      const cx = entries.reduce((s, e) => s + e.x, 0) / entries.length;
      const cz = entries.reduce((s, e) => s + e.z, 0) / entries.length;
      clusters.push({ cx, cz, items: entries.map(e => e.item) });
    }
  }
  return { singles, clusters };
}

function buildBadgeSprite(count) {
  const size = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#d93620';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${count > 9 ? 28 : 34}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(count), size / 2, size / 2);
  const texture = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.8, 0.8, 0.8);
  return sprite;
}

function buildClusterStack(count, cat, color) {
  const group = new THREE.Group();
  const layers = Math.min(count, 3);
  for (let i = 0; i < layers; i++) {
    const building = buildSprite(cat, color);
    const s = 1 - i * 0.12;
    building.scale.setScalar(s);
    building.position.set(
      (i - 1) * 0.28,
      i * 0.55,
      (i - 1) * 0.12
    );
    group.add(building);
  }
  const badge = buildBadgeSprite(count);
  badge.position.set(0.7, layers * 0.55 + 0.3, 0);
  group.add(badge);
  return group;
}

function spawnCluster(cluster) {
  const cfg = CAT_CONFIG[CAT];
  const color = cfg ? cfg.color : 0xffffff;
  const stack = buildClusterStack(cluster.items.length, CAT, color);
  stack.position.set(cluster.cx, 20, cluster.cz);
  stack.userData = {
    isCluster: true,
    falling: true,
    targetY: 1.0,
    items: cluster.items,
    expanded: false,
    cx: cluster.cx,
    cz: cluster.cz,
  };
  scene.add(stack);
  fallingItems.push(stack);
}

// ── Paginación: estado y botón "Cargar más" ──
let loadedOffset = 0;
let serverTotal  = 0;

function updateLoadMoreBtn() {
  const btn = document.getElementById('load-more-btn');
  const remaining = serverTotal - loadedOffset;
  if (remaining > 0) {
    btn.textContent = `Cargar más (${remaining})`;
    btn.style.display = 'block';
  } else {
    btn.style.display = 'none';
  }
}

// ── Cargar categoría (SPA-safe) ──
async function loadCategory() {
  const cfg = CAT_CONFIG[CAT];
  if (!cfg) return;

  const baseUrl = cfg.url.replace('{id}', MUNICIPIO_ID);
  const fetchPage = async (offset) => {
    const sep = baseUrl.includes('?') ? '&' : '?';
    let url = baseUrl + sep + `limit=30&offset=${offset}`;
    if (catFilterTipo) url += `&tipo=${catFilterTipo}`;
    if (CAT === 'mercado' && mercadoCat) url += `&categoria=${mercadoCat}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return { items: [], total: 0 };
      const total = parseInt(resp.headers.get('X-Total-Count') || '0', 10);
      const data = await resp.json();
      return { items: data.items || [], total: total || data.total || 0 };
    } catch {
      return { items: [], total: 0 };
    }
  };

  const { items, total } = await fetchPage(0);
  serverTotal = total;
  loadedOffset = items.length;

  if (ROUTE_CATS.has(CAT)) {
    const ROUTE_COLOR = ROUTE_COLORS[CAT] || 0x1565ff;
    let lineCount = 0;
    for (const item of items) {
      if (item.coords && item.coords.length >= 2) {
        const glow = buildRouteGlow(item.coords, ROUTE_COLOR);
        if (glow) {
          glow.userData = { ...item, isRoute: true, _origColor: ROUTE_COLOR };
          scene.add(glow); routeObjects.push(glow); lineCount++;
        }
      }
    }
    if (lineCount === 0) {
      totalItems = items.length;
      items.forEach((item, i) => setTimeout(() => spawnItem(item, i), i * 120));
    }
    updateLoadMoreBtn();
    // Usar onclick para evitar acumulación de listeners al cambiar categoría
    document.getElementById('load-more-btn').onclick = async () => {
      const { items: more } = await fetchPage(loadedOffset);
      loadedOffset += more.length;
      const RC = ROUTE_COLORS[CAT] || 0x1565ff;
      for (const item of more) {
        if (item.coords && item.coords.length >= 2) {
          const glow = buildRouteGlow(item.coords, RC);
          if (glow) {
            glow.userData = { ...item, isRoute: true, _origColor: RC };
            scene.add(glow); routeObjects.push(glow);
          }
        }
      }
      updateLoadMoreBtn();
    };

  } else if (CAT === 'mercado') {
    allMercadoItems = items;
    totalItems = Math.min(items.length, 30);
    items.slice(0, 30).forEach((item, i) => {
      setTimeout(() => spawnItem(item, i), i * 120);
    });

  } else {
    // POI categories — occupancy grid maneja anti-solapamiento, sin clustering
    totalItems = items.length;
    items.forEach((item, i) => setTimeout(() => spawnItem(item, i), i * 80));

    updateLoadMoreBtn();
    document.getElementById('load-more-btn').onclick = async () => {
      const { items: more } = await fetchPage(loadedOffset);
      loadedOffset += more.length;
      const base = fallingItems.length;
      more.forEach((item, i) => setTimeout(() => { totalItems++; spawnItem(item, base + i); }, i * 80));
      updateLoadMoreBtn();
    };
  }

  // Notificar AstuGuía con conteo real de la BD
  window.dispatchEvent(new CustomEvent('explorar:categoryLoaded', {
    detail: { cat: CAT, total: serverTotal, items: items }
  }));
}

// ── SPA: switch de categoría sin reload ──
async function switchCategory(newCat) {
  if (newCat === CAT) return;
  closePoiPanel();
  clearSuggestedPin();
  posGrid.clear();
  if (hoveredPin?.userData.pinHead) hoveredPin.userData.pinHead.scale.setScalar(0.35);
  hoveredPin = null;
  document.getElementById('poi-tooltip').style.display = 'none';

  // Fly-up sprites actuales
  for (const item of fallingItems) item.userData.flyingUp = true;

  // Update URL y botones activos
  history.pushState({}, '', ROOT + '/explorar/' + MUNICIPIO_ID + '?cat=' + newCat);
  CAT = newCat;
  // Sincronizar dataset para que guia-explorar.js lea la categoría correcta
  const _appEl = document.getElementById('app-explorar');
  if (_appEl) _appEl.dataset.cat = newCat;
  // Actualizar label HUD (renderizado por Jinja2, no se actualiza solo)
  const hudLabel = document.querySelector('.hud-cat-label');
  if (hudLabel) hudLabel.textContent = CAT_CONFIG[newCat]?.label || newCat;
  document.querySelectorAll('[data-cat]').forEach(b =>
    b.classList.toggle('active', b.dataset.cat === CAT));

  // Cerrar paneles
  closePanels();
  document.getElementById('load-more-btn').style.display = 'none';

  // Esperar que los sprites vuelen (450ms)
  await new Promise(r => setTimeout(r, 450));

  // Limpiar escena
  selectedRoute = null;
  closeRoutePanel();
  for (const s of fallingItems) scene.remove(s);
  fallingItems.length = 0;
  for (const r of routeObjects) scene.remove(r);
  routeObjects.length = 0;
  totalItems = 0; loadedOffset = 0; serverTotal = 0;
  allMercadoItems = [];
  catFilterTipo = '';
  mercadoCat    = '';

  updateFilterPanel(CAT);
  await loadCategory();
}

// ── C-2: Listeners de categoría → SPA ──
document.querySelectorAll('.cat-bar-btn, .cat-sb-btn[data-cat]').forEach(btn => {
  btn.addEventListener('click', () => switchCategory(btn.dataset.cat));
});

// ── Sidebar toggle ──
document.getElementById('cat-sidebar-toggle')?.addEventListener('click', () => {
  document.getElementById('cat-sidebar')?.classList.toggle('expanded');
  document.getElementById('app-explorar')?.classList.toggle('sidebar-expanded');
  document.body.classList.toggle('sidebar-expanded');
});

// ── Filter button → abre panel correcto según CAT ──
function openFilterPanel() {
  const isPoi = !!CAT_FILTER_TAGS[CAT];
  const isMercado = CAT === 'mercado';
  const fp  = document.getElementById('cat-filter-panel');
  const mfp = document.getElementById('mercado-filter-panel');
  if (isPoi) {
    fp.classList.contains('panel-open') ? closePanels() : openPanel(fp);
  } else if (isMercado) {
    mfp.classList.contains('panel-open') ? closePanels() : openPanel(mfp);
  }
}
document.getElementById('cat-sb-filter-btn')?.addEventListener('click', openFilterPanel);
document.getElementById('cat-filter-bar-btn')?.addEventListener('click', openFilterPanel);

// ── Init ──
async function init() {
  stampPassport(MUNICIPIO_ID, MUNICIPIO_NOMBRE);

  const concejo_key = 'explorar_concejo';
  const isFirstVisit = sessionStorage.getItem(concejo_key) !== String(MUNICIPIO_ID);
  sessionStorage.setItem(concejo_key, String(MUNICIPIO_ID));

  if (!isFirstVisit) {
    hideLoading();
  } else {
    setLoadingProgress(0.2);
  }

  if (GEOJSON_RAW) {
    buildPlatform(GEOJSON_RAW);
  }
  applyDayNight();

  if (isFirstVisit) setLoadingProgress(0.5);

  initAllFilterPanels();
  updateFilterPanel(CAT);

  // Pre-aplicar cat_filter desde URL (viene del chat cuando recomienda mercado+subcategoría)
  const urlCatFilter = new URLSearchParams(window.location.search).get('cat_filter');
  if (urlCatFilter && CAT === 'mercado') {
    mercadoCat = urlCatFilter;
    document.querySelectorAll('.mfp-tag').forEach(t => {
      t.classList.toggle('active', (t.dataset.cat || '') === urlCatFilter);
    });
  }

  // Pre-aplicar filtro tipo desde URL (ej: viene del wizard con &tipo=cafe)
  const urlTipo = new URLSearchParams(window.location.search).get('tipo');
  if (urlTipo && CAT_FILTER_TAGS[CAT]) {
    catFilterTipo = urlTipo;
    const tagsEl = document.getElementById('cfp-tags');
    if (tagsEl) {
      tagsEl.querySelectorAll('.cfp-tag').forEach(t => {
        t.classList.toggle('active', t.dataset.tipo === urlTipo);
      });
    }
  }

  // Notificar AstuGuía ANTES de cargar categoría, para que la bienvenida sea siempre el primer mensaje
  window.dispatchEvent(new CustomEvent('explorar:ready', {
    detail: { nombre: MUNICIPIO_NOMBRE, costero: ES_COSTERO }
  }));

  await loadCategory();

  if (isFirstVisit) {
    setLoadingProgress(1.0);
    setTimeout(hideLoading, 800);
  }
}

init();
