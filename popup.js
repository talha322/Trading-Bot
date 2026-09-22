document.addEventListener('DOMContentLoaded', () => {
  // Tabs Logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Load last active tab
  const savedTab = localStorage.getItem('activeQuotexTab') || 'patterns';
  setActiveTab(savedTab);

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      setActiveTab(tabName);
      localStorage.setItem('activeQuotexTab', tabName);
    });
  });

  function setActiveTab(tabName) {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(`tab-${tabName}`);
    
    if (activeBtn && activeContent) {
      activeBtn.classList.add('active');
      activeContent.classList.add('active');
    }
  }

  // DOM Elements
  const toggleBtn = document.getElementById('toggle-btn');

  const enableTelegramCheck = document.getElementById('enableTelegram');
  const telegramInputs = document.getElementById('telegramInputs');
  const botTokenInput = document.getElementById('botToken');
  const chatIdInput = document.getElementById('chatId');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  
  const patternNameInput = document.getElementById('patternName');
  const addGreenBtn = document.getElementById('addGreenBtn');
  const addRedBtn = document.getElementById('addRedBtn');
  const clearBtn = document.getElementById('clearBtn');
  const sequenceDisplay = document.getElementById('sequenceDisplay');
  const savePatternBtn = document.getElementById('savePatternBtn');
  const patternsList = document.getElementById('patternsList');

  const logContainer = document.getElementById('log-container');
  const clearLogBtn = document.getElementById('clear-log-btn');
  const headerCleanAllBtn = document.getElementById('clean-all-btn');

  let currentSequence = [];
  let isRunning = false;

  // Telegram toggle UI update
  enableTelegramCheck.addEventListener('change', (e) => {
    if (e.target.checked) {
      telegramInputs.style.display = 'block';
      telegramInputs.style.opacity = '1';
    } else {
      telegramInputs.style.display = 'none';
      telegramInputs.style.opacity = '0.5';
    }
  });

  // Logging function
  function addLog(message, type = 'normal') {
    chrome.storage.local.get(['appLogs'], (res) => {
      let logs = res.appLogs || [];
      const timeString = new Date().toLocaleTimeString([], { hour12: false });
      logs.unshift({ time: timeString, message, type });
      if (logs.length > 50) logs.pop(); // keep last 50
      chrome.storage.local.set({ appLogs: logs }, renderLogs);
    });
  }

  function renderLogs() {
    chrome.storage.local.get(['appLogs'], (res) => {
      const logs = res.appLogs || [];
      logContainer.innerHTML = '';
      if (logs.length === 0) {
        logContainer.innerHTML = '<p class="log-entry" style="color:var(--text3); text-align:center; padding:20px;">No logs yet...</p>';
        return;
      }
      logs.forEach(log => {
        const p = document.createElement('p');
        p.className = `log-entry ${log.type}`;
        p.innerHTML = `<span style="color:var(--text3)">[${log.time}]</span> ${log.message}`;
        logContainer.appendChild(p);
      });
    });
  }

  // Clear Logs Logic
  const clearLogsAction = () => {
    chrome.storage.local.set({ appLogs: [] }, () => {
      renderLogs();
      const origText = headerCleanAllBtn.innerText;
      headerCleanAllBtn.innerText = "✓ Cleared";
      setTimeout(() => headerCleanAllBtn.innerText = origText, 1500);
    });
  };

  clearLogBtn.addEventListener('click', clearLogsAction);
  headerCleanAllBtn.addEventListener('click', clearLogsAction);

  // Listen for background/content script logs
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.appLogs) renderLogs();
  });

  // Load Initial Data
  chrome.storage.local.get(['telegramBotToken', 'telegramChatId', 'enableTelegram', 'savedPatterns', 'botRunning'], (result) => {
    if (result.telegramBotToken) botTokenInput.value = result.telegramBotToken;
    if (result.telegramChatId) chatIdInput.value = result.telegramChatId;
    if (result.enableTelegram) {
       enableTelegramCheck.checked = true;
       telegramInputs.style.display = 'block';
       telegramInputs.style.opacity = '1';
    }
    
    isRunning = result.botRunning || false;
    updateUIState();
    
    renderPatterns(result.savedPatterns || []);
    renderLogs();
  });

  // Start / Stop Logic
  toggleBtn.addEventListener('click', () => {
    if (!isRunning && enableTelegramCheck.checked && (!botTokenInput.value || !chatIdInput.value)) {
      alert("Please configure Telegram Settings first, or disable Telegram Alerts!");
      document.querySelector('[data-tab="settings"]').click();
      return;
    }

    isRunning = !isRunning;
    chrome.storage.local.set({ botRunning: isRunning }, () => {
      updateUIState();
      
      if (isRunning) {
        addLog("Starting Bot... Opening Quotex tab", "match");
        
        // Open the Quotex Demo page in a new tab
        chrome.tabs.create({ url: "https://market-qx.trade/en/demo-trade", active: true });
        addLog("Quotex Tab Opened. Waiting for candles...", "normal");
        
      } else {
        // Stop the bot and close any open Quotex tabs
        chrome.tabs.query({ url: "*://*.market-qx.trade/*" }, function(tabs) {
          tabs.forEach(tab => chrome.tabs.remove(tab.id));
          addLog("Quotex Tab Closed.", "warn");
        });
        addLog("Radar Stopped.", "warn");
      }
    });
  });

  function updateUIState() {
    if (isRunning) {
      toggleBtn.innerText = "⏹ Stop";
      toggleBtn.classList.add('active'); // makes it red in upwork css
    } else {
      toggleBtn.innerText = "▶ Start";
      toggleBtn.classList.remove('active');
    }
  }

  // Save Settings
  saveSettingsBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      enableTelegram: enableTelegramCheck.checked,
      telegramBotToken: botTokenInput.value.trim(),
      telegramChatId: chatIdInput.value.trim()
    }, () => {
      const orig = saveSettingsBtn.innerText;
      saveSettingsBtn.innerText = "Updated! ✅";
      setTimeout(() => saveSettingsBtn.innerText = orig, 2000);
      addLog("Settings updated.");
    });
  });

  // Pattern Builder
  const renderSequence = () => {
    if (currentSequence.length === 0) {
      sequenceDisplay.innerHTML = '<span class="hint" id="emptyText" style="margin: auto;">No candles added</span>';
      return;
    }
    sequenceDisplay.innerHTML = '';
    currentSequence.forEach((color, idx) => {
      const div = document.createElement('div');
      div.className = `candle-box candle-${color}`;
      div.innerText = idx + 1;
      sequenceDisplay.appendChild(div);
    });
  };

  addGreenBtn.addEventListener('click', () => { currentSequence.push('G'); renderSequence(); });
  addRedBtn.addEventListener('click', () => { currentSequence.push('R'); renderSequence(); });
  clearBtn.addEventListener('click', () => { currentSequence.pop(); renderSequence(); });

  savePatternBtn.addEventListener('click', () => {
    const name = patternNameInput.value.trim();
    if (!name || currentSequence.length === 0) {
      alert("Enter a name and add at least 1 candle.");
      return;
    }

    chrome.storage.local.get(['savedPatterns'], (result) => {
      const patterns = result.savedPatterns || [];
      patterns.push({
        id: Date.now().toString(),
        name: name,
        sequence: [...currentSequence],
        active: true
      });

      chrome.storage.local.set({ savedPatterns: patterns }, () => {
        patternNameInput.value = '';
        currentSequence = [];
        renderSequence();
        renderPatterns(patterns);
        addLog(`Pattern created: ${name}`);
        
        const orig = savePatternBtn.innerText;
        savePatternBtn.innerText = "Saved! ✅";
        setTimeout(() => savePatternBtn.innerText = orig, 2000);
      });
    });
  });

  function renderPatterns(patterns) {
    patternsList.innerHTML = '';
    if (patterns.length === 0) {
      patternsList.innerHTML = '<div style="text-align: center; color: var(--text3); font-size: 11px; padding: 10px;">No patterns saved.</div>';
      return;
    }

    patterns.forEach((p) => {
      const pDiv = document.createElement('div');
      pDiv.style.cssText = `background: var(--bg2); border: 1px solid var(--border); padding: 10px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; opacity: ${p.active ? '1' : '0.6'}`;
      
      const seqHtml = p.sequence.map(c => c === 'G' ? '🟢' : '🔴').join('');
      
      pDiv.innerHTML = `
        <div style="flex:1;">
          <div style="font-weight: 600; font-size: 13px; margin-bottom: 2px;">
            ${p.name} ${p.active ? '<span style="color:var(--accent); font-size: 16px;">•</span>' : ''}
          </div>
          <div style="font-size: 10px; letter-spacing: 2px;">${seqHtml}</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px;">
          <button class="btn-small toggle-btn" style="border-color:${p.active ? 'var(--warn)' : 'var(--accent)'}; color:${p.active ? 'var(--warn)' : 'var(--accent)'}" data-id="${p.id}">
            ${p.active ? 'Pause' : 'Activate'}
          </button>
          <button class="btn-small delete-btn" style="border-color:var(--danger); color:var(--danger)" data-id="${p.id}">Delete</button>
        </div>
      `;
      patternsList.appendChild(pDiv);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const newPatterns = patterns.filter(pt => pt.id !== id);
        chrome.storage.local.set({ savedPatterns: newPatterns }, () => {
            renderPatterns(newPatterns);
            addLog("Pattern deleted.", "warn");
        });
      });
    });

    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const updatedPatterns = patterns.map(pt => pt.id === id ? { ...pt, active: !pt.active } : pt);
        chrome.storage.local.set({ savedPatterns: updatedPatterns }, () => renderPatterns(updatedPatterns));
      });
    });
  }
});
