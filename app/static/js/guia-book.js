// ── AstuGuía — Wizard en book.html ──
import { SVG_PERSONAJE, typewriter } from './guia-utils.js';
import { initChat, activateChat, setPlayerName } from './guia-chat.js';

const ROOT = document.getElementById('app-book')?.dataset.root || '';

// ── Helper variantes ──
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Estado del wizard ──
const state = {
  tipo:            null,   // rutas | gastro | cultura | tiendas
  subtipo:         null,   // ciclismo | senderismo | ... | restaurant | cafe | bar | pub | fast_food
  zona:            null,   // costero | interior | sorpresa
  cuisine:         null,   // regional | other | null
  municipio_input: null,   // nombre de municipio escrito por el usuario (opcional)
  playerName:      null,   // capturado en s0
};

// ── Tracker de paso actual (para restaurar tras cerrar chat) ──
let currentStepId = null;
let lastResultRec = null;

// ── Municipios recomendados por subtipo + zona ──
const FEATURED = {
  ciclismo:      { costero: [{id:24,n:'Gijón'},{id:4,n:'Avilés'}],
                   interior: [{id:43,n:'Oviedo'},{id:31,n:'Langreo'}] },
  senderismo:    { costero: [{id:35,n:'Llanes'},{id:55,n:'Ribadesella'}],
                   interior: [{id:12,n:'Cangas del Narcea'},{id:72,n:'Tineo'}] },
  sendas_verdes: { costero: [{id:55,n:'Ribadesella'}],
                   interior: [{id:31,n:'Langreo'},{id:36,n:'Mieres'}] },
  carril_bici:   { costero: [{id:24,n:'Gijón'},{id:4,n:'Avilés'}],
                   interior: [{id:43,n:'Oviedo'}] },
  paseos:        { costero: [{id:35,n:'Llanes'},{id:21,n:'Cudillero'}],
                   interior: [{id:43,n:'Oviedo'}] },
  comer:         { costero: [{id:24,n:'Gijón'},{id:35,n:'Llanes'}],
                   interior: [{id:43,n:'Oviedo'}] },
  mercado:       { costero: [{id:24,n:'Gijón'}],
                   interior: [{id:43,n:'Oviedo'}] },
  ocio:          { costero: [{id:24,n:'Gijón'}],
                   interior: [{id:43,n:'Oviedo'}] },
  tiendas:       { costero: [{id:24,n:'Gijón'}],
                   interior: [{id:43,n:'Oviedo'}] },
};

