// ── AstuGuía — Modo Chat (bridge /api/guia/chat) ──

const SVG_EXPAND   = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6V1h5"/><path d="M10 1h5v5"/><path d="M15 10v5h-5"/><path d="M6 15H1v-5"/></svg>`;
const SVG_MINIMIZE = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 1v5H1"/><path d="M15 6h-5V1"/><path d="M10 15v-5h5"/><path d="M1 10h5v5"/></svg>`;

// Session key para conversación — único por página (book vs explorar/24 vs explorar/43)
// Así book.html y explorar.html nunca comparten historial de conversación
const CONV_KEY = 'aguia_conv_' + window.location.pathname.replace(/\//g, '_').replace(/^_/, '');

let _root         = '';
let _awaitingName = false;
let _playerName   = null;
let _municipiosCache = null;

// ── Resolve ROOT from DOM ──
function getRoot() {
  return _root
    || document.getElementById('app-book')?.dataset.root
    || document.getElementById('app-explorar')?.dataset.root
    || '';
}

// ── Precargar municipios una sola vez (para botón NAV) ──
async function getMunicipios() {
  if (_municipiosCache) return _municipiosCache;
  try {
    const res = await fetch(getRoot() + '/api/municipios');
    _municipiosCache = res.ok ? await res.json() : [];
  } catch {
    _municipiosCache = [];
  }
  return _municipiosCache;
}

// ── Normalizar texto para comparación ──
function normalize(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '');
}

// ── Detectar primer municipio mencionado en texto ──
async function detectMunicipio(text) {
  const municipios = await getMunicipios();
  const normText = normalize(text);
  for (const m of municipios) {
    if (normText.includes(normalize(m.nombre))) return m;
  }
  return null;
}

// ── Detectar tag [NAV:Concejo] explícito puesto por el modelo ──
async function detectNavTag(text) {
  const match = text.match(/\[NAV:([^\]]+)\]/i);
  if (!match) return null;
  const navName = match[1].trim();
  const municipios = await getMunicipios();
  const normNav = normalize(navName);
  return municipios.find(m => normalize(m.nombre) === normNav)
      || municipios.find(m => normalize(m.nombre).includes(normNav))
      || null;
}

