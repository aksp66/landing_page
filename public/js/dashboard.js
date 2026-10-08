(() => {
  'use strict';

  const STORAGE_KEY = 'dashboardKey';

  const gate = document.getElementById('dash-gate');
  const gateForm = document.getElementById('dash-gate-form');
  const gateError = document.getElementById('dash-gate-error');
  const passwordInput = document.getElementById('dash-password');
  const content = document.getElementById('dash-content');
  const notConfigured = document.getElementById('dash-not-configured');
  const cards = document.getElementById('dash-cards');
  const logoutBtn = document.getElementById('dash-logout');

  const totalViewsEl = document.getElementById('dash-total-views');
  const totalQuotesEl = document.getElementById('dash-total-quotes');
  const weekViewsEl = document.getElementById('dash-week-views');
  const chartEl = document.getElementById('dash-chart');
  const audioRankEl = document.getElementById('dash-audio-rank');
  const videoRankEl = document.getElementById('dash-video-rank');

  const formatDay = (iso) => {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const renderChart = (dailyViews) => {
    chartEl.innerHTML = '';
    const max = Math.max(1, ...dailyViews.map((d) => d.count));
    dailyViews.forEach(({ date, count }) => {
      const col = document.createElement('div');
      col.className = 'dash-bar-col';
      col.innerHTML = `
        <span class="dash-bar-count">${count}</span>
        <span class="dash-bar" style="height:${Math.max(4, (count / max) * 100)}%"></span>
        <span class="dash-bar-label">${formatDay(date)}</span>
      `;
      chartEl.appendChild(col);
    });
  };

  const renderRank = (el, items) => {
    if (!items.length) {
      el.innerHTML = '<li class="dash-rank-empty">Aucune donnée pour le moment.</li>';
      return;
    }
    el.innerHTML = items
      .map(({ id, count }) => `<li><span class="dash-rank-id">${escapeHtml(id)}</span><span class="dash-rank-count">${count}</span></li>`)
      .join('');
  };

  const escapeHtml = (str) => String(str).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const render = (data) => {
    gate.hidden = true;
    content.hidden = false;

    if (data.configured === false) {
      notConfigured.hidden = false;
      cards.hidden = true;
      document.querySelectorAll('.dash-panel').forEach((p) => { p.hidden = true; });
      return;
    }

    const weekTotal = data.dailyViews.slice(-7).reduce((sum, d) => sum + d.count, 0);
    totalViewsEl.textContent = data.totalViews;
    totalQuotesEl.textContent = data.totalQuotes;
    weekViewsEl.textContent = weekTotal;

    renderChart(data.dailyViews);
    renderRank(audioRankEl, data.media.filter((m) => m.type === 'audio'));
    renderRank(videoRankEl, data.media.filter((m) => m.type === 'video'));
  };

  const fetchStats = async (key) => {
    const res = await fetch('/api/dashboard', { headers: { 'X-Dashboard-Key': key } });
    if (res.status === 401) throw new Error('Mot de passe incorrect.');
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erreur inattendue.');
    return res.json();
  };

  const tryLogin = async (key, { fromStorage } = {}) => {
    try {
      const data = await fetchStats(key);
      sessionStorage.setItem(STORAGE_KEY, key);
      render(data);
    } catch (err) {
      if (fromStorage) sessionStorage.removeItem(STORAGE_KEY);
      gateError.textContent = err.message;
    }
  };

  gateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    gateError.textContent = '';
    tryLogin(passwordInput.value.trim());
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem(STORAGE_KEY);
    content.hidden = true;
    gate.hidden = false;
    passwordInput.value = '';
    passwordInput.focus();
  });

  const savedKey = sessionStorage.getItem(STORAGE_KEY);
  if (savedKey) tryLogin(savedKey, { fromStorage: true });
})();
