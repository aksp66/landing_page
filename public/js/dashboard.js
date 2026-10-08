(() => {
  'use strict';

  const STORAGE_KEY = 'dashboardKey';
  let currentKey = '';

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

  const escapeHtml = (str) => String(str).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const apiFetch = (path, options = {}) => fetch(path, {
    ...options,
    headers: { ...(options.headers || {}), 'X-Dashboard-Key': currentKey },
  });

  /* ============================================
     ONGLETS
     ============================================ */
  const tabs = document.querySelectorAll('.tab[data-dash-tab]');
  const panels = document.querySelectorAll('.dash-tab-panel[data-dash-panel]');
  const loadedPanels = new Set();

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      const name = tab.dataset.dashTab;
      panels.forEach((p) => { p.hidden = p.dataset.dashPanel !== name; });

      if (!loadedPanels.has(name)) {
        loadedPanels.add(name);
        if (name === 'devis') loadDevis();
        if (name === 'form') loadFormEditor();
      }
    });
  });

  /* ============================================
     STATISTIQUES
     ============================================ */
  const formatDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

  const CHART_COLORS = ['#7C3AED', '#6D28D9', '#5B21B6', '#DB2777', '#EC4899', '#F472B6', '#06B6D4', '#0EA5E9', '#22D3EE', '#7C3AED', '#DB2777', '#06B6D4', '#6D28D9', '#EC4899'];

  const renderChart = (dailyViews) => {
    chartEl.innerHTML = '';
    const max = Math.max(1, ...dailyViews.map((d) => d.count));
    dailyViews.forEach(({ date, count }, i) => {
      const col = document.createElement('div');
      col.className = 'dash-bar-col';
      const color = count > 0 ? CHART_COLORS[i % CHART_COLORS.length] : 'var(--card-border)';
      col.innerHTML = `
        <span class="dash-bar-count">${count}</span>
        <span class="dash-bar" style="height:${Math.max(4, (count / max) * 100)}%;background:${color}"></span>
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
    const max = Math.max(1, ...items.map((i) => i.count));
    el.innerHTML = items
      .map(({ id, count }, i) => `
        <li>
          <span class="dash-rank-bar" style="width:${Math.max(6, (count / max) * 100)}%;background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
          <span class="dash-rank-id">${escapeHtml(id)}</span>
          <span class="dash-rank-count">${count}</span>
        </li>`)
      .join('');
  };

  const renderStats = (data) => {
    if (data.configured === false) {
      notConfigured.hidden = false;
      cards.hidden = true;
      document.querySelectorAll('[data-dash-panel="stats"] .dash-panel').forEach((p) => { p.hidden = true; });
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

  /* ============================================
     DEMANDES DE DEVIS
     ============================================ */
  const devisList = document.getElementById('dash-devis-list');
  const devisNotConfigured = document.getElementById('dash-devis-not-configured');

  const fmtDate = (iso) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const summarize = (s) => {
    const bits = [];
    if (s.projectType?.length) bits.push(s.projectType.join(', '));
    if (s.company) bits.push(s.company);
    return bits.join(' · ') || 'Projet non précisé';
  };

  const detailLine = (label, value) => (value && (!Array.isArray(value) || value.length)
    ? `<div class="dash-devis-field"><span>${escapeHtml(label)}</span><p>${escapeHtml(Array.isArray(value) ? value.join(', ') : value)}</p></div>`
    : '');

  const renderDevisList = (submissions) => {
    if (!submissions.length) {
      devisList.innerHTML = '<li class="dash-rank-empty">Aucune demande de devis reçue pour le moment.</li>';
      return;
    }
    devisList.innerHTML = submissions.map((s) => `
      <li class="dash-devis-item ${s.replied ? 'is-replied' : ''}" data-id="${escapeHtml(s.id)}">
        <button type="button" class="dash-devis-summary">
          <span class="dash-devis-summary-main">
            <strong>${escapeHtml(s.fullName)}</strong>
            <span class="dash-devis-meta">${escapeHtml(s.email)} · ${fmtDate(s.submittedAt)}</span>
            <span class="dash-devis-tags">${escapeHtml(summarize(s))}</span>
          </span>
          ${s.replied ? '<span class="dash-badge-replied">Répondu ✓</span>' : ''}
          <span class="dash-devis-chevron" aria-hidden="true">⌄</span>
        </button>
        <div class="dash-devis-detail" hidden>
          ${detailLine('Téléphone', s.phone)}
          ${detailLine('Type de projet', s.projectType)}
          ${s.projectTypeOther ? detailLine('Précision', s.projectTypeOther) : ''}
          ${detailLine('Ton / style', s.voiceTone)}
          ${s.voiceToneOther ? detailLine('Précision ton', s.voiceToneOther) : ''}
          ${detailLine('Lien de référence', s.referenceLink)}
          ${detailLine('Plateforme', s.platform)}
          ${detailLine('Zone géographique', s.broadcastZone)}
          ${detailLine("Durée d'exploitation", s.usageDuration)}
          ${detailLine('Durée / mots', s.length)}
          ${detailLine('Type long métrage', s.longFormType)}
          ${detailLine('Script', s.scriptStatus)}
          ${detailLine('Délai souhaité', s.deadline)}
          ${detailLine('Date précise', s.deadlineDate)}
          ${detailLine('Traitement audio', s.audioMix)}
          ${detailLine('Type de mixage', s.mixType)}
          ${detailLine('Format de livraison', s.deliveryFormat)}
          ${detailLine('Message', s.message)}
          ${s.fileNames?.length ? detailLine('Fichiers joints', s.fileNames) : ''}

          ${s.replied
            ? `<div class="dash-devis-replied-box"><strong>Réponse envoyée le ${fmtDate(s.repliedAt)} :</strong><p>${escapeHtml(s.replyMessage)}</p></div>`
            : `<form class="dash-reply-form">
                <textarea name="message" rows="4" placeholder="Votre réponse au client…" required></textarea>
                <button type="submit" class="btn btn-primary btn-sm">Envoyer la réponse</button>
                <p class="dash-form-status"></p>
              </form>`}
        </div>
      </li>
    `).join('');
  };

  const loadDevis = async () => {
    try {
      const res = await apiFetch('/api/dashboard/devis');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erreur');
      const data = await res.json();
      renderDevisList(data.submissions);
    } catch (err) {
      devisNotConfigured.hidden = false;
      devisNotConfigured.textContent = err.message;
    }
  };

  devisList.addEventListener('click', (e) => {
    const summaryBtn = e.target.closest('.dash-devis-summary');
    if (summaryBtn) {
      const detail = summaryBtn.nextElementSibling;
      detail.hidden = !detail.hidden;
      summaryBtn.classList.toggle('is-open', !detail.hidden);
    }
  });

  devisList.addEventListener('submit', async (e) => {
    const form = e.target.closest('.dash-reply-form');
    if (!form) return;
    e.preventDefault();

    const item = e.target.closest('.dash-devis-item');
    const id = item.dataset.id;
    const message = form.message.value.trim();
    const statusEl = form.querySelector('.dash-form-status');
    const btn = form.querySelector('button[type="submit"]');
    if (!message) return;

    btn.disabled = true;
    statusEl.textContent = '';
    try {
      const res = await apiFetch(`/api/dashboard/devis/${encodeURIComponent(id)}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erreur');
      loadDevis();
    } catch (err) {
      statusEl.textContent = err.message;
      btn.disabled = false;
    }
  });

  /* ============================================
     FORMULAIRE DE DEVIS — ÉDITEUR D'OPTIONS
     ============================================ */
  const FIELD_LABELS = {
    projectType: 'Type de projet',
    voiceTone: 'Ton / style de voix',
    platform: 'Plateforme de diffusion',
    broadcastZone: 'Zone géographique',
    usageDuration: "Durée d'exploitation",
    length: 'Durée / nombre de mots',
    longFormType: 'Type (long métrage)',
    mixType: 'Type de traitement audio',
    deliveryFormat: 'Format de livraison',
  };

  const formEditor = document.getElementById('dash-form-editor');

  const renderFormEditor = (config) => {
    formEditor.innerHTML = Object.keys(FIELD_LABELS).map((field) => `
      <div class="dash-panel dash-field-editor" data-field="${field}">
        <h2>${FIELD_LABELS[field]}</h2>
        <ul class="dash-option-list">
          ${(config[field] || []).map((opt) => `
            <li>
              <span>${escapeHtml(opt)}</span>
              <button type="button" class="dash-option-remove" aria-label="Retirer">×</button>
            </li>`).join('')}
        </ul>
        <form class="dash-option-add">
          <input type="text" placeholder="Nouvelle option…" maxlength="80">
          <button type="submit" class="btn btn-outline btn-sm">Ajouter</button>
        </form>
        <p class="dash-form-status"></p>
      </div>
    `).join('');
  };

  const saveField = async (field, options, statusEl) => {
    try {
      const res = await apiFetch(`/api/dashboard/devis-config/${field}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erreur');
      statusEl.textContent = 'Enregistré.';
      statusEl.classList.add('is-success');
      setTimeout(() => { statusEl.textContent = ''; statusEl.classList.remove('is-success'); }, 2000);
      return true;
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.classList.add('is-error');
      return false;
    }
  };

  formEditor.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.dash-option-remove');
    if (!removeBtn) return;
    const editor = removeBtn.closest('.dash-field-editor');
    const field = editor.dataset.field;
    const li = removeBtn.closest('li');

    // Retire par position (pas par texte) au cas où deux options se ressemblent.
    const allLis = Array.from(editor.querySelectorAll('.dash-option-list li'));
    const options = allLis.map((item) => item.querySelector('span').textContent);
    options.splice(allLis.indexOf(li), 1);

    const statusEl = editor.querySelector('.dash-form-status');
    saveField(field, options, statusEl).then((ok) => { if (ok) li.remove(); });
  });

  formEditor.addEventListener('submit', (e) => {
    const addForm = e.target.closest('.dash-option-add');
    if (!addForm) return;
    e.preventDefault();

    const editor = addForm.closest('.dash-field-editor');
    const field = editor.dataset.field;
    const input = addForm.querySelector('input');
    const value = input.value.trim();
    if (!value) return;

    const options = Array.from(editor.querySelectorAll('.dash-option-list li span')).map((s) => s.textContent);
    if (options.includes(value)) { input.value = ''; return; }
    options.push(value);

    const statusEl = editor.querySelector('.dash-form-status');
    saveField(field, options, statusEl).then((ok) => {
      if (ok) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${escapeHtml(value)}</span><button type="button" class="dash-option-remove" aria-label="Retirer">×</button>`;
        editor.querySelector('.dash-option-list').appendChild(li);
        input.value = '';
      }
    });
  });

  const loadFormEditor = async () => {
    try {
      const res = await apiFetch('/api/dashboard/devis');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      renderFormEditor(data.config);
    } catch (err) {
      formEditor.innerHTML = `<p class="dash-not-configured">${escapeHtml(err.message)}</p>`;
    }
  };

  /* ============================================
     PARAMÈTRES — CHANGER LE MOT DE PASSE
     ============================================ */
  const passwordForm = document.getElementById('dash-password-form');
  const passwordStatus = document.getElementById('dash-password-status');

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    passwordStatus.textContent = '';
    passwordStatus.className = 'dash-form-status';

    const currentPassword = passwordForm.currentPassword.value;
    const newPassword = passwordForm.newPassword.value;

    try {
      const res = await apiFetch('/api/dashboard/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erreur');

      currentKey = newPassword;
      sessionStorage.setItem(STORAGE_KEY, newPassword);
      passwordStatus.textContent = 'Mot de passe mis à jour.';
      passwordStatus.classList.add('is-success');
      passwordForm.reset();
    } catch (err) {
      passwordStatus.textContent = err.message;
      passwordStatus.classList.add('is-error');
    }
  });

  /* ============================================
     CONNEXION
     ============================================ */
  const fetchStats = async (key) => {
    const res = await fetch('/api/dashboard', { headers: { 'X-Dashboard-Key': key } });
    if (res.status === 401) throw new Error('Mot de passe incorrect.');
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erreur inattendue.');
    return res.json();
  };

  const tryLogin = async (key, { fromStorage } = {}) => {
    try {
      const data = await fetchStats(key);
      currentKey = key;
      sessionStorage.setItem(STORAGE_KEY, key);
      gate.hidden = true;
      content.hidden = false;
      renderStats(data);
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
    currentKey = '';
    content.hidden = true;
    gate.hidden = false;
    passwordInput.value = '';
    passwordInput.focus();
  });

  const savedKey = sessionStorage.getItem(STORAGE_KEY);
  if (savedKey) tryLogin(savedKey, { fromStorage: true });
})();