// ── Llamada al bridge /api/guia/chat (SSE streaming) ──
async function callBridgeStream(message, extraContext = {}) {
  const root = getRoot();
  const ctx  = window.ASTUGUIA_CONTEXT || {};
  const name = _playerName || sessionStorage.getItem('astuguia_player_name') || null;

  const payload = {
    message,
    context_type:     extraContext.context_type   || 'chat',
    municipio_id:     ctx.municipio_id            || extraContext.municipio_id    || null,
    municipio_nombre: ctx.municipio_nombre        || extraContext.municipio_nombre || null,
    categoria:        ctx.categoria               || extraContext.categoria        || null,
    wizard_state:     extraContext.wizard_state   || null,
    poi_id:           extraContext.poi_id         || null,
    conversation_id:  sessionStorage.getItem(CONV_KEY) || null,
    player_name:      name,
  };

  return fetch(`${root}/api/guia/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

// ── Streaming SSE via bridge (exported for wizard + explorar) ──
export async function sendMessage(message, onChunk, onDone, onError, extraContext = {}, onProgress = null) {
  let response;
  try {
    response = await callBridgeStream(message, extraContext);
  } catch {
    onError('No se pudo conectar con AstuGuía. ¿Tienes conexión?');
    return;
  }

  if (!response.ok) {
    onError(`Error ${response.status} al contactar AstuGuía`);
    return;
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';
  let fullText  = '';
  let eventName = null; // for named SSE events

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop(); // incomplete fragment

    for (const line of lines) {
      const trimmed = line.trim();

      // Handle named event lines (e.g. "event: conv_id")
      if (trimmed.startsWith('event: ')) {
        eventName = trimmed.slice(7).trim();
        continue;
      }

      if (!trimmed) { eventName = null; continue; }
      if (trimmed === 'data: [DONE]') { eventName = null; break; }
      if (!trimmed.startsWith('data: ')) { continue; }

      const dataStr = trimmed.slice(6);

      // Special event: conv_id injected by bridge
      if (eventName === 'conv_id') {
        sessionStorage.setItem(CONV_KEY, dataStr.trim());
        eventName = null;
        continue;
      }

      // Progress event: update spinner text while model is thinking/searching
      if (eventName === 'progress') {
        try {
          const prog = JSON.parse(dataStr);
          if (onProgress) onProgress(prog);
        } catch { /* ignore */ }
        eventName = null;
        continue;
      }

      eventName = null;

      // Normal data chunk
      try {
        const json = JSON.parse(dataStr);
        const chunk = json.choices?.[0]?.delta?.content || json.content || '';
        if (chunk) { fullText += chunk; onChunk(chunk); }
        if (json.conversation_id) sessionStorage.setItem(CONV_KEY, json.conversation_id);
      } catch { /* ignore malformed lines */ }
    }
  }

  onDone(fullText);
}

// ── DOM helpers ──
const $ = id => document.getElementById(id);

function miniMd(text) {
  let s = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__(.*?)__/g, '<strong>$1</strong>');
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
  s = s.replace(/_(.*?)_/g, '<em>$1</em>');
  s = s.replace(/`(.*?)`/g, '<code>$1</code>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

function appendMessage(role, text) {
  const history = $('guia-chat-history');
  if (!history) return null;
  const div = document.createElement('div');
  div.className = `gchat-msg gchat-${role}`;
  div.innerHTML = miniMd(text);
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
  return div;
}

function showDots() {
  const history = $('guia-chat-history');
  if (!history) return null;
  const div = document.createElement('div');
  div.className = 'gchat-msg gchat-bot gchat-dots';
  div.innerHTML = 'Pera, toy en ello <span></span><span></span><span></span>';
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
  return div;
}

// ── Red de seguridad: captura frase literal del modelo cuando ignora el system prompt ──
function postProcessResponse(text) {
  if (/documentos proporcionados/i.test(text)) {
    return 'En estos momentos no tengo datos específicos sobre este concejo. ' +
           'Pero te diré que Asturias tiene 78 concejos con paisajes, historia y gastronomía únicos. ' +
           '¡Explora el mapa de Asturias para descubrir rutas, monumentos y encantos locales en esta zona!';
  }
  return text;
}

// ── Detectar categoría de exploración a partir del texto de respuesta ──
const CATEGORY_KEYWORDS = [
  { cat: 'sendas_verdes', words: ['senda verde', 'sendas verdes', 'via verde', 'vía verde'] },
  { cat: 'carril_bici',   words: ['carril bici', 'carril-bici', 'ciclocarril'] },
  { cat: 'ciclismo',      words: ['bicicleta', 'ciclismo', 'ruta ciclista', 'en bici'] },
  { cat: 'senderismo',    words: ['senderismo', 'senda', 'ruta de montana', 'ruta de montaña', 'trekking', 'hiking'] },
  { cat: 'paseos',        words: ['paseo', 'pasear', 'caminata', 'caminar'] },
  // mercado ANTES de comer — comprar productos locales no es comer
  { cat: 'mercado',       words: ['donde comprar', 'dónde comprar', 'comprar', 'llagar', 'quesería', 'queseria',
                                   'sidrería', 'sidreria', 'tienda de productos', 'productos locales',
                                   'artesania', 'artesanía', 'mercadillo', 'comercio local',
                                   'tienda asturiana', 'productos tipicos', 'productos típicos'] },
  { cat: 'comer',         words: ['restaurante', 'gastronomia', 'gastronomía', 'sidrería donde comer',
                                   'comer', 'comida', 'fabada', 'cocina', 'marisco', 'pescado',
                                   'cachopo', 'pote asturiano', 'bar', 'tasca', 'cenar', 'almorzar'] },
  { cat: 'ocio',          words: ['monumento', 'museo', 'cultura', 'arte', 'mirador', 'teatro', 'iglesia',
                                   'catedral', 'castillo', 'patrimonio', 'exposicion', 'exposición',
                                   'arquitectura', 'historico', 'histórico', 'visitar', 'conocer', 'ver'] },
  { cat: 'tiendas',       words: ['tienda', 'compras', 'shopping', 'boutique'] },
];

// Devuelve null si no hay match claro (evita falsos positivos en explorar)
function detectCategory(text, { fallback = 'ocio' } = {}) {
  const norm = normalize(text);
  for (const { cat, words } of CATEGORY_KEYWORDS) {
    if (words.some(w => norm.includes(normalize(w)))) return cat;
  }
  return fallback;
}

// Etiquetas legibles para el botón de categoría en explorar.html
const CAT_LABELS = {
  ciclismo:      'Rutas en Bici',
  senderismo:    'Senderismo',
  sendas_verdes: 'Sendas Verdes',
  carril_bici:   'Carril Bici',
  paseos:        'Paseos',
  comer:         'Restaurantes',
  ocio:          'Ocio y Cultura',
  tiendas:       'Tiendas',
  mercado:       'Mercado',
};

// ── Detectar subcategoría de mercado (para filtro server-side) ──
function detectMercadoSubcat(text) {
  const n = normalize(text);
  if (n.includes('sidra') || n.includes('llagar') || n.includes('sidreria') || n.includes('cerveza') || n.includes('cerveceria')) return 'sidra-bebidas';
  if (n.includes('queso') || n.includes('queseria') || n.includes('cabrales') || n.includes('gamone') || n.includes('embutido') || n.includes('chorizo') || n.includes('charcuter') || n.includes('conserva')) return 'gastro';
  if (n.includes('artesania') || n.includes('ceramica') || n.includes('artesanal')) return 'artesania';
  if (n.includes('dulce') || n.includes('reposteria') || n.includes('pasteleria') || n.includes('carbayones')) return 'dulce';
  if (n.includes('huerta') || n.includes('verdura') || n.includes('fabe') || n.includes('legumbre') || n.includes('manzana')) return 'huerta-campo';
  return '';
}

// ── Enviar mensaje ──
async function handleSend() {
  const input   = $('guia-chat-input');
  const sendBtn = $('guia-chat-send');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  if (_awaitingName) {
    _awaitingName = false;
    const name = text;
    _playerName = name;
    sessionStorage.setItem('astuguia_player_name', name);
    input.value = '';
    input.style.height = 'auto';
    input.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    appendMessage('user', name);
    appendMessage('bot', `¡Encantau de conocete ${name}! ¿Qué ye lo que quies saber?`);
    input.focus();
    return;
  }

  input.value    = '';
  input.style.height = 'auto';
  input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  appendMessage('user', text);

  let dots     = showDots();   // let para poder nullificarlo
  let botDiv   = null;
  let fullReply = '';

  await sendMessage(
    text,
    (chunk) => {
      if (dots) { dots.remove(); dots = null; botDiv = appendMessage('bot', ''); }
      if (botDiv) {
        fullReply += chunk;
        botDiv.innerHTML = miniMd(fullReply);
        const h = $('guia-chat-history');
        if (h) h.scrollTop = h.scrollHeight;
      }
    },
    async (fullText) => {
      // Limpiar spinner zombie si no llegó contenido
      if (!fullText && dots) { dots.remove(); dots = null; }

      // 1. Red de seguridad fallback
      const displayText = postProcessResponse(fullText);
      if (botDiv && displayText !== fullText) botDiv.innerHTML = miniMd(displayText);

      // 2. Strip [NAV:xxx] del texto visible (siempre, en ambas vistas)
      if (botDiv) {
        const clean = displayText.replace(/\s*\[NAV:[^\]]*\]/gi, '').trim();
        botDiv.innerHTML = miniMd(clean);
      }

      const history = $('guia-chat-history');
      const ctx = window.ASTUGUIA_CONTEXT || {};
      const isExplorar = !!ctx.municipio_id;

      if (isExplorar) {
        // ── explorar.html: botón de cambio de categoría en el mismo concejo ──
        // Solo si la categoría detectada difiere de la actual (sin fallback ocio para evitar falsos positivos)
        const detectedCat = detectCategory(fullText, { fallback: null });
        const currentCat  = ctx.categoria || '';
        if (detectedCat && detectedCat !== currentCat && history) {
          const catLabel = CAT_LABELS[detectedCat] || detectedCat;
          const btn = document.createElement('button');
          btn.className = 'guia-btn guia-btn-nav';
          btn.textContent = `🗺️ Ir a la categoría ${catLabel} de ${ctx.municipio_nombre}`;
          btn.addEventListener('click', () => {
            let url = getRoot() + '/explorar/' + ctx.municipio_id + '?cat=' + detectedCat;
            if (detectedCat === 'mercado') {
              const subcat = detectMercadoSubcat(fullText);
              if (subcat) url += '&cat_filter=' + subcat;
            }
            location.href = url;
          });
          history.appendChild(btn);
          history.scrollTop = history.scrollHeight;
        }
      } else {
        // ── book.html: botón de navegación a municipio ──
        const municipio = await detectNavTag(fullText) || await detectMunicipio(fullText);
        if (municipio && history) {
          const btn = document.createElement('button');
          btn.className = 'guia-btn guia-btn-nav';
          btn.textContent = `🗺️ Ir a ${municipio.nombre}`;
          btn.addEventListener('click', () => {
            const cat = detectCategory(fullText);
            let url = getRoot() + '/explorar/' + municipio.id + '?cat=' + cat;
            if (cat === 'mercado') {
              const subcat = detectMercadoSubcat(fullText);
              if (subcat) url += '&cat_filter=' + subcat;
            }
            location.href = url;
          });
          history.appendChild(btn);
          history.scrollTop = history.scrollHeight;
        }
      }

      input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      input.focus();
    },
    (errMsg) => {
      if (dots) dots.remove();
      appendMessage('bot', '⚠️ ' + errMsg);
      input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
    },
    {},
    (prog) => {
      if (dots && prog.msg) dots.innerHTML = prog.msg + ' <span></span><span></span><span></span>';
    }
  );
}

// ── Toggle maximizar/minimizar chat ──
function toggleExpand() {
  const overlay = $('guia-overlay');
  if (!overlay) return;
  const isExpanded = overlay.classList.toggle('chat-expanded');
  const label = isExpanded ? 'Minimizar' : 'Maximizar';
  const icon  = isExpanded ? SVG_MINIMIZE : SVG_EXPAND;
  const btn = $('guia-dialog-expand');
  if (btn) { btn.title = label; btn.innerHTML = icon; }
}

// ── Saludo inicial al abrir el chat ──
function showInitialGreeting() {
  const history = $('guia-chat-history');
  if (!history || history.children.length > 0) return;  // ya hay mensajes
  const name = _playerName || sessionStorage.getItem('astuguia_player_name');
  if (name) {
    appendMessage('bot', `Hola ${name}, ¿Qué ye lo que quies saber?`);
  } else {
    appendMessage('bot', 'Hola, ¿Cómo te llames?');
    _awaitingName = true;
  }
}

// ── Borrar conversación actual (cambio de página/contexto) ──
export function clearConversation() {
  sessionStorage.removeItem(CONV_KEY);
}

// ── Actualizar nombre del jugador (desde wizard) ──
// Borra la conversación anterior para que el bot empiece fresco con el nuevo nombre
export function setPlayerName(name) {
  _playerName = name;
  sessionStorage.setItem('astuguia_player_name', name);
  sessionStorage.removeItem(CONV_KEY);
}

// ── Activar chat (llamar cuando se quiere mostrar el panel) ──
// silent=true: no muestra el saludo inicial (el wizard ya lo hace)
export function activateChat({ silent = false } = {}) {
  const overlay = $('guia-overlay');
  if (!overlay) return;
  overlay.classList.add('guia-chat-active');
  if (!silent) showInitialGreeting();
  setTimeout(() => { const inp = $('guia-chat-input'); if (inp) inp.focus(); }, 80);
}

// ── Inicializar (llamar desde guia-book.js / guia-explorar.js) ──
export function initChat({ root } = {}) {
  _root = root || _root;
  _playerName = sessionStorage.getItem('astuguia_player_name') || null;

  // Precargar municipios en background
  getMunicipios();

  // Botón expandir diálogo
  const expandBtn2 = $('guia-dialog-expand');
  if (expandBtn2) {
    expandBtn2.innerHTML = SVG_EXPAND;
    expandBtn2.addEventListener('click', (e) => { e.stopPropagation(); toggleExpand(); });
  }

  // Botón enviar
  const sendBtn = $('guia-chat-send');
  if (sendBtn) sendBtn.addEventListener('click', handleSend);

  // Tecla Enter en textarea
  const input = $('guia-chat-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 80) + 'px';
    });
  }
}
