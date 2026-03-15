// ── AstuGuía — Comentarista contextual en explorar.html ──
import { SVG_PERSONAJE, typewriter, makeDraggable, loadPos } from './guia-utils.js';
import { initChat, activateChat } from './guia-chat.js';

const overlay  = document.getElementById('guia-overlay');
const textEl   = document.getElementById('guia-text');
const charEl   = document.getElementById('guia-character');

// ── Helper variantes ──
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Etiquetas y frases de categoría en español ──
// Función para construir frase con número correctamente
function catPhrase(cat, total) {
  const s = total === 1;
  switch (cat) {
    case 'ciclismo':
      return s ? '1 ruta en bici' : `${total} rutas en bici`;
    case 'senderismo':
      return s ? '1 ruta de senderismo' : `${total} rutas de senderismo`;
    case 'sendas_verdes':
      return s ? '1 senda verde' : `${total} sendas verdes`;
    case 'carril_bici':
      return s ? '1 carril bici' : `${total} carriles bici`;
    case 'paseos':
      return s ? '1 ruta de paseo' : `${total} rutas de paseo`;
    case 'comer':
      return s ? '1 sitio para comer' : `${total} sitios para comer`;
    case 'ocio':
      return s ? '1 lugar de ocio' : `${total} lugares de ocio`;
    case 'tiendas':
      return s ? '1 tienda' : `${total} tiendas`;
    case 'mercado':
      return s ? '1 comercio de mercado' : `${total} comercios de mercado`;
    default:
      return `${total} elementos`;
  }
}

// Nombre en plural sin número (para frases como "no hay X")
const CAT_LABEL_PLURAL = {
  ciclismo:      'rutas en bici',
  senderismo:    'rutas de senderismo',
  sendas_verdes: 'sendas verdes',
  carril_bici:   'carriles bici',
  paseos:        'rutas de paseo',
  comer:         'sitios para comer',
  ocio:          'lugares de ocio',
  tiendas:       'tiendas',
  mercado:       'comercios de mercado',
};

// Comentarios según tipo de POI (tipo puede venir en inglés desde OSM)
function getTipComment(tipo) {
  if (!tipo) return rnd([
    '¡Esto tien buena pinta! Èchai un güeyu 📍',
    '¡Merez mucho la pena! Ya me contarás 📍',
    'Nun lo tengo catalogao pero seguro que tien encanto 📍 ¡Descúbrelo tú!',
  ]);
  const t = tipo.toLowerCase();
  // Gastronomía
  if (t.includes('restaurant') || t.includes('bar') || t.includes('cafe') || t.includes('café') ||
      t.includes('sidrería') || t.includes('sidrer') || t.includes('pub') || t.includes('fast_food') ||
      t.includes('food'))
    return rnd([
      '¡Aquí comese de escándalo! Pa el que tien fame claro 🍽️',
      '¡Farteste seguro! ¿Ties fame? 🍽️',
      '¡Deja ya de caminar y ponte a comer! Aquí vas flipalo 🍽️',
    ]);
  // Cultura y monumentos
  if (t.includes('museo') || t.includes('museum') || t.includes('monument') || t.includes('artwork') ||
      t.includes('iglesia') || t.includes('church') || t.includes('castillo') || t.includes('castle') ||
      t.includes('ruins') || t.includes('ruinas') || t.includes('historic'))
    return rnd([
      '¡Pedazo historia tien esto! Nun pases sin velo 🏛️',
      '¡Historia asturiana pura! Esto no lo tien cualquiera 🏛️',
      '¡Un trocin de la historia del norte aquí mismo! 🏛️',
    ]);
  // Miradores y naturaleza
  if (t.includes('mirador') || t.includes('viewpoint') || t.includes('natural') || t.includes('peak') ||
      t.includes('waterfall') || t.includes('cascade') || t.includes('beach') || t.includes('playa'))
    return rnd([
      'Desde aquí vese to... ¡o casi! 👁️',
      '¡Vistas de quitarse el sombreru! Esto nun tien preciu 👁️',
      '¡Con estes vistes haceste influencer! 👁️📱',
    ]);
  // Tiendas y mercados
  if (t.includes('mercado') || t.includes('market') || t.includes('tienda') || t.includes('shop') ||
      t.includes('supermarket') || t.includes('mall') || t.includes('boutique'))
    return rnd([
      '¡Pa que no vuelvas a casa tu ma con les manes vacies, castrón! 🛍️',
      '¡Lleva un recuerdu que luego riñente en casa! 🛍️',
      'Anda compra algo, un detallin pa los amigos aunque sea pa quedar bien 🛍️',
    ]);
  // Ocio y entretenimiento
  if (t.includes('theatre') || t.includes('theater') || t.includes('teatro') || t.includes('cinema') ||
      t.includes('cine') || t.includes('arts_centre') || t.includes('gallery') || t.includes('nightclub'))
    return rnd([
      '¡Aquí culturizamonos sin esfuerzu! 🎭',
      '¡Con esti plan cultural quedes chapó! 🎭',
      '¡Qué arte tenemos en Asturias redios! 🎭',
    ]);
  // Alojamiento
  if (t.includes('hotel') || t.includes('hostel') || t.includes('guest_house') || t.includes('camp'))
    return rnd([
      'Después de tanto andar, esti descansu ye de lujo 🏨',
      '¡A descansar que mañana ye otru dia! Aquí vas tar bien 🏨',
      'Vamos dir retirando, mañana sigues 🏨',
    ]);
  return rnd([
    '¡Esto tien buena pinta! Èchai un güeyu 📍',
    '¡Merez mucho la pena! Ya me contarás 📍',
    'Nun lo tengo catalogao pero seguro que tien encanto 📍',
  ]);
}

