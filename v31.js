/* Estado Maior V31 — efeitos ativos visíveis, score parcial no HUD,
   capítulos no feed, warning de retorno, sons de feedback */
(function () {
  'use strict';

  /* =====================================================
     PARTE 1 — SONS DE FEEDBACK (Web Audio API)
     Beeps curtos para ações importantes.
     Respeita o toggle de som já existente no V15.
  ===================================================== */
  let _soundOn = true;

  function beepV31(freq, dur, type = 'sine', vol = 0.03) {
    if (!_soundOn) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.stop(ctx.currentTime + dur + 0.01);
    } catch (e) {}
  }

  // Sons contextuais
  const SFX = {
    action:   () => beepV31(520, 0.07),
    good:     () => { beepV31(520, 0.07); setTimeout(() => beepV31(660, 0.09), 80); },
    bad:      () => beepV31(200, 0.18, 'sawtooth', 0.02),
    war:      () => { beepV31(180, 0.12, 'sawtooth', 0.025); setTimeout(() => beepV31(140, 0.2, 'sawtooth', 0.02), 100); },
    chapter:  () => { beepV31(440, 0.08); setTimeout(() => beepV31(550, 0.08), 100); setTimeout(() => beepV31(660, 0.12), 200); },
    crisis:   () => { beepV31(280, 0.15, 'square', 0.018); setTimeout(() => beepV31(220, 0.2, 'square', 0.015), 160); },
    victory:  () => { [440,550,660,880].forEach((f,i) => setTimeout(() => beepV31(f, 0.12), i*80)); },
    defeat:   () => { [440,330,220].forEach((f,i) => setTimeout(() => beepV31(f, 0.18, 'sawtooth', 0.02), i*100)); },
    popup:    () => beepV31(380, 0.06),
    objective:() => { beepV31(660, 0.08); setTimeout(() => beepV31(880, 0.12), 90); },
  };

  // Injeta toggle de som no HUD
  function buildSoundToggle() {
    const statRow = document.getElementById('statRow');
    if (!statRow || document.getElementById('soundToggleV31')) return;
    const btn = document.createElement('button');
    btn.id = 'soundToggleV31';
    btn.className = _soundOn ? 'on' : '';
    btn.title = 'Ativar/desativar sons';
    btn.innerHTML = `<span class="stIcon">${_soundOn ? '🔊' : '🔇'}</span>`;
    btn.onclick = () => {
      _soundOn = !_soundOn;
      btn.className = _soundOn ? 'on' : '';
      btn.querySelector('.stIcon').textContent = _soundOn ? '🔊' : '🔇';
      if (_soundOn) SFX.action();
      localStorage.setItem('estadoMaior.v31.sound', _soundOn ? '1' : '0');
    };
    statRow.after(btn);
    _soundOn = localStorage.getItem('estadoMaior.v31.sound') !== '0';
    btn.className = _soundOn ? 'on' : '';
    btn.querySelector('.stIcon').textContent = _soundOn ? '🔊' : '🔇';
  }

  // Hook nos sons dos eventos do jogo
  const _addBulletinV31 = window.addBulletin;
  window.addBulletin = function (ico, titulo, texto, tipo, channel) {
    const r = _addBulletinV31(ico, titulo, texto, tipo, channel);
    if (!window.PLAYER) return r;
    if (tipo === 'war') SFX.war();
    else if (tipo === 'good') SFX.good();
    else if (tipo === 'bad') SFX.bad();
    else if (tipo === 'act') SFX.action();
    return r;
  };

  // Hook no showPopup
  const _showPopupV31 = window.showPopup;
  window.showPopup = function () {
    SFX.popup();
    return _showPopupV31.apply(this, arguments);
  };

  // Hook nos objetivos concluídos (já existem no updateObjectives)
  const _updateObjectivesV31 = window.updateObjectives;
  window.updateObjectives = function () {
    if (!window.PLAYER) return _updateObjectivesV31?.();
    const before = (window.objectives || []).filter(o => o.done).length;
    const r = _updateObjectivesV31?.();
    const after = (window.objectives || []).filter(o => o.done).length;
    if (after > before) SFX.objective();
    return r;
  };

  // Hook no end()
  const _endV31 = window.end;
  window.end = function (t, c, txt) {
    if (t && t.includes('REELEITO')) SFX.victory();
    else if (t) SFX.defeat();
    return _endV31.apply(this, arguments);
  };

  /* =====================================================
     PARTE 2 — BARRA DE EFEITOS ATIVOS
     Mostra pills com cada efeito temporário rodando
     (Propaganda, Educação, Renda Cidadã, Fundo Reserva, etc.)
     com barra de progresso e dias restantes.
  ===================================================== */

  // Metadados dos efeitos (mapeados pelo ID da ação que os criou)
  const EFFECT_META = {
    propag:  { icon: '📺', name: 'Propaganda', type: 'cost',  total: 110 },
    educacao:{ icon: '🎓', name: 'Educação',   type: 'good',  total: 240 },
    reserva: { icon: '🏦', name: 'Fundo Reserva', type: 'good', total: 150 },
    renda:   { icon: '💳', name: 'Renda Cidadã', type: 'cost', total: 180 },
    reserve: { icon: '💹', name: 'Reserva cambial', type: 'good', total: 180 },
    fund:    { icon: '💰', name: 'Fundo soberano', type: 'good', total: 300 },
  };

  // Rastreia efeitos com metadados enriquecidos
  const trackedEffects = [];

  function buildEffectsPanel() {
    if (document.getElementById('activeEffectsV31')) return;
    const el = document.createElement('div');
    el.id = 'activeEffectsV31';
    document.body.appendChild(el);
  }

  function renderEffectsPanel() {
    const el = document.getElementById('activeEffectsV31');
    if (!el || !window.PLAYER) return;

    // Sincroniza com window.efeitos
    const rawEffects = window.efeitos || [];

    // Atualiza dias dos tracked a partir dos raw
    trackedEffects.forEach(te => {
      const raw = rawEffects[te.rawIndex];
      if (raw) te.diasLeft = raw.dias;
    });

    // Remove os que já acabaram
    trackedEffects.splice(0, trackedEffects.length,
      ...trackedEffects.filter(te => te.diasLeft > 0));

    if (!trackedEffects.length) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = trackedEffects.slice(0, 4).map(te => {
      const pct = Math.round((te.diasLeft / te.total) * 100);
      return `<div class="effectPillV31 ${te.type}">
        <span class="epIcon">${te.icon}</span>
        <span class="epName">${te.name}</span>
        <div class="epBar"><div class="epFill" style="width:${pct}%"></div></div>
        <span class="epDays">${te.diasLeft}d</span>
      </div>`;
    }).join('');
  }

  // Intercepta executeAction para capturar efeitos com metadados
  const _executeV31 = window.executeAction;
  window.executeAction = function (a) {
    const effectsBefore = (window.efeitos || []).length;
    const r = _executeV31.apply(this, arguments);
    const effectsAfter = (window.efeitos || []).length;
    // Se novos efeitos foram adicionados, rastreia com metadados
    if (effectsAfter > effectsBefore) {
      const meta = EFFECT_META[a.id] || { icon: a.ico, name: a.t, type: 'good', total: a.cd || 90 };
      for (let i = effectsBefore; i < effectsAfter; i++) {
        trackedEffects.push({
          rawIndex: i,
          icon: meta.icon,
          name: meta.name,
          type: meta.type,
          total: meta.total,
          diasLeft: (window.efeitos || [])[i]?.dias || meta.total,
        });
      }
    }
    return r;
  };

  // Intercepta useTreasury para capturar efeitos do tesouro
  const _useTreasuryV31 = window.useTreasury;
  window.useTreasury = function (type) {
    const effectsBefore = (window.efeitos || []).length;
    const r = _useTreasuryV31?.apply(this, arguments);
    const effectsAfter = (window.efeitos || []).length;
    if (effectsAfter > effectsBefore) {
      const meta = EFFECT_META[type] || { icon: '💰', name: type, type: 'good', total: 180 };
      for (let i = effectsBefore; i < effectsAfter; i++) {
        trackedEffects.push({
          rawIndex: i,
          icon: meta.icon,
          name: meta.name,
          type: meta.type,
          total: meta.total,
          diasLeft: (window.efeitos || [])[i]?.dias || meta.total,
        });
      }
    }
    return r;
  };

  /* =====================================================
     PARTE 3 — SCORE PARCIAL VISÍVEL NO HUD
     Calcula o legado atual em tempo real e mostra
     no topBar com tooltip detalhado.
  ===================================================== */

  const LEGACY_TIERS = [
    { min: 88, label: 'Arquiteto de uma nova era', color: '#fbbf24' },
    { min: 72, label: 'Estadista de grande legado', color: '#a78bfa' },
    { min: 56, label: 'Governo sólido', color: '#34d399' },
    { min: 40, label: 'Sobrevivente político', color: '#60a5fa' },
    { min: 25, label: 'Mandato apagado', color: '#9ca3af' },
    { min:  0, label: 'Mandato que virou advertência', color: '#fb4b64' },
  ];

  function calcLiveScore() {
    if (!window.PLAYER) return { score: 0, tier: LEGACY_TIERS[4], breakdown: [] };
    const n = window.PLAYER;
    const growth = (n.pib / (n.pib0 || n.pib) - 1) * 100;
    const debt = n.divida / n.pib * 100;
    const parts = [
      { label: 'Aprovação',    val: Math.round(n.aprovacao * 0.22) },
      { label: 'Estabilidade', val: Math.round(n.estabilidade * 0.18) },
      { label: 'Legitimidade', val: Math.round(n.legitimidade * 0.16) },
      { label: 'Saúde',        val: Math.round(n.saude * 0.09) },
      { label: 'Ciência',      val: Math.round(n.ciencia * 0.09) },
      { label: 'Diplomacia',   val: Math.round(n.diplo * 0.08) },
      { label: 'PIB',          val: Math.round(Math.max(-20, Math.min(30, growth)) * 1.2) },
      { label: 'Alianças',     val: (n.aliados || []).length * 2 + (n.acordos || []).length },
    ];
    const score = Math.round(parts.reduce((s, p) => s + p.val, 0) - Math.max(0, debt - 70) * 0.12);
    const tier = LEGACY_TIERS.find(t => score >= t.min) || LEGACY_TIERS[LEGACY_TIERS.length - 1];
    return { score, tier, breakdown: parts };
  }

  function buildLegacyGauge() {
    const statRow = document.getElementById('statRow');
    if (!statRow || document.getElementById('legacyGaugeV31')) return;
    const el = document.createElement('div');
    el.id = 'legacyGaugeV31';
    el.title = 'Legado atual — pontuação em tempo real';
    el.innerHTML = `
      <span class="lgIcon">📜</span>
      <div>
        <span class="lgLabel">LEGADO</span>
        <span class="lgName" id="lgNameV31">—</span>
      </div>
      <span class="lgVal" id="lgValV31">—</span>
      <div class="lgTooltipV31" id="lgTooltipV31">
        <b>PONTUAÇÃO ATUAL</b>
        <div id="lgBreakdownV31"></div>
      </div>
    `;
    statRow.appendChild(el);
  }

  function updateLegacyGauge() {
    const valEl = document.getElementById('lgValV31');
    const nameEl = document.getElementById('lgNameV31');
    const breakdownEl = document.getElementById('lgBreakdownV31');
    if (!valEl || !window.PLAYER) return;

    const { score, tier, breakdown } = calcLiveScore();
    valEl.textContent = score;
    valEl.style.color = tier.color;
    nameEl.textContent = tier.label;
    nameEl.style.color = tier.color;

    if (breakdownEl) {
      breakdownEl.innerHTML = breakdown.map(p =>
        `<div class="lgTRow"><div>${p.label}</div><span>${p.val > 0 ? '+' : ''}${p.val}</span></div>`
      ).join('');
    }
  }

  /* =====================================================
     PARTE 4 — CAPÍTULOS NO FEED (post especial permanente)
     Intercepta showChapter() para também criar um post
     especial no feed que não some em 6 segundos.
  ===================================================== */

  const _showChapterV31 = window.showChapter;
  window.showChapter = function (ch) {
    const r = _showChapterV31.apply(this, arguments);
    SFX.chapter();

    // Cria post especial no feed
    const bulletin = document.getElementById('bulletin');
    if (!bulletin) return r;

    const el = document.createElement('article');
    el.className = 'bitem ai-event chapter-v31';
    el.dataset.channel = 'general';

    // Se o feed estiver em "results", esconde temporariamente
    if (window.activeFeed && window.activeFeed !== 'general') {
      el.classList.add('feed-hidden');
    }

    el.innerHTML = `
      <div class="bico">📖</div>
      <div class="btxt">
        <div>
          <strong>${ch.title}</strong>
          <span class="verified">✓</span>
          <span class="bhandle">@mandato_histórico</span>
        </div>
        <span class="bcopy">${ch.text}</span>
        <span class="btime">Dia ${window.dia || 0} · Marco do mandato</span>
        <span class="chapterTagV31">${ch.k}</span>
      </div>
    `;

    bulletin.insertBefore(el, bulletin.firstChild);
    return r;
  };

  /* =====================================================
     PARTE 5 — WARNING DE RETORNO DECRESCENTE NO CARD
     Mostra badge "2ª vez · −bônus" antes de clicar,
     e "3ª+ vez · PENALIDADE" quando já repetiu demais.
  ===================================================== */

  function getRepeatWarning(a) {
    if (!window.PLAYER || !window.actionHistory) return null;
    const hist = window.actionHistory[a.id];
    if (!hist || hist.count < 1) return null;

    const daysSinceLast = (window.dia || 0) - (hist.last || 0);
    if (daysSinceLast >= 180) return null; // cooldown já passou, sem penalidade

    if (hist.count >= 3) {
      return { text: `${hist.count}ª vez · PENALIDADE`, cls: 'danger' };
    }
    if (hist.count >= 2) {
      return { text: `${hist.count}ª vez · −bônus`, cls: '' };
    }
    if (hist.count >= 1) {
      return { text: `2ª uso · custo sobe`, cls: '' };
    }
    return null;
  }

  function injectRepeatWarnings() {
    if (!window.PLAYER || !window.ACOES) return;
    document.querySelectorAll('#actionRow .acard[data-a]').forEach(card => {
      // Remove warning anterior para recalcular
      card.querySelector('.repeatWarnV31')?.remove();

      const a = window.ACOES.find(x => x.id === card.dataset.a);
      if (!a) return;

      const warn = getRepeatWarning(a);
      if (!warn) return;

      const badge = document.createElement('span');
      badge.className = `repeatWarnV31 ${warn.cls}`;
      badge.textContent = `⚠ ${warn.text}`;

      // Insere após o badge de chance do v30 (se existir) ou após actionVote
      const after = card.querySelector('.apvVoteBadgeV30') || card.querySelector('.actionVote');
      if (after) after.after(badge);
      else card.appendChild(badge);
    });
  }

  /* =====================================================
     PARTE 6 — HOOKS NO REFRESH E TICK
  ===================================================== */

  const _refreshV31 = window.refresh;
  window.refresh = function () {
    const r = _refreshV31.apply(this, arguments);
    setTimeout(() => {
      updateLegacyGauge();
      renderEffectsPanel();
      injectRepeatWarnings();
    }, 40);
    return r;
  };

  const _tickV31 = window.tick;
  window.tick = function (dt) {
    const r = _tickV31.apply(this, arguments);
    if (window.PLAYER && window.dia % 5 === 0) {
      updateLegacyGauge();
      renderEffectsPanel();
    }
    return r;
  };

  /* =====================================================
     PARTE 7 — INIT
  ===================================================== */

  function init() {
    buildEffectsPanel();
    buildSoundToggle();
    buildLegacyGauge();
    setTimeout(() => {
      updateLegacyGauge();
      renderEffectsPanel();
      injectRepeatWarnings();
    }, 600);
  }

  init();

  // Atualiza periodicamente mesmo sem tick
  setInterval(() => {
    if (window.PLAYER) {
      updateLegacyGauge();
      renderEffectsPanel();
    }
  }, 5000);

  window.EMV31 = { calcLiveScore, renderEffectsPanel, updateLegacyGauge, SFX };
})();
