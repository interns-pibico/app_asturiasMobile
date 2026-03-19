// weather.js — Widget del tiempo via Open-Meteo (sin API key, CORS-friendly)

const WMO_EMOJI = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️',
  61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'❄️', 73:'❄️', 75:'❄️', 77:'🌨️',
  80:'🌦️', 81:'🌧️', 82:'⛈️',
  95:'⛈️', 96:'⛈️', 99:'⛈️',
};

function getWmoEmoji(code) {
  if (WMO_EMOJI[code] !== undefined) return WMO_EMOJI[code];
  const keys = Object.keys(WMO_EMOJI).map(Number).sort((a, b) => a - b);
  let closest = keys[0];
  for (const k of keys) { if (k <= code) closest = k; else break; }
  return WMO_EMOJI[closest] || '🌡️';
}

async function fetchWeather(lat, lon) {
  const cacheKey = `weather_${(+lat).toFixed(2)}_${(+lon).toFixed(2)}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const { data, time } = JSON.parse(cached);
    if (Date.now() - time < 30 * 60 * 1000) return data;
  }
  // Proxy backend para evitar restricciones CSP
  const root = document.getElementById('app-book')?.dataset.root
             || document.getElementById('app-explorar')?.dataset.root
             || '';
  const url = `${root}/api/weather?lat=${lat}&lon=${lon}`;
  const res  = await fetch(url);
  const data = await res.json();
  sessionStorage.setItem(cacheKey, JSON.stringify({ data, time: Date.now() }));
  return data;
}

function renderWeather(data, el) {
  const cur = data.current;
  const daily = data.daily;
  if (!cur) return;
  // Soporta ambos nombres por compatibilidad
  const code  = cur.weather_code ?? cur.weathercode ?? 0;
  const emoji = getWmoEmoji(code);
  const temp  = Math.round(cur.temperature_2m);
  const min   = Math.round(daily.temperature_2m_min[0]);
  const max   = Math.round(daily.temperature_2m_max[0]);
  el.innerHTML = `
    <span class="wx-icon">${emoji}</span>
    <span class="wx-temp">${temp}°</span>
    <span class="wx-range">↓${min}° ↑${max}°</span>`;
  el.classList.add('weather-loaded');
}

export async function initWeather(lat, lon, targetEl) {
  if (!targetEl || !lat || !lon) return;
  try {
    const data = await fetchWeather(lat, lon);
    renderWeather(data, targetEl);
  } catch (_) {
    // fail silently — el widget se queda vacío
  }
}

// Multi-ciudad: cities = [{label, lat, lon}], containerEl = elemento padre
export async function initWeatherMulti(cities, containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = cities.map(c =>
    `<div class="wx-city" data-lat="${c.lat}" data-lon="${c.lon}">
      <span class="wx-city-label">${c.label}</span>
      <span class="wx-icon">…</span>
      <span class="wx-temp"></span>
    </div>`
  ).join('');

  for (const c of cities) {
    const el = containerEl.querySelector(`[data-lat="${c.lat}"][data-lon="${c.lon}"]`);
    if (!el) continue;
    try {
      const data = await fetchWeather(c.lat, c.lon);
      const cur  = data.current;
      if (!cur) continue;
      const code  = cur.weather_code ?? cur.weathercode ?? 0;
      el.querySelector('.wx-icon').textContent  = getWmoEmoji(code);
      el.querySelector('.wx-temp').textContent  = Math.round(cur.temperature_2m) + '°';
    } catch (_) { el.querySelector('.wx-icon').textContent = ''; }
  }
  containerEl.classList.add('weather-loaded');
}
