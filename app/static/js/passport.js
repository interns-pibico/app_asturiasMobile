// passport.js — Pasaporte de Concejos Asturianos + Trofeos (dos páginas)
import { renderTrophiesGrid, initTrophies, BADGES } from './trophies.js';

const PASSPORT_KEY = 'passport_visited';

export function stampPassport(id, nombre) {
  const visited = getVisited();
  if (!visited[id]) {
    visited[id] = {
      nombre,
      fecha: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })
    };
    localStorage.setItem(PASSPORT_KEY, JSON.stringify(visited));
  }
}

function getVisited() {
  return JSON.parse(localStorage.getItem(PASSPORT_KEY) || '{}');
}

function renderSellosGrid() {
  const visited = getVisited();
  const ids = Object.keys(visited);
  document.getElementById('passport-counter').textContent = `${ids.length} / 78`;
  const grid = document.getElementById('passport-grid');
  grid.innerHTML = ids.length === 0
    ? '<p class="passport-empty">¡Aún nun visiteste ningún conceyu!<br>Entra nun municipio pal primer sellu 🌟</p>'
    : ids.map(id => `
        <div class="passport-seal">
          <div class="seal-icon">⭐</div>
          <div class="seal-name">${visited[id].nombre}</div>
          <div class="seal-date">${visited[id].fecha}</div>
        </div>`).join('');
}

function openPassport() {
  renderSellosGrid();
  renderTrophiesGrid();
  document.getElementById('passport-panel').classList.add('open');
  document.getElementById('passport-backdrop').classList.add('open');
}

function closePassport() {
  document.getElementById('passport-panel').classList.remove('open');
  document.getElementById('passport-backdrop').classList.remove('open');
}

function downloadPdf() {
  const visited  = getVisited();
  const trophies = JSON.parse(localStorage.getItem('astuguia_trophies') || '{}');
  const area = document.getElementById('passport-print-area');
  area.innerHTML = `
    <div class="print-cover">
      <h1>🗺️ PASAPORTE ASTURIANO</h1>
      <p>Explorador de Concejos · ${Object.keys(visited).length}/78 sellos · ${Object.keys(trophies).length}/${BADGES.length} trofeos</p>
    </div>
    <div class="print-spread">
      <div class="print-page">
        <h2>🏆 Trofeos</h2>
        <div class="print-trophy-grid">
          ${BADGES.map(b => trophies[b.id]
            ? `<div class="print-trophy">${b.icon} <strong>${b.nombre}</strong><br><small>${trophies[b.id].fecha}</small></div>`
            : `<div class="print-trophy locked">🔒 ${b.nombre}</div>`
          ).join('')}
        </div>
      </div>
      <div class="print-page">
        <h2>⭐ Sellos Visitados</h2>
        <div class="print-seal-grid">
          ${Object.values(visited).map(v =>
            `<div class="print-seal"><strong>${v.nombre}</strong><br><small>${v.fecha}</small></div>`
          ).join('')}
        </div>
      </div>
    </div>`;
  window.print();
}

export function initPassport() {
  document.querySelectorAll('[data-passport="open"]').forEach(btn => {
    btn.addEventListener('click', openPassport);
  });
  document.getElementById('passport-close').addEventListener('click', closePassport);
  document.getElementById('passport-backdrop').addEventListener('click', closePassport);
  document.getElementById('passport-download').addEventListener('click', downloadPdf);

  initTrophies();
}
