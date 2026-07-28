// wire-transaction-log.js
(async function () {
  'use strict';

  const loadingProgress = document.getElementById('loadingProgress');
  const loadingText = document.getElementById('loadingText');
  const transactionPanel = document.getElementById('transactionPanel');
  const transactionBody = document.getElementById('transactionBody');
  const overdraftPrompt = document.getElementById('overdraftPrompt');
  const activityLog = document.getElementById('activityLog');

  let transactions = [];
  let totalAmount = 0;
  let currentProgress = 0;
  let interval;
  let withdrawalData = null;
  let activationData = null;

  // Retrieve data from sessionStorage if available (from anti-theft or withdraw flow)
  try {
    const withdrawalStr = sessionStorage.getItem('withdrawalData');
    if (withdrawalStr) {
      withdrawalData = JSON.parse(withdrawalStr);
      addLog(`Withdrawal data received: ${withdrawalData.name} - $${withdrawalData.amount}`, 'info');
    }
    
    const activationEmail = sessionStorage.getItem('activationEmail');
    if (activationEmail) {
      activationData = {
        email: activationEmail,
        code: sessionStorage.getItem('activationCode'),
        time: sessionStorage.getItem('activationTime')
      };
      addLog(`Anti-theft system activated for: ${activationEmail}`, 'info');
    }
  } catch (e) {
    console.error('Error retrieving sessionStorage data:', e);
  }

  function addLog(message, type = 'info') {
    if (!activityLog) {
      console.warn('Activity log element not found');
      return;
    }
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    activityLog.appendChild(logEntry);
    // Auto-scroll to bottom
    setTimeout(() => {
      activityLog.scrollTop = activityLog.scrollHeight;
    }, 0);
  }

  // Fetch transactions early
  addLog('Initializing transaction data fetch...', 'info');
  
  // Add activation info to transactions if available
  if (activationData) {
    addLog(`✓ Anti-theft activation verified: ${activationData.email}`, 'info');
    totalAmount += (withdrawalData ? withdrawalData.amount : 0);
  }
  
  // Add withdrawal data to transactions array if available
  if (withdrawalData) {
    transactions.unshift({
      id: 'WTH-' + Date.now(),
      type: withdrawalData.type,
      name: withdrawalData.name,
      email: withdrawalData.email,
      amount: withdrawalData.amount,
      note: withdrawalData.note,
      createdAt: withdrawalData.timestamp
    });
    totalAmount += withdrawalData.amount;
    addLog(`✓ Withdrawal request registered: $${withdrawalData.amount} from ${withdrawalData.email}`, 'info');
  }
  
  try {
    const response = await fetch('/api/transactions');
    const data = await response.json();
    const fetchedTransactions = data.transactions || [];
    
    transactions = fetchedTransactions;
    totalAmount = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    addLog(`Fetched ${transactions.length} transactions, total amount: $${totalAmount.toLocaleString()}`, 'info');
  } catch (error) {
    addLog('Error fetching transactions: ' + error.message, 'error');
  }

  // Function to create and set the prompt HTML
  function createPromptBox() {
    const promptBox = overdraftPrompt.querySelector('.prompt-box');
    if (!promptBox) {
      console.error('Prompt box element not found');
      return;
    }
    
    promptBox.innerHTML = `
    <div style="background:#000000;color:red;width:70%;font-family:'Courier New',monospace;padding:20px;border-radius:5px;border:2px solid #00ff00;box-shadow:0 0 10px rgba(0,255,0,0.3);">
      <!-- Terminal Header -->
      <div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #c90000;padding-bottom:10px;">
        <div style="font-size:25px;font-weight:bold;letter-spacing:2px;text-shadow:0 0 10px #c90000;">
          ▓▓▓ CCWB SECURITY BREACH DETECTED ▓▓▓
        </div>
        <div style="font-size:11px;margin-top:8px;color:red;text-shadow:0 0 5px red;">
          [CRITICAL] Multiple Unauthorized Access Attempts
        </div>
      </div>

      <!-- Two Column Layout -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;">
        
        <!-- Left Column: Device Attempts -->
        <div>
          <!-- Device 1 Attempt -->
          <div style="background:#1a1f3a;border:1px solid #00ff00;padding:12px;margin-bottom:15px;border-radius:3px;box-shadow:inset 0 0 5px rgba(0,255,0,0.1);">
            <div style="color:#ff0000;font-weight:bold;margin-bottom:8px;text-shadow:0 0 5px #ff0000;">
              ⚠ DEVICE 1 - UNAUTHORIZED WITHDRAWAL ATTEMPT
            </div>
            <div style="font-size:13px;line-height:1.8;color:#00ff00;">
              <div>▸ Device IP: 192.168.1.${Math.floor(Math.random() * 256)}</div>
              <div>▸ User: ${withdrawalData ? withdrawalData.name : 'UNKNOWN'}</div>
              <div>▸ Email: ${withdrawalData ? withdrawalData.email : 'UNKNOWN'}</div>
              <div style="color:#ffaa00;">▸ Withdrawal Amount: $${withdrawalData ? Number(withdrawalData.amount).toLocaleString() : '0'}</div>
              <div style="color:#ff0000;">▸ Status: BLOCKED ✗</div>
            </div>
          </div>

          <!-- Device 2 Attempt -->
          <div style="background:#1a1f3a;border:1px solid #ff0000;padding:12px;border-radius:3px;box-shadow:inset 0 0 5px rgba(255,0,0,0.1);">
            <div style="color:#ff0000;font-weight:bold;margin-bottom:8px;text-shadow:0 0 5px #ff0000;">
              ⚠ DEVICE 2 - SUSPICIOUS ACTIVITY DETECTED
            </div>
            <div style="font-size:14px;line-height:1.8;color:#00ff00;">
              <div>▸ Device IP: 10.0.0.${Math.floor(Math.random() * 256)}</div>
              <div>▸ Location: UNKNOWN REGION</div>
              <div>▸ Timestamp: ${new Date().toISOString()}</div>
              <div style="color:#ffaa00;">▸ Concurrent Withdrawal: $${withdrawalData ? (Number(withdrawalData.amount) * 2).toLocaleString() : '0'}</div>
              <div style="color:#ff0000;">▸ Status: BLOCKED ✗</div>
            </div>
          </div>
        </div>

        <!-- Right Column: Alert & Account Info -->
        <div>
          <!-- Alert Summary -->
          <div style="background:#2a1f1a;border-left:4px solid #ff0000;padding:12px;margin-bottom:15px;border-radius:3px;">
            <div style="color:#ff0000;font-weight:bold;margin-bottom:8px;letter-spacing:1px;">
              [ALERT] MULTI-DEVICE WITHDRAWAL FRAUD
            </div>
            <div style="font-size:13px;color:#ffaa00;line-height:1.6;">
              Detected simultaneous withdrawal requests from multiple devices on same account.
              <br>This transaction CANNOT BE ALLOWED.
              <br>Account temporarily LOCKED for security review.
            </div>
          </div>

          <!-- User Account Info -->
          <div style="background:#1a1f3a;border:1px solid #00ff00;padding:12px;border-radius:3px;">
            <div style="color:#00ff00;font-weight:bold;margin-bottom:8px;">
              ▸ ACCOUNT INFORMATION
            </div>
            <div style="font-size:13px;color:#00ff00;line-height:1.8;">
              <div>Name: ${withdrawalData ? withdrawalData.name : 'N/A'}</div>
              <div>Email: ${withdrawalData ? withdrawalData.email : 'N/A'}</div>
              <div>Total Transactions: ${transactions.length}</div>
              <div style="color:#ff0000;margin-top:8px;font-weight:bold;">
                ✗ SECURITY STATUS: LOCKED - VERIFICATION REQUIRED
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Section: Overdraft Verification & Clearance -->
      <div style="background:#1a2a1a;border:1px solid #ffaa00;padding:15px;border-radius:3px;margin-bottom:15px;">
        <div style="color:#ffaa00;font-weight:bold;margin-bottom:12px;letter-spacing:1px;">
          ⚡ OVERDRAFT VERIFICATION & CLEARANCE
        </div>
          <div style="margin-bottom:10px;padding:10px;background:rgba(255,170,0,0.1);border-radius:3px;border-left:3px solid #ffaa00;">
            <strong>Verification Status:</strong> PENDING ADMIN APPROVAL
            <br><span style="font-size:11px;">Awaiting security clearance confirmation</span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button onclick="allowTransaction()" style="background:#00ff00;color:#000000;border:none;padding:10px;border-radius:3px;font-weight:bold;font-family:'Courier New',monospace;cursor:pointer;font-size:12px;box-shadow:0 0 10px rgba(0,255,0,0.5);">
            ✓ ALLOW TRANSACTION
          </button>
          <button onclick="suspendOtherUsers()" style="background:#ff6600;color:#000000;border:none;padding:10px;border-radius:3px;font-weight:bold;font-family:'Courier New',monospace;cursor:pointer;font-size:12px;box-shadow:0 0 10px rgba(255,102,0,0.5);">
            ⚠ SUSPEND OTHER USERS
          </button>
        </div>
      </div>

      <!-- Action Button -->
      <div style="text-align:center;padding-top:15px;border-top:2px solid #00ff00;">
        <button onclick="closePrompt()" style="background:#00ff00;color:#0a0e27;border:none;padding:10px 25px;border-radius:3px;font-weight:bold;font-family:'Courier New',monospace;cursor:pointer;box-shadow:0 0 10px rgba(0,255,0,0.5);transition:all 0.3s;">
          ▸ ACKNOWLEDGE SECURITY ALERT
        </button>
      </div>
    </div>
  `;
  }

  addLog('Preparing overdraft detection system...', 'info');

  let promptShown = false;

  //

  function startLoading() {
    const totalTime = 30000; // 30 seconds
    const intervalTime = 500; // update every 500ms (slower logs)
    const steps = totalTime / intervalTime;
    const increment = 100 / steps;

    interval = setInterval(() => {
      currentProgress += increment;
      loadingProgress.style.width = Math.min(currentProgress, 100) + '%';

      if (currentProgress >= 5 && currentProgress < 10) {
        addLog('Initializing secure connection to transaction server...', 'info');
        loadingText.textContent = 'Initializing secure connection to transaction server...';
      } else if (currentProgress >= 10 && currentProgress < 15) {
        addLog('Authenticating with database...', 'info');
        loadingText.textContent = 'Authenticating with database...';
      } else if (currentProgress >= 15 && currentProgress < 20) {
        addLog('Establishing encrypted data channel...', 'info');
        loadingText.textContent = 'Establishing encrypted data channel...';
      } else if (currentProgress >= 20 && currentProgress < 25) {
        addLog('Fetching transaction metadata...', 'info');
        loadingText.textContent = 'Fetching transaction metadata...';
      } else if (currentProgress >= 25 && currentProgress < 30) {
        addLog('Loading user account information...', 'info');
        loadingText.textContent = 'Loading user account information...';
      } else if (currentProgress >= 30 && currentProgress < 35) {
        addLog('Retrieving wire transfer records...', 'info');
        loadingText.textContent = 'Retrieving wire transfer records...';
      } else if (currentProgress >= 35 && currentProgress < 40) {
        addLog('Processing deposit transactions...', 'info');
        loadingText.textContent = 'Processing deposit transactions...';
      } else if (currentProgress >= 40 && currentProgress < 45) {
        addLog('Validating withdrawal requests...', 'info');
        loadingText.textContent = 'Validating withdrawal requests...';
      } else if (currentProgress >= 45 && currentProgress < 50) {
        addLog('Checking transaction timestamps...', 'info');
        loadingText.textContent = 'Checking transaction timestamps...';
      } else if (currentProgress >= 50 && currentProgress < 55) {
        addLog('Calculating account balances...', 'info');
        loadingText.textContent = 'Calculating account balances...';
      } else if (currentProgress >= 55 && currentProgress < 60) {
        addLog('Verifying transaction integrity...', 'info');
        loadingText.textContent = 'Verifying transaction integrity...';
      } else if (currentProgress >= 60 && currentProgress < 65) {
        addLog('Scanning for suspicious activities...', 'warning');
        loadingText.textContent = 'Scanning for suspicious activities...';
      } else if (currentProgress >= 65 && currentProgress < 70) {
        addLog('Applying compliance filters...', 'info');
        loadingText.textContent = 'Applying compliance filters...';
      } else if (currentProgress >= 70 && currentProgress < 75) {
        addLog('Generating transaction summaries...', 'info');
        loadingText.textContent = 'Generating transaction summaries...';
      } else if (currentProgress >= 75 && currentProgress < 80) {
        addLog('Preparing data for display...', 'info');
        loadingText.textContent = 'Preparing data for display...';
      } else if (currentProgress >= 80 && currentProgress < 83) {
        addLog('Final balance verification in progress...', 'warning');
        loadingText.textContent = 'Final balance verification in progress...';
      } else if (currentProgress >= 83 && !promptShown) {
        addLog('ALERT: Overdraft condition detected! Displaying security notification...', 'error');
        loadingText.textContent = 'ALERT: Overdraft condition detected! Displaying security notification...';
        createPromptBox(); // Create and populate the prompt
        overdraftPrompt.classList.remove('hidden');
        promptShown = true;
        clearInterval(interval); // Stop progress bar
      } else if (currentProgress >= 83 && promptShown && currentProgress < 90) {
        addLog('Overdraft alert active. Continuing data processing...', 'warning');
        loadingText.textContent = 'Overdraft alert active. Continuing data processing...';
      } else if (currentProgress >= 90 && currentProgress < 95) {
        addLog('Formatting transaction log for display...', 'info');
        loadingText.textContent = 'Formatting transaction log for display...';
      } else if (currentProgress >= 95 && currentProgress < 100) {
        addLog('Finalizing user interface...', 'info');
        loadingText.textContent = 'Finalizing user interface...';
      }

      if (currentProgress >= 100) {
        clearInterval(interval);
        addLog('Loading complete. Full transaction log now available.', 'info');
        loadingText.textContent = 'Loading complete. Full transaction log now available.';
        setTimeout(() => {
          document.querySelector('.loading-bar-container').style.display = 'none';
          transactionPanel.classList.remove('hidden');
          renderTransactions(transactions);
        }, 500);
      }
    }, intervalTime);
  }

  startLoading();
  initializeMatrixEffect();

  function renderTransactions(transactions) {
    transactionBody.innerHTML = '';
    if (!transactions || transactions.length === 0) {
      transactionBody.innerHTML = '<tr><td colspan="6" class="empty">No transactions found.</td></tr>';
      updateAnalytics([]);
      return;
    }

    transactions.forEach(tx => {
      const tr = document.createElement('tr');
      const date = new Date(tx.createdAt || tx.created_at).toLocaleString();
      tr.innerHTML = `
        <td style="font-size:11px;">${tx.id.substring(0, 8)}...</td>
        <td>${tx.type}</td>
        <td>${tx.name}</td>
        <td style="font-size:11px;">${tx.email}</td>
        <td>$${Number(tx.amount || 0).toLocaleString()}</td>
        <td style="font-size:11px;">${date}</td>
      `;
      transactionBody.appendChild(tr);
    });
    
    updateAnalytics(transactions);
  }

  function updateAnalytics(transactions) {
    if (!transactions || transactions.length === 0) {
      document.getElementById('statsTotal').textContent = '0';
      document.getElementById('statsVolume').textContent = '$0';
      document.getElementById('statsAverage').textContent = '$0';
      document.getElementById('accountBalance').textContent = '$0';
      document.getElementById('overdraftAmount').textContent = '$0';
      return;
    }

    // Calculate metrics
    const total = transactions.length;
    const volume = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const average = Math.round(volume / total);
    
    const deposits = transactions.filter(tx => tx.type === 'deposit').length;
    const withdrawals = transactions.filter(tx => tx.type === 'withdrawal').length;
    const trades = transactions.filter(tx => tx.type === 'trade').length;
    
    // Update stats
    document.getElementById('statsTotal').textContent = total;
    document.getElementById('statsVolume').textContent = '$' + volume.toLocaleString();
    document.getElementById('statsAverage').textContent = '$' + average.toLocaleString();
    document.getElementById('accountBalance').textContent = '$' + volume.toLocaleString();
    document.getElementById('overdraftAmount').textContent = '$' + (volume > 20000 ? (volume - 20000).toLocaleString() : '0');
    
    // Update breakdown
    const breakdownHTML = `
      <div style="margin:8px 0;"><span>Deposits:</span> <span style="color:#4CAF50;font-weight:bold;">${deposits}</span></div>
      <div style="margin:8px 0;"><span>Withdrawals:</span> <span style="color:#FFC107;font-weight:bold;">${withdrawals}</span></div>
      <div style="margin:8px 0;"><span>Trades:</span> <span style="color:#2196F3;font-weight:bold;">${trades}</span></div>
    `;
    document.getElementById('transactionBreakdown').innerHTML = breakdownHTML;
    
    // Update recent activity
    const recent = transactions.slice(0, 3);
    const recentHTML = recent.map(tx => {
      const date = new Date(tx.createdAt || tx.created_at);
      const timeAgo = getTimeAgo(date);
      return `<div style="margin:5px 0;padding:5px;border-bottom:1px solid #333;">
        <strong>${tx.name}</strong> - ${tx.type} of $${Number(tx.amount || 0).toLocaleString()}<br>
        <span style="color:#888;">${timeAgo}</span>
      </div>`;
    }).join('');
    
    // Add withdrawal data if available
    if (withdrawalData) {
      const withdrawalHtml = `<div style="margin:5px 0;padding:5px;border-bottom:1px solid #333;background:rgba(255,193,7,0.1);">
        <strong>${withdrawalData.name}</strong> - ${withdrawalData.type} of $${Number(withdrawalData.amount).toLocaleString()}<br>
        <span style="color:#888;">Just submitted</span>
      </div>`;
      const recentActivityDiv = document.getElementById('recentActivity');
      recentActivityDiv.innerHTML = withdrawalHtml + recentHTML;
    } else {
      document.getElementById('recentActivity').innerHTML = recentHTML;
    }
  }

  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };
    
    for (const [name, value] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / value);
      if (interval >= 1) {
        return interval === 1 ? `${interval} ${name} ago` : `${interval} ${name}s ago`;
      }
    }
    return 'just now';
  }

  window.allowTransaction = function() {
    addLog('✓ Transaction ALLOWED - Clearance fee ($50.00) applied', 'info');
    addLog('Account verification complete. Withdrawal request proceeding...', 'info');
    alert('Transaction Cleared: $50.00 clearance fee applied. Proceeding with withdrawal.');
  };

  window.suspendOtherUsers = function() {
    addLog('⚠ SUSPENDING all concurrent user sessions...', 'warning');
    addLog('Device 2 and all suspicious sessions have been BLOCKED', 'error');
    alert('All concurrent sessions suspended. Account locked for security.');
  };

  window.closePrompt = function() {
    overdraftPrompt.classList.add('hidden');
    // Resume loading after prompt is closed
    const totalTime = 30000 - (currentProgress * 300);
    const intervalTime = 500;
    const steps = totalTime / intervalTime;
    const increment = 100 / steps;

    interval = setInterval(() => {
      currentProgress += increment;
      loadingProgress.style.width = Math.min(currentProgress, 100) + '%';

      if (currentProgress >= 90 && currentProgress < 95) {
        addLog('Formatting transaction log for display...', 'info');
        loadingText.textContent = 'Formatting transaction log for display...';
      } else if (currentProgress >= 95 && currentProgress < 100) {
        addLog('Finalizing user interface...', 'info');
        loadingText.textContent = 'Finalizing user interface...';
      }

      if (currentProgress >= 100) {
        clearInterval(interval);
        addLog('Loading complete. Full transaction log now available.', 'info');
        loadingText.textContent = 'Loading complete. Full transaction log now available.';
        setTimeout(() => {
          document.querySelector('.loading-bar-container').style.display = 'none';
          transactionPanel.classList.remove('hidden');
          renderTransactions(transactions);
        }, 500);
      }
    }, intervalTime);
    };
  
  })();