// ── Árbol de pasos ──
const STEPS = {
  s0: {
    text: '¡Qué pasa paisanu! Soy AstuGuía, el que más sabe de esta tierra verde y con sabor a sidra 🍎 ¿Cómo te llames?',
    // sin choices — se gestiona con showNameCapture()
  },
  s1: {
    text: '¿Qué ye lo que quies facer? sudar, comer o culturizate',
    choices: [
      { label: '🚴 Rutas y deporte', set: { tipo: 'rutas' },   next: 's2a' },
      { label: '🍽️ Gastronomía',     set: { tipo: 'gastro' },  next: 's2b_loc' },
      { label: '🏛️ Cultura y ocio',  set: { tipo: 'cultura' }, next: 's2c' },
      { label: '🛍️ Tiendas',         set: { tipo: 'tiendas', subtipo: 'tiendas' }, next: 's3' },
    ],
  },
  s2a: {
    text: '¡Eso gustame más! ¿Tienes los pies pal monte o quies pedalear?',
    choices: [
      { label: '🚴 Bicicleta',       set: { subtipo: 'ciclismo' },      next: 's3' },
      { label: '🥾 Senderismo',      set: { subtipo: 'senderismo' },    next: 's3' },
      { label: '🌿 Vía Verde',       set: { subtipo: 'sendas_verdes' }, next: 's3' },
      { label: '🚶 Paseo tranquilo', set: { subtipo: 'paseos' },        next: 's3' },
    ],
  },
  s2b_loc: {
    text: '¡Ahora si nos entendemos! ¿En qué conceyu andas o te quies mover? (o sáltalo si te da igual)',
    // sin choices — gestionado con showMunicipioInput()
  },
  s2b_zona: {
    text: '¿Prefieres costa o monte?',
    choices: [
      { label: '🌊 Costa',         set: { zona: 'costero' },  next: 's2c_food' },
      { label: '🏔️ Interior',      set: { zona: 'interior' }, next: 's2c_food' },
      { label: '🗺️ Sorpréndeme',   set: { zona: 'sorpresa' }, next: 's2c_food' },
    ],
  },
  s2c_food: {
    text: '¿Qué te apetez? 🧀',
    choices: [
      { label: '🍴 Comer algo',      set: {},                              next: 's2d_comida' },
      { label: '☕ Café y merienda', set: { subtipo: 'cafe' },             next: 's4' },
      { label: '🍺 Sidra / cerveza', set: { subtipo: 'bar' },              next: 's4' },
      { label: '🍹 Cócteles / copas', set: { subtipo: 'pub' },             next: 's4' },
    ],
  },
  s2d_comida: {
    text: '¿Qué cocina te fae más tilín?',
    choices: [
      { label: '🫕 Cocina asturiana',  set: { subtipo: 'restaurant', cuisine: 'regional' }, next: 's4' },
      { label: '🌍 Internacional',      set: { subtipo: 'restaurant', cuisine: 'other' },   next: 's4' },
      { label: '🍔 Algo rápido',        set: { subtipo: 'fast_food',  cuisine: null },       next: 's4' },
    ],
  },
  s2c: {
    text: '¡Ojo que Asturias tien historia asgaya! ¿Qué te fae tilín? 🏛️',
    choices: [
      { label: '🏛️ Museos y monumentos', set: { subtipo: 'ocio' }, next: 's3' },
      { label: '👁️ Miradores',           set: { subtipo: 'ocio' }, next: 's3' },
      { label: '🎭 Teatro y arte',        set: { subtipo: 'ocio' }, next: 's3' },
    ],
  },
  s3: {
    text: '¿Prefieres costa o monte? ¡Ámbos son guapinos eh!',
    choices: [
      { label: '🌊 Costa',         set: { zona: 'costero' },  next: 's4' },
      { label: '🏔️ Interior',      set: { zona: 'interior' }, next: 's4' },
      { label: '🗺️ ¡Sorpréndeme!', set: { zona: 'sorpresa' }, next: 's4' },
    ],
  },
};

// ── Obtener recomendación (fallback hardcodeado) ──
function getRecommendation() {
  const sub  = state.subtipo || 'comer';
  const zona = state.zona    || 'costero';
  // Mapear subtipos gastro nuevos → clave FEATURED
  const featKey = ['restaurant','cafe','bar','pub','fast_food'].includes(sub) ? 'comer' : sub;
  const pool = FEATURED[featKey] || FEATURED.comer;

  let list;
  if (zona === 'sorpresa') {
    list = [...(pool.costero || []), ...(pool.interior || [])];
  } else {
    list = pool[zona] || pool.costero || [];
  }
  if (!list.length) list = [{ id: 24, n: 'Gijón' }];
  return list[Math.floor(Math.random() * list.length)];
}

// ── Fetch recomendación real desde la BD ──
async function fetchRecommendation() {
  try {
    const sub = state.subtipo || 'restaurant';
    // Solo subtipos válidos para el endpoint
    const validSubtipos = ['restaurant', 'cafe', 'bar', 'pub', 'fast_food'];
    if (!validSubtipos.includes(sub)) return getRecommendation();

    const params = new URLSearchParams({ subtipo: sub, zona: state.zona || 'sorpresa' });
    if (state.cuisine) params.set('cuisine', state.cuisine);
    if (state.municipio_input) params.set('municipio', state.municipio_input);

    const res = await fetch(ROOT + '/api/guia/recommendations?' + params.toString());
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    if (data && data.length) {
      return { id: data[0].id, n: data[0].nombre, num_pois: data[0].num_pois };
    }
  } catch (_) { /* fallback */ }
  return getRecommendation();
}

// ── UI helpers ──
const overlay  = document.getElementById('guia-overlay');
const textEl   = document.getElementById('guia-text');
const choicesEl = document.getElementById('guia-choices');
const charEl   = document.getElementById('guia-character');

