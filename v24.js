/* Estado Maior V24 — fronteiras leves, aura de guerra e orçamento visual. */
(function(){
  document.body.classList.add('performance-tuned');
  const isMobile=matchMedia('(max-width:820px)').matches;
  const warNames=new Set(),collapseNames=new Set();let warSignature='',boundaries=[],lastPrune=0,lastUnitFrame=0,lastSituationRefresh=0;
  const englishAliases={
    'Estados Unidos':'United States of America','Rússia':'Russia','Ucrânia':'Ukraine','Irã':'Iran','Israel':'Israel','Coreia do Norte':'North Korea','Coreia do Sul':'South Korea','China':'China','Taiwan':'Taiwan','Sudão':'Sudan','Sudão do Sul':'South Sudan','Arábia Saudita':'Saudi Arabia','Iêmen':'Yemen','Armênia':'Armenia','Azerbaijão':'Azerbaijan','Brasil':'Brazil','Alemanha':'Germany','França':'France','Reino Unido':'United Kingdom','Espanha':'Spain','Itália':'Italy','Índia':'India','Japão':'Japan','Turquia':'Turkey','Síria':'Syria','Iraque':'Iraq','Venezuela':'Venezuela','Bolívia':'Bolivia','Tchéquia':'Czechia','República Democrática do Congo':'Dem. Rep. Congo','República do Congo':'Congo','República Centro-Africana':'Central African Rep.','Macedônia do Norte':'North Macedonia','Bósnia e Herzegovina':'Bosnia and Herz.','Costa do Marfim':"Côte d'Ivoire",'Myanmar':'Myanmar','Laos':'Laos','Vietnã':'Vietnam','Camboja':'Cambodia','Palestina':'Palestine','Kosovo':'Kosovo'
  };
  const baseIso2={'Brasil':'BR','Argentina':'AR','Chile':'CL','Colômbia':'CO','Peru':'PE','Venezuela':'VE','México':'MX','Estados Unidos':'US','Canadá':'CA','Cuba':'CU','Reino Unido':'GB','França':'FR','Alemanha':'DE','Espanha':'ES','Itália':'IT','Portugal':'PT','Polônia':'PL','Ucrânia':'UA','Rússia':'RU','Turquia':'TR','Suécia':'SE','Noruega':'NO','Egito':'EG','Nigéria':'NG','África do Sul':'ZA','Etiópia':'ET','Quênia':'KE','Marrocos':'MA','Argélia':'DZ','Israel':'IL','Arábia Saudita':'SA','Irã':'IR','Emirados Árabes':'AE','Índia':'IN','Paquistão':'PK','China':'CN','Japão':'JP','Coreia do Sul':'KR','Coreia do Norte':'KP','Indonésia':'ID','Vietnã':'VN','Tailândia':'TH','Cazaquistão':'KZ','Austrália':'AU','Nova Zelândia':'NZ','Uruguai':'UY','Paraguai':'PY','Bolívia':'BO','Equador':'EC','Países Baixos':'NL','Bélgica':'BE','Suíça':'CH','Áustria':'AT','Grécia':'GR','Romênia':'RO','Sérvia':'RS','República Democrática do Congo':'CD','Sudão':'SD','Tanzânia':'TZ','Gana':'GH','Iraque':'IQ','Síria':'SY','Jordânia':'JO','Catar':'QA','Líbano':'LB','Bangladesh':'BD','Filipinas':'PH','Malásia':'MY','Singapura':'SG','Taiwan':'TW','Mongólia':'MN','Afeganistão':'AF'};
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const nameForms=name=>new Set([normalize(name),normalize(englishAliases[name]||'')].filter(Boolean));

  function collectWarCountries(){
    const next=new Set();
    if(PLAYER?.emGuerra){next.add(PLAYER.nome);if(PLAYER.warTarget)next.add(PLAYER.warTarget.nome);}
    (window.EMCrisis?.crises||[]).filter(c=>!c.contained&&c.kind==='military').forEach(c=>c.nations.forEach(n=>next.add(n)));
    (window.EMStrategy?.conflicts||[]).filter(c=>c.intensity>=70||(c.intensity>=45&&/guerra|conflito|eua.?irã|sudão/i.test(c.name))).forEach(c=>{next.add(c.a);next.add(c.b);});
    mapLiveEvents.filter(e=>e.kind==='military'&&e.lifeState==='escalated').forEach(e=>{if(e.a)next.add(e.a.nome);if(e.b)next.add(e.b.nome);});
    warNames.clear();next.forEach(n=>warNames.add(n));return [...next].sort().join('|');
  }
  function featureNation(feature){
    if(!feature)return null;if(Object.prototype.hasOwnProperty.call(feature,'_emNation'))return feature._emNation;
    const props=feature.properties||{},iso=String(feature.id||props.ISO_A2||props.iso_a2||'').toUpperCase(),featureName=normalize(props.name||props.NAME||props.NAME_EN||props.ADMIN||'');
    feature._emNation=NATIONS.find(n=>String(n.iso||baseIso2[n.nome]||'').toUpperCase()===iso)||NATIONS.find(n=>nameForms(n.nome).has(featureName))||null;return feature._emNation;
  }
  function featureIsAtWar(feature){const n=featureNation(feature);return !!n&&warNames.has(n.nome);}
  function featureIsCollapsed(feature){const n=featureNation(feature);return !!n&&collapseNames.has(n.nome);}
  function refreshBoundaryColors(){
    if(!boundaries.length)return;
    collapseNames.clear();NATIONS.filter(n=>n._collapsed).forEach(n=>collapseNames.add(n.nome));
    World.polygonCapColor(f=>featureIsCollapsed(f)?'rgba(76,84,94,.62)':featureIsAtWar(f)?'rgba(225,28,58,.25)':'rgba(4,12,20,.018)')
      .polygonStrokeColor(f=>featureIsCollapsed(f)?'rgba(155,164,174,.82)':featureIsAtWar(f)?'rgba(255,92,112,.92)':'rgba(190,222,235,.48)')
      .polygonAltitude(f=>featureIsCollapsed(f)?.005:featureIsAtWar(f)?.007:.0015)
      .polygonsData(boundaries);
  }
  function updateWarAura(force=false){
    const next=collectWarCountries();if(!force&&next===warSignature)return;warSignature=next;
    NATIONS.forEach(n=>n._warAura=warNames.has(n.nome));
    World.pointRadius(n=>n?._collapsed?.28:n?._warAura?.43:PLAYER===n?.34:selN===n?.29:.14)
      .pointAltitude(n=>n?._collapsed?.018:n?._warAura?.03:PLAYER===n?.038:selN===n?.028:.014)
      .pointColor(n=>n?._collapsed?'#69717b':n?._warAura?'#ef334f':nationColor(n))
      .pointsTransitionDuration(0).pointsData(NATIONS);
    refreshBoundaryColors();
  }

  function pruneVisuals(force=false){
    const now=performance.now();if(!force&&now-lastPrune<900)return;lastPrune=now;
    const militaryCrises=new Set((window.EMCrisis?.crises||[]).filter(c=>!c.contained&&c.kind==='military').map(c=>c.id));
    const counts={traffic:0,ambient:0,other:0},perEvent=new Map(),perCrisis=new Map();
    mobileUnits=mobileUnits.filter(u=>{
      if(['war','flash','traffic','ambient','event','catastrophe'].includes(u.scope))return false;
      if(u.crisisId&&militaryCrises.has(u.crisisId)&&u.scope!=='crisis-point')return false;
      if(['tank','soldier','plane','ship','truck','car','explosion','ruin','fire'].includes(u.kind))return false;
      if(u.scope==='event-point'){const key=u.eventId||'event',n=perEvent.get(key)||0;perEvent.set(key,n+1);return n<1;}
      if(u.scope==='crisis-point'){const key=u.crisisId||u.markerId||'crisis',n=perCrisis.get(key)||0;perCrisis.set(key,n+1);return n<1;}
      return counts.other++<(isMobile?4:7);
    });
    /* O mapa de calor e a borda do país já comunicam a guerra. Ondas e
       trajetórias hostis duplicavam o aviso, poluíam o mapa e custavam FPS. */
    impactRings=[];
    ambientArcs=ambientArcs.filter(a=>{
      if(a._until&&a._until<Date.now())return false;
      const type=String(a.type||'').toLowerCase();
      const colors=Array.isArray(a.colors)?a.colors.join('|'):String(a.color||'');
      const hostile=type==='battle'||type==='war'||type.includes('military')||/fb4b64|ff7a30|251\s*,\s*75\s*,\s*100/i.test(colors);
      return !hostile;
    }).slice(-(isMobile?6:10));
    warArcs=[];
  }

  const layerBase=refreshGlobeLayers;
  refreshGlobeLayers=function(){
    pruneVisuals();
    const result=layerBase();
    /* Garante que efeitos antigos salvos em memória também desapareçam. */
    if((World.ringsData()||[]).length)World.ringsData([]);
    return result;
  };
  updateWarUnits=function(now=performance.now()){
    const interval=isMobile?260:170;if(document.hidden||now-lastUnitFrame<interval)return;lastUnitFrame=now;
    mobileUnits.forEach(u=>{if(!u.stationary)moveUnit(u);});lastHtmlSignature='';refreshGlobeLayers();
  };
  drawWarArc=function(a,b){
    warArcs=[];impactRings=impactRings.filter(r=>!String(r.rgb||'').startsWith('251,')&&!String(r.rgb||'').startsWith('255,'));
    if(a)a._warAura=true;if(b)b._warAura=true;updateWarAura(true);queueGlobeRefresh();
  };
  spawnWarUnits=function(a,b){clearWarUnits();if(a)a._warAura=true;if(b)b._warAura=true;updateWarAura(true);};
  const impactBase=pulseImpact;
  pulseImpact=function(n,rgb='251,75,100'){
    const red=String(rgb).startsWith('251,')||String(rgb).startsWith('255,');if(red){if(n){n._warAuraUntil=Date.now()+1800;World.pointsData(NATIONS);}return;}
    impactBase(n,rgb);impactRings=impactRings.slice(-3);
  };
  const endWarBase=encerrarGuerra;
  encerrarGuerra=function(a,b){const r=endWarBase(a,b);if(a)a._warAura=false;if(b)b._warAura=false;updateWarAura(true);return r;};

  /* O painel antigo fica oculto na V23; não reconstruí-lo a cada evento economiza DOM. */
  renderMapActivity=function(){
    const drawer=document.getElementById('situationDrawer');if(drawer?.classList.contains('on')&&Date.now()-lastSituationRefresh>800){lastSituationRefresh=Date.now();window.EMV23?.renderSituation?.();}
  };

  function loadBorders(){
    const status=document.getElementById('borderStatusV24');status?.classList.add('on');if(status)status.textContent='CARREGANDO FRONTEIRAS';
    if(!window.topojson){if(status)status.textContent='FRONTEIRAS INDISPONÍVEIS';setTimeout(()=>status?.classList.remove('on'),2200);return;}
    const isoAtlas='https://gist.githubusercontent.com/gregpabian/70933d92cd62ffc57216f943f98ff075/raw/f862941d33e2907f057471e617e938413f996997/countries.json',fallbackAtlas='https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
    const request=url=>fetch(url,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('fronteiras');return r.json();});
    request(isoAtlas).catch(()=>request(fallbackAtlas)).then(world=>{
      const object=world.objects.countries||world.objects[Object.keys(world.objects)[0]];boundaries=topojson.feature(world,object).features;
      World.polygonsTransitionDuration(0).polygonSideColor(()=> 'rgba(0,0,0,0)').polygonLabel(f=>{const n=featureNation(f);return n?`<b>${n.nome}</b>${n._collapsed?'<br><span style="color:#aab2bc">ESTADO COLAPSADO</span>':''}`:'';}).onPolygonClick(f=>{const n=featureNation(f);if(n)openDossier(n);}).polygonsData(boundaries);
      refreshBoundaryColors();if(status)status.textContent=`${boundaries.length} FRONTEIRAS ATIVAS`;setTimeout(()=>status?.classList.remove('on'),1800);
    }).catch(()=>{if(status)status.textContent='FRONTEIRAS INDISPONÍVEIS';setTimeout(()=>status?.classList.remove('on'),2200);});
  }

  document.body.insertAdjacentHTML('beforeend','<div id="borderStatusV24">OTIMIZANDO MAPA</div>');
  try{World.renderer().setPixelRatio(Math.min(devicePixelRatio,isMobile?.72:.88));World.arcsTransitionDuration(0);World.controls().autoRotateSpeed=.16;World.showGraticules(false);if(PERF_LEVEL!=='high')World.bumpImageUrl(null);}catch(e){}
  pruneVisuals(true);updateWarAura(true);queueGlobeRefresh();
  (window.requestIdleCallback||function(cb){setTimeout(cb,700);})(loadBorders,{timeout:2500});
  setInterval(()=>{pruneVisuals();updateWarAura();queueGlobeRefresh();},2500);
  window.EMPerformance={pruneVisuals,updateWarAura,refreshBoundaryColors,get warCountries(){return [...warNames];},get collapsedCountries(){return [...collapseNames];}};
})();
