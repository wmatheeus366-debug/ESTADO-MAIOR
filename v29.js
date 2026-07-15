/* Estado Maior V29 — sem turnos, tutorial de 3 passos, missão de turno, jornal mensal, tooltips. */
(function () {
  'use strict';

  /* ===================================================
     PARTE 1 — DESATIVAR O SISTEMA DE TURNOS
     Congela o tempo manual, libera o fluxo contínuo.
  =================================================== */
  // Sobrescreve endTurn para não fazer nada — o tempo corre livre
  window.endTurn = function () {};
  if (window.EMTurn) {
    EMTurn.endTurn = function () {};
  }
  // Remove a classe que escondia os controles de velocidade
  document.body.classList.remove('turnModeV27');
  // Garante que velocidade começa em 1 (não travada em 0 pelo turno)
  if (typeof speed !== 'undefined' && speed === 0) {
    try { document.querySelector('.spd button[data-s="1"]')?.click(); } catch (e) {}
  }

  /* ===================================================
     PARTE 2 — TUTORIAL DE 3 PASSOS
     Aparece uma vez ao começar o jogo, orientando
     o jogador sem bloquear o globo.
  =================================================== */
  const TUT_KEY = 'estadoMaior.v29.tutorialDone';
  const STEPS = [
    {
      icon: '🌍',
      title: 'Você governa uma nação real',
      desc: 'O globo ao fundo é o mundo acontecendo em tempo real. <b>Clique em qualquer país</b> para ver seu dossiê — economia, diplomacia e relação com você.'
    },
    {
      icon: '⚡',
      title: 'Aja com CP e Influência',
      desc: '<b>CP (pontos de ação)</b> são sua energia por ciclo — gaste em reformas, investimentos e guerras. <b>Influência</b> serve para diplomacia e negociações. Os dois se regeneram com o tempo.'
    },
    {
      icon: '📰',
      title: 'O mundo vai te cobrar todo mês',
      desc: 'A cada 30 dias in-game, um <b>jornal</b> resume o que aconteceu — suas decisões, crises e reação da população. Não existe "encerrar turno": o tempo corre e o mundo reage.'
    }
  ];

  let tutStep = 0;

  function buildTutorial () {
    const el = document.createElement('div');
    el.id = 'tutorialV29';
    el.innerHTML = `
      <div class="tutCardV29">
        <div class="tutHeadV29">
          <div class="tutEyebrowV29">
            <span style="width:7px;height:7px;background:#22d3ee;border-radius:50%;display:inline-block;box-shadow:0 0 10px #22d3ee"></span>
            PRIMEIROS PASSOS
          </div>
          <div class="tutStepsV29">
            ${STEPS.map((_, i) => `<div class="tutStepDotV29" id="tutDot${i}"></div>`).join('')}
          </div>
        </div>
        <div class="tutBodyV29" id="tutBody"></div>
        <div class="tutFootV29">
          <button class="tutSkipV29" id="tutSkip">PULAR TUTORIAL</button>
          <button class="tutNextV29" id="tutNext">PRÓXIMO →</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    document.getElementById('tutSkip').onclick = closeTutorial;
    document.getElementById('tutNext').onclick = advanceTutorial;
    renderTutStep();
    el.classList.add('on');
  }

  function renderTutStep () {
    const s = STEPS[tutStep];
    document.getElementById('tutBody').innerHTML = `
      <div class="tutStepIconV29">${s.icon}</div>
      <div class="tutStepTitleV29">${s.title}</div>
      <div class="tutStepDescV29">${s.desc}</div>
    `;
    STEPS.forEach((_, i) => {
      document.getElementById('tutDot' + i)?.classList.toggle('done', i <= tutStep);
    });
    const btn = document.getElementById('tutNext');
    if (btn) btn.textContent = tutStep === STEPS.length - 1 ? 'COMEÇAR A GOVERNAR ✓' : 'PRÓXIMO →';
  }

  function advanceTutorial () {
    if (tutStep < STEPS.length - 1) {
      tutStep++;
      renderTutStep();
    } else {
      closeTutorial();
    }
  }

  function closeTutorial () {
    document.getElementById('tutorialV29')?.classList.remove('on');
    localStorage.setItem(TUT_KEY, '1');
    // Após o tutorial, garante que o tempo está rodando
    if (typeof speed !== 'undefined' && speed === 0) {
      try { document.querySelector('.spd button[data-s="1"]')?.click(); } catch (e) {}
    }
  }

  /* ===================================================
     PARTE 3 — MISSÃO DE TURNO NO HUD
     Uma frase de orientação gerada dinamicamente
     baseada no estado atual do jogador.
  =================================================== */
  function buildMissionHud () {
    if (document.getElementById('missionHudV29')) return;
    const el = document.createElement('div');
    el.id = 'missionHudV29';
    el.innerHTML = `
      <div class="missionHudLabelV29">
        <span class="missionHudDotV29"></span>
        PRIORIDADE DO MOMENTO
      </div>
      <div id="missionHudTextV29"><b>Avaliando situação...</b></div>
    `;
    document.body.appendChild(el);
  }

  function getMission () {
    if (!window.PLAYER) return null;
    const p = PLAYER;
    const doom = window.EMCrisis?.worldDoom?.() || 0;
    const activeCrises = (window.EMCrisis?.crises || []).filter(c => !c.contained);

    // Prioridade 1 — doom alto
    if (doom >= 60) {
      return { title: '⚠️ Risco global crítico', text: `O índice de colapso está em ${Math.round(doom)}%. Abra a Central Estratégica e intervenha nas crises ativas.` };
    }
    // Prioridade 2 — crise ativa afetando o país
    const myCrisis = activeCrises.find(c => c.nations.includes(p.nome));
    if (myCrisis) {
      return { title: '🔥 Crise no seu território', text: `${myCrisis.title} está afetando ${p.nome}. Intervenha antes que ela se expanda para mais países.` };
    }
    // Prioridade 3 — aprovação baixa
    if (p.aprovacao < 35) {
      return { title: '📉 Aprovação em queda', text: `Sua aprovação está em ${Math.round(p.aprovacao)}%. Execute uma ação social ou econômica — veja o menu de Ações.` };
    }
    // Prioridade 4 — caixa negativo ou muito baixo
    if (p.caixa < p.pib * 0.05) {
      return { title: '💸 Caixa crítico', text: `O Tesouro está quase zerado. Considere um ajuste fiscal ou reduza gastos antes de novas ações.` };
    }
    // Prioridade 5 — legitimidade baixa
    if (p.legitimidade < 30) {
      return { title: '🏛️ Legitimidade frágil', text: `Com ${Math.round(p.legitimidade)}% de legitimidade, o Congresso pode bloquear suas próximas iniciativas.` };
    }
    // Prioridade 6 — briefing aguardando
    if (window.EMBriefings?.state?.pending > 0) {
      return { title: '♟ Briefing aguardando', text: 'Há uma decisão política esperando por você. Abra o menu BRIEFING no painel lateral.' };
    }
    // Prioridade 7 — crise ativa mas não no país
    if (activeCrises.length > 0) {
      return { title: `🌍 ${activeCrises.length} crise(s) no mundo`, text: `${activeCrises[0].title} está se expandindo. Mediação pode render influência e diplomacia.` };
    }
    // Default — situação estável
    return { title: '✅ Situação sob controle', text: 'Explore o Mercado Internacional ou invista em ciência para crescer no longo prazo.' };
  }

  function updateMissionHud () {
    const el = document.getElementById('missionHudTextV29');
    if (!el || !PLAYER) return;
    const m = getMission();
    if (!m) return;
    el.innerHTML = `<b>${m.title}</b>${m.text}`;
  }

  /* ===================================================
     PARTE 4 — JORNAL MENSAL (substitui relatório de turno)
     Aparece automaticamente a cada 30 dias in-game.
     Gerado a partir das ações e eventos reais do período.
  =================================================== */
  let lastNewspaperDay = -999;
  const paperActions = [];
  const paperNews = [];
  let paperSnap = null;

  function takeSnap () {
    if (!PLAYER) return null;
    return {
      day: dia,
      aprovacao: PLAYER.aprovacao,
      estabilidade: PLAYER.estabilidade,
      legitimidade: PLAYER.legitimidade,
      saude: PLAYER.saude,
      ciencia: PLAYER.ciencia,
      mil: PLAYER.mil,
      diplo: PLAYER.diplo,
      caixa: PLAYER.caixa,
      pib: PLAYER.pib,
      tension: worldTension || 0
    };
  }

  function signed (v, digits = 1) {
    const x = Math.abs(v) < 0.05 ? 0 : v;
    return (x > 0 ? '+' : '') + x.toFixed(digits);
  }

  // Titulares dramáticos baseados no estado do jogo
  function generateHeadline (before, after) {
    const delta = after.aprovacao - before.aprovacao;
    const doom = window.EMCrisis?.worldDoom?.() || 0;
    const wars = (window.EMCrisis?.crises || []).filter(c => !c.contained && c.kind === 'military').length;
    const crises = (window.EMCrisis?.crises || []).filter(c => !c.contained).length;

    if (doom >= 75) return { icon: '🌐', title: 'Mundo à beira do colapso', body: `Com ${Math.round(doom)}% de risco global, analistas internacionais alertam que a estabilidade geopolítica nunca esteve tão ameaçada. Governos cobram respostas urgentes.` };
    if (wars >= 2) return { icon: '⚔️', title: 'Múltiplas guerras simultâneas mudam o mapa', body: `${wars} conflitos ativos redefinem alianças e fronteiras. A comunidade internacional debate intervenção e os mercados reagem com nervosismo.` };
    if (delta >= 8) return { icon: '📈', title: `${PLAYER.nome} vive momento de popularidade`, body: `O governo registra alta significativa na aprovação popular. Pesquisas apontam satisfação com as decisões recentes e expectativa de continuidade.` };
    if (delta <= -8) return { icon: '📉', title: `Aprovação de ${PLAYER.nome} despenca`, body: `O índice de aprovação caiu ${Math.abs(delta).toFixed(1)} pontos no período. Grupos sociais e imprensa questionam o rumo das políticas públicas.` };
    if (crises >= 3) return { icon: '🔥', title: `${crises} crises simultâneas testam governos`, body: `O cenário internacional acumula instabilidade. Países cobram liderança enquanto recursos humanitários e diplomáticos são pressionados ao limite.` };
    if (after.caixa < after.pib * 0.04) return { icon: '💰', title: `Tesouro de ${PLAYER.nome} em situação crítica`, body: 'As reservas fiscais atingiram nível de alerta. Economistas pedem ajuste imediato enquanto o governo avalia cortes e novas receitas.' };
    if (after.aprovacao > 65) return { icon: '🏆', title: `${PLAYER.nome} entre os governos mais populares`, body: 'Índices de aprovação acima da média regional consolidam a imagem de um governo com respaldo popular, embora desafios ainda persistam.' };
    return { icon: '📰', title: `${PLAYER.nome} fecha mês em compasso de espera`, body: 'O período foi marcado por gestão rotineira e decisões graduais. A oposição cobra resultados mais concretos enquanto o governo defende a consistência do rumo.' };
  }

  function generateColumns (actions, news) {
    const leftTitle = 'Decisões do governo';
    const leftBody = actions.length
      ? actions.slice(0, 5).map(a => `— ${a}`).join('<br>')
      : 'Nenhuma ação executiva de destaque foi registrada no período.';

    const rightTitle = 'Cenário internacional';
    const rightBody = news.length
      ? news.slice(0, 5).map(n => `— ${n}`).join('<br>')
      : 'O mês transcorreu sem eventos internacionais de grande impacto.';

    return { leftTitle, leftBody, rightTitle, rightBody };
  }

  function buildNewspaper () {
    if (document.getElementById('newspaperV29')) return;
    const el = document.createElement('div');
    el.id = 'newspaperV29';
    el.innerHTML = `
      <div class="npCardV29">
        <div class="npHeaderV29">
          <div class="npMastheadV29">Estado Maior · Diário Geopolítico</div>
          <div class="npTitleV29">O <em>Mundo</em> em Revista</div>
          <div class="npMetaV29">
            <span id="npDateV29">Janeiro, Ano 1</span>
            <span>EDIÇÃO MENSAL</span>
            <span id="npNationV29">—</span>
          </div>
        </div>
        <div class="npBodyV29" id="npBodyV29"></div>
        <div class="npFootV29">
          <button class="npCloseV29" id="npCloseV29">CONTINUAR GOVERNANDO →</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    document.getElementById('npCloseV29').onclick = closeNewspaper;
  }

  function showNewspaper () {
    if (!PLAYER || !paperSnap) return;
    const after = takeSnap();
    const hl = generateHeadline(paperSnap, after);
    const cols = generateColumns([...paperActions], [...paperNews]);

    // Stats delta
    const stats = [
      { label: 'APROVAÇÃO', val: after.aprovacao, delta: after.aprovacao - paperSnap.aprovacao },
      { label: 'ESTAB.', val: after.estabilidade, delta: after.estabilidade - paperSnap.estabilidade },
      { label: 'CAIXA', val: after.caixa, delta: after.caixa - paperSnap.caixa, money: true },
      { label: 'TENSÃO GLOBAL', val: after.tension, delta: after.tension - paperSnap.tension, invert: true }
    ];

    function fmtStat (s) {
      if (s.money) {
        const d = s.delta;
        return { shown: money(s.val), deltaShown: (d >= 0 ? '+' : '−') + money(Math.abs(d)).replace('−', ''), up: d >= 0 };
      }
      return { shown: Math.round(s.val) + '%', deltaShown: signed(s.delta, 1) + ' p.p.', up: s.invert ? s.delta <= 0 : s.delta >= 0 };
    }

    const month = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][Math.floor(dia / 30) % 12];
    const year = Math.floor(dia / 365) + 1;

    document.getElementById('npDateV29').textContent = `${month}, Ano ${year} · Dia ${dia}`;
    document.getElementById('npNationV29').textContent = PLAYER.nome;

    document.getElementById('npBodyV29').innerHTML = `
      <div class="npHeadlineV29">
        <div class="npHeadlineIconV29">${hl.icon}</div>
        <div class="npHeadlineTitleV29">${hl.title}</div>
        <div class="npHeadlineBodyV29">${hl.body}</div>
      </div>
      <div class="npColumnV29">
        <div class="npColumnTitleV29">${cols.leftTitle}</div>
        ${cols.leftBody}
      </div>
      <div class="npColumnV29">
        <div class="npColumnTitleV29">${cols.rightTitle}</div>
        ${cols.rightBody}
      </div>
      <div class="npStatsV29">
        ${stats.map(s => {
          const f = fmtStat(s);
          return `<div class="npStatV29">
            <span class="npStatValV29 ${Math.abs(s.delta || 0) < 0.1 ? '' : f.up ? 'up' : 'dn'}">${f.shown}</span>
            <span class="npStatLblV29">${s.label} ${f.deltaShown}</span>
          </div>`;
        }).join('')}
      </div>
    `;

    document.getElementById('newspaperV29').classList.add('on');
    // Pausa o tempo enquanto o jornal está aberto
    if (typeof speed !== 'undefined') {
      window._v29SpeedBeforeNewspaper = speed;
      try { document.querySelector('.spd button[data-s="0"]')?.click(); } catch (e) {}
    }

    // Reset dos acumuladores para o próximo mês
    paperActions.length = 0;
    paperNews.length = 0;
    paperSnap = takeSnap();
  }

  function closeNewspaper () {
    document.getElementById('newspaperV29')?.classList.remove('on');
    // Retoma a velocidade anterior
    const prev = window._v29SpeedBeforeNewspaper || 1;
    try {
      const btn = document.querySelector(`.spd button[data-s="${prev}"]`);
      if (btn) btn.click();
      else document.querySelector('.spd button[data-s="1"]')?.click();
    } catch (e) {}
  }

  /* ===================================================
     PARTE 5 — TOOLTIPS NOS TERMOS-CHAVE
     Envolve labels de CP e Influência no HUD com
     tooltips informativos.
  =================================================== */
  const TERMS = {
    CP: 'Ponto de Ação (PA): sua energia por ciclo. Gaste em reformas, guerras e decisões grandes. Regenera com o tempo e aprovação alta.',
    'AÇÃO': 'Ponto de Ação (PA): sua energia por ciclo. Gaste em reformas, guerras e decisões grandes. Regenera com o tempo e aprovação alta.',
    'INFL': 'Influência: moeda diplomática. Serve para negociações, mediações e acordos internacionais. Cresce com aprovação e legitimidade altas.',
    'LEGITIMIDADE': 'Legitimidade: quanto o sistema político te aceita. Baixa demais e o Congresso bloqueia tuas iniciativas.',
    'APROVAÇÃO': 'Aprovação popular: o quanto a população apoia seu governo. Abaixo de 30% você perde poder. Sobe com boas decisões sociais e econômicas.',
    'DOOM': 'Risco de colapso global: soma das crises não resolvidas. Em 100%, o jogo termina com o colapso da ordem mundial.',
    'COLAPSO': 'Risco de colapso global: soma das crises não resolvidas. Em 100%, o jogo termina com o colapso da ordem mundial.',
  };

  function installTooltips () {
    // Envolve labels de stats no topBar
    document.querySelectorAll('.sc .sl').forEach(el => {
      const txt = el.textContent.trim().toUpperCase();
      const def = TERMS[txt] || Object.entries(TERMS).find(([k]) => txt.includes(k))?.[1];
      if (!def) return;
      if (el.querySelector('.termTipBubbleV29')) return;
      el.classList.add('termTipV29');
      el.insertAdjacentHTML('beforeend', `<span class="termTipBubbleV29"><b>${txt}</b>${def}</span>`);
    });
    // Doom status
    const doomBox = document.getElementById('doomStatus');
    if (doomBox && !doomBox.querySelector('.termTipBubbleV29')) {
      const doomTop = doomBox.querySelector('.doomTop span');
      if (doomTop) {
        doomTop.classList.add('termTipV29');
        doomTop.insertAdjacentHTML('beforeend', `<span class="termTipBubbleV29"><b>RISCO DE COLAPSO</b>${TERMS['DOOM']}</span>`);
      }
    }
  }

  /* ===================================================
     PARTE 6 — INTERCEPTAR addBulletin e tick
     Para alimentar o jornal e disparar nos dias certos.
  =================================================== */
  const _bulletinV29 = addBulletin;
  addBulletin = function (ico, title, text, type, channel) {
    if (PLAYER) {
      const actual = channel || (type === 'act' ? 'results' : 'general');
      const line = String(title || '').trim();
      if (actual === 'general' && line && !paperNews.includes(line)) {
        paperNews.push(`${ico || ''} ${line}`.trim());
        if (paperNews.length > 20) paperNews.shift();
      }
      if (actual === 'results' && ['act', 'good', 'war'].includes(type) && line && !paperActions.includes(line)) {
        paperActions.push(line);
        if (paperActions.length > 20) paperActions.shift();
      }
    }
    return _bulletinV29(ico, title, text, type, channel);
  };

  const _tickV29 = tick;
  tick = function (dt) {
    const before = dia;
    const result = _tickV29(dt);
    if (PLAYER && dia !== before) {
      // Jornal a cada 30 dias
      if (dia > 0 && dia % 30 === 0 && dia !== lastNewspaperDay) {
        lastNewspaperDay = dia;
        setTimeout(showNewspaper, 600);
      }
      // Missão a cada 5 dias
      if (dia % 5 === 0) updateMissionHud();
      // Tooltips instalar periodicamente (novos elementos podem aparecer)
      if (dia % 15 === 0) installTooltips();
    }
    return result;
  };

  /* ===================================================
     PARTE 7 — HOOK NO STARTGAME
  =================================================== */
  const _startV29 = startGame;
  startGame = function (n) {
    const result = _startV29(n);

    // Inicializa o snapshot para o jornal
    paperSnap = takeSnap();
    lastNewspaperDay = dia;

    // Missão imediata
    setTimeout(() => {
      updateMissionHud();
      installTooltips();
    }, 500);

    // Tutorial: apenas se nunca viu antes
    if (!localStorage.getItem(TUT_KEY)) {
      setTimeout(() => {
        buildTutorial();
      }, 1200);
    }

    return result;
  };

  /* ===================================================
     INIT — Constrói os elementos no DOM
  =================================================== */
  buildMissionHud();
  buildNewspaper();

  // Atualiza missão periodicamente mesmo sem tick
  setInterval(() => {
    if (PLAYER) {
      updateMissionHud();
      installTooltips();
    }
  }, 8000);

  window.EMV29 = { showNewspaper, closeNewspaper, updateMissionHud, installTooltips };
})();