let autoHideTimer  = null;   // setTimeout para colapsar tras silencio
let pendingDelay   = null;   // setTimeout del delay de say()
let activeTypewriter = null; // setInterval del typewriter en curso
let isOpen = false;
let _guiaTimers = [];        // timers de sugerencia por categoría (cancelables)

// ── Mostrar mensaje con typewriter ──
// Cancela cualquier mensaje pendiente o en curso antes de iniciar el nuevo
function say(msg, delay = 0) {
  if (!overlay || !textEl) return;

  // Cancelar todo lo que esté en vuelo
  if (pendingDelay)   { clearTimeout(pendingDelay);   pendingDelay   = null; }
  if (autoHideTimer)  { clearTimeout(autoHideTimer);  autoHideTimer  = null; }
  if (activeTypewriter) { clearInterval(activeTypewriter); activeTypewriter = null; }

  const run = () => {
    if (!isOpen) showOverlay();
    activeTypewriter = typewriter(msg, textEl, () => {
      activeTypewriter = null;
    });
    // Auto-ocultar tras 8 segundos tras terminar de escribir
    autoHideTimer = setTimeout(() => {
      if (isOpen) collapseOverlay();
    }, 8000);
  };

  if (delay > 0) {
    pendingDelay = setTimeout(() => { pendingDelay = null; run(); }, delay);
  } else {
    run();
  }
}

function showOverlay() {
  isOpen = true;
  overlay.hidden = false;
  overlay.classList.remove('guia-char-only');
  overlay.classList.add('guia-open', 'guia-in');
  activateChat();
}

function collapseOverlay() {
  isOpen = false;
  overlay.classList.remove('guia-open', 'guia-in', 'chat-expanded');
  overlay.classList.add('guia-char-only');
}

// ── Inicializar overlay ──
function init() {
  if (!overlay) return;

  // Inyectar SVG personaje
  if (charEl && !charEl.querySelector('svg')) {
    charEl.insertAdjacentHTML('afterbegin', SVG_PERSONAJE);
  }

  // Restaurar posición guardada
  loadPos(overlay);

  // Clic en el personaje → abrir diálogo
  makeDraggable(overlay, () => {
    if (overlay.classList.contains('guia-char-only')) showOverlay();
  });

  // Botón X — cerrar diálogo, volver al monigote
  const closeBtn = document.getElementById('guia-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      collapseOverlay();
    });
  }

  // Inicializar chat — el bridge usa root automáticamente
  const appEl = document.getElementById('app-explorar');
  const root  = appEl?.dataset.root || '';
  initChat({ root });

  // Mostrar overlay (solo personaje visible por defecto)
  overlay.hidden = false;
}

// ── Eventos de explorar.js ──

