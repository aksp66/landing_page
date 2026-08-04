(() => {
  'use strict';

  /* ============================================
     NAV MOBILE
     ============================================ */
  const navToggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('primary-nav');

  if (navToggle && nav) {
    const closeNav = () => {
      nav.hidden = true;
      navToggle.setAttribute('aria-expanded', 'false');
    };
    const isDesktop = () => window.matchMedia('(min-width: 860px)').matches;
    if (!isDesktop()) nav.hidden = true;

    navToggle.addEventListener('click', () => {
      const open = nav.hidden;
      nav.hidden = !open;
      navToggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => { if (!isDesktop()) closeNav(); });
    });
    window.addEventListener('resize', () => {
      if (isDesktop()) { nav.hidden = false; navToggle.setAttribute('aria-expanded', 'false'); }
      else if (navToggle.getAttribute('aria-expanded') !== 'true') { nav.hidden = true; }
    });
  }

  /* ============================================
     DÉMOS AUDIO — FILTRES PAR ONGLET
     (scopé à #demos : la galerie vidéo a ses propres
     onglets .tab plus bas, il ne faut pas les mélanger)
     ============================================ */
  const demosSection = document.getElementById('demos');
  const players = demosSection ? demosSection.querySelectorAll('.player') : [];

  if (demosSection) {
    const demoTabs = demosSection.querySelectorAll('.tabs .tab');
    demoTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        demoTabs.forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');

        const filter = tab.dataset.filter;
        players.forEach((player) => {
          player.hidden = !(filter === 'all' || player.dataset.category === filter);
        });
      });
    });
  }

  /* ============================================
     LECTEURS AUDIO PERSONNALISÉS
     ============================================ */
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  let currentlyPlaying = null;

  players.forEach((player) => {
    const audio = player.querySelector('audio');
    const toggle = player.querySelector('.player-toggle');
    const iconPlay = player.querySelector('.icon-play');
    const iconPause = player.querySelector('.icon-pause');
    const fill = player.querySelector('.player-progress-fill');
    const timeLabel = player.querySelector('.player-time');
    if (!audio || !toggle) return;

    const setPlayingState = (isPlaying) => {
      player.classList.toggle('is-playing', isPlaying);
      // SVG elements don't reflect the `hidden` IDL property like HTML elements do,
      // so toggle the attribute directly instead of `iconPlay.hidden = ...`.
      iconPlay.toggleAttribute('hidden', isPlaying);
      iconPause.toggleAttribute('hidden', !isPlaying);
    };

    const pause = () => { audio.pause(); setPlayingState(false); };

    toggle.addEventListener('click', () => {
      if (audio.paused) {
        if (currentlyPlaying && currentlyPlaying !== audio) {
          currentlyPlaying.pause();
        }
        audio.play().catch(() => {
          timeLabel.textContent = 'Indisponible';
          toggle.disabled = true;
        });
        currentlyPlaying = audio;
      } else {
        pause();
        currentlyPlaying = null;
      }
    });

    audio.addEventListener('play', () => setPlayingState(true));
    audio.addEventListener('pause', () => setPlayingState(false));
    audio.addEventListener('ended', () => { setPlayingState(false); fill.style.width = '0%'; currentlyPlaying = null; });

    audio.addEventListener('loadedmetadata', () => {
      timeLabel.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    });
    audio.addEventListener('timeupdate', () => {
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      fill.style.width = `${pct}%`;
      timeLabel.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    });
    audio.addEventListener('error', () => {
      timeLabel.textContent = 'Démo à venir';
      toggle.disabled = true;
      toggle.style.opacity = '0.5';
      toggle.style.cursor = 'not-allowed';
    });
  });

  /* ============================================
     GALERIE VIDÉO — FILTRES + AFFICHAGE PROGRESSIF
     ============================================ */
  const videoSection = document.getElementById('videos');
  if (videoSection) {
    const cards = Array.from(videoSection.querySelectorAll('.video-card'));
    const videoTabs = videoSection.querySelectorAll('.tabs .tab');
    const showMoreBtn = videoSection.querySelector('#video-show-more');
    const REVEAL_STEP = 6;
    let currentFilter = 'all';
    let expanded = false;

    const applyVisibility = () => {
      const matches = cards.filter((c) => currentFilter === 'all' || c.dataset.category === currentFilter);
      cards.forEach((card) => { card.hidden = !matches.includes(card); });

      const capApplies = currentFilter === 'all' && !expanded && matches.length > REVEAL_STEP;
      if (capApplies) {
        matches.forEach((card, i) => { if (i >= REVEAL_STEP) card.hidden = true; });
      }
      if (showMoreBtn) showMoreBtn.hidden = !capApplies;
    };

    videoTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        videoTabs.forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');
        currentFilter = tab.dataset.filter;
        expanded = false;
        applyVisibility();
      });
    });

    if (showMoreBtn) {
      showMoreBtn.addEventListener('click', () => {
        expanded = true;
        applyVisibility();
      });
    }

    applyVisibility();
  }

  /* ============================================
     GALERIE VIDÉO — LIGHTBOX SIMPLE
     ============================================ */
  const videoLinks = document.querySelectorAll('[data-video]');
  if (videoLinks.length) {
    const overlay = document.createElement('div');
    overlay.className = 'video-lightbox';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="video-lightbox-inner">
        <button class="video-lightbox-close" type="button" aria-label="Fermer la vidéo">
          <svg class="icon"><use href="#icon-x"/></svg>
        </button>
        <video controls playsinline></video>
        <p class="video-lightbox-error" hidden>Cette vidéo sera bientôt disponible.</p>
      </div>`;
    document.body.appendChild(overlay);

    const videoEl = overlay.querySelector('video');
    const errorEl = overlay.querySelector('.video-lightbox-error');
    const closeBtn = overlay.querySelector('.video-lightbox-close');

    const closeLightbox = () => {
      overlay.hidden = true;
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.hidden = false;
      errorEl.hidden = true;
    };

    videoLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        overlay.hidden = false;
        videoEl.hidden = false;
        errorEl.hidden = true;
        videoEl.src = link.getAttribute('href');
        videoEl.play().catch(() => {});
      });
    });

    videoEl.addEventListener('error', () => {
      videoEl.hidden = true;
      errorEl.hidden = false;
    });

    closeBtn.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLightbox(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) closeLightbox(); });
  }

  /* ============================================
     FORMULAIRE DE CONTACT
     ============================================ */
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const submitBtn = document.getElementById('contact-submit');

  if (form && status && submitBtn) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      status.className = 'form-status';

      const data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        message: form.message.value.trim(),
        website: form.website.value.trim(),
      };

      if (!data.name || !data.email || !data.message) {
        status.textContent = 'Merci de remplir tous les champs obligatoires.';
        status.classList.add('is-error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours…';

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(result.error || 'Une erreur est survenue.');

        status.textContent = 'Votre demande a bien été envoyée. Réponse sous 24h !';
        status.classList.add('is-success');
        form.reset();
      } catch (err) {
        status.textContent = err.message || 'Impossible d\'envoyer le message pour le moment.';
        status.classList.add('is-error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Envoyer ma demande';
      }
    });
  }
})();
