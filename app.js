(() => {
  'use strict';

  const LB_TO_KG = 0.45359237;
  const UG_PER_KG = 1000000000;
  const STORAGE_KEY = 'plateLoaderUnifiedV3';
  let uid = 1;

  function toUg(value, unit){
    const n = Number(value);
    if(!Number.isFinite(n)) return null;
    const kg = unit === 'lb' ? n * LB_TO_KG : n;
    return Math.round(kg * UG_PER_KG);
  }
  function fromUg(ug, unit){
    if(ug == null) return null;
    const kg = ug / UG_PER_KG;
    return unit === 'lb' ? kg / LB_TO_KG : kg;
  }
  function makePlate(value,unit,enabled=true,custom=true){
    return { id:`p${Date.now()}_${uid++}`, ug:toUg(value,unit), originValue:Number(value), originUnit:unit, enabled, custom };
  }

  const defaultCatalog = () => [45,35,25,10,5,2.5].map(v => makePlate(v,'lb',true,false));

  const state = {
    unit:'lb',
    equipment:'barbell',
    includeEquipment:true,
    targetUg:null,
    equipmentUg:{barbell:toUg(45,'lb'), sled:0},
    plates:defaultCatalog()
  };

  const $ = id => document.getElementById(id);
  const els = {
    target:$('targetWeight'),
    includeEquipment:$('includeEquipment'),
    includeLabel:$('includeLabel'),
    includeHelp:$('includeHelp'),
    openSetup:$('openSetup'),
    closeSetup:$('closeSetup'),
    setupBackdrop:$('setupBackdrop'),
    barbellWeight:$('barbellWeight'),
    sledWeight:$('sledWeight'),
    unitSegment:$('unitSegment'),
    equipSegment:$('equipmentSegment'),
    plateGrid:$('plateGrid'),
    customPlate:$('customPlate'),
    addCustom:$('addCustom'),
    customList:$('customList'),
    resetInventory:$('resetInventory'),
    saveState:$('saveState'),
    result:$('resultCard'),
    liveVisual:$('liveVisual')
  };

  function fmt(n,max=3){
    if(!Number.isFinite(Number(n))) return '';
    return Number(Number(n).toFixed(max)).toLocaleString(undefined,{maximumFractionDigits:max});
  }
  function displayWeightUg(ug){ return `${fmt(fromUg(ug,state.unit))} ${state.unit}`; }
  function displayPlate(p){ return `${fmt(fromUg(p.ug,state.unit), state.unit==='lb'?2:3)} ${state.unit}`; }
  function originLabel(p){
    const shown = fromUg(p.ug,state.unit);
    if(p.originUnit === state.unit || Math.abs(shown-p.originValue)<0.0005) return '';
    return `${fmt(p.originValue,3)} ${p.originUnit} plate`;
  }

  function save(){
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify({
        unit:state.unit,
        equipment:state.equipment,
        includeEquipment:state.includeEquipment,
        targetUg:state.targetUg,
        equipmentUg:state.equipmentUg,
        plates:state.plates
      }));
    }catch(e){}
  }

  function flashSaved(message='Saved'){
    els.saveState.textContent=message;
    clearTimeout(flashSaved.timer);
    flashSaved.timer=setTimeout(()=>{ els.saveState.textContent='Changes save automatically.'; },1500);
  }

  function load(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const s=JSON.parse(raw);
      if(s.unit==='lb'||s.unit==='kg') state.unit=s.unit;
      if(s.equipment==='barbell'||s.equipment==='sled') state.equipment=s.equipment;
      if(typeof s.includeEquipment==='boolean') state.includeEquipment=s.includeEquipment;
      if(Number.isFinite(s.targetUg)) state.targetUg=s.targetUg;
      if(s.equipmentUg && Number.isFinite(s.equipmentUg.barbell) && Number.isFinite(s.equipmentUg.sled)) state.equipmentUg=s.equipmentUg;
      if(Array.isArray(s.plates) && s.plates.length){
        state.plates=s.plates
          .filter(p=>p && Number.isFinite(p.ug) && p.ug>0)
          .map(p=>({
            id:p.id||`p${Date.now()}_${uid++}`,
            ug:Math.round(p.ug),
            originValue:Number(p.originValue)||fromUg(p.ug,p.originUnit==='kg'?'kg':'lb'),
            originUnit:p.originUnit==='kg'?'kg':'lb',
            enabled:p.enabled!==false,
            custom:!!p.custom
          }));
      }
    }catch(e){}
  }

  function renderSegments(){
    els.unitSegment.querySelectorAll('button').forEach(b=>{
      const active=b.dataset.unit===state.unit;
      b.classList.toggle('active',active);
      b.setAttribute('aria-pressed',String(active));
    });
    els.equipSegment.querySelectorAll('button').forEach(b=>{
      const active=b.dataset.equipment===state.equipment;
      b.classList.toggle('active',active);
      b.setAttribute('aria-pressed',String(active));
    });
    document.querySelectorAll('.unitText').forEach(e=>e.textContent=state.unit);
  }

  function renderInputs(){
    renderSegments();
    els.includeEquipment.checked=state.includeEquipment;
    const isBar=state.equipment==='barbell';
    els.includeLabel.textContent=isBar?'Include barbell weight':'Include sled resistance';
    els.includeHelp.textContent=state.includeEquipment
      ? 'Your target represents the full loaded weight.'
      : 'Your target represents plate weight only.';
    if(state.targetUg!=null && document.activeElement!==els.target){
      els.target.value=fmt(fromUg(state.targetUg,state.unit),3);
    }
    if(document.activeElement!==els.barbellWeight){
      els.barbellWeight.value=fmt(fromUg(state.equipmentUg.barbell,state.unit),3);
    }
    if(document.activeElement!==els.sledWeight){
      els.sledWeight.value=fmt(fromUg(state.equipmentUg.sled,state.unit),3);
    }
  }

  function renderPlates(){
    els.plateGrid.innerHTML='';
    state.plates.forEach(p=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='plate-option'+(p.enabled?' selected':'');
      b.dataset.plateId=p.id;
      b.setAttribute('aria-pressed',String(p.enabled));
      const sub=originLabel(p);
      b.innerHTML=`${displayPlate(p)}${sub?`<small>${sub}</small>`:''}`;
      els.plateGrid.appendChild(b);
    });

    els.customList.innerHTML='';
    state.plates.filter(p=>p.custom).forEach(p=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='custom-chip';
      b.dataset.removePlate=p.id;
      b.innerHTML=`Remove ${displayPlate(p)} <span>×</span>`;
      els.customList.appendChild(b);
    });
  }

  function renderEmptyVisual(){
    if(state.equipment==='barbell'){
      els.liveVisual.innerHTML=`<div class="visual-label">Barbell preview</div><div class="bar-visual"><div class="bar-shaft"></div><div class="bar-collar left"></div><div class="bar-collar right"></div><div class="visual-empty">Enter a target weight to build the load.</div></div>`;
    }else{
      els.liveVisual.innerHTML=`<div class="visual-label">Sled preview</div><div class="sled-visual"><div class="sled-frame"></div><div class="sled-platform"></div><div class="sled-horn left"></div><div class="sled-horn right"></div><div class="visual-empty">Enter a target weight to build the load.</div></div>`;
    }
  }

  function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){const t=b;b=a%b;a=t;}return a;}
  function gcdArray(a){return a.reduce((g,n)=>gcd(g,n),0)||1;}

  function solve(targetUg, plates){
    if(targetUg<0) return {error:'Target plate load cannot be negative.'};
    if(targetUg===0) return {exact:{combo:[],sumUg:0},lower:null,higher:null};

    const enabled=plates.filter(p=>p.enabled).sort((a,b)=>b.ug-a.ug);
    if(!enabled.length) return {error:'Open Setup and select at least one available plate size.'};

    const originUnits=[...new Set(enabled.map(p=>p.originUnit))];
    const basis=originUnits.length===1?originUnits[0]:state.unit;
    const scale=1000;
    const coins=enabled.map(p=>({p,units:Math.max(1,Math.round(fromUg(p.ug,basis)*scale))}));
    const targetUnits=Math.max(0,Math.round(fromUg(targetUg,basis)*scale));
    const g=gcdArray(coins.map(c=>c.units));
    const normCoins=coins.map(c=>({...c,n:Math.max(1,Math.round(c.units/g))}));
    const normTarget=targetUnits/g;
    const maxCoin=Math.max(...normCoins.map(c=>c.n));
    const cap=Math.ceil(normTarget)+maxCoin*2;

    if(cap>1500000){
      return {error:'That load is too large for the current plate increments. Try a smaller target or remove very small custom plate sizes.'};
    }

    const INF=1e9;
    const dp=new Int32Array(cap+1);
    const prev=new Int32Array(cap+1);
    const coinIdx=new Int16Array(cap+1);
    dp.fill(INF); prev.fill(-1); coinIdx.fill(-1); dp[0]=0;

    for(let amt=1;amt<=cap;amt++){
      for(let i=0;i<normCoins.length;i++){
        const c=normCoins[i].n;
        if(c<=amt && dp[amt-c]!==INF && dp[amt-c]+1<dp[amt]){
          dp[amt]=dp[amt-c]+1;
          prev[amt]=amt-c;
          coinIdx[amt]=i;
        }
      }
    }

    const reconstruct=idx=>{
      if(idx<0||idx>cap||dp[idx]===INF) return null;
      const combo=[];
      let cur=idx;
      while(cur>0){
        const ci=coinIdx[cur];
        if(ci<0)return null;
        combo.push(normCoins[ci].p);
        cur=prev[cur];
      }
      combo.sort((a,b)=>b.ug-a.ug);
      return {combo,sumUg:combo.reduce((s,p)=>s+p.ug,0)};
    };

    const center=Math.round(normTarget);
    let exact=null, lower=null, higher=null;
    const seen=new Set();

    const consider=idx=>{
      if(idx<0||idx>cap||seen.has(idx)||dp[idx]===INF)return;
      seen.add(idx);
      const r=reconstruct(idx);
      if(!r)return;
      if(r.sumUg===targetUg){
        if(!exact||r.combo.length<exact.combo.length) exact=r;
      }else if(r.sumUg<targetUg){
        if(!lower||r.sumUg>lower.sumUg||(r.sumUg===lower.sumUg&&r.combo.length<lower.combo.length)) lower=r;
      }else{
        if(!higher||r.sumUg<higher.sumUg||(r.sumUg===higher.sumUg&&r.combo.length<higher.combo.length)) higher=r;
      }
    };

    const radius=Math.min(cap,Math.max(maxCoin*3,5000));
    for(let d=0;d<=radius;d++){
      consider(center-d);
      if(d) consider(center+d);
      if(exact && lower && higher) break;
      if(lower && higher && d>maxCoin) break;
    }

    if(exact) return {exact,lower:null,higher:null};

    if(!lower || !higher){
      for(let i=0;i<=cap;i++){
        if(dp[i]!==INF) consider(i);
      }
    }
    return {exact:null,lower,higher};
  }

  function plateHeight(p,combo){
    const max=Math.max(...combo.map(x=>x.ug),1);
    const min=Math.min(...combo.map(x=>x.ug),max);
    if(max===min)return 72;
    return Math.round(44+((p.ug-min)/(max-min))*50);
  }

  function discsHTML(combo){
    return combo.map(p=>`<div class="plate-disc" style="height:${plateHeight(p,combo)}px"><span>${fmt(fromUg(p.ug,state.unit),2)}</span></div>`).join('');
  }

  function visualHTML(combo,equipUg,plateUg){
    const discs=discsHTML(combo);
    const perSide=combo.reduce((s,p)=>s+p.ug,0);
    const perSideText=combo.length?combo.map(p=>fmt(fromUg(p.ug,state.unit),2)).join(' + '):'No plates';
    const displayedTotal=state.includeEquipment?plateUg+equipUg:plateUg;
    const equipmentDetail=state.includeEquipment
      ? ` · ${displayWeightUg(equipUg)} ${state.equipment==='barbell'?'empty weight':'starting resistance'}`
      : '';
    const totalLabel=state.includeEquipment?'total':'plates';

    if(state.equipment==='barbell'){
      return `<div class="visual-label">Barbell${equipmentDetail}</div><div class="bar-visual"><div class="bar-center-label">${displayWeightUg(displayedTotal)} ${totalLabel}</div><div class="bar-shaft"></div><div class="bar-collar left"></div><div class="bar-collar right"></div><div class="bar-plates left">${discs}</div><div class="bar-plates right">${discs}</div>${combo.length?'':'<div class="visual-empty">No plates needed for this load.</div>'}</div><div class="visual-total"><strong>${perSideText}</strong> on each side</div>`;
    }

    return `<div class="visual-label">Sled${equipmentDetail}</div><div class="sled-visual"><div class="sled-frame"></div><div class="sled-platform"></div><div class="sled-horn left"></div><div class="sled-horn right"></div><div class="sled-plates left">${discs}</div><div class="sled-plates right">${discs}</div>${combo.length?'':'<div class="visual-empty">No plates needed for this load.</div>'}</div><div class="visual-total"><strong>${displayWeightUg(displayedTotal)}</strong> ${totalLabel} · ${displayWeightUg(perSide)} plates per side</div>`;
  }

  function platesHTML(combo){
    return combo.length
      ? combo.map(p=>`<span class="plate-pill">${displayPlate(p)}</span>`).join('')
      : '<span class="note">No plates needed</span>';
  }

  function groupedSteps(combo){
    if(!combo.length)return '<li>No plates are needed.</li>';
    const groups=[];
    combo.forEach(p=>{
      const last=groups.at(-1);
      if(last&&last.ug===p.ug) last.count++;
      else groups.push({p,count:1});
    });
    return groups.map(g=>`<li>Add ${g.count>1?`${g.count} × `:''}${displayPlate(g.p)} plate${g.count>1?'s':''} to <strong>each side</strong>.</li>`).join('');
  }

  function altBlock(r,targetUg,equipUg,included,label){
    const plateUg=r.sumUg*2;
    const actualUg=plateUg+equipUg;
    const interpreted=included?actualUg:plateUg;
    const diff=interpreted-targetUg;
    return `<div class="alternative"><h3>${label}: ${displayWeightUg(interpreted)}</h3><p>${displayWeightUg(Math.abs(diff))} ${diff<0?'lighter':'heavier'} than target.</p><div class="side-title">Each side</div><div class="plates">${platesHTML(r.combo)}</div></div>`;
  }

  function showError(msg){
    els.result.innerHTML=`<span class="status error">! Check input</span><p class="note">${msg}</p>`;
    els.result.classList.add('show');
  }

  function clearCalculation(){
    els.result.innerHTML='';
    els.result.classList.remove('show');
    renderEmptyVisual();
  }

  function calculate(){
    syncInputsToState();
    if(state.targetUg==null||state.targetUg<0){
      clearCalculation();
      return;
    }

    const equipUg=state.equipmentUg[state.equipment];
    const plateTotalNeeded=state.targetUg-(state.includeEquipment?equipUg:0);

    if(plateTotalNeeded<0){
      showError(`Your target is lighter than the ${state.equipment} itself. Increase the target or turn off “Include ${state.equipment==='barbell'?'barbell weight':'sled resistance'}.”`);
      renderEmptyVisual();
      return;
    }

    const perSideTarget=Math.round(plateTotalNeeded/2);
    const solved=solve(perSideTarget,state.plates);
    if(solved.error){
      showError(solved.error);
      renderEmptyVisual();
      return;
    }

    if(solved.exact){
      const r=solved.exact;
      const plateUg=r.sumUg*2;
      const totalUg=plateUg+equipUg;
      els.liveVisual.innerHTML=visualHTML(r.combo,equipUg,plateUg);

      const equipmentSummary=state.includeEquipment
        ? `<div class="summary-box"><span>${state.equipment==='barbell'?'Barbell weight':'Sled resistance'}</span><strong>${displayWeightUg(equipUg)}</strong></div><div class="summary-box"><span>Loaded total</span><strong>${displayWeightUg(totalUg)}</strong></div>`
        : '';

      els.result.innerHTML=`
        <span class="status exact">✓ Exact even load</span>
        <div class="big-number">${displayWeightUg(r.sumUg)}</div>
        <div class="big-caption">plates on each side</div>
        <div class="side-title">Load on each side, inside → outside</div>
        <div class="plates">${platesHTML(r.combo)}</div>
        <div class="summary-grid">
          <div class="summary-box"><span>Plate weight</span><strong>${displayWeightUg(plateUg)}</strong></div>
          <div class="summary-box"><span>Total plates</span><strong>${r.combo.length*2}</strong></div>
          ${equipmentSummary}
        </div>
        <ol class="steps">${groupedSteps(r.combo)}</ol>`;
    }else{
      const primary=solved.lower||solved.higher;
      if(primary){
        const plateUg=primary.sumUg*2;
        els.liveVisual.innerHTML=visualHTML(primary.combo,equipUg,plateUg);
      }
      const alts=[
        solved.lower?altBlock(solved.lower,state.targetUg,equipUg,state.includeEquipment,'Closest lighter'):'',
        solved.higher?altBlock(solved.higher,state.targetUg,equipUg,state.includeEquipment,'Closest heavier'):''
      ].join('');
      els.result.innerHTML=`
        <span class="status near">≈ No exact match</span>
        <h3 class="section-title">Nearest even loads</h3>
        <p class="note">Your available plates cannot hit ${displayWeightUg(state.targetUg)} exactly while keeping both sides equal.</p>
        <div class="alternatives">${alts}</div>`;
    }

    els.result.classList.add('show');
    save();
  }

  function syncInputsToState(){
    const t=Number(els.target.value);
    state.targetUg=els.target.value!==''&&Number.isFinite(t)&&t>=0?toUg(t,state.unit):null;

    const bar=Number(els.barbellWeight.value);
    if(Number.isFinite(bar)&&bar>=0){
      state.equipmentUg.barbell=toUg(bar,state.unit);
    }

    const sled=Number(els.sledWeight.value);
    if(Number.isFinite(sled)&&sled>=0){
      state.equipmentUg.sled=toUg(sled,state.unit);
    }

    state.includeEquipment=els.includeEquipment.checked;
  }

  function setUnit(unit){
    if(unit===state.unit)return;
    syncInputsToState();
    state.unit=unit;
    renderInputs();
    renderPlates();
    save();
    if(state.targetUg!=null) calculate();
    else renderEmptyVisual();
  }

  function setEquipment(type){
    if(type===state.equipment)return;
    syncInputsToState();
    state.equipment=type;
    renderInputs();
    save();
    if(state.targetUg!=null) calculate();
    else renderEmptyVisual();
  }

  function addPlate(){
    const v=Number(els.customPlate.value);
    if(!Number.isFinite(v)||v<=0)return;
    const ug=toUg(v,state.unit);
    const existing=state.plates.find(p=>Math.abs(p.ug-ug)<=5);
    if(existing) existing.enabled=true;
    else state.plates.push(makePlate(v,state.unit,true,true));
    els.customPlate.value='';
    renderPlates();
    save();
    flashSaved('Plate added');
    if(state.targetUg!=null)calculate();
  }

  function resetPlates(){
    state.plates=defaultCatalog();
    renderPlates();
    save();
    flashSaved('Plate inventory reset');
    if(state.targetUg!=null)calculate();
  }

  function openSetup(){
    els.setupBackdrop.hidden=false;
    document.body.classList.add('sheet-open');
    requestAnimationFrame(()=>els.closeSetup.focus());
  }

  function closeSetup(){
    els.setupBackdrop.hidden=true;
    document.body.classList.remove('sheet-open');
    els.openSetup.focus();
  }

  document.addEventListener('click',e=>{
    const unit=e.target.closest('[data-unit]');
    if(unit){ setUnit(unit.dataset.unit); return; }

    const eq=e.target.closest('[data-equipment]');
    if(eq){ setEquipment(eq.dataset.equipment); return; }

    const plate=e.target.closest('[data-plate-id]');
    if(plate){
      const p=state.plates.find(x=>x.id===plate.dataset.plateId);
      if(p){
        p.enabled=!p.enabled;
        renderPlates();
        save();
        if(state.targetUg!=null)calculate();
      }
      return;
    }

    const remove=e.target.closest('[data-remove-plate]');
    if(remove){
      state.plates=state.plates.filter(p=>p.id!==remove.dataset.removePlate);
      renderPlates();
      save();
      flashSaved('Plate removed');
      if(state.targetUg!=null)calculate();
    }
  });

  els.openSetup.addEventListener('click',openSetup);
  els.closeSetup.addEventListener('click',closeSetup);
  els.setupBackdrop.addEventListener('click',e=>{ if(e.target===els.setupBackdrop) closeSetup(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!els.setupBackdrop.hidden) closeSetup(); });

  els.addCustom.addEventListener('click',addPlate);
  els.resetInventory.addEventListener('click',resetPlates);
  els.customPlate.addEventListener('keydown',e=>{
    if(e.key==='Enter'){
      e.preventDefault();
      addPlate();
    }
  });

  els.includeEquipment.addEventListener('change',()=>{
    state.includeEquipment=els.includeEquipment.checked;
    renderInputs();
    save();
    if(state.targetUg!=null)calculate();
    else clearCalculation();
  });

  els.target.addEventListener('input',()=>{
    const v=Number(els.target.value);
    state.targetUg=els.target.value!==''&&Number.isFinite(v)&&v>=0?toUg(v,state.unit):null;
    save();
    if(state.targetUg!=null)calculate();
    else clearCalculation();
  });

  els.barbellWeight.addEventListener('input',()=>{
    const v=Number(els.barbellWeight.value);
    if(Number.isFinite(v)&&v>=0){
      state.equipmentUg.barbell=toUg(v,state.unit);
      save();
      if(state.equipment==='barbell'&&state.includeEquipment&&state.targetUg!=null) calculate();
    }
  });

  els.sledWeight.addEventListener('input',()=>{
    const v=Number(els.sledWeight.value);
    if(Number.isFinite(v)&&v>=0){
      state.equipmentUg.sled=toUg(v,state.unit);
      save();
      if(state.equipment==='sled'&&state.includeEquipment&&state.targetUg!=null) calculate();
    }
  });

  load();
  renderInputs();
  renderPlates();
  renderEmptyVisual();
  if(state.targetUg!=null) calculate();

  if('serviceWorker' in navigator && location.protocol.startsWith('http')){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
})();