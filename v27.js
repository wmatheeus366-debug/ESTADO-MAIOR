/* Estado Maior V27 — turnos, comércio internacional, bandeiras e unidades 3D leves. */
(function(){
  'use strict';

  const TURN_DAYS=30,TURN_STORE='estadoMaior.v27.turn',MARKET_STORE='estadoMaior.v27.market';
  const ISO={
    'Brasil':'br','Argentina':'ar','Chile':'cl','Colômbia':'co','Peru':'pe','Venezuela':'ve','México':'mx','Estados Unidos':'us','Canadá':'ca','Cuba':'cu','Reino Unido':'gb','França':'fr','Alemanha':'de','Espanha':'es','Itália':'it','Portugal':'pt','Polônia':'pl','Ucrânia':'ua','Rússia':'ru','Turquia':'tr','Suécia':'se','Noruega':'no','Egito':'eg','Nigéria':'ng','África do Sul':'za','Etiópia':'et','Quênia':'ke','Marrocos':'ma','Argélia':'dz','Israel':'il','Arábia Saudita':'sa','Irã':'ir','Emirados Árabes':'ae','Índia':'in','Paquistão':'pk','China':'cn','Japão':'jp','Coreia do Sul':'kr','Coreia do Norte':'kp','Indonésia':'id','Vietnã':'vn','Tailândia':'th','Cazaquistão':'kz','Austrália':'au','Nova Zelândia':'nz','Uruguai':'uy','Paraguai':'py','Bolívia':'bo','Equador':'ec','Países Baixos':'nl','Bélgica':'be','Suíça':'ch','Áustria':'at','Grécia':'gr','Romênia':'ro','Sérvia':'rs','República Democrática do Congo':'cd','Sudão':'sd','Tanzânia':'tz','Gana':'gh','Iraque':'iq','Síria':'sy','Jordânia':'jo','Catar':'qa','Líbano':'lb','Bangladesh':'bd','Filipinas':'ph','Malásia':'my','Singapura':'sg','Taiwan':'tw','Mongólia':'mn','Afeganistão':'af'
  };
  const SPECIAL_PRODUCTS={
    'Estados Unidos':{tank:'M1A2 Abrams · 40 unidades',jet:'F-35A · esquadrão',missile:'Patriot PAC-3 · bateria',ship:'Arleigh Burke · destróier',carrier:'Gerald R. Ford · porta-aviões'},
    'Rússia':{tank:'T-90M · 40 unidades',jet:'Su-57 · esquadrão',missile:'S-400 · bateria',ship:'Admiral Gorshkov · fragata',carrier:'Grupo aeronaval Kuznetsov'},
    'China':{tank:'Type 99A · 40 unidades',jet:'J-20 · esquadrão',missile:'HQ-9B · bateria',ship:'Type 055 · destróier',carrier:'Fujian · grupo aeronaval'},
    'Brasil':{tank:'VBTP Guarani · 60 unidades',jet:'F-39 Gripen · esquadrão',missile:'ASTROS II · bateria',ship:'Fragata Tamandaré',carrier:'Navio-aeródromo multipropósito'},
    'França':{tank:'Leclerc XLR · 36 unidades',jet:'Rafale F4 · esquadrão',missile:'SAMP/T · bateria',ship:'FREMM Aquitaine · fragata',carrier:'Charles de Gaulle · grupo aeronaval'},
    'Alemanha':{tank:'Leopard 2A8 · 36 unidades',jet:'Eurofighter · esquadrão',missile:'IRIS-T SLM · bateria',ship:'F126 · fragata'},
    'Reino Unido':{tank:'Challenger 3 · 36 unidades',jet:'Typhoon · esquadrão',missile:'Sky Sabre · bateria',ship:'Type 45 · destróier',carrier:'Queen Elizabeth · grupo aeronaval'},
    'Índia':{tank:'Arjun Mk1A · 40 unidades',jet:'Tejas Mk1A · esquadrão',missile:'Akash · bateria',ship:'Kolkata · destróier',carrier:'Vikrant · grupo aeronaval'},
    'Coreia do Sul':{tank:'K2 Black Panther · 40 unidades',jet:'KF-21 · esquadrão',missile:'KM-SAM · bateria',ship:'KDX-III · destróier'},
    'Japão':{tank:'Type 10 · 36 unidades',jet:'F-2 · esquadrão',missile:'Type 03 · bateria',ship:'Mogami · fragata'},
    'Turquia':{tank:'Altay · 40 unidades',jet:'KAAN · esquadrão',missile:'Siper · bateria',ship:'Istanbul · fragata'},
    'Israel':{tank:'Merkava Mk.4 · 36 unidades',jet:'F-16I · esquadrão',missile:'David’s Sling · bateria',ship:'Sa’ar 6 · corveta'}
  };
  const GOODS={
    tank:{category:'DEFESA',icon:'▣',base:6,effect:'Poder militar +3 · força terrestre +4',label:'Pacote blindado'},
    jet:{category:'DEFESA',icon:'◆',base:12,effect:'Poder militar +4 · ciência +1',label:'Esquadrão de caças'},
    missile:{category:'DEFESA',icon:'▲',base:5,effect:'Poder militar +3 · dissuasão +2',label:'Sistema de mísseis'},
    ship:{category:'DEFESA',icon:'▬',base:9,effect:'Poder militar +3 · diplomacia +1',label:'Navio de combate'},
    carrier:{category:'DEFESA',icon:'▰',base:28,effect:'Poder militar +7 · projeção global',label:'Grupo de porta-aviões'},
    textile:{category:'INDÚSTRIA',icon:'▦',base:2.2,effect:'PIB +0,3% · estabilidade +0,4',label:'Têxteis e vestuário'},
    electronics:{category:'INDÚSTRIA',icon:'⌁',base:4.2,effect:'Ciência +2 · PIB +0,2%',label:'Eletrônicos e componentes'},
    food:{category:'ALIMENTOS',icon:'●',base:2.8,effect:'Saúde +1,5 · aprovação +1',label:'Cesta de alimentos'},
    meat:{category:'ALIMENTOS',icon:'◒',base:2.4,effect:'Saúde +0,8 · aprovação +0,7',label:'Proteína e carne'}
  };

  let turnNo=1,turnProcessing=false,turnTarget=0,turnSnapshot=null,turnActions=[],turnNews=[],lastReport=null;
  let marketSeller='',marketCategory='TODOS',marketPurchases={};
  let unit3DSignature='';

  function nationOf(value){return typeof value==='string'?NATIONS.find(n=>n.nome===value):value;}
  function isoOf(value){const n=nationOf(value),name=n?.nome||String(value||'');return String(n?.iso||ISO[name]||'un').toLowerCase();}
  function esc(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  function flagHTML(value,round=false){const n=nationOf(value),name=n?.nome||String(value||'País');return `<span class="fi fi-${isoOf(n||name)} realFlagV27${round?' round':''}" role="img" aria-label="Bandeira de ${esc(name)}"></span>`;}
  function relationWith(n){if(!PLAYER||!n||n===PLAYER)return 100;return window.EMWorld?.relation?.(PLAYER,n)??0;}
  function sameBloc(a,b){return (a?.blocs||[]).find(x=>(b?.blocs||[]).includes(x));}
  function bricsPartner(n){return !!PLAYER&&PLAYER!==n&&(PLAYER.blocs||[]).includes('BRICS')&&(n.blocs||[]).includes('BRICS');}
  function signed(v,digits=1){const x=Math.abs(v)<.05?0:v;return `${x>0?'+':''}${x.toFixed(digits)}`;}

  /* Bandeiras reais nos marcadores, no HUD e nos dossiês. */
  function installFlagMarkers(){
    if(typeof World==='undefined')return;
    const current=World.htmlElement(),base=typeof current==='function'?current:createGlobeMarker;
    World.htmlElement(d=>{
      if(d?.type!=='nation')return base(d);
      const n=d.n,el=document.createElement('button');el.type='button';el.className='nation-flag-marker';
      el.innerHTML=`<span class="flagOrb">${flagHTML(n,true)}</span><span class="flagName">${esc(n.nome)}</span>`;
      el.title=n.nome;el.onclick=e=>{e.stopPropagation();openDossier(n);};d._el=el;return el;
    });
    try{const data=World.htmlElementsData();World.htmlElementsData([]);setTimeout(()=>World.htmlElementsData(data||[]),30);}catch(e){}
  }
  function paintPlayerFlag(){if(!PLAYER)return;const p=document.getElementById('playerFlag'),c=document.getElementById('composeFlag');if(p)p.innerHTML=flagHTML(PLAYER);if(c)c.innerHTML=flagHTML(PLAYER);}

  /* ---------- Mercado internacional ---------- */
  function productName(seller,kind){return SPECIAL_PRODUCTS[seller.nome]?.[kind]||({tank:`Blindado ${seller.nome}`,jet:`Caça multirole ${seller.nome}`,missile:`Defesa aérea ${seller.nome}`,ship:`Fragata ${seller.nome}`,carrier:`Grupo aeronaval ${seller.nome}`,textile:`Têxteis de ${seller.nome}`,electronics:`Tecnologia de ${seller.nome}`,food:`Alimentos de ${seller.nome}`,meat:`Carnes de ${seller.nome}`}[kind]);}
  function sellerCatalog(seller){
    const kinds=['food'],landlocked=['Bolívia','Paraguai','Cazaquistão','Mongólia','Afeganistão','Etiópia','Áustria','Suíça','Sérvia'];
    if(['América do Sul','América do Norte','Oceania','Europa','África'].includes(seller.regiao))kinds.push('meat');
    if(['Ásia','África','Eurásia','América do Sul'].includes(seller.regiao)||seller.pib>500)kinds.push('textile');
    if(seller.ciencia>=52)kinds.push('electronics');
    if(seller.mil>=42)kinds.push('tank');
    if(seller.mil>=54&&seller.ciencia>=38)kinds.push('jet');
    if(seller.mil>=58)kinds.push('missile');
    if(seller.mil>=48&&!landlocked.includes(seller.nome))kinds.push('ship');
    if(seller.mil>=78&&seller.pib>=900&&!landlocked.includes(seller.nome))kinds.push('carrier');
    return [...new Set(kinds)].map(kind=>({kind,...GOODS[kind],name:productName(seller,kind)}));
  }
  function tradeTerms(seller){
    const relation=relationWith(seller),bloc=sameBloc(PLAYER,seller),atWar=PLAYER?.warTarget===seller||seller?.warTarget===PLAYER;
    let discount=0,reason='Preço padrão';
    if(bricsPartner(seller)){discount=.20;reason='Parceiro BRICS · 20% de desconto';}
    else if(bloc){discount=.10;reason=`Parceiro ${bloc} · 10% de desconto`;}
    else if(relation>=60){discount=.08;reason='Parceiro estratégico · 8% de desconto';}
    else if(relation>=30){discount=.04;reason='Boa relação · 4% de desconto';}
    const blocked=!!seller._collapsed||atWar||relation<=-35;
    const blockReason=seller._collapsed?'Estado fornecedor em colapso':atWar?'Comércio suspenso durante a guerra':relation<=-35?'Relação hostil: melhore a diplomacia':'Disponível';
    return{relation,discount,reason,blocked,blockReason};
  }
  function priceFor(seller,item,terms){const quality=clamp((seller.mil+seller.ciencia)/150,.72,1.34),raw=item.base*(.82+quality*.22);return{raw,final:raw*(1-terms.discount)};}
  function applyPurchase(item,seller){
    if(!PLAYER)return;const terms=tradeTerms(seller),price=priceFor(seller,item,terms),key=`${turnNo}|${seller.nome}|${item.kind}`;
    if(terms.blocked||marketPurchases[key])return renderMarket();
    if(PLAYER.caixa<price.final){addBulletin('⚠️','Compra não autorizada',`O Tesouro precisa de ${money(price.final)} para concluir a compra em ${seller.nome}.`,'warn','results');return;}
    PLAYER.caixa-=price.final;
    if(item.kind==='tank'){PLAYER.mil=clamp(PLAYER.mil+3,0,100);PLAYER.warStrength=clamp((PLAYER.warStrength||PLAYER.mil)+4,0,120);}
    if(item.kind==='jet'){PLAYER.mil=clamp(PLAYER.mil+4,0,100);PLAYER.ciencia=clamp(PLAYER.ciencia+1,0,100);}
    if(item.kind==='missile'){PLAYER.mil=clamp(PLAYER.mil+3,0,100);PLAYER.legitimidade=clamp(PLAYER.legitimidade+.5,0,100);}
    if(item.kind==='ship'){PLAYER.mil=clamp(PLAYER.mil+3,0,100);PLAYER.diplo=clamp(PLAYER.diplo+1,0,100);}
    if(item.kind==='carrier'){PLAYER.mil=clamp(PLAYER.mil+7,0,100);PLAYER.diplo=clamp(PLAYER.diplo+2,0,100);PLAYER.divida+=price.final*.08;}
    if(item.kind==='textile'){PLAYER.pib*=1.003;PLAYER.estabilidade=clamp(PLAYER.estabilidade+.4,0,100);}
    if(item.kind==='electronics'){PLAYER.ciencia=clamp(PLAYER.ciencia+2,0,100);PLAYER.pib*=1.002;}
    if(item.kind==='food'){PLAYER.saude=clamp(PLAYER.saude+1.5,0,100);PLAYER.aprovacao=clamp(PLAYER.aprovacao+1,0,100);}
    if(item.kind==='meat'){PLAYER.saude=clamp(PLAYER.saude+.8,0,100);PLAYER.aprovacao=clamp(PLAYER.aprovacao+.7,0,100);}
    window.EMWorld?.changeRelation?.(PLAYER,seller,2);marketPurchases[key]={seller:seller.nome,item:item.name,price:price.final,turn:turnNo};
    turnActions.push(`Compra de ${item.name} em ${seller.nome} por ${money(price.final)}`);
    addBulletin('🛒','Contrato internacional assinado',`${PLAYER.nome} comprou ${item.name} de ${seller.nome} por ${money(price.final)}.${terms.discount?` Desconto: ${Math.round(terms.discount*100)}%.`:''}`,'good','results');
    persistMarket();refresh();renderMarket();
  }
  function persistMarket(){try{localStorage.setItem(MARKET_STORE,JSON.stringify(marketPurchases));}catch(e){}}
  function loadMarket(){try{marketPurchases=JSON.parse(localStorage.getItem(MARKET_STORE)||'{}')||{};}catch(e){marketPurchases={};}}
  function eligibleSellers(){return NATIONS.filter(n=>n!==PLAYER).sort((a,b)=>{const ta=tradeTerms(a),tb=tradeTerms(b);return Number(ta.blocked)-Number(tb.blocked)||tb.relation-ta.relation||b.mil-a.mil;});}
  function renderMarket(){
    const body=document.getElementById('strategyBody');if(!body||!PLAYER)return;
    const sellers=eligibleSellers();let seller=NATIONS.find(n=>n.nome===marketSeller&&n!==PLAYER);if(!seller)seller=sellers[0];if(!seller)return;marketSeller=seller.nome;
    const terms=tradeTerms(seller),catalog=sellerCatalog(seller).filter(item=>marketCategory==='TODOS'||item.category===marketCategory);
    document.querySelectorAll('.strategyTabs button').forEach(b=>b.classList.toggle('active',b.dataset.st==='trade-market'));
    const options=sellers.map(n=>{const t=tradeTerms(n);return `<option value="${esc(n.nome)}" ${n===seller?'selected':''}>${t.blocked?'BLOQUEADO · ':''}${esc(n.nome)} · relação ${t.relation>0?'+':''}${Math.round(t.relation)}</option>`;}).join('');
    const categories=['TODOS','DEFESA','INDÚSTRIA','ALIMENTOS'];
    body.innerHTML=`<div class="marketHeroV27"><div class="marketHeroTopV27">${flagHTML(seller)}<div><small>FORNECEDOR SELECIONADO</small><strong>${esc(seller.nome)}</strong></div><span class="marketRelationV27 ${terms.blocked?'bad':''}">${terms.blocked?'NEGOCIAÇÃO BLOQUEADA':`RELAÇÃO ${terms.relation>0?'+':''}${Math.round(terms.relation)}`}</span></div><p>${terms.blocked?terms.blockReason:terms.reason}. O catálogo e os preços refletem capacidade industrial, qualidade militar e a relação bilateral.</p></div><div class="marketToolbarV27"><select id="marketSellerV27" aria-label="País fornecedor">${options}</select></div><div class="marketCategoryV27">${categories.map(c=>`<button data-market-cat="${c}" class="${c===marketCategory?'active':''}">${c}</button>`).join('')}</div><div class="marketCatalogV27">${catalog.map(item=>{const p=priceFor(seller,item,terms),key=`${turnNo}|${seller.nome}|${item.kind}`,bought=marketPurchases[key],disabled=terms.blocked||bought||PLAYER.caixa<p.final;return `<article class="marketItemV27 ${terms.blocked?'blocked':''}"><div class="marketItemIconV27">${item.icon}</div><div><small>${item.category} · ${esc(seller.nome)}</small><strong>${esc(item.name)}</strong><p>${item.effect}</p>${terms.discount?`<span class="marketDiscountV27">${esc(terms.reason)}</span>`:''}<div class="marketBuyRowV27"><span class="marketPriceV27"><b>${money(p.final)}</b>${terms.discount?`<del>${money(p.raw)}</del>`:''}</span><button data-buy-v27="${item.kind}" ${disabled?'disabled':''}>${bought?'COMPRADO':terms.blocked?'BLOQUEADO':PLAYER.caixa<p.final?'SEM CAIXA':'COMPRAR'}</button></div></div></article>`;}).join('')}</div>`;
    document.getElementById('marketSellerV27').onchange=e=>{marketSeller=e.target.value;renderMarket();};
    body.querySelectorAll('[data-market-cat]').forEach(b=>b.onclick=()=>{marketCategory=b.dataset.marketCat;renderMarket();});
    body.querySelectorAll('[data-buy-v27]').forEach(b=>b.onclick=()=>{const item=sellerCatalog(seller).find(x=>x.kind===b.dataset.buyV27);if(item)applyPurchase(item,seller);});
  }
  function installMarketTab(){
    const tabs=document.querySelector('.strategyTabs');if(!tabs||tabs.querySelector('[data-st="trade-market"]'))return;
    const quote=tabs.querySelector('[data-st="markets"]');if(quote)quote.textContent='COTAÇÕES';
    const b=document.createElement('button');b.dataset.st='trade-market';b.textContent='MERCADO';tabs.insertBefore(b,tabs.querySelector('[data-st="intel"]'));
    b.onclick=()=>renderMarket();
  }

  /* ---------- Modo por turnos e relatório ---------- */
  function snapshot(){if(!PLAYER)return null;return{day:dia,caixa:PLAYER.caixa,pib:PLAYER.pib,approval:PLAYER.aprovacao,stability:PLAYER.estabilidade,legitimacy:PLAYER.legitimidade,health:PLAYER.saude,science:PLAYER.ciencia,military:PLAYER.mil,diplomacy:PLAYER.diplo,debt:PLAYER.divida/Math.max(1,PLAYER.pib)*100,tension:worldTension,cp,influence};}
  function createTurnUI(){
    document.body.classList.add('turnModeV27');
    if(!document.getElementById('turnControlV27'))document.body.insertAdjacentHTML('beforeend','<div id="turnControlV27"><div class="turnIdentityV27"><small>GOVERNO POR TURNOS</small><b id="turnLabelV27">TURNO 1</b><span id="turnDatesV27">30 DIAS</span></div><button id="endTurnV27" type="button">ENCERRAR TURNO</button></div>');
    if(!document.getElementById('turnReportV27'))document.body.insertAdjacentHTML('beforeend','<section id="turnReportV27" aria-modal="true" role="dialog"><div class="turnReportCardV27"><header class="turnReportHeadV27"><div class="turnStampV27">▤</div><div><small id="turnReportKickerV27">RELATÓRIO DO TURNO</small><h2 id="turnReportTitleV27">Balanço do governo</h2><p id="turnReportSubV27"></p></div></header><div class="turnReportBodyV27" id="turnReportBodyV27"></div><footer class="turnReportFooterV27"><span>As consequências já foram aplicadas ao mundo.</span><button id="nextTurnV27" type="button">INICIAR PRÓXIMO TURNO</button></footer></div></section>');
    document.getElementById('endTurnV27').onclick=endTurn;
    document.getElementById('nextTurnV27').onclick=()=>{document.getElementById('turnReportV27').classList.remove('on');turnNo++;beginTurn();};
  }
  function updateTurnUI(){
    const label=document.getElementById('turnLabelV27'),dates=document.getElementById('turnDatesV27'),button=document.getElementById('endTurnV27');
    if(label)label.textContent=`TURNO ${turnNo}`;if(dates)dates.textContent=`DIA ${dia} → ${dia+TURN_DAYS}`;
    if(button){button.disabled=turnProcessing;button.classList.toggle('processing',turnProcessing);button.textContent=turnProcessing?'PROCESSANDO TURNO':'ENCERRAR TURNO';}
  }
  function beginTurn(){turnProcessing=false;document.body.classList.remove('turn-processing-v27');speed=0;turnTarget=0;turnSnapshot=snapshot();turnActions=[];turnNews=[];updateTurnUI();syncWarUnits3D(true);try{localStorage.setItem(TURN_STORE,JSON.stringify({turnNo}));}catch(e){}}
  function endTurn(){
    if(!PLAYER||turnProcessing)return;
    const popup=document.getElementById('popup');if(popup?.classList.contains('on')){addBulletin('⚠️','Decisão pendente','Conclua a decisão aberta antes de encerrar o turno.','warn','results');return;}
    turnProcessing=true;document.body.classList.add('turn-processing-v27');turnTarget=Math.min(DIAS,dia+TURN_DAYS);speed=8;updateTurnUI();
  }
  function deltaCard(label,value,format='points'){
    const tone=value>.04?'good':value<-.04?'bad':'',shown=format==='money'?`${value>=0?'+':'−'}${money(Math.abs(value)).replace('−','')}`:format==='percent'?`${signed(value,1)} p.p.`:`${signed(value,1)}`;
    return `<div class="turnDeltaV27 ${tone}"><small>${label}</small><b>${shown}</b></div>`;
  }
  function reactionText(before,after){
    const approval=after.approval-before.approval,leg=after.legitimacy-before.legitimacy,tension=after.tension-before.tension;
    const people=approval>=2?'A população percebeu melhora concreta e ampliou o apoio ao governo.':approval<=-2?'O custo das decisões chegou ao cotidiano e a aprovação recuou.':'A opinião pública ficou dividida; não houve mudança decisiva no apoio.';
    const media=leg>=1?'A imprensa destacou capacidade de execução e previsibilidade institucional.':leg<=-1?'A cobertura cobrou transparência, custo e legitimidade das medidas.':tension>2?'A mídia concentrou a cobertura no aumento do risco internacional.':'A cobertura foi cautelosa, comparando promessas com resultados.';
    return{people,media};
  }
  function finishTurn(){
    if(!turnProcessing)return;turnProcessing=false;document.body.classList.remove('turn-processing-v27');speed=0;const after=snapshot(),before=turnSnapshot||after,reaction=reactionText(before,after);
    lastReport={before,after,actions:[...turnActions],news:[...turnNews]};
    const actions=turnActions.length?turnActions.slice(-8):['Nenhuma nova ação executiva foi registrada neste turno.'];
    const news=turnNews.length?turnNews.slice(-6):['O cenário internacional permaneceu relativamente estável.'];
    document.getElementById('turnReportKickerV27').textContent=`RELATÓRIO DO TURNO ${turnNo}`;
    document.getElementById('turnReportTitleV27').textContent=`${dataStr(before.day)} — ${dataStr(after.day)}`;
    document.getElementById('turnReportSubV27').textContent=`${after.day-before.day} dias avançados · o mundo reagiu às suas escolhas.`;
    document.getElementById('turnReportBodyV27').innerHTML=`<section class="turnSectionV27 wide"><h3>O QUE MUDOU</h3><div class="turnDeltaGridV27">${deltaCard('CAIXA',after.caixa-before.caixa,'money')}${deltaCard('PIB',after.pib-before.pib,'money')}${deltaCard('APROVAÇÃO',after.approval-before.approval,'percent')}${deltaCard('ESTABILIDADE',after.stability-before.stability,'percent')}${deltaCard('LEGITIMIDADE',after.legitimacy-before.legitimacy,'percent')}${deltaCard('SAÚDE',after.health-before.health,'percent')}${deltaCard('MILITAR',after.military-before.military,'percent')}${deltaCard('RISCO GLOBAL',after.tension-before.tension,'percent')}</div></section><section class="turnSectionV27"><h3>SUAS AÇÕES</h3><div class="turnListV27">${actions.map(x=>`<div class="turnLineV27"><i></i><span>${esc(x)}</span></div>`).join('')}</div></section><section class="turnSectionV27"><h3>REPERCUSSÃO</h3><div class="turnListV27"><div class="turnLineV27 ${after.approval>=before.approval?'good':'bad'}"><i></i><span><b>POPULAÇÃO:</b> ${esc(reaction.people)}</span></div><div class="turnLineV27 ${after.legitimacy>=before.legitimacy?'good':'bad'}"><i></i><span><b>MÍDIA:</b> ${esc(reaction.media)}</span></div></div></section><section class="turnSectionV27 wide"><h3>MUNDO NESTE TURNO</h3><div class="turnListV27">${news.map(x=>`<div class="turnLineV27"><i></i><span>${esc(x)}</span></div>`).join('')}</div></section>`;
    document.getElementById('turnReportV27').classList.add('on');updateTurnUI();syncWarUnits3D(true);refresh();
  }

  /* ---------- Unidades militares 3D ---------- */
  function material(color,emissive=0x000000){return new THREE.MeshPhongMaterial({color,emissive,shininess:35,flatShading:true});}
  function mesh(geometry,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=false;return m;}
  function militaryModel(kind,side=0){
    if(!window.THREE)return new Object();const g=new THREE.Group(),main=material(side?'#e5485e':'#4aa8d8',side?0x310409:0x031b29),dark=material('#172433'),metal=material('#a7b1b9');
    if(kind==='tank'){
      g.add(mesh(new THREE.BoxGeometry(1.65,.42,.9),main,0,.25,0),mesh(new THREE.BoxGeometry(1.5,.22,1.05),dark,0,.05,0),mesh(new THREE.CylinderGeometry(.38,.42,.28,8),main,.05,.58,0));
      const barrel=mesh(new THREE.CylinderGeometry(.07,.08,1.25,8),metal,.65,.62,0);barrel.rotation.z=Math.PI/2;g.add(barrel);
    }else if(kind==='jet'){
      const body=mesh(new THREE.CylinderGeometry(.16,.25,1.9,8),main,0,.25,0);body.rotation.z=Math.PI/2;g.add(body,mesh(new THREE.BoxGeometry(.7,.06,1.65),dark,-.05,.24,0),mesh(new THREE.ConeGeometry(.25,.55,8),metal,1.2,.25,0));g.children[g.children.length-1].rotation.z=-Math.PI/2;
    }else if(kind==='missile'){
      g.add(mesh(new THREE.CylinderGeometry(.15,.18,1.35,10),main,0,.7,0),mesh(new THREE.ConeGeometry(.18,.42,10),metal,0,1.58,0),mesh(new THREE.BoxGeometry(.65,.08,.18),dark,0,.18,0),mesh(new THREE.BoxGeometry(.18,.08,.65),dark,0,.18,0));
    }else{
      const carrier=kind==='carrier';g.add(mesh(new THREE.BoxGeometry(carrier?2.8:2,.28,carrier?1:.72),main,0,.18,0),mesh(new THREE.BoxGeometry(carrier?2.45:1.65,.2,carrier?.82:.58),dark,0,0,0),mesh(new THREE.BoxGeometry(carrier?.45:.55,carrier?.28:.42,carrier?.28:.34),metal,carrier?.62:.2,.52,0));if(carrier)g.add(mesh(new THREE.BoxGeometry(1.25,.035,.06),material('#f1d36c'),-.3,.36,0));
    }
    g.scale.setScalar(kind==='carrier'?.52:kind==='ship'?.55:.48);g.rotation.y=(side?Math.PI:.1);g.userData.kind=kind;return g;
  }
  function activeWarPairs(){
    const pairs=[];const add=(a,b,title,intensity=70)=>{a=nationOf(a);b=nationOf(b);if(!a||!b)return;const key=[a.nome,b.nome].sort().join('|');if(!pairs.some(p=>p.key===key))pairs.push({key,a,b,title,intensity});};
    if(PLAYER?.emGuerra&&PLAYER.warTarget)add(PLAYER,PLAYER.warTarget,`${PLAYER.nome} × ${PLAYER.warTarget.nome}`,85);
    (window.EMStrategy?.conflicts||[]).filter(c=>c.intensity>=50).forEach(c=>add(c.a,c.b,c.name,c.intensity));
    (window.EMCrisis?.crises||[]).filter(c=>!c.contained&&c.kind==='military').forEach(c=>{const ns=(c.nations||[]).slice(-2);if(ns.length>1)add(ns[0],ns[1],c.title,c.intensity);});
    return pairs.slice(0,1);
  }
  function warUnitData(){const out=[];activeWarPairs().forEach((p,index)=>{const midLat=(p.a.lat+p.b.lat)/2,midLng=shortestLng(p.a.lng,p.b.lng,.5),offset=(index-1)*.6;out.push({id:`${p.key}:tank`,kind:'tank',lat:p.a.lat+.45,lng:p.a.lng+.55,side:0,nation:p.a,pair:p,label:`Tanques de ${p.a.nome} · ${p.title}`},{id:`${p.key}:jet`,kind:'jet',lat:midLat+1.2+offset,lng:midLng,side:0,nation:p.a,pair:p,label:`Caças em operação · ${p.title}`},{id:`${p.key}:missile`,kind:'missile',lat:p.b.lat-.35,lng:p.b.lng-.45,side:1,nation:p.b,pair:p,label:`Bateria de mísseis de ${p.b.nome}`},{id:`${p.key}:ship`,kind:p.intensity>78?'carrier':'ship',lat:midLat-1.6,lng:midLng+2.2,side:1,nation:p.b,pair:p,label:`Força naval mobilizada · ${p.title}`});});return out.slice(0,12);}
  function syncWarUnits3D(force=false){
    if(typeof World==='undefined'||!window.THREE||typeof World.objectsData!=='function')return;const data=warUnitData(),sig=data.map(d=>d.id).join('|');if(!force&&sig===unit3DSignature)return;unit3DSignature=sig;
    World.objectsData(data).objectLat('lat').objectLng('lng').objectAltitude(d=>d.kind==='jet'?.07:.025).objectFacesSurface(true).objectThreeObject(d=>militaryModel(d.kind,d.side)).objectLabel(d=>`<div class="warUnitLabelV27">${esc(d.label)}<br><small>Clique para abrir a zona de conflito</small></div>`).onObjectClick(d=>{if(d.nation)focusNation(d.nation,1.42);const c=(window.EMCrisis?.crises||[]).find(x=>!x.contained&&(x.nations||[]).some(n=>n===d.nation?.nome));if(c)setTimeout(()=>window.EMCrisis?.crisisIntervention?.(c),250);else{document.getElementById('strategyPanel')?.classList.add('on');document.querySelector('.strategyTabs [data-st="world"]')?.click();}});
  }

  /* Captura ações e notícias para o relatório do turno. */
  const bulletinV27=addBulletin;addBulletin=function(ico,title,text,type,channel){
    if(PLAYER&&turnSnapshot){const line=`${title}: ${text}`,actual=channel||(type==='act'?'results':'general');if((actual==='general'||turnProcessing)&&!turnNews.includes(line))turnNews.push(line);turnNews=turnNews.slice(-18);if(!turnProcessing&&actual==='results'&&['act','good','war'].includes(type)&&!turnActions.includes(title))turnActions.push(title);}
    return bulletinV27(ico,title,text,type,channel);
  };
  const actionV27=registerAction;registerAction=function(id){if(PLAYER){let label=id;try{label=ACTIONS.find(a=>a.id===id)?.t||id;}catch(e){}if(label&&!turnActions.includes(label))turnActions.push(label);}return actionV27(id);};

  const dossierV27=openDossier;openDossier=function(n){const r=dossierV27(n);const f=document.getElementById('dFlag2');if(f)f.innerHTML=flagHTML(n);return r;};
  const tickV27=tick;tick=function(dt){const decisionOpen=document.getElementById('popup')?.classList.contains('on');if(PLAYER&&!turnProcessing)speed=0;else if(PLAYER&&turnProcessing&&!decisionOpen)speed=8;const r=tickV27(dt);if(turnProcessing&&dia>=turnTarget)finishTurn();if(PLAYER&&dia%5===0)syncWarUnits3D();return r;};
  const startV27=startGame;startGame=function(n){const r=startV27(n);loadMarket();paintPlayerFlag();turnNo=Math.max(1,Math.floor(dia/TURN_DAYS)+1);beginTurn();setTimeout(()=>{installFlagMarkers();syncWarUnits3D(true);},250);return r;};

  createTurnUI();installMarketTab();installFlagMarkers();loadMarket();
  window.addEventListener('beforeunload',()=>{persistMarket();try{localStorage.setItem(TURN_STORE,JSON.stringify({turnNo}));}catch(e){}});
  window.EMTurn={endTurn,beginTurn,get report(){return lastReport;},get number(){return turnNo;}};
  window.EMMarket={render:renderMarket,catalog:sellerCatalog,terms:tradeTerms,flagHTML,isoOf};
  window.EMMilitary3D={sync:syncWarUnits3D};
})();
