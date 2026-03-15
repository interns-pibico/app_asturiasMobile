// ── AstuGuía — Utilidades compartidas ──

// SVG inline del asturiano con traje regional auténtico (montera picona, madreñas)
export const SVG_PERSONAJE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 96" width="72" height="96">
  <!-- Sombra Paper Mario -->
  <ellipse cx="36" cy="92" rx="20" ry="4" fill="rgba(0,0,0,0.18)"/>

  <!-- Piernas (pantalón oscuro ajustado) -->
  <rect x="25" y="64" width="9" height="18" rx="3" fill="#1a1a1a"/>
  <rect x="37" y="64" width="9" height="18" rx="3" fill="#1a1a1a"/>

  <!-- Medias blancas -->
  <rect x="25" y="75" width="9" height="7" rx="2" fill="#f0ece0"/>
  <rect x="37" y="75" width="9" height="7" rx="2" fill="#f0ece0"/>

  <!-- Madreñas (zuecos de madera) -->
  <path d="M22 82 Q24 86 34 86 Q36 86 36 84 L34 80 L25 80 Z" fill="#8B4513"/>
  <path d="M34 82 Q36 86 46 86 Q48 86 48 84 L46 80 L37 80 Z" fill="#8B4513"/>
  <path d="M22 82 L34 80 L34 78 L23 79 Z" fill="#6b3410"/>
  <path d="M34 82 L46 80 L46 78 L35 79 Z" fill="#6b3410"/>

  <!-- Cuerpo — camisa blanca con mangas abullonadas -->
  <rect x="22" y="38" width="28" height="27" rx="4" fill="#f5f0e8"/>

  <!-- Chaleco oscuro -->
  <path d="M28 38 L44 38 L44 58 L28 58 Z" fill="#2d1f0e"/>
  <circle cx="36" cy="44" r="1.5" fill="#c8a020"/>
  <circle cx="36" cy="50" r="1.5" fill="#c8a020"/>
  <circle cx="36" cy="56" r="1.5" fill="#c8a020"/>

  <!-- Faja roja -->
  <rect x="22" y="58" width="28" height="7" rx="2" fill="#c0392b"/>

  <!-- Mangas abullonadas -->
  <ellipse cx="19" cy="45" rx="6" ry="8" fill="#f5f0e8"/>
  <ellipse cx="53" cy="45" rx="6" ry="8" fill="#f5f0e8"/>

  <!-- Manos -->
  <circle cx="19" cy="53" r="4" fill="#f0c8a0"/>
  <circle cx="53" cy="53" r="4" fill="#f0c8a0"/>

  <!-- Cuello -->
  <rect x="32" y="32" width="8" height="8" rx="2" fill="#f0c8a0"/>

  <!-- Cara -->
  <ellipse cx="36" cy="26" rx="14" ry="15" fill="#f0c8a0"/>
  <!-- Borde cara -->
  <ellipse cx="36" cy="26" rx="14" ry="15" fill="none" stroke="#1a1a1a" stroke-width="1.5"/>

  <!-- Ojos -->
  <ellipse cx="30" cy="24" rx="2.5" ry="3" fill="#1a1a1a"/>
  <ellipse cx="42" cy="24" rx="2.5" ry="3" fill="#1a1a1a"/>
  <!-- Brillo ojos -->
  <circle cx="31" cy="23" r="0.8" fill="#fff"/>
  <circle cx="43" cy="23" r="0.8" fill="#fff"/>

  <!-- Sonrisa -->
  <path d="M30 30 Q36 35 42 30" fill="none" stroke="#a0603a" stroke-width="1.5" stroke-linecap="round"/>

  <!-- Mejillas sonrojadas -->
  <ellipse cx="27" cy="28" rx="4" ry="2.5" fill="rgba(220,100,80,0.3)"/>
  <ellipse cx="45" cy="28" rx="4" ry="2.5" fill="rgba(220,100,80,0.3)"/>

  <!-- Montera picona (sombrero asturiano icónico) -->
  <!-- Base cilíndrica negra -->
  <rect x="22" y="8" width="28" height="14" rx="3" fill="#1a1a1a"/>
  <!-- Ala inferior de la montera -->
  <rect x="18" y="20" width="36" height="5" rx="2" fill="#1a1a1a"/>
  <!-- Pico prominente hacia arriba-adelante -->
  <path d="M36 8 L44 2 L48 7 L36 8 Z" fill="#1a1a1a"/>
  <path d="M44 2 L48 7 L46 8 L40 5 Z" fill="#2a2a2a"/>
  <!-- Borde dorado de la montera -->
  <rect x="18" y="20" width="36" height="2" rx="1" fill="#c8a020"/>
