/* Estado Maior V28 — precisão territorial, consequências legíveis e render leve. */
(function(){
  'use strict';
  document.body.classList.add('performance-v28');
  let impactTimerV28=0,impactSequenceV28=0,lastMarkerSignatureV28='';

  function addUnique(list,n){if(n&&!list.includes(n))list.push(n);}
  function compactNationMarkers(){
    const list=[];addUnique(list,PLAYER);addUnique(list,selN);addUnique(list,PLAYER?.warTarget);
    (window.EMPerformance?.warCountries||[]).forEach(name=>addUnique(list,NATIONS.find(n=>n.nome===name)));
    ['Estados Unidos','China','Rússia','Índia'].forEach(name=>addUnique(list,NATIONS.find(n=>n.nome===name)));
    return list.slice(0,8).map(n=>nationMarkers.find(d=>d.n===n)).filter(Boolean);
  }
  visibleNationMarkers=function(){return compactNationMarkers();};

  function applyLeanRenderer(){
    try{
      World.renderer().setPixelRatio(Math.min(devicePixelRatio,.78));
      World.showAtmosphere(false).showGraticules(false).bumpImageUrl(null);
      World.pointsTransitionDuration(0).arcsTransitionDuration(0).htmlTransitionDuration(0).polygonsTransitionDuration(0);
      World.controls().autoRotateSpeed=.13;
    }catch(e){}
  }
  function pruneMapNoise(){
    if(!PLAYER)return;const seenEvent=new Set(),seenCrisis=new Set();
    mobileUnits=mobileUnits.filter(u=>{
      if(['traffic','ambient','war','flash','catastrophe','event'].includes(u.scope))return false;
      if(u.scope==='event-point'){if(seenEvent.has(u.eventId))return false;seenEvent.add(u.eventId);return seenEvent.size<=4;}
      if(u.scope==='crisis-point'){if(seenCrisis.has(u.crisisId))return false;seenCrisis.add(u.crisisId);return seenCrisis.size<=3;}
      return !!u.stationary;
    });
    impactRings=[];warArcs=[];ambientArcs=[];routeArcs=[];
    const markers=compactNationMarkers(),sig=markers.map(m=>m.n.nome).join('|')+'|'+mobileUnits.map(u=>u.eventId||u.crisisId||u.markerId).join('|');
    if(sig!==lastMarkerSignatureV28){lastMarkerSignatureV28=sig;lastHtmlSignature='';queueGlobeRefresh();}
  }

  function impactSnapshot(){
    if(!PLAYER)return null;const target=selN&&selN!==PLAYER?selN:null;
    return{target,targetName:target?.nome,approval:PLAYER.aprovacao,stability:PLAYER.estabilidade,legitimacy:PLAYER.legitimidade,health:PLAYER.saude,science:PLAYER.ciencia,military:PLAYER.mil,diplomacy:PLAYER.diplo,cash:PLAYER.caixa,pib:PLAYER.pib,debt:PLAYER.divida/Math.max(1,PLAYER.pib)*100,cp,influence,relation:target&&window.EMWorld?EMWorld.relation(PLAYER,target):null,targetHealth:target?.saude,targetStability:target?.estabilidade,targetMilitary:target?.mil};
  }
  const METRICS=[
    ['approval','Aprovação','number',1],['stability','Estabilidade','number',1],['legitimacy','Legitimidade','number',1],['health','Saúde','number',1],['science','Ciência','number',1],['military','Defesa','number',1],['diplomacy','Diplomacia','number',1],['cash','Caixa','money',1],['pib','PIB','money',1],['debt','Dívida/PIB','percent',-1],['cp','Ação','integer',1],['influence','Influência','integer',1],['relation','Relação bilateral','integer',1],['targetHealth','Saúde do país','number',1],['targetStability','Estabilidade do país','number',1],['targetMilitary','Defesa do país','number',1]
  ];
  function formatValue(v,kind){if(kind==='money')return money(v);if(kind==='percent')return `${v.toFixed(1)}%`;if(kind==='integer')return String(Math.round(v));return v.toFixed(1);}
  function actionLabel(btn){const item=btn.closest('.marketItemV27')?.querySelector('strong')?.textContent,card=btn.closest('.acard')?.querySelector('.at')?.textContent;return (item||card||btn.textContent||'Ação executada').replace(/\s+/g,' ').trim().slice(0,90);}
  function showActionLevels(before,label,sequence){
    if(sequence!==impactSequenceV28||!before||!PLAYER)return;const after=impactSnapshot();if(!after)return;const rows=[];
    METRICS.forEach(([key,name,kind,direction])=>{const a=before[key],b=after[key];if(a==null||b==null)return;const delta=b-a,threshold=kind==='money'?.25:.04;if(Math.abs(delta)<threshold)return;const beneficial=delta*direction>0;rows.push({name,kind,a,b,delta,tone:beneficial?'good':'bad'});});
    if(!rows.length)return;let box=document.getElementById('actionResultV28');if(!box){document.body.insertAdjacentHTML('beforeend','<aside id="actionResultV28"></aside>');box=document.getElementById('actionResultV28');}
    box.innerHTML=`<div class="actionResultHeadV28"><i>↕</i><div><small>RESULTADO IMEDIATO DA AÇÃO</small><strong>${label}${before.targetName?` · ${before.targetName}`:''}</strong></div></div><div class="actionLevelsV28">${rows.slice(0,9).map(r=>`<div class="actionLevelV28 ${r.tone}"><small>${r.name}</small><b>${formatValue(r.a,r.kind)} → ${formatValue(r.b,r.kind)} <em>${r.delta>0?'+':''}${r.kind==='money'?money(r.delta):r.delta.toFixed(r.kind==='integer'?0:1)}</em></b></div>`).join('')}</div>`;
    box.classList.add('on');clearTimeout(impactTimerV28);impactTimerV28=setTimeout(()=>box.classList.remove('on'),7600);
  }
  document.addEventListener('click',event=>{
    const btn=event.target.closest('button');if(!btn||!PLAYER||btn.disabled||btn.closest('#turnReportV27')||btn.id==='endTurnV27')return;
    const before=impactSnapshot(),label=actionLabel(btn),sequence=++impactSequenceV28;setTimeout(()=>showActionLevels(before,label,sequence),80);
  },true);

  const refreshV28=refreshGlobeLayers;refreshGlobeLayers=function(){pruneMapNoise();return refreshV28();};
  const startV28=startGame;startGame=function(n){const result=startV28(n);applyLeanRenderer();setTimeout(()=>{pruneMapNoise();window.EMMilitary3D?.sync?.(true);},350);return result;};
  applyLeanRenderer();pruneMapNoise();setInterval(pruneMapNoise,1800);
  window.EMV28={pruneMapNoise,applyLeanRenderer,compactNationMarkers};
})();
