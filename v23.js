/* Estado Maior V23 — direção de campanha, interface progressiva e países vivos. */
(function(){
  const state={mode:localStorage.getItem('EM.mode')||'current',situationTab:'crises',goals:[],storyIndex:0,lastStoryDay:-999,scenarioApplied:false};
  const $id=id=>document.getElementById(id);
  document.body.classList.add('v23-ready');

  function metricClass(v,inverse=false){const value=inverse?100-v:v;return value>=68?'good':value<38?'bad':'warn';}
  function coreRisk(){const doom=window.EMCrisis?.worldDoom?.()||0;return clamp(Math.max(doom,worldTension||0),0,100);}
  function renderCoreHud(){
    if(!PLAYER)return;const growth=(PLAYER.pib/PLAYER.pib0-1)*100,power=clamp(PLAYER.mil*.42+PLAYER.diplo*.38+PLAYER.ciencia*.2,0,100),risk=coreRisk();
    const row=$id('statRow');if(!row)return;
    row.innerHTML=`<div class="coreMetric ${metricClass(PLAYER.aprovacao)}"><span>👥 APROVAÇÃO <i>popular</i></span><strong>${Math.round(PLAYER.aprovacao)}%</strong></div><div class="coreMetric ${metricClass(growth+50)}"><span>📈 ECONOMIA <i>PIB</i></span><strong>${growth>=0?'+':''}${growth.toFixed(1)}%</strong></div><div class="coreMetric ${metricClass(PLAYER.estabilidade)}"><span>🏛 ESTABILIDADE <i>interna</i></span><strong>${Math.round(PLAYER.estabilidade)}</strong></div><div class="coreMetric ${metricClass(power)}"><span>🌐 PODER <i>global</i></span><strong>${Math.round(power)}</strong></div><div class="coreMetric ${metricClass(risk,true)}"><span>⚠ RISCO GLOBAL <i>crises</i></span><strong>${Math.round(risk)}%</strong></div>`;
  }

  function profileFor(n){
    const island=['Caribe','Oceania'].includes(n.regiao),micro=n.pop<2,major=n.pib>1500||n.mil>78,emerging=n.pc<6500,rich=n.pc>30000;
    if(micro)return {key:'micro',title:'Diplomacia de precisão',trait:'Estado pequeno e ágil — acordos e reputação valem mais que força bruta.',tags:['ALTA AGILIDADE','BAIXA ESCALA'],focus:'Transformar limitações territoriais em influência e prosperidade.'};
    if(island)return {key:'maritime',title:'Potência marítima',trait:'Rotas oceânicas — comércio, turismo e ajuda internacional têm maior valor.',tags:['MARÍTIMO','COMÉRCIO'],focus:'Proteger rotas e liderar respostas climáticas.'};
    if(major)return {key:'major',title:'Responsabilidade de potência',trait:'Toda decisão move mercados e alianças — poder alto, cobrança internacional maior.',tags:['POTÊNCIA','ALTA PRESSÃO'],focus:'Ampliar influência sem provocar uma escalada mundial.'};
    if(emerging)return {key:'emerging',title:'Salto de desenvolvimento',trait:'Infraestrutura e saúde geram crescimento adicional, mas crises causam danos profundos.',tags:['EMERGENTE','POTENCIAL'],focus:'Modernizar o país preservando estabilidade social.'};
    if(rich)return {key:'advanced',title:'Economia avançada',trait:'Ciência e instituições fortes — projetos custam mais, mas geram efeitos duradouros.',tags:['ALTA RENDA','INOVAÇÃO'],focus:'Manter competitividade, coesão social e liderança tecnológica.'};
    return {key:'regional',title:'Liderança regional',trait:'Equilíbrio estratégico — diplomacia e crescimento podem transformar o peso regional.',tags:['REGIONAL','EQUILÍBRIO'],focus:'Construir alianças e superar rivais próximos.'};
  }

  const previousLeader=getLider;
  getLider=function(name){
    const base=previousLeader(name),n=NATIONS.find(x=>x.nome===name);if(!n||LIDERES[name])return base;const p=profileFor(n),oldBonus=base.bonus;
    return{cargo:base.cargo,trait:`${p.trait}`,bonus:x=>{oldBonus?.(x);if(p.key==='micro'){x.diplo+=7;x._dCp=-1;}if(p.key==='maritime'){x.diplo+=5;x.caixa+=x.pib*.008;}if(p.key==='emerging'){x.caixa+=x.pib*.015;}if(p.key==='advanced'){x.ciencia+=5;}if(p.key==='major'){x.mil+=3;x.diplo+=3;}}};
  };

  function goalPool(n){
    const p=profileFor(n),goals={
      growth:{id:'growth',label:'Fazer o PIB crescer 6%',reward:'Caixa +1,5% PIB',check:x=>x.pib>=x.pib0*1.06,grant:x=>x.caixa+=x.pib*.015},
      health:{id:'healthV23',label:'Levar saúde a 72',reward:'Aprovação +5',check:x=>x.saude>=72,grant:x=>x.aprovacao+=5},
      science:{id:'scienceV23',label:'Levar ciência a 75',reward:'PIB +2%',check:x=>x.ciencia>=75,grant:x=>x.pib*=1.02},
      stability:{id:'stabilityV23',label:'Consolidar estabilidade em 70',reward:'Legitimidade +6',check:x=>x.estabilidade>=70,grant:x=>x.legitimidade+=6},
      power:{id:'power',label:'Alcançar poder internacional 75',reward:'Diplomacia +6',check:x=>x.mil*.42+x.diplo*.38+x.ciencia*.2>=75,grant:x=>x.diplo+=6},
      alliances:{id:'alliancesV23',label:'Firmar dois acordos ou alianças',reward:'Influência +2',check:x=>x.aliados.length+x.acordos.length>=2,grant:()=>influence=Math.min(INFLUENCE_MAX,influence+2)},
      debt:{id:'debtV23',label:'Manter dívida abaixo de 55% do PIB',reward:'Estabilidade +5',check:x=>dia>150&&x.divida/x.pib<.55,grant:x=>x.estabilidade+=5},
      diplomacy:{id:'diplomacyV23',label:'Elevar diplomacia a 75',reward:'Influência +2',check:x=>x.diplo>=75,grant:()=>influence=Math.min(INFLUENCE_MAX,influence+2)}
    };
    const sets={micro:['diplomacy','alliances','stability'],maritime:['growth','alliances','diplomacy'],major:['power','alliances','stability'],emerging:['growth','health','stability'],advanced:['science','debt','diplomacy'],regional:['growth','alliances','power']};
    return sets[p.key].map(k=>({...goals[k],done:false}));
  }
  function campaignTitle(n){const p=profileFor(n);return [`${p.title} — ${n.nome}`,p.focus];}
  function setupGoals(n){
    state.goals=goalPool(n);try{const saved=JSON.parse(localStorage.getItem('estadoMaior.v23.campaign')||'null');if(saved?.player===n.nome){state.mode=saved.mode||state.mode;state.storyIndex=saved.storyIndex||0;state.goals.forEach(g=>g.done=!!saved.done?.includes(g.id));}}catch(e){}
  }
  function updateGoals(){
    if(!PLAYER)return;state.goals.forEach(g=>{if(!g.done&&g.check(PLAYER)){g.done=true;g.grant(PLAYER);addBulletin('🎯','Meta nacional concluída',`${g.label}. Recompensa: ${g.reward}.`,'good','results');}});
  }
  function saveV23(){if(!PLAYER)return;localStorage.setItem('estadoMaior.v23.campaign',JSON.stringify({player:PLAYER.nome,mode:state.mode,storyIndex:state.storyIndex,done:state.goals.filter(g=>g.done).map(g=>g.id)}));}

  function modeMarkup(){return `<div id="gameModePicker" aria-label="Modo de partida"><button class="gameModeBtn" data-mode="current"><b>MUNDO 2026</b><small>Relações e crises inspiradas no cenário atual.</small></button><button class="gameModeBtn" data-mode="alternative"><b>HISTÓRIA ALTERNATIVA</b><small>Alianças e rivalidades mudam a cada campanha.</small></button><button class="gameModeBtn" data-mode="sandbox"><b>SANDBOX</b><small>Jogue sem prazo ou derrota definitiva.</small></button></div>`;}
  const hint=$id('hint');if(hint&&!$id('gameModePicker'))hint.insertAdjacentHTML('beforebegin',modeMarkup());
  function syncMode(){document.querySelectorAll('.gameModeBtn').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));localStorage.setItem('EM.mode',state.mode);}
  document.querySelectorAll('.gameModeBtn').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;syncMode();});syncMode();

  const extraConflicts=[
    {a:'Israel',b:'Irã',name:'Conflito Israel–Irã',intensity:76,front:48},
    {a:'Coreia do Norte',b:'Coreia do Sul',name:'Armistício coreano',intensity:61,front:50},
    {a:'China',b:'Taiwan',name:'Tensão no Estreito de Taiwan',intensity:57,front:54},
    {a:'Sudão',b:'Sudão do Sul',name:'Crise no Sudão',intensity:72,front:43},
    {a:'Arábia Saudita',b:'Iêmen',name:'Crise no Mar Vermelho',intensity:52,front:58}
  ];
  extraConflicts.forEach(c=>{if(!window.EMStrategy?.conflicts?.some(x=>x.name===c.name))window.EMStrategy?.conflicts?.push(c);});

  function setRelation(aName,bName,value){const a=NATIONS.find(n=>n.nome===aName),b=NATIONS.find(n=>n.nome===bName);if(!a||!b||!window.EMWorld)return;window.EMWorld.changeRelation(a,b,value-window.EMWorld.relation(a,b));}
  function applyScenario(){
    if(state.scenarioApplied)return;state.scenarioApplied=true;document.body.classList.toggle('sandbox-mode',state.mode==='sandbox');
    if(state.mode==='current'){
      [['Israel','Irã',-100],['Sudão','Sudão do Sul',-72],['China','Taiwan',-84],['Coreia do Norte','Coreia do Sul',-92],['Armênia','Azerbaijão',-58],['Grécia','Turquia',-18],['Índia','China',-34]].forEach(x=>setRelation(...x));
    }
    if(state.mode==='alternative'){
      const pool=NATIONS.slice().sort(()=>Math.random()-.5).slice(0,32);for(let i=0;i<pool.length-1;i+=2)setRelation(pool[i].nome,pool[i+1].nome,Math.round(Math.random()*150-75));
      window.EMStrategy?.conflicts?.forEach(c=>{c.intensity=35+Math.random()*55;c.front=30+Math.random()*40;});
    }
  }

  document.body.insertAdjacentHTML('beforeend',`<button id="situationToggle" type="button">SITUAÇÃO MUNDIAL <b id="situationCount">0</b></button><section id="situationDrawer" aria-label="Situação mundial"><header class="situationHead"><div><small>PAINEL DE PRIORIDADES</small><strong>O que exige sua atenção</strong></div><button id="situationClose" type="button">✕</button></header><nav class="situationTabs"><button class="active" data-situation="crises">CRISES</button><button data-situation="agenda">AGENDA</button><button data-situation="guide">COMO JOGAR</button></nav><div id="situationBody"></div></section><section id="onboardingV23"><div class="onboardingCard"><small>PRIMEIRO MINUTO DE GOVERNO</small><h2>Você não precisa controlar tudo agora.</h2><p>O jogo foi organizado em três movimentos simples. O mundo continua vivo, mas apenas decisões importantes interrompem seu mandato.</p><div class="onboardingSteps"><div><b>1. Leia a prioridade</b><span>Abra Situação Mundial para ver crises e metas.</span></div><div><b>2. Escolha um ministério</b><span>As ações ficam agrupadas na parte inferior.</span></div><div><b>3. Observe a reação</b><span>População, imprensa e países lembrarão suas escolhas.</span></div></div><button id="onboardingDone">COMEÇAR O MANDATO</button></div></section>`);

  function activeCrises(){return window.EMCrisis?.crises?.filter(c=>!c.contained)||[];}
  function renderSituation(tab=state.situationTab){
    state.situationTab=tab;document.querySelectorAll('.situationTabs button').forEach(b=>b.classList.toggle('active',b.dataset.situation===tab));const body=$id('situationBody');if(!body)return;
    if(tab==='agenda'){
      const [title,desc]=PLAYER?campaignTitle(PLAYER):['Agenda nacional','Inicie uma campanha.'];
      body.innerHTML=`<article class="situationCard good"><small>MISSÃO NACIONAL <span>${state.goals.filter(g=>g.done).length}/${state.goals.length}</span></small><strong>${title}</strong><p>${desc}</p></article>${state.goals.map(g=>`<article class="situationCard ${g.done?'good':''}"><small>${g.done?'CONCLUÍDA':'META DO MANDATO'} <span>${g.reward}</span></small><strong>${g.done?'✓ ':''}${g.label}</strong><p>${g.done?'A recompensa já foi incorporada ao governo.':'Avance no seu ritmo; não é necessário resolver tudo ao mesmo tempo.'}</p></article>`).join('')}`;return;
    }
    if(tab==='guide'){
      body.innerHTML=`<article class="situationCard"><small>RECURSOS POLÍTICOS</small><strong>Ação e influência não são a mesma coisa</strong><p>Ação executa políticas nacionais. Influência negocia votos, acordos e intervenções internacionais.</p></article><article class="situationCard"><small>LEITURA DA TELA</small><strong>Cinco números conduzem o mandato</strong><p>Aprovação, economia, estabilidade, poder internacional e risco global. Os detalhes ficam nos painéis especializados.</p></article><article class="situationCard"><small>CRISES</small><strong>Nem todo acontecimento exige intervenção</strong><p>Observe intensidade e países afetados. Crises persistentes escalam; notícias comuns terminam naturalmente.</p></article><article class="situationCard"><small>ATALHOS</small><strong>Espaço pausa · R para o globo</strong><p>Em telas menores, use a navegação inferior e abra apenas um painel por vez.</p></article>`;return;
    }
    const catastrophes=activeCrises(),conflicts=window.EMStrategy?.conflicts||[],events=(window.mapLiveEvents||mapLiveEvents||[]).filter(e=>e.lifeState!=='resolved').slice(0,6);
    const conflictHtml=conflicts.map((c,i)=>`<article class="situationCard ${c.intensity>=72?'critical':''}"><small>CONFLITO PERSISTENTE <span>${Math.round(c.intensity)}%</span></small><strong>${c.name}</strong><p>${flag(c.a)} ${c.a} × ${flag(c.b)} ${c.b}. A frente muda com diplomacia, ajuda e intervenção.</p><div class="situationMeter"><i style="width:${c.intensity}%"></i></div><div class="situationActions"><button data-conf-focus="${i}">VER NO MAPA</button><button data-conf-mediate="${i}">MEDIAR</button><button data-conf-aid="${i}">AJUDA</button><button class="danger" data-conf-war="${i}">ENTRAR</button></div></article>`).join('');
    const catastropheHtml=catastrophes.map((c,i)=>`<article class="situationCard critical"><small>CRISE EM EXPANSÃO <span>${c.nations.length} PAÍSES</span></small><strong>${c.title}</strong><p>Intensidade ${Math.round(c.intensity)}% · dano acumulado ${Math.round(c.damage)}%. Sem resposta, novas fronteiras serão atingidas.</p><div class="situationMeter"><i style="width:${c.intensity}%"></i></div><div class="situationActions"><button data-cat-focus="${i}">LOCALIZAR</button><button class="danger" data-cat-action="${i}">INTERVIR</button></div></article>`).join('');
    const eventHtml=events.map((e,i)=>`<article class="situationCard"><small>ACONTECENDO AGORA <span>${e.lifeState==='escalated'?'ESCALANDO':'EM CURSO'}</span></small><strong>${e.icon||'●'} ${e.title}</strong><p>${flag(e.a?.nome)} ${e.a?.nome||''}${e.b?` → ${flag(e.b.nome)} ${e.b.nome}`:''}. ${e.text||'A situação continua sendo monitorada.'}</p><div class="situationActions"><button data-event-focus="${i}">VER NO MAPA</button></div></article>`).join('');
    body.innerHTML=catastropheHtml+conflictHtml+eventHtml||'<article class="situationCard good"><small>MUNDO ESTÁVEL</small><strong>Nenhuma crise exige intervenção imediata</strong><p>Use este período para fortalecer economia, alianças e instituições.</p></article>';
    body.querySelectorAll('[data-conf-focus]').forEach(b=>b.onclick=()=>{const c=conflicts[+b.dataset.confFocus],n=NATIONS.find(x=>x.nome===c.a);$id('situationDrawer').classList.remove('on');if(n){focusNation(n,1.35);openDossier(n);}});
    body.querySelectorAll('[data-conf-mediate]').forEach(b=>b.onclick=()=>window.EMUI?.mediate(conflicts[+b.dataset.confMediate]));
    body.querySelectorAll('[data-conf-aid]').forEach(b=>b.onclick=()=>window.EMUI?.humanitarianAid(conflicts[+b.dataset.confAid]));
    body.querySelectorAll('[data-conf-war]').forEach(b=>b.onclick=()=>{$id('situationDrawer').classList.remove('on');window.EMUI?.chooseWarSide(conflicts[+b.dataset.confWar]);});
    body.querySelectorAll('[data-cat-focus]').forEach(b=>b.onclick=()=>{const c=catastrophes[+b.dataset.catFocus],n=NATIONS.find(x=>x.nome===c.nations.at(-1));$id('situationDrawer').classList.remove('on');if(n)focusNation(n,1.3);});
    body.querySelectorAll('[data-cat-action]').forEach(b=>b.onclick=()=>{$id('situationDrawer').classList.remove('on');window.EMCrisis?.crisisIntervention(catastrophes[+b.dataset.catAction]);});
    body.querySelectorAll('[data-event-focus]').forEach(b=>b.onclick=()=>{const e=events[+b.dataset.eventFocus],n=e.kind==='military'?e.b:e.a;$id('situationDrawer').classList.remove('on');if(n){focusNation(n,1.35);openDossier(n);}});
  }
  function updateSituationCount(){const urgent=activeCrises().length+(window.EMStrategy?.conflicts||[]).filter(c=>c.intensity>=65).length;$id('situationCount').textContent=urgent;$id('situationToggle').classList.toggle('urgent',urgent>0);if($id('situationDrawer').classList.contains('on'))renderSituation();}
  $id('situationToggle').onclick=()=>{$id('situationDrawer').classList.toggle('on');if($id('situationDrawer').classList.contains('on')){window.EMUI?.closeMajor?.('none');renderSituation();}};$id('situationClose').onclick=()=>$id('situationDrawer').classList.remove('on');document.querySelectorAll('.situationTabs button').forEach(b=>b.onclick=()=>renderSituation(b.dataset.situation));

  const stories=[
    {ico:'🌊',title:'A água chegou primeiro',desc:'Chuvas extremas isolam cidades e colocam infraestrutura, orçamento e confiança pública à prova.',choices:[['Reconstrução nacional','Caro, protege famílias e gera obras',m=>{m.caixa-=m.pib*.025;m.estabilidade+=7;m.aprovacao+=6;m.pib*=1.008;}],['Resposta local','Custo menor, recuperação mais lenta',m=>{m.caixa-=m.pib*.009;m.estabilidade+=2;m.aprovacao-=1;}],['Priorizar centros econômicos','Protege o PIB, amplia revolta regional',m=>{m.pib*=1.006;m.aprovacao-=7;m.legitimidade-=4;}]]},
    {ico:'🖥️',title:'Setenta e duas horas sem rede',desc:'Um ataque digital paralisa pagamentos públicos e expõe dados de cidadãos.',choices:[['Assumir e modernizar','Custa caixa, fortalece ciência e legitimidade',m=>{m.caixa-=m.pib*.014;m.ciencia+=8;m.legitimidade+=5;}],['Operação secreta','Recupera sistemas, reduz transparência',m=>{m.estabilidade+=5;m.legitimidade-=4;m.mil+=3;}],['Acusar um rival externo','Ganha apoio imediato, eleva tensão',m=>{m.aprovacao+=5;m.diplo-=7;addTension(7,'Acusações digitais elevam a tensão internacional.');}]]},
    {ico:'🏭',title:'O preço do próximo emprego',desc:'Uma multinacional oferece milhares de vagas, mas exige isenções e regras ambientais mais flexíveis.',choices:[['Aceitar o pacote','PIB cresce, ambientalistas reagem',m=>{m.pib*=1.025;m.caixa+=m.pib*.006;m.grupos.ambientais-=10;}],['Negociar contrapartidas','Resultado equilibrado, exige influência',m=>{if(influence>0)influence--;m.pib*=1.014;m.aprovacao+=3;m.legitimidade+=2;}],['Recusar publicamente','Preserva regras, perde investimento',m=>{m.legitimidade+=4;m.pib*=.996;m.grupos.ambientais+=8;}]]},
    {ico:'🧳',title:'Fronteiras humanas',desc:'Uma crise regional envia milhares de refugiados à fronteira e divide a opinião pública.',choices:[['Abrir corredor humanitário','Diplomacia e legitimidade sobem',m=>{m.caixa-=m.pib*.01;m.diplo+=7;m.legitimidade+=5;m.aprovacao-=2;}],['Recepção limitada','Equilíbrio com resultado moderado',m=>{m.caixa-=m.pib*.004;m.diplo+=2;m.estabilidade+=1;}],['Fechar a fronteira','Aprovação imediata, custo internacional',m=>{m.aprovacao+=4;m.diplo-=10;m.legitimidade-=3;}]]},
    {ico:'⚖️',title:'A maioria por um voto',desc:'Uma reforma central depende de um parlamentar investigado que oferece apoio em troca de proteção.',choices:[['Recusar o acordo','Perde votos, preserva instituições',m=>{m.congresso-=4;m.legitimidade+=9;m.corrupcao-=5;}],['Aceitar discretamente','Ganha base, cria memória perigosa',m=>{m.congresso+=7;m.legitimidade-=10;m.corrupcao+=8;}],['Expor a negociação','Risco alto, enorme impacto público',m=>{m.aprovacao+=6;m.legitimidade+=5;m.oposicao+=4;}]]},
    {ico:'🔋',title:'A corrida pela energia',desc:'Uma descoberta estratégica pode mudar exportações e alianças durante décadas.',choices:[['Investimento estatal','Alto custo, grande retorno futuro',m=>{m.caixa-=m.pib*.03;m.ciencia+=8;m.pib*=1.02;}],['Consórcio internacional','Fortalece comércio e diplomacia',m=>{m.diplo+=7;m.pib*=1.012;m.caixa+=m.pib*.004;}],['Leilão imediato','Muito caixa agora, pouca soberania',m=>{m.caixa+=m.pib*.035;m.legitimidade-=5;m.aprovacao-=2;}]]}
  ];
  function campaignStory(){if(!PLAYER||$id('popup').classList.contains('on'))return;const s=stories[state.storyIndex%stories.length];state.storyIndex++;state.lastStoryDay=dia;showPopup(s.ico,s.title,s.desc,s.choices.map(([l,t,go])=>({l,t,efeito:'Consequências imediatas e futuras',go,msg:l})));}

  function identityMarkup(n){const p=profileFor(n),resources=n.regiao==='Oriente Médio'?['ENERGIA','ROTAS']:n.regiao==='África'?['MINÉRIOS','POPULAÇÃO JOVEM']:['Caribe','Oceania'].includes(n.regiao)?['OCEANO','TURISMO']:n.ciencia>70?['TECNOLOGIA','CAPITAL HUMANO']:['INDÚSTRIA','MERCADO'];return `<div id="countryIdentityV23" class="countryIdentityV23"><small>IDENTIDADE ESTRATÉGICA</small><strong>${p.title}</strong><p>${p.trait}</p><div class="identityTags">${[...p.tags,...resources].map(x=>`<span>${x}</span>`).join('')}</div></div>`;}
  const dossierBase=openDossier;openDossier=function(n){const r=dossierBase(n);$id('countryIdentityV23')?.remove();$id('dTrait')?.insertAdjacentHTML('afterend',identityMarkup(n));return r;};
  $id('playerName')?.addEventListener('click',()=>{if(PLAYER)openDossier(PLAYER);});$id('playerName')?.setAttribute('title','Abrir perfil do país');

  /* O bônus artificial por clicar em quatro áreas foi removido. Estratégia vem das consequências. */
  registerAction=function(){actionCombo=0;comboUnique.clear();$id('comboToast')?.classList.remove('on');};

  function configureActionMinistries(){
    const labels={ECONOMIA:'ECONOMIA',SOCIAL:'BEM-ESTAR',TECNOLOGIA:'INOVAÇÃO','INSTITUIÇÕES':'GOVERNO',DEFESA:'DEFESA',EXTERIOR:'DIPLOMACIA'};
    document.querySelectorAll('.actionTab').forEach(b=>{if(labels[b.dataset.cat])b.textContent=labels[b.dataset.cat];});
    document.querySelector('.actionTab[data-cat="ECONOMIA"]')?.click();
  }
  function relabel(selector,text){const b=document.querySelector(selector+' b');if(b)b.textContent=text;}
  relabel('[data-rail="radar"]','NOTÍCIAS');relabel('[data-rail="treasury"]','ECONOMIA');relabel('#strategyOpen','MUNDO');relabel('#govOpen','GOVERNO');
  document.querySelector('[data-rail="actions"]')?.setAttribute('hidden','');document.querySelector('[data-rail="country"]')?.setAttribute('hidden','');

  function configureMobileNav(){
    const nav=$id('mobileNav');if(!nav)return;nav.innerHTML='<button class="mobileNavBtn active" data-v23-mobile="map"><span>◎</span>MAPA</button><button class="mobileNavBtn" data-v23-mobile="actions"><span>⌁</span>DECIDIR</button><button class="mobileNavBtn" data-v23-mobile="government"><span>♟</span>GOVERNO</button><button class="mobileNavBtn" data-v23-mobile="world"><span>◈</span>MUNDO</button><button class="mobileNavBtn" data-v23-mobile="feed"><span>◫</span>NOTÍCIAS</button>';
    nav.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{const view=btn.dataset.v23Mobile;nav.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));$id('strategyPanel')?.classList.remove('on');$id('governmentRoom')?.classList.remove('on');$id('situationDrawer')?.classList.remove('on');if(view==='map'){closeMobilePanels();document.body.classList.remove('mobile-panel-open');return;}if(view==='actions'){setMobileView('actions');return;}if(view==='feed'){setMobileView('feed');return;}closeMobilePanels();document.body.classList.add('mobile-panel-open');if(view==='government'){$id('governmentRoom')?.classList.add('on');window.EMDepth?.renderGovernment?.();}if(view==='world'){$id('strategyPanel')?.classList.add('on');document.querySelector('.strategyTabs [data-st="world"]')?.click();}});
  }
  configureMobileNav();

  const refreshBase=refresh;refresh=function(){const r=refreshBase();updateGoals();renderCoreHud();updateSituationCount();return r;};
  const tickBase=tick;tick=function(dt){if(state.mode==='sandbox'&&dia>=DIAS-2)dia=Math.max(0,DIAS-367);const before=dia,r=tickBase(dt);if(PLAYER&&dia!==before&&dia-state.lastStoryDay>=180&&dia>35)campaignStory();return r;};
  const endBase=end;end=function(t,c,txt){if(state.mode!=='sandbox')return endBase(t,c,txt);playing=true;if(PLAYER){PLAYER.aprovacao=Math.max(PLAYER.aprovacao,25);PLAYER.estabilidade=Math.max(PLAYER.estabilidade,28);PLAYER.legitimidade=Math.max(PLAYER.legitimidade,25);PLAYER.grupos.mil=Math.max(PLAYER.grupos.mil,25);}addBulletin('♾️','Sandbox continua',`${t} foi registrado na história, mas a campanha livre continua.`,'warn','results');refresh();};
  const startBase=startGame;startGame=function(n){
    setupGoals(n);const r=startBase(n);if(state.mode==='alternative'){mapLiveEvents=mapLiveEvents.filter(e=>!['Guerra na Ucrânia','Cessar-fogo EUA–Irã'].includes(e.title));worldTension=38;renderMapActivity();}applyScenario();configureActionMinistries();renderCoreHud();updateSituationCount();const [title,desc]=campaignTitle(n);setTimeout(()=>{const card=$id('campaignCard');if(card)card.innerHTML=`<small>MISSÃO NACIONAL</small><strong>${title}</strong><span>${desc}</span>`;},0);if(!localStorage.getItem('EM.tutorialSeen'))setTimeout(()=>$id('onboardingV23').classList.add('on'),450);return r;
  };
  $id('onboardingDone').onclick=()=>{$id('onboardingV23').classList.remove('on');localStorage.setItem('EM.tutorialSeen','1');$id('situationDrawer').classList.add('on');renderSituation('agenda');};
  window.addEventListener('beforeunload',saveV23);setInterval(()=>{saveV23();updateSituationCount();},12000);
  const search=$id('countrySearch');if(search)search.placeholder=`Buscar entre ${NATIONS.length} nações...`;
  const bulletin=$id('bulletin');if(bulletin&&!document.querySelector('.feedArchiveHint'))bulletin.insertAdjacentHTML('afterend','<div class="feedArchiveHint">AS 7 NOTÍCIAS MAIS IMPORTANTES · RESULTADOS GUARDAM SUAS DECISÕES</div>');
  window.EMV23={state,profileFor,renderSituation,renderCoreHud,save:saveV23};
})();
