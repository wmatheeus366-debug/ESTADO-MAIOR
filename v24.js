/* Estado Maior V24 — fronteiras leves, aura de guerra e orçamento visual. */
(function(){
  document.body.classList.add('performance-tuned');
  const isMobile=matchMedia('(max-width:820px)').matches;
  const warNames=new Set();let warSignature='',boundaries=[],lastPrune=0,lastUnitFrame=0,lastSituationRefresh=0;
  const englishAliases={
    'Estados Unidos':'United States of America','Rússia':'Russia','Ucrânia':'Ukraine','Irã':'Iran','Israel':'Israel','Coreia do Norte':'North Korea','Coreia do Sul':'South Korea','China':'China','Taiwan':'Taiwan','Sudão':'Sudan','Sudão do Sul':'South Sudan','Arábia Saudita':'Saudi Arabia','Iêmen':'Yemen','Armênia':'Armenia','Azerbaijão':'Azerbaijan','Brasil':'Brazil','Alemanha':'Germany','França':'France','Reino Unido':'United Kingdom','Espanha':'Spain','Itália':'Italy','Índia':'India','Japão':'Japan','Turquia':'Turkey','Síria':'Syria','Iraque':'Iraq','Venezuela':'Venezuela','Bolívia':'Bolivia','Tchéquia':'Czechia','República Democrática do Congo':'Dem. Rep. Congo','República do Congo':'Congo','República Centro-Africana':'Central African Rep.','Macedônia do Norte':'North Macedonia','Bósnia e Herzegovina':'Bosnia and Herz.','Costa do Marfim':"Côte d'Ivoire",'Myanmar':'Myanmar','Laos':'Laos','Vietnã':'Vietnam','Camboja':'Cambodia','Palestina':'Palestine','Kosovo':'Kosovo'
  };
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
  function featureIsAtWar(feature){
    const props=feature?.properties||{},featureName=normalize(props.name||props.NAME||props.ADMIN||'');if(!featureName)return false;
    for(const name of warNames){if(nameForms(name).has(featureName))return true;}return false;
  }
  function refreshBoundaryColors(){
    if(!boundaries.length)return;
    World.polygonCapColor(f=>featureIsAtWar(f)?'rgba(225,28,58,.25)':'rgba(4,12,20,.018)')
      .polygonStrokeColor(f=>featureIsAtWar(f)?'rgba(255,92,112,.92)':'rgba(178,215,232,.34)')
      .polygonAltitude(f=>featureIsAtWar(f)?.007:.001)
      .polygonsData(boundaries);
  }
  function updateWarAura(force=false){
    const next=collectWarCountries();if(!force&&next===warSignature)return;warSignature=next;
    NATIONS.forEach(n=>n._warAura=warNames.has(n.nome));
    World.pointRadius(n=>n?._warAura?.43:PLAYER===n?.34:selN===n?.29:.14)
      .pointAltitude(n=>n?._warAura?.03:PLAYER===n?.038:selN===n?.028:.014)
      .pointColor(n=>n?._warAura?'#ef334f':nationColor(n))
      .pointsTransitionDuration(0).pointsData(NATIONS);
    refreshBoundaryColors();
  }

  function pruneVisuals(force=false){
    const now=performance.now();if(!force&&now-lastPrune<900)return;lastPrune=now;
    const militaryCrises=new Set((window.EMCrisis?.crises||[]).filter(c=>!c.contained&&c.kind==='military').map(c=>c.id));
    const counts={traffic:0,ambient:0,other:0},perEvent=new Map(),perCrisis=new Map();
    mobileUnits=mobileUnits.filter(u=>{
      if(u.scope==='war')return false;
      if(u.crisisId&&militaryCrises.has(u.crisisId))return false;
      if(u.scope==='flash')return false;
      if(u.scope==='traffic')return counts.traffic++<(isMobile?3:6);
      if(u.scope==='ambient')return counts.ambient++<(isMobile?1:2);
      if(u.scope==='event'){
        if(['tank','soldier','plane'].includes(u.kind))return false;const key=u.eventId||'event',n=perEvent.get(key)||0;perEvent.set(key,n+1);return n<(isMobile?2:4);
      }
      if(u.scope==='catastrophe'){
        const key=u.crisisId||'crisis',n=perCrisis.get(key)||0;perCrisis.set(key,n+1);return u.stationary&&n<(isMobile?1:2);
      }
      return counts.other++<8;
    });
    impactRings=impactRings.filter(r=>{
      const red=String(r.rgb||'251,75,100').startsWith('251,')||String(r.rgb||'').startsWith('255,');
      if(red)return false;if(r._until&&r._until<Date.now())return false;return true;
    }).slice(-(isMobile?3:5));
    ambientArcs=ambientArcs.filter(a=>!a._until||a._until>Date.now()).slice(-(isMobile?8:14));
    warArcs=[];
  }

  const layerBase=refreshGlobeLayers;
  refreshGlobeLayers=function(){pruneVisuals();return layerBase();};
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
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('fronteiras');return r.json();}).then(world=>{
      boundaries=topojson.feature(world,world.objects.countries).features;
      World.polygonsTransitionDuration(0).polygonSideColor(()=> 'rgba(0,0,0,0)').polygonLabel(()=> '').polygonsData(boundaries);
      refreshBoundaryColors();if(status)status.textContent=`${boundaries.length} FRONTEIRAS ATIVAS`;setTimeout(()=>status?.classList.remove('on'),1800);
    }).catch(()=>{if(status)status.textContent='FRONTEIRAS INDISPONÍVEIS';setTimeout(()=>status?.classList.remove('on'),2200);});
  }

  document.body.insertAdjacentHTML('beforeend','<div id="borderStatusV24">OTIMIZANDO MAPA</div>');
  try{World.renderer().setPixelRatio(Math.min(devicePixelRatio,isMobile?.9:1.1));World.arcsTransitionDuration(0);World.controls().autoRotateSpeed=.22;}catch(e){}
  pruneVisuals(true);updateWarAura(true);queueGlobeRefresh();
  (window.requestIdleCallback||function(cb){setTimeout(cb,700);})(loadBorders,{timeout:2500});
  setInterval(()=>{pruneVisuals();updateWarAura();queueGlobeRefresh();},2500);
  window.EMPerformance={pruneVisuals,updateWarAura,get warCountries(){return [...warNames];}};
})();
