/* Estado Maior V30 — preview de ação no hover, alerta doom, chance de votação no card */
(function () {
  'use strict';

  /* ===================================================
     PARTE 1 — PREVIEW DE AÇÃO + CHANCE NO CARD
     Injeta tooltip com efeitos e badge de % no hover
     em cada card de ação.
  =================================================== */

  function fmtEffect (key, val) {
    const labels = {
      aprovacao: 'Aprovação', estabilidade: 'Estabilidade',
      legitimidade: 'Legitimidade', saude: 'Saúde',
      ciencia: 'Ciência', diplo: 'Diplomacia', mil: 'Defesa'
    };
    const label = labels[key] || key;
    const sign = val > 0 ? '+' : '';
    const cls = val > 0 ? 'up' : 'dn';
    return `<div class="apvRowV30"><span>${label}</span><b class="${cls}">${sign}${val > 0 ? Math.abs(val) : val}</b></div>`;
  }

  function buildPreviewHTML (a) {
    if (!window.PLAYER) return '';

    // Efeitos da ação
    const rows = [];
    const n = PLAYER;
    const freeSci = n._freeSci && (a.id === 'ciencia' || a.id === 'saude');
    const cpCost = freeSci ? 0 : (typeof cpCusto === 'function' ? cpCusto(a) : a.cp);
    const cost = typeof actionCost === 'function' ? actionCost(a) : a.c * n.pib;

    // Simula o go() para extrair efeitos sem aplicar
    const snap = {
      aprovacao: n.aprovacao, estabilidade: n.estabilidade,
      legitimidade: n.legitimidade, saude: n.saude,
      ciencia: n.ciencia, diplo: n.diplo, mil: n.mil
    };
    const fake = Object.assign({}, n);
    try { a.go(fake); } catch (e) {}

    const effectKeys = ['aprovacao', 'estabilidade', 'legitimidade', 'saude', 'ciencia', 'diplo', 'mil'];
    effectKeys.forEach(k => {
      const delta = Math.round((fake[k] || 0) - (snap[k] || 0));
      if (Math.abs(delta) >= 1) rows.push(fmtEffect(k, delta));
    });

    // PIB delta (multipliers)
    if (fake.pib && n.pib) {
      const pibDelta = ((fake.pib / n.pib) - 1) * 100;
      if (Math.abs(pibDelta) >= 0.1) {
        const cls = pibDelta > 0 ? 'up' : 'dn';
        rows.push(`<div class="apvRowV30"><span>PIB</span><b class="${cls}">${pibDelta > 0 ? '+' : ''}${pibDelta.toFixed(1)}%</b></div>`);
      }
    }

    // Custo monetário
    const costLabel = cost < 0
      ? `<div class="apvRowV30"><span>Receita</span><b class="up">+${typeof money === 'function' ? money(Math.abs(cost)) : Math.abs(cost)}</b></div>`
      : cost > 0
        ? `<div class="apvRowV30"><span>Custo</span><b class="dn">−${typeof money === 'function' ? money(cost) : cost}</b></div>`
        : '';

    // Chance de votação (só para legislativas)
    let chanceHTML = '';
    if (a.legislative && typeof voteForecast === 'function') {
      try {
        const f = voteForecast(a);
        const pct = f.chance;
        const tier = pct >= 65 ? 'high' : pct <= 40 ? 'low' : '';
        chanceHTML = `<div class="apvChanceV30 ${tier}">
          <span>CHANCE CONGRESSO</span>
          <b>${pct}%</b>
        </div>`;
      } catch (e) {}
    }

    return `
      <span class="apvTitleV30">${a.ico} ${a.t}</span>
      ${costLabel}
      ${rows.join('')}
      ${chanceHTML}
    `;
  }

  function buildVoteBadge (a) {
    if (!a.legislative || !window.PLAYER || typeof voteForecast !== 'function') return '';
    try {
      const f = voteForecast(a);
      const pct = f.chance;
      const tier = pct >= 65 ? 'high' : pct <= 40 ? 'low' : '';
      return `<span class="apvVoteBadgeV30 ${tier}">🏛 ${pct}%</span>`;
    } catch (e) { return ''; }
  }

  // Injeta previews nos cards após cada refresh
  function injectActionPreviews () {
    if (!window.PLAYER) return;
    document.querySelectorAll('#actionRow .acard[data-a]').forEach(card => {
      if (card.querySelector('.acardPreviewV30')) return; // já tem
      const id = card.dataset.a;
      const a = (window.ACOES || []).find(x => x.id === id);
      if (!a) return;

      // Tooltip preview
      const tip = document.createElement('div');
      tip.className = 'acardPreviewV30';
      tip.innerHTML = buildPreviewHTML(a);
      card.appendChild(tip);

      // Badge de chance (só legislativas)
      if (a.legislative) {
        const badge = document.createElement('span');
        badge.className = 'apvVoteBadgeV30';
        badge.innerHTML = buildVoteBadge(a).replace(/<span[^>]*>|<\/span>/g, '');
        // pega o texto do badge sem o wrapper
        try {
          const tmp = document.createElement('div');
          tmp.innerHTML = buildVoteBadge(a);
          const inner = tmp.querySelector('.apvVoteBadgeV30');
          if (inner) {
            badge.className = inner.className;
            badge.textContent = inner.textContent;
          }
        } catch (e) {}
        // Insere após a .actionVote existente
        const vote = card.querySelector('.actionVote');
        if (vote) vote.after(badge);
        else card.appendChild(badge);
      }
    });
  }

  /* ===================================================
     PARTE 2 — ALERTA DOOM CRESCENTE
     Borda vermelha na tela + banner quando doom sobe.
     3 níveis: warn (50%), danger (70%), critical (85%)
  =================================================== */

  let doomAlertEl = null;
  let doomBannerEl = null;
  let lastDoomLevel = '';
  let bannerTimer = null;

  function buildDoomAlert () {
    if (document.getElementById('doomAlertV30')) return;

    doomAlertEl = document.createElement('div');
    doomAlertEl.id = 'doomAlertV30';
    document.body.appendChild(doomAlertEl);

    doomBannerEl = document.createElement('div');
    doomBannerEl.id = 'doomBannerV30';
    doomBannerEl.innerHTML = `<span class="doomBannerDotV30"></span><span id="doomBannerTextV30">RISCO DE COLAPSO GLOBAL</span>`;
    document.body.appendChild(doomBannerEl);
  }

  function updateDoomAlert () {
    if (!doomAlertEl || !window.PLAYER) return;
    const doom = window.EMCrisis?.worldDoom?.() || 0;

    let level = '';
    let bannerMsg = '';

    if (doom >= 85) {
      level = 'critical';
      bannerMsg = `⚠️ COLAPSO IMINENTE — ${Math.round(doom)}% — INTERVENHA AGORA`;
    } else if (doom >= 70) {
      level = 'danger';
      bannerMsg = `🔴 RISCO CRÍTICO — ${Math.round(doom)}% — Crises sem controle`;
    } else if (doom >= 50) {
      level = 'warn';
      bannerMsg = `🟡 RISCO ELEVADO — ${Math.round(doom)}% — Monitore as crises`;
    }

    // Atualiza borda
    doomAlertEl.className = level ? level : '';

    // Banner: só mostra quando sobe de nível
    if (level && level !== lastDoomLevel) {
      const textEl = document.getElementById('doomBannerTextV30');
      if (textEl) textEl.textContent = bannerMsg;
      doomBannerEl.classList.add('on');
      clearTimeout(bannerTimer);
      // Banner crítico fica mais tempo
      const duration = level === 'critical' ? 8000 : level === 'danger' ? 5000 : 3500;
      bannerTimer = setTimeout(() => doomBannerEl.classList.remove('on'), duration);
    }

    lastDoomLevel = level;
  }

  /* ===================================================
     PARTE 3 — HOOK NO REFRESH
     Injeta previews e atualiza doom após cada render.
  =================================================== */

  const _refreshV30 = window.refresh;
  window.refresh = function () {
    const r = _refreshV30 ? _refreshV30(...arguments) : undefined;
    // Pequeno delay para o DOM terminar de renderizar os cards
    setTimeout(() => {
      injectActionPreviews();
      updateDoomAlert();
    }, 30);
    return r;
  };

  // Também atualiza doom no tick (sem esperar refresh)
  const _tickV30 = window.tick;
  window.tick = function (dt) {
    const r = _tickV30 ? _tickV30(dt) : undefined;
    if (window.PLAYER && window.dia % 3 === 0) {
      updateDoomAlert();
    }
    return r;
  };

  /* ===================================================
     INIT
  =================================================== */
  buildDoomAlert();

  // Injeta nos cards que já existem (se refresh já rodou)
  setTimeout(() => {
    injectActionPreviews();
    updateDoomAlert();
  }, 800);

  window.EMV30 = { injectActionPreviews, updateDoomAlert };
})();

/* ===================================================
   PARTE EXTRA — Sincroniza popup-open no body
   para esconder o actionResultV28 quando popup abre
=================================================== */
(function () {
  const popup = document.getElementById('popup');
  if (!popup) return;
  const obs = new MutationObserver(() => {
    document.body.classList.toggle('popup-open', popup.classList.contains('on'));
  });
  obs.observe(popup, { attributes: true, attributeFilter: ['class'] });
})();