</svg>`;

// ── Efecto typewriter ──
export function typewriter(text, el, cb) {
  el.textContent = '';
  let i = 0;
  const char = el.closest('#guia-overlay')?.querySelector('#guia-character');
  if (char) char.classList.add('talking');

  const iv = setInterval(() => {
    el.textContent += text[i++];
    if (i >= text.length) {
      clearInterval(iv);
      if (char) char.classList.remove('talking');
      if (cb) cb();
    }
  }, 28);
  return iv;
}

// ── Persistir posición del overlay en localStorage ──
function savePos(el) {
  localStorage.setItem('guia_pos', JSON.stringify({
    left: el.style.left,
    top:  el.style.top,
  }));
}

export function loadPos(el) {
  const p = JSON.parse(localStorage.getItem('guia_pos') || 'null');
  if (p && p.left && p.top) {
    el.style.left   = p.left;
    el.style.top    = p.top;
    el.style.right  = 'auto';
    el.style.bottom = 'auto';
  }
}

// ── Hacer el overlay arrastrable (mouse + touch) ──
// onClickCallback: función opcional llamada al hacer click (no drag) sobre #guia-character
export function makeDraggable(el, onClickCallback = null) {
  let dragOffX = 0, dragOffY = 0;
  let startCX  = 0, startCY  = 0;
  let moved    = false;

  el.addEventListener('mousedown', e => {
    if (e.target.matches('button, .guia-btn') && !e.target.closest('#guia-toggle')) return;
    dragOffX = e.clientX - el.offsetLeft;
    dragOffY = e.clientY - el.offsetTop;
    startCX  = e.clientX;
    startCY  = e.clientY;
    moved    = false;
    el.classList.add('dragging');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  el.addEventListener('touchstart', e => {
    if (e.target.matches('button, .guia-btn') && !e.target.closest('#guia-toggle')) return;
    const t  = e.touches[0];
    dragOffX = t.clientX - el.offsetLeft;
    dragOffY = t.clientY - el.offsetTop;
    startCX  = t.clientX;
    startCY  = t.clientY;
    moved    = false;
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchUp);
  }, { passive: true });

  function onMove(e) {
    if (Math.abs(e.clientX - startCX) > 5 || Math.abs(e.clientY - startCY) > 5) moved = true;
    el.style.left   = (e.clientX - dragOffX) + 'px';
    el.style.top    = (e.clientY - dragOffY) + 'px';
    el.style.right  = 'auto';
    el.style.bottom = 'auto';
  }
  function onTouchMove(e) {
    e.preventDefault();
    const t = e.touches[0];
    if (Math.abs(t.clientX - startCX) > 5 || Math.abs(t.clientY - startCY) > 5) moved = true;
    el.style.left   = (t.clientX - dragOffX) + 'px';
    el.style.top    = (t.clientY - dragOffY) + 'px';
    el.style.right  = 'auto';
    el.style.bottom = 'auto';
  }
  function onUp(e) {
    el.classList.remove('dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    savePos(el);
    if (!moved && onClickCallback && e.target.closest('#guia-character')) {
      onClickCallback();
    }
  }
  function onTouchUp(e) {
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchUp);
    savePos(el);
    if (!moved && onClickCallback && e.changedTouches.length) {
      const t2  = e.changedTouches[0];
      const hit = document.elementFromPoint(t2.clientX, t2.clientY);
      if (hit?.closest('#guia-character')) onClickCallback();
    }
  }
}
