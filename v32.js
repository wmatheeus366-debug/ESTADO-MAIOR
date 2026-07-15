/* Estado Maior V32 — arcos de mísseis entre países em guerra, marcador de doença
   com nome, países podem te atacar com decisão de resposta */
(function () {
  'use strict';

  /* =====================================================
     PARTE 1 — TICKER DE GUERRAS + ARCOS DE MÍSSEIS
     Mostra um pill por conflito ativo (EMStrategy +
     EMCrisis militares) com bandeiras, nome e intensidade.
     Ao clicar foca o globo no conflito.
     Também injeta arcos de mísseis entre os países.
  ===================================================== */

  function buildWarTicker() {
    if (document.getElementById('warTickerV32')) return;
    const el = document.createElement('div');
    el.id = 'warTickerV32';
    document.body.appendChild(el);
  }

  function getAllActiveWars() {
    const pairs = [];
    const seen = new Set();

    const add = (aNome, bNome, title, intensity) => {
      const key = [aNome, bNome].sort().join('|');
      if (seen.has(key)) return;
      seen.add(key);
      const a = window.NATIONS?.find(n => n.nome === aNome);
      const b = window.NATIONS?.find(n => n.nome === bNome);
      if (!a || !b) return;
      pairs.push({ a, b, title, intensity, key });
    };

    // Conflitos do EMStrategy (Rússia×Ucrânia, EUA×Irã, etc.)
    (window.EMStrategy?.conflicts || [])
      .filter(c => c.intensity >= 45)
      .forEach(c => add(c.a, c.b, c.name, c.intensity));

    // Crises militares do EMCrisis
    (window.EMCrisis?.crises || [])
      .filter(c => !c.contained && c.kind === 'military' && c.nations.length >= 2)
      .forEach(c => add(c.nations[0], c.nations[1], c.title, c.intensity));

    // Guerra do próprio jogador
    if (window.PLAYER?.emGuerra && window.PLAYER.warTarget) {
      add(PLAYER.nome, PLAYER.warTarget.nome,
        `${PLAYER.nome} × ${PLAYER.warTarget.nome}`, 90);
    }

    return pairs;
  }

  function renderWarTicker() {
    const el = document.getElementById('warTickerV32');
    if (!el || !window.PLAYER) return;

    const wars = getAllActiveWars();
    if (!wars.length) { el.innerHTML = ''; return; }

    const flag = n => window.FLAGS?.[n.nome] || '🌐';

    el.innerHTML = wars.slice(0, 3).map(w => `
      <div class="warPairV32" data-war-a="${w.a.nome}" data-war-b="${w.b.nome}"
           title="Clique para ver no globo">
        <span class="wpDot"></span>
        <span class="wpFlags">${flag(w.a)} ⚔ ${flag(w.b)}</span>
        <span class="wpMissile">🚀</span>
        <span class="wpLabel">${w.title}</span>
        <span class="wpIntensity">${Math.round(w.intensity)}%</span>
      </div>
    `).join('');

    el.querySelectorAll('.warPairV32').forEach(pill => {
      pill.onclick = () => {
        const a = window.NATIONS?.find(n => n.nome === pill.dataset.warA);
        const b = window.NATIONS?.find(n => n.nome === pill.dataset.warB);
        if (a && window.focusNation) focusNation(a, 1.4);
      };
    });
  }

  // Arcos de mísseis para cada guerra ativa (além do arco do jogador)
  function injectWarArcs() {
    if (!window.PLAYER || !window.ambientArcs) return;

    // Remove arcos de guerra anteriores do v32
    window.ambientArcs = window.ambientArcs.filter(a => !a._v32war);

    const wars = getAllActiveWars().filter(w => {
      // Não duplica o arco do jogador (já gerenciado pelo drawWarArc)
      return !(w.a === window.PLAYER || w.b === window.PLAYER);
    });

    wars.slice(0, 4).forEach(w => {
      // Arco de ida
      window.ambientArcs.push({
        startLat: w.a.lat, startLng: w.a.lng,
        endLat: w.b.lat, endLng: w.b.lng,
        colors: ['rgba(251,75,100,.06)', '#fb4b64'],
        altitude: 0.22, stroke: 0.28,
        dashLength: 0.14, dashGap: 0.1,
        animate: 1100,
        _v32war: true,
        _until: Date.now() + 8000,
      });
      // Arco de volta (menor)
      window.ambientArcs.push({
        startLat: w.b.lat, startLng: w.b.lng,
        endLat: w.a.lat, endLng: w.a.lng,
        colors: ['rgba(251,75,100,.04)', 'rgba(251,75,100,.5)'],
        altitude: 0.16, stroke: 0.14,
        dashLength: 0.08, dashGap: 0.14,
        animate: 1600,
        _v32war: true,
        _until: Date.now() + 8000,
      });
    });

    // Limpa expirados
    window.ambientArcs = window.ambientArcs.filter(
      a => !a._until || a._until > Date.now()
    );

    if (window.queueGlobeRefresh) queueGlobeRefresh();
  }

  /* =====================================================
     PARTE 2 — MARCADOR DE DOENÇA MELHORADO
     Crises de doença ganham um marcador verde pulsante
     com o nome da doença e intensidade, substituindo
     o ☣️ genérico.
  ===================================================== */

  // Nomes de doenças gerados dinamicamente a partir do título da crise
  function diseaseDisplayName(crisis) {
    if (crisis.title && crisis.title !== 'Pandemia regional') return crisis.title;
    const names = [
      'Vírus XB-7', 'Febre Hemorrágica', 'Síndrome Respiratória', 'Gripe H5N2',
      'Meningite Regional', 'Encefalite Viral', 'Coronavírus Delta-3',
      'Hepatite-X', 'Febre Amarela Mutante', 'Praguejamento Sistêmico'
    ];
    // Usa o ID da crise como seed para nome consistente
    const seed = parseInt(crisis.id.replace(/\D/g, '').slice(-4)) || 0;
    return names[seed % names.length];
  }

  // Cria elemento HTML para marcador de doença
  function createDiseaseMarker(crisis, nationName) {
    const nation = window.NATIONS?.find(n => n.nome === nationName);
    if (!nation) return null;

    const name = diseaseDisplayName(crisis);
    const intensity = Math.round(crisis.intensity);

    const el = document.createElement('div');
    el.className = 'diseaseMarkerV32';
    el.title = `${name} em ${nationName} — clique para intervir`;
    el.innerHTML = `
      <div class="dmBubble">
        <span class="dmIcon">☣️</span>
        <div>
          <span class="dmName">${name}</span>
          <span class="dmIntensity">${nationName} · ${intensity}% intensidade</span>
        </div>
      </div>
    `;
    el.onclick = e => {
      e.stopPropagation();
      if (window.focusNation) focusNation(nation, 1.4);
      if (window.EMCrisis?.crisisIntervention) {
        setTimeout(() => EMCrisis.crisisIntervention(crisis), 300);
      }
    };
    return el;
  }

  // Injeta marcadores de doença como HTML elements no globo
  function syncDiseaseMarkers() {
    if (!window.PLAYER || !window.mobileUnits) return;

    // Remove marcadores de doença anteriores do v32
    window.mobileUnits = window.mobileUnits.filter(u => !u._v32disease);

    const diseaseCrises = (window.EMCrisis?.crises || [])
      .filter(c => !c.contained && c.kind === 'disease');

    diseaseCrises.forEach(crisis => {
      crisis.nations.slice(0, 3).forEach((name, i) => {
        const nation = window.NATIONS?.find(n => n.nome === name);
        if (!nation) return;

        const diseaseName = diseaseDisplayName(crisis);

        // Adiciona como unidade HTML no globo (similar aos event-points)
        const markerId = `v32disease:${crisis.id}:${name}`;
        if (window.mobileUnits.some(u => u.markerId === markerId)) return;

        window.mobileUnits.push({
          scope: 'v32disease',
          crisisId: crisis.id,
          markerId,
          kind: 'v32disease',
          stationary: true,
          color: '#84cc16',
          severity: crisis.intensity,
          diseaseName,
          nationName: name,
          crisis,
          label: `${diseaseName} em ${name} — ${Math.round(crisis.intensity)}% intensidade`,
          lat: nation.lat + Math.sin(i * 2.1) * 0.5,
          lng: nation.lng + Math.cos(i * 2.1) * 0.5,
          alt: 0.046,
          _v32disease: true,
        });
      });
    });

    if (window.queueGlobeRefresh) queueGlobeRefresh();
  }

  // Hook no createGlobeMarker para renderizar marcadores de doença
  const _createGlobeMarkerV32 = window.createGlobeMarker;
  window.createGlobeMarker = function (d) {
    if (d?.kind === 'v32disease') {
      const el = document.createElement('div');
      el.className = 'diseaseMarkerV32';
      el.title = d.label;
      el.innerHTML = `
        <div class="dmBubble">
          <span class="dmIcon">☣️</span>
          <div>
            <span class="dmName">${d.diseaseName}</span>
            <span class="dmIntensity">${d.nationName} · ${Math.round(d.severity)}%</span>
          </div>
        </div>
      `;
      el.onclick = e => {
        e.stopPropagation();
        const nation = window.NATIONS?.find(n => n.nome === d.nationName);
        if (nation && window.focusNation) focusNation(nation, 1.4);
        if (d.crisis && window.EMCrisis?.crisisIntervention) {
          setTimeout(() => EMCrisis.crisisIntervention(d.crisis), 300);
        }
      };
      d._el = el;
      return el;
    }
    return _createGlobeMarkerV32.apply(this, arguments);
  };

  /* =====================================================
     PARTE 3 — PAÍSES PODEM TE ATACAR
     A cada 60-90 dias, um país hostil ou com relação
     negativa pode iniciar um ataque ao jogador,
     apresentando um popup de decisão de resposta.
  ===================================================== */

  let lastAttackDay = -999;
  let attackInProgress = false;

  function buildAttackAlert() {
    if (document.getElementById('attackAlertV32')) return;
    const el = document.createElement('div');
    el.id = 'attackAlertV32';
    el.innerHTML = `<div class="attackBoxV32" id="attackBoxV32Inner"></div>`;
    document.body.appendChild(el);
  }

  function closeAttack() {
    document.getElementById('attackAlertV32')?.classList.remove('on');
    attackInProgress = false;
  }

  function triggerAttack() {
    if (!window.PLAYER || attackInProgress) return;
    if (document.getElementById('popup')?.classList.contains('on')) return;

    const n = window.PLAYER;
    const flag = nome => window.FLAGS?.[nome] || '🌐';

    // Encontra um país que possa atacar
    // Prioriza: países hostis, alta tensão, em guerra com aliados
    const candidates = (window.NATIONS || []).filter(nation => {
      if (nation === n) return false;
      if (n.aliados?.some(a => a.nome === nation.nome)) return false;
      const rel = window.EMWorld?.relation?.(n, nation) ?? 0;
      return rel < -20 || (nation.mil > 65 && Math.random() < 0.3);
    });

    if (!candidates.length) return;

    // Pesa por hostilidade
    const attacker = candidates.sort((a, b) => {
      const relA = window.EMWorld?.relation?.(n, a) ?? 0;
      const relB = window.EMWorld?.relation?.(n, b) ?? 0;
      return relA - relB;
    })[0];

    attackInProgress = true;
    lastAttackDay = window.dia || 0;

    const rel = Math.round(window.EMWorld?.relation?.(n, attacker) ?? -30);
    const attackerStrength = Math.round(attacker.mil);
    const myStrength = Math.round(n.mil);
    const warChance = Math.round(clamp(50 + (attackerStrength - myStrength) * 0.4, 15, 85));

    // Pulsa o país atacante no globo
    if (window.pulseImpact) pulseImpact(attacker);
    if (window.addTension) addTension(8, `${attacker.nome} move forças em direção a ${n.nome}.`);

    const box = document.getElementById('attackBoxV32Inner');
    if (!box) { attackInProgress = false; return; }

    box.innerHTML = `
      <div class="attackHeaderV32">
        <span class="attackSirenV32">🚨</span>
        <span class="attackTitleV32">${flag(attacker.nome)} ATAQUE IMINENTE</span>
        <span class="attackSubV32">${attacker.nome} mobiliza forças contra ${n.nome}. Decisão necessária.</span>
      </div>
      <div class="attackBodyV32">
        <div class="attackStatsV32">
          <div class="attackStatV32">
            <b>${flag(attacker.nome)} ${attackerStrength}</b>
            <small>Força atacante</small>
          </div>
          <div class="attackStatV32">
            <b>${flag(n.nome)} ${myStrength}</b>
            <small>Sua defesa</small>
          </div>
          <div class="attackStatV32">
            <b style="color:${rel < -40 ? '#fb4b64' : '#fbbf24'}">${rel}</b>
            <small>Relação bilateral</small>
          </div>
        </div>
        <div class="attackChoicesV32">
          <button class="attackChoiceV32 war" id="atk-repel">
            <span class="acLabel">⚔️ REPELIR COM FORÇA</span>
            Mobilize tropas e entre em estado de guerra. Alto custo, mas demonstra força.
            <span class="acEffect">−CP 2 · −caixa 2% PIB · guerra declarada · mil +5</span>
          </button>
          <button class="attackChoiceV32" id="atk-negotiate">
            <span class="acLabel">🕊️ NEGOCIAR IMEDIATAMENTE</span>
            Acionar diplomatas e oferecer concessões para evitar o conflito.
            <span class="acEffect">−2 influência · diplomacia +6 · aprovação −3</span>
          </button>
          <button class="attackChoiceV32" id="atk-ally">
            <span class="acLabel">📯 ACIONAR ALIADOS</span>
            Pedir ajuda militar aos seus aliados para dissuadir o ataque.
            <span class="acEffect">${n.aliados?.length ? `${n.aliados.length} aliado(s) · força +15 · caixa −1% PIB` : 'Sem aliados ativos · sem efeito'}</span>
          </button>
          <button class="attackChoiceV32 peace" id="atk-concede">
            <span class="acLabel">🏳️ CEDER PARCIALMENTE</span>
            Aceitar demandas menores para evitar a guerra. Legitimidade paga o preço.
            <span class="acEffect">Sem guerra · legitimidade −10 · aprovação −5 · rel. +15</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('attackAlertV32').classList.add('on');

    // Pausa o tempo
    const prevSpeed = window.speed || 1;
    try { document.querySelector('.spd button[data-s="0"]')?.click(); } catch (e) {}

    function resolve(choice) {
      closeAttack();
      try {
        const btn = document.querySelector(`.spd button[data-s="${prevSpeed}"]`);
        if (btn) btn.click();
        else document.querySelector('.spd button[data-s="1"]')?.click();
      } catch (e) {}

      const p = window.PLAYER;
      if (!p) return;

      if (choice === 'repel') {
        const cost = p.pib * 0.02;
        if (window.cp >= 2) window.cp -= 2;
        p.caixa -= cost;
        p.mil += 5;
        p.emGuerra = true;
        p.warTarget = attacker;
        p.warDias = 0;
        p.warStrength = clamp(p.mil + Math.random() * 10, 10, 100);
        attacker.warStrength = clamp(attacker.mil + Math.random() * 10, 10, 100);
        if (window.drawWarArc) drawWarArc(p, attacker);
        if (window.spawnWarUnits) spawnWarUnits(p, attacker);
        if (window.addBulletin) addBulletin('⚔️', 'Resposta militar', `${p.nome} repele o ataque de ${attacker.nome} com força total.`, 'war');
        if (window.addTension) addTension(14, `${p.nome} entra em guerra com ${attacker.nome}.`);
      } else if (choice === 'negotiate') {
        if (window.influence >= 2) window.influence -= 2;
        else window.influence = 0;
        p.diplo += 6;
        p.aprovacao -= 3;
        if (window.EMWorld?.changeRelation) EMWorld.changeRelation(p, attacker, 8);
        if (window.addBulletin) addBulletin('🕊️', 'Crise evitada', `Diplomatas de ${p.nome} negociaram uma saída com ${attacker.nome}.`, 'good');
        if (window.addTension) addTension(-5, `A negociação entre ${p.nome} e ${attacker.nome} suspendeu o ataque.`);
      } else if (choice === 'ally') {
        if (p.aliados?.length) {
          p.mil = clamp(p.mil + 15, 0, 100);
          p.caixa -= p.pib * 0.01;
          const ally = p.aliados[0];
          if (window.addBulletin) addBulletin('📯', 'Aliados respondem', `${ally.nome} mobiliza forças em apoio a ${p.nome}.`, 'good');
          if (window.addTension) addTension(6, `Aliados de ${p.nome} entram em prontidão.`);
          if (window.EMWorld?.changeRelation) EMWorld.changeRelation(p, attacker, -5);
        } else {
          p.aprovacao -= 5;
          if (window.addBulletin) addBulletin('⚠️', 'Sem aliados', `${p.nome} não tem aliados para acionar. O isolamento custou aprovação.`, 'bad');
        }
      } else if (choice === 'concede') {
        p.legitimidade -= 10;
        p.aprovacao -= 5;
        if (window.EMWorld?.changeRelation) EMWorld.changeRelation(p, attacker, 15);
        if (window.addBulletin) addBulletin('🏳️', 'Concessão diplomática', `${p.nome} cedeu parcialmente às demandas de ${attacker.nome}.`, 'warn');
        if (window.addTension) addTension(-8, `A concessão de ${p.nome} desarmou a crise temporariamente.`);
      }

      if (window.clampAll) clampAll();
      if (window.refresh) refresh();
    }

    document.getElementById('atk-repel').onclick = () => resolve('repel');
    document.getElementById('atk-negotiate').onclick = () => resolve('negotiate');
    document.getElementById('atk-ally').onclick = () => resolve('ally');
    document.getElementById('atk-concede').onclick = () => resolve('concede');
  }

  // Verifica se um ataque deve acontecer
  function checkForAttack() {
    if (!window.PLAYER || attackInProgress) return;
    if (document.getElementById('popup')?.classList.contains('on')) return;
    const day = window.dia || 0;
    if (day - lastAttackDay < 65) return; // mínimo 65 dias entre ataques

    // Chance de ataque cresce com tensão global e relações ruins
    const tension = window.worldTension || 0;
    const hostileCount = (window.NATIONS || []).filter(n => {
      if (n === window.PLAYER) return false;
      return (window.EMWorld?.relation?.(window.PLAYER, n) ?? 0) < -30;
    }).length;

    const chance = (tension / 100) * 0.012 + hostileCount * 0.008;
    if (Math.random() < chance) triggerAttack();
  }

  /* =====================================================
     PARTE 4 — HOOKS NO TICK E REFRESH
  ===================================================== */

  const _tickV32 = window.tick;
  window.tick = function (dt) {
    const r = _tickV32.apply(this, arguments);
    if (window.PLAYER) {
      const d = window.dia || 0;
      if (d % 8 === 0) {
        renderWarTicker();
        syncDiseaseMarkers();
      }
      if (d % 12 === 0) injectWarArcs();
      checkForAttack();
    }
    return r;
  };

  const _refreshV32 = window.refresh;
  window.refresh = function () {
    const r = _refreshV32.apply(this, arguments);
    if (window.PLAYER) {
      setTimeout(() => {
        renderWarTicker();
        syncDiseaseMarkers();
        injectWarArcs();
      }, 50);
    }
    return r;
  };

  /* ===================================================
     INIT
  =================================================== */
  buildWarTicker();
  buildAttackAlert();

  setTimeout(() => {
    if (window.PLAYER) {
      renderWarTicker();
      syncDiseaseMarkers();
      injectWarArcs();
    }
  }, 1000);

  setInterval(() => {
    if (window.PLAYER) {
      renderWarTicker();
      injectWarArcs();
    }
  }, 12000);

  window.EMV32 = { renderWarTicker, syncDiseaseMarkers, injectWarArcs, triggerAttack };
})();