function showNameCapture() {
  choicesEl.innerHTML = '';

  const row = document.createElement('div');
  row.className = 'guia-name-row';

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'guia-name-input';
  inp.placeholder = 'Tu nombre…';
  inp.maxLength = 30;

  const btn = document.createElement('button');
  btn.className = 'guia-btn';
  btn.textContent = '¡Dale!';

  const confirmName = () => {
    const name = inp.value.trim();
    if (!name) { inp.focus(); return; }
    state.playerName = name;
    // Sincronizar nombre en guia-chat (limpia conversación anterior)
    setPlayerName(name);
    choicesEl.innerHTML = '';
    typewriter(`¡Encantau de conocete ${name}! ¿Búscote un rincón nel Paraíso?`, textEl, () => {
      choicesEl.innerHTML = '';
      const btnStart = document.createElement('button');
      btnStart.className = 'guia-btn';
      btnStart.textContent = '¡Empezar aventura!';
      btnStart.addEventListener('click', () => showStep('s1'));
      choicesEl.appendChild(btnStart);
      // Mostrar chat justo después de confirmar el nombre (sin saludo extra)
      activateChat({ silent: true });
    });
  };

  btn.addEventListener('click', confirmName);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); confirmName(); } });

  row.appendChild(inp);
  row.appendChild(btn);
  choicesEl.appendChild(row);
  setTimeout(() => inp.focus(), 50);
}

function showMunicipioInput() {
  choicesEl.innerHTML = '';

  const row = document.createElement('div');
  row.className = 'guia-name-row';

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'guia-name-input';
  inp.placeholder = 'Ej: Gijón, Llanes…';
  inp.maxLength = 40;

  const btnOk = document.createElement('button');
  btnOk.className = 'guia-btn';
  btnOk.textContent = '¡Pa allá!';

  const btnSkip = document.createElement('button');
  btnSkip.className = 'guia-btn';
  btnSkip.textContent = '¡No importa!';
  btnSkip.style.cssText = 'background:rgba(255,255,255,0.15);color:#2d1a0e;';

  const confirmMunicipio = () => {
    const val = inp.value.trim();
    state.municipio_input = val || null;
    choicesEl.innerHTML = '';
    if (val) {
      typewriter(`¡Guay! Busco lo mejor pal conceyu de ${val}…`, textEl, () => setTimeout(() => showStep('s2c_food'), 700));
    } else {
      showStep('s2b_zona');
    }
  };

  btnOk.addEventListener('click', confirmMunicipio);
  btnSkip.addEventListener('click', () => { state.municipio_input = null; showStep('s2b_zona'); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); confirmMunicipio(); } });

  row.appendChild(inp);
  row.appendChild(btnOk);
  choicesEl.appendChild(row);
  choicesEl.appendChild(btnSkip);
  setTimeout(() => inp.focus(), 50);
}

function showStep(stepId) {
  currentStepId = stepId;
  lastResultRec = null;
  const step = STEPS[stepId];
  if (!step) return;
  choicesEl.innerHTML = '';
  const onDone = stepId === 's0'       ? showNameCapture
               : stepId === 's2b_loc'  ? showMunicipioInput
               : () => renderChoices(step.choices, stepId);
  typewriter(step.text, textEl, onDone);
}

function renderChoices(choices, stepId) {
  choicesEl.innerHTML = '';
  choices.forEach(c => {
    if (c.skip) return;   // "Explorar solo" se maneja con el botón skip
    const btn = document.createElement('button');
    btn.className = 'guia-btn';
    btn.textContent = c.label;
    btn.addEventListener('click', () => handleChoice(c));
    choicesEl.appendChild(btn);
  });
}

function handleChoice(c) {
  if (c.set) Object.assign(state, c.set);

  if (c.next === 's4') {
    showResult();
  } else if (c.next) {
    showStep(c.next);
  }
}

