// Activation page script
(function(){
  // Allowed activation codes (for demo). Replace or extend as needed.
  const VALID_CODES = ['48290517','12345678','87654321'];

  // Grab elements
  const input = document.getElementById('codeInput');
  const btn = document.getElementById('activateBtn');
  const result = document.getElementById('result');

  // Try prefill from query string
  const params = new URLSearchParams(window.location.search);
  const pre = params.get('code');
  if(pre){
    input.value = pre.slice(0,8);
  }

  function showMessage(success, message){
    result.style.display='block';
    result.style.background = success ? 'rgba(0,255,65,0.08)' : 'rgba(255,0,81,0.08)';
    result.style.border = success ? '1px solid rgba(0,255,65,0.2)' : '1px solid rgba(255,0,81,0.2)';
    result.textContent = message;
  }

  function validateCode(code){
    return /^\d{8}$/.test(code) && VALID_CODES.includes(code);
  }

  btn.addEventListener('click', ()=>{
    const code = (input.value||'').trim();
    if(!/\d{8}$/.test(code)){
      showMessage(false,'Please enter a valid 8-digit code.');
      return;
    }
    if(validateCode(code)){
      showMessage(true,'Activation successful! Your service is now active. Redirecting...');
      setTimeout(()=>{window.location.href='anti-theft.html?activated=1&code='+encodeURIComponent(code);},1200);
    } else {
      showMessage(false,'Activation failed: code invalid or expired.');
    }
  });
})();
