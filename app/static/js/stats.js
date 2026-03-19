// stats.js — Estadísticas del Viajero

const PASSPORT_KEY  = 'passport_visited';
const CAT_KEY       = 'astuguia_cat_counts';
const POI_KEY       = 'astuguia_poi_count';
const ROUTE_KEY     = 'astuguia_route_count';

const CAT_LABELS = {
  ciclismo:'🚴 Ciclismo', senderismo:'🥾 Senderismo', sendas_verdes:'🌿 Sendas Verdes',
  carril_bici:'🚲 Carril Bici', paseos:'🚶 Paseos',
  comer:'🍽️ Comer', ocio:'🎭 Ocio', tiendas:'🛍️ Tiendas', mercado:'🏪 Mercado',
};

function getStats() {
  const visited  = JSON.parse(localStorage.getItem(PASSPORT_KEY) || '{}');
  const cats     = JSON.parse(localStorage.getItem(CAT_KEY) || '{}');
  const poiCount = parseInt(localStorage.getItem(POI_KEY) || '0', 10);
  const routeCount = parseInt(localStorage.getItem(ROUTE_KEY) || '0', 10);

  const numVisited = Object.keys(visited).length;
  const exploredCats = Object.entries(cats).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]);
  const favCat = exploredCats[0] ? exploredCats[0][0] : null;

  return { numVisited, visited, exploredCats, favCat, poiCount, routeCount };
}

function renderStats() {
  const s = getStats();
  const pct = Math.round(s.numVisited / 78 * 100);

  document.getElementById('stats-content').innerHTML = `
    <div class="stats-section">
      <div class="stats-label">Concejos visitados</div>
      <div class="stats-big">${s.numVisited} <span class="stats-of">/ 78</span></div>
      <div class="stats-bar-track"><div class="stats-bar-fill" style="width:${pct}%"></div></div>
    </div>

    <div class="stats-section">
      <div class="stats-label">Puntos de interés explorados</div>
      <div class="stats-big">${s.poiCount}</div>
    </div>

    <div class="stats-section">
      <div class="stats-label">Rutas cargadas</div>
      <div class="stats-big">${s.routeCount}</div>
    </div>

    ${s.favCat ? `<div class="stats-section">
      <div class="stats-label">Categoría favorita</div>
      <div class="stats-fav">${CAT_LABELS[s.favCat] || s.favCat}</div>
    </div>` : ''}

    ${s.exploredCats.length ? `<div class="stats-section">
      <div class="stats-label">Categorías exploradas</div>
      <div class="stats-cats">
        ${s.exploredCats.map(([cat, n]) => `<span class="stats-cat-pill">${CAT_LABELS[cat] || cat} <em>${n}x</em></span>`).join('')}
      </div>
    </div>` : ''}

    ${s.numVisited === 0 ? '<p class="stats-empty">¡Aún nun visiteste ningún conceyu!<br>Empieza explorando el mapa 🗺️</p>' : ''}
  `;
}

function openStats()  { renderStats(); document.getElementById('stats-panel').classList.add('open'); document.getElementById('stats-backdrop').classList.add('open'); }
function closeStats() { document.getElementById('stats-panel').classList.remove('open'); document.getElementById('stats-backdrop').classList.remove('open'); }

function incRouteCount() {
  const n = parseInt(localStorage.getItem(ROUTE_KEY) || '0', 10) + 1;
  localStorage.setItem(ROUTE_KEY, String(n));
}

export function initStats() {
  document.querySelectorAll('[data-stats="open"]').forEach(btn => {
    btn.addEventListener('click', openStats);
  });
  document.getElementById('stats-close').addEventListener('click', closeStats);
  document.getElementById('stats-backdrop').addEventListener('click', closeStats);

  // Contar rutas cargadas
  window.addEventListener('explorar:categoryLoaded', e => {
    const ROUTE_CATS = new Set(['ciclismo','senderismo','sendas_verdes','carril_bici','paseos']);
    if (ROUTE_CATS.has(e.detail.cat)) incRouteCount();
  });
}
