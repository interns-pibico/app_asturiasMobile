// trophies.js — Sistema de Logros / Trofeos

const TROPHY_KEY   = 'astuguia_trophies';
const CAT_KEY      = 'astuguia_cat_counts';
const POI_KEY      = 'astuguia_poi_count';
const PASSPORT_KEY = 'passport_visited';

const COSTERO_IDS = new Set([4,8,9,13,14,18,23,24,28,30,35,36,40,41,42,53,59,60,64,65]);

export const BADGES = [
  { id:'primer_paso',  icon:'👣', nombre:'Primer Paso',       desc:'Visita tu primer concejo',     check:(t,v)   => Object.keys(v).length >= 1 },
  { id:'explorador',   icon:'🗺️', nombre:'Explorador',        desc:'Visita 10 concejos',            check:(t,v)   => Object.keys(v).length >= 10 },
  { id:'gran_viajero', icon:'✈️', nombre:'Gran Viajero',      desc:'Visita 25 concejos',            check:(t,v)   => Object.keys(v).length >= 25 },
  { id:'leyenda',      icon:'👑', nombre:'Leyenda Asturiana', desc:'Visita los 78 concejos',        check:(t,v)   => Object.keys(v).length >= 78 },
  { id:'costeru',      icon:'🌊', nombre:'Costeru',           desc:'Visita 5 concejos costeros',   check:(t,v)   => Object.keys(v).filter(id => COSTERO_IDS.has(+id)).length >= 5 },
  { id:'senderista',   icon:'🥾', nombre:'Senderista',        desc:'Carga senderismo 5 veces',     check:(t,v,c) => (c.senderismo||0) >= 5 },
  { id:'ciclista',     icon:'🚴', nombre:'Ciclista',          desc:'Carga ciclismo 5 veces',       check:(t,v,c) => (c.ciclismo||0) >= 5 },
  { id:'sidreru',      icon:'🍺', nombre:'Sidreru',           desc:'Entra en un bar o sidrería',   check:(t,v,c,p) => p.sidreru === true },
  { id:'mercader',     icon:'🏪', nombre:'Mercader',          desc:'Explora el mercado local',     check:(t,v,c) => (c.mercado||0) >= 1 },
  { id:'curioso',      icon:'🔍', nombre:'Curioso',           desc:'Abre 10 puntos de interés',    check:(t,v,c,p) => (p.count||0) >= 10 },
];

function getTrophies()  { return JSON.parse(localStorage.getItem(TROPHY_KEY) || '{}'); }
function getCatCounts() { return JSON.parse(localStorage.getItem(CAT_KEY) || '{}'); }
function getPoisData()  {
  return {
    count:   parseInt(localStorage.getItem(POI_KEY) || '0', 10),
    sidreru: localStorage.getItem('astuguia_sidreru') === 'true',
  };
}

export function renderTrophiesGrid() {
  const trophies = getTrophies();
  const unlocked = Object.keys(trophies).length;
  document.getElementById('trophies-counter').textContent = `${unlocked} / ${BADGES.length}`;
  const grid = document.getElementById('trophies-grid');
  grid.innerHTML = BADGES.map(b => {
    const done = !!trophies[b.id];
    return `<div class="trophy-card${done ? ' unlocked' : ' locked'}">
      <div class="trophy-card-icon">${b.icon}</div>
      <div class="trophy-card-name">${b.nombre}</div>
      <div class="trophy-card-desc">${done ? trophies[b.id].fecha : b.desc}</div>
    </div>`;
  }).join('');
}

function checkAndUnlock() {
  const trophies = getTrophies();
  const visited  = JSON.parse(localStorage.getItem(PASSPORT_KEY) || '{}');
  const cats     = getCatCounts();
  const pois     = getPoisData();
  const newOnes  = [];

  for (const badge of BADGES) {
    if (trophies[badge.id]) continue;
    if (badge.check(trophies, visited, cats, pois)) {
      trophies[badge.id] = { fecha: new Date().toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'2-digit' }) };
      newOnes.push(badge);
    }
  }
  if (newOnes.length) {
    localStorage.setItem(TROPHY_KEY, JSON.stringify(trophies));
    newOnes.forEach(showToast);
  }
}

function showToast(badge) {
  const t = document.createElement('div');
  t.className = 'trophy-toast';
  t.innerHTML = `<span class="trophy-toast-icon">${badge.icon}</span><div><strong>¡Trofeo desbloqueado!</strong><div>${badge.nombre}</div></div>`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('visible'), 50);
  setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 400); }, 3500);
}

function incCatCount(cat) {
  const c = getCatCounts();
  c[cat] = (c[cat] || 0) + 1;
  localStorage.setItem(CAT_KEY, JSON.stringify(c));
}

function incPoiCount(tipo) {
  const n = parseInt(localStorage.getItem(POI_KEY) || '0', 10) + 1;
  localStorage.setItem(POI_KEY, String(n));
  if (['pub','bar','fast_food'].includes(tipo)) localStorage.setItem('astuguia_sidreru', 'true');
}

export function initTrophies() {
  window.addEventListener('explorar:categoryLoaded', e => { incCatCount(e.detail.cat); checkAndUnlock(); });
  window.addEventListener('explorar:poiSelected',    e => { incPoiCount(e.detail?.poi?.tipo || ''); checkAndUnlock(); });
  checkAndUnlock();
}
