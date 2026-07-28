(() => {
  const logEl = document.getElementById('log');
  const wpsEl = document.getElementById('wps');
  const flagsEl = document.getElementById('flags');
  const amtEl = document.getElementById('amt');
  const conEl = document.getElementById('con');

  let withdrawalsPerSec = 0;
  let suspiciousFlags = 0;
  let interceptedAmt = 0;
  let connections = 120;

  const types = ['TRANSFER','WITHDRAWAL','WIRE','ACH']

  function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min}
  function now(){return new Date().toLocaleTimeString()}
  function maskAcct(){return '****' + randInt(1000,9999)}

  function makeRow(){
    const el = document.createElement('div');
    el.className = 'row';
    const t = now();
    const ty = types[randInt(0,types.length-1)];
    const amt = (Math.random()*20000).toFixed(2);
    const from = 'ADDR:'+maskAcct();
    const to = 'ADDR:'+maskAcct();

    if(ty === 'WITHDRAWAL') el.classList.add('withdraw');
    if(ty === 'TRANSFER') el.classList.add('transfer');

    el.innerHTML = `
      <div class="time">${t}</div>
      <div class="acc">${from} → ${to}</div>
      <div class="type">${ty} <span class="badge">#${randInt(1000,9999)}</span></div>
      <div class="amt">$${amt}</div>
    `;

    // random chance to mark suspicious
    if(Math.random() < 0.08){
      const flag = document.createElement('div');
      flag.className = 'badge';
      flag.textContent = 'SUSPICIOUS';
      el.querySelector('.type').appendChild(flag);
      suspiciousFlags++;
      flagsEl.textContent = suspiciousFlags;
    }

    if(ty === 'WITHDRAWAL'){
      withdrawalsPerSec++;
      interceptedAmt += parseFloat(amt);
      wpsEl.textContent = withdrawalsPerSec;
      amtEl.textContent = '$' + interceptedAmt.toFixed(2);
    }

    // occasionally add a bold issue note for third-party activity
    if(Math.random() < 0.015){
      const issues = document.getElementById('issues');
      const li = document.createElement('li');
      li.className = 'pending';
      li.textContent = 'Third-party session escalation observed — remote withdraw in progress';
      issues.insertBefore(li, issues.firstChild);
      // delay before making it prominent and announcing
      const delay = randInt(3000, 9000); // 3-9s
      setTimeout(()=>{
        li.classList.remove('pending');
        li.classList.add('highlight','pulse');
        announceIssue(li.textContent);
      }, delay);
    }

    logEl.appendChild(el);
    // keep it long: remove oldest after many
    if(logEl.children.length > 200) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
  }

  // burst generator
  function start(){
    // seed a lot of rows so page looks busy
    for(let i=0;i<60;i++) makeRow();

    // announce any pre-existing highlighted or pending issue on load (with delay)
    const existing = document.querySelector('.issues .highlight, .issues .pending');
    if(existing){
      setTimeout(()=> announceIssue(existing.textContent), randInt(2000,6000));
    }

    setInterval(()=>{
      // create a few rows per tick to look noisy
      const n = randInt(1,4);
      for(let i=0;i<n;i++) makeRow();
      // slight jitter to metrics
      connections += randInt(-2,5);
      if(connections < 80) connections = 80;
      conEl.textContent = connections;
      // decay withdrawalsPerSec slowly
      withdrawalsPerSec = Math.max(0, Math.floor(withdrawalsPerSec * 0.85));
      wpsEl.textContent = withdrawalsPerSec;
    }, 700);
  }

  // allow quick reset for demo
  window.demoReset = function(){
    logEl.innerHTML = '';
    withdrawalsPerSec = 0; suspiciousFlags = 0; interceptedAmt = 0; connections = 120;
    wpsEl.textContent = '0'; flagsEl.textContent = '0'; amtEl.textContent = '0'; conEl.textContent = '120';
  }

  // announcement helper: show banner and optionally speak
  function announceIssue(text){
    const banner = document.getElementById('alertBanner');
    if(!banner) return;
    banner.hidden = false;
    banner.classList.remove('hidden');
    banner.innerHTML = `<div class="dot"></div>${text}`;
    // speak if available
    try{
      if(window.speechSynthesis){
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.05; utter.pitch = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    }catch(e){/* ignore */}
    // hide after a few seconds
    setTimeout(()=>{
      banner.classList.add('hidden');
      setTimeout(()=>{ banner.hidden = true; }, 500);
    }, 5500);
  }

  // run on load
  document.addEventListener('DOMContentLoaded', start);
  // in case DOM already loaded
  if(document.readyState === 'complete' || document.readyState === 'interactive') start();

})();