// Bienvenida al municipio — solo auto-abre si venimos del wizard de book.html
window.addEventListener('explorar:ready', ({ detail }) => {
  const { nombre, costero } = detail;
  const fromWizard = sessionStorage.getItem('astuguia_from_wizard');
  if (fromWizard) {
    sessionStorage.removeItem('astuguia_from_wizard');
    const msg = costero
      ? rnd([
          `¡${nombre}, qué grande! Aquí el Cantábrico manda... y bien que manda 🌊`,
          `¡Bienvenido a ${nombre}! Con esi mar delante, mal lo tienes pa aburrite 🌊`,
          `¡${nombre}! Costa, gastronomía y mucho más pa difrutar 🌊`,
        ])
      : rnd([
          `¡${nombre}! Tierra adentro, verde que te quiero verde 🏔️ ¡Va prestate!`,
          `¡Bienvenido a ${nombre}! Aquí el verde, les pites y la calma manden 🏔️`,
          `¡${nombre}! Aquí la belleza de la naturaleza no tien rival 🏔️`,
        ]);
    say(msg, 900);
  }
  // Si no venimos del wizard → solo monigote; categoryLoaded abrirá AstuGuía más adelante
});

// Después de cargar categoría — espera suficiente para que el saludo haya terminado
window.addEventListener('explorar:categoryLoaded', async ({ detail }) => {
  // Cancelar sugerencias pendientes de la categoría anterior
  _guiaTimers.forEach(id => clearTimeout(id));
  _guiaTimers = [];

  const { cat, total, items } = detail;
  const labelPlural = CAT_LABEL_PLURAL[cat] || cat;

  // Fallback hardcoded (se usa si RAG no responde)
  let fallbackMsg;
  if (total === 0) {
    fallbackMsg = rnd([
      `Uf, de ${labelPlural} nun tengo de momento. Apúntolo aquí a ver si apaecen, ¡Nun te lo aseguro eh! 📍`,
      `Aquí de ${labelPlural}, nun tengo na. ¡Yes el primeru en preguntame esto! 🔍`,
      `Sin ${labelPlural} de momentu... Esta zona tien sus secretos 🤫`,
    ]);
  } else if (total === 1) {
    fallbackMsg = rnd([
      `Solo hay ${catPhrase(cat, 1)}, pero ye de calidad`,
      `Mira, ${catPhrase(cat, 1)} na más, ¡pero ye una joya! ✨`,
      `Aquí ${catPhrase(cat, 1)} únicu. Eso dai valor, ¿no? 😄`,
    ]);
  } else if (total < 5) {
    const phrase = catPhrase(cat, total);
    const phraseC = phrase.charAt(0).toUpperCase() + phrase.slice(1);
    fallbackMsg = rnd([
      `${phraseC} na más, ¡pero de calidad! Nun hay queja 😉`,
      `Pocos, ${phrase}, pero valen munchu 😏`,
      `${phraseC} en total. Empaquetadino y concentrao, como el quesu Cabrales 🧀`,
    ]);
  } else {
    fallbackMsg = rnd([
      `¡${catPhrase(cat, total)} tan esperándote! El problema ye elegir 😄`,
      `¡Ojo al dato! ${catPhrase(cat, total)} en esti conceju. ¡Pa dar y tomar!`,
      `${catPhrase(cat, total)} aquí. Esto ye lo que llamo yo abundancia asturiana 🎉`,
    ]);
  }

  // Delay 3.5s: la bienvenida habrá terminado
  _guiaTimers.push(setTimeout(() => {
    say(fallbackMsg);
  }, 3500));

  // Sugerencia aleatoria de item con nombre
  if (total > 0 && items?.length > 0) {
    const withName = items.filter(i => i.nombre);
    const featured = withName.length ? rnd(withName) : null;
    if (featured) {
      _guiaTimers.push(setTimeout(() => {
        let sugerencia = featured.nombre;
        if (featured.distancia_km) sugerencia += ` (${featured.distancia_km} km)`;
        if (featured.dificultad_label) sugerencia += ` — ${featured.dificultad_label}`;
        if (featured.desde && featured.hasta) sugerencia += ` · De ${featured.desde} a ${featured.hasta}`;
        say(rnd([
          `¡Oye! Empieza por: ${sugerencia} 📍 Tócalo que nun muerde 😄`,
          `El mi conseyu ye: ${sugerencia} 📍 Dai un toque y mira qué hay`,
          `¿Por dónde quies empezar? Yo iría por: ${sugerencia} 📍 ¡Toca ahí!`,
        ]));
        window.dispatchEvent(new CustomEvent('guia:suggestPoi', { detail: { nombre: featured.nombre } }));
      }, 8000));
    }
  }
});

// Cuando el usuario abre el sidebar de un POI
window.addEventListener('explorar:poiSelected', ({ detail }) => {
  const { poi } = detail;
  if (!poi || !poi.nombre) return;
  say(`¡${poi.nombre}! ${getTipComment(poi.tipo)}`);
});

// ── Arrancar ──
init();