function renderResultButtons(rec) {
  // Mapear subtipos gastro → categoría de explorar.html
  const GASTRO_TIPOS = new Set(['restaurant', 'cafe', 'bar', 'pub', 'fast_food']);
  const sub = state.subtipo || 'comer';
  const cat = GASTRO_TIPOS.has(sub) ? 'comer' : sub;
  choicesEl.innerHTML = '';
  const btnIr = document.createElement('button');
  btnIr.className = 'guia-btn';
  btnIr.textContent = `🗺️ Ir a ${rec.n}`;
  btnIr.addEventListener('click', () => {
    // Marcar que venimos del wizard para que explorar.html abra AstuGuía automáticamente
    sessionStorage.setItem('astuguia_from_wizard', '1');
    // Pasar tipo para pre-filtrar en explorar.html
    let url = ROOT + '/explorar/' + rec.id + '?cat=' + cat;
    if (GASTRO_TIPOS.has(sub)) url += '&tipo=' + sub;
    location.href = url;
  });
  const btnMap = document.createElement('button');
  btnMap.className = 'guia-btn';
  btnMap.textContent = 'Ver en el mapa';
  btnMap.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('guia:filter', { detail: { ids: [rec.id] } }));
    closeGuia();
  });
  choicesEl.appendChild(btnIr);
  choicesEl.appendChild(btnMap);
}

async function showResult() {
  currentStepId = '__result__';
  lastResultRec = null;
  choicesEl.innerHTML = '';

  // Mostrar mensaje de carga mientras consultamos la BD
  textEl.textContent = 'Dame un momentín, busco el mejor sitiu pa ti… 🔍';

  const rec = await fetchRecommendation();
  lastResultRec = rec;

  const n = state.playerName ? `${state.playerName}, ` : '';
  const countInfo = rec.num_pois ? ` — hay ${rec.num_pois} sitios` : '';
  const resultText = rnd([
    `¡Buah! Pa lo que busques, ${n}${rec.n} ye lo tuyo${countInfo}. ¡Confirmao!`,
    `Sin duda alguna: ${n}${rec.n}${countInfo}. Va a prestate, digotelo yo 🤝`,
    `Recomiendote: ${n}${rec.n}${countInfo}. ¡Ye lo mejor pa ti!`,
  ]);

  typewriter(resultText, textEl, () => renderResultButtons(rec));
}

function restoreCurrentStep() {
  if (!currentStepId) return;
  choicesEl.innerHTML = '';
  if (currentStepId === '__result__' && lastResultRec) {
    renderResultButtons(lastResultRec);
  } else if (currentStepId === 's0') {
    showNameCapture();
  } else if (currentStepId === 's2b_loc') {
    showMunicipioInput();
  } else {
    const step = STEPS[currentStepId];
    if (step?.choices) renderChoices(step.choices, currentStepId);
  }
}

function closeGuia() {
  // Volver a modo monigote (no ocultar el overlay completo)
  overlay.classList.add('guia-char-only');
  overlay.classList.remove('guia-in', 'chat-expanded');
}

// ── Iniciar wizard ──
function startGuia() {
  if (!overlay) return;

  // Inyectar SVG personaje
  if (charEl && !charEl.querySelector('svg')) {
    charEl.insertAdjacentHTML('afterbegin', SVG_PERSONAJE);
  }

  // Clic en el personaje → abre wizard (solo mientras está en modo char-only)
  function openWizard() {
    if (!overlay.classList.contains('guia-char-only')) return;
    overlay.classList.remove('guia-char-only');
    overlay.classList.add('guia-in');
    if (currentStepId) restoreCurrentStep();
    else showStep('s0');
  }
  charEl.addEventListener('click', openWizard);
  charEl.addEventListener('touchend', (e) => { e.preventDefault(); openWizard(); }, { passive: false });

  overlay.hidden = false;  // visible pero compacto (solo personaje)

  // Botón skip (solo visible cuando el wizard está abierto)
  const skipBtn = document.getElementById('guia-skip');
  if (skipBtn) {
    skipBtn.addEventListener('click', closeGuia, { once: true });
  }

  // Botón X — cerrar diálogo, volver al monigote
  const closeBtn = document.getElementById('guia-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeGuia();
    });
  }
}

// ── Escuchar evento FASE3 del libro ──
window.addEventListener('book:fase3ready', () => {
  setTimeout(() => {
    // Inicializar chat — el bridge usa ROOT automáticamente
    initChat({ root: ROOT });
    startGuia();
  }, 800);
});

// ── Escuchar filtro de mapa desde resultado ──
window.addEventListener('guia:filter', (e) => {
  // book.js puede escuchar este evento para resaltar municipios en Leaflet
});
