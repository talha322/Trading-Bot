// Tabs Logic
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// DOM Elements
const toggleBtn = document.getElementById('toggle-btn');
const enableTelegramCheck = document.getElementById('enableTelegram');
const enableAutoTradeCheck = document.getElementById('enableAutoTrade');
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

const dirUpBtn = document.getElementById('dirUpBtn');
const dirDownBtn = document.getElementById('dirDownBtn');

const logContainer = document.getElementById('log-container');
const clearLogBtn = document.getElementById('clear-log-btn');
const headerCleanAllBtn = document.getElementById('clean-all-btn');

let currentSequence = [];
let isRunning = false;
let editingPatternIndex = null;
let tradeDirection = 'UP'; // UP or DOWN

function updateDirUI(dir) {
  tradeDirection = dir;
  if (dir === 'UP') {
    dirUpBtn.style.border = '2px solid #10b981';
    dirUpBtn.style.color = '#10b981';
    dirDownBtn.style.border = '1px solid var(--border)';
    dirDownBtn.style.color = 'var(--text3)';
  } else {
    dirDownBtn.style.border = '2px solid #ef4444';
    dirDownBtn.style.color = '#ef4444';
    dirUpBtn.style.border = '1px solid var(--border)';
    dirUpBtn.style.color = 'var(--text3)';
  }
}

dirUpBtn.addEventListener('click', () => updateDirUI('UP'));
dirDownBtn.addEventListener('click', () => updateDirUI('DOWN'));

// Telegram toggle UI update & Auto-save
enableTelegramCheck.addEventListener('change', (e) => {
  if (e.target.checked) {
    telegramInputs.style.display = 'block';
    telegramInputs.style.opacity = '1';
  } else {
    telegramInputs.style.display = 'none';
    telegramInputs.style.opacity = '0.5';
  }
  
  chrome.storage.local.set({ enableTelegram: e.target.checked }, () => {
    addLog(`Telegram Alerts are now ${e.target.checked ? 'ON' : 'OFF'}`);
  });
});

// Auto-save Auto-Trade toggle immediately
enableAutoTradeCheck.addEventListener('change', (e) => {
  chrome.storage.local.set({ autoTradeEnabled: e.target.checked }, () => {
    addLog(`Auto-Trade is now ${e.target.checked ? 'ON' : 'OFF'}`);
  });
});

// Logging function
function addLog(message, type = 'normal') {
  chrome.storage.local.get(['appLogs'], (res) => {
    let logs = res.appLogs || [];
    const timeString = new Date().toLocaleTimeString([], { hour12: false });
    logs.unshift({ time: timeString, message, type });
    if (logs.length > 50) logs.pop();
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

chrome.storage.onChanged.addListener((changes) => {
  if (changes.appLogs) renderLogs();
});

// Load Initial Data
chrome.storage.local.get(['telegramBotToken', 'telegramChatId', 'enableTelegram', 'autoTradeEnabled', 'savedPatterns', 'botRunning'], (result) => {
  if (result.telegramBotToken) botTokenInput.value = result.telegramBotToken;
  if (result.telegramChatId) chatIdInput.value = result.telegramChatId;
  if (result.enableTelegram) {
     enableTelegramCheck.checked = true;
     telegramInputs.style.display = 'block';
     telegramInputs.style.opacity = '1';
  }
  if (result.autoTradeEnabled) {
     enableAutoTradeCheck.checked = true;
  }
  
  isRunning = result.botRunning || false;
  updateUIState();
  
  renderPatterns(result.savedPatterns || []);
  renderLogs();
});

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
      chrome.tabs.create({ url: "https://market-qx.trade/en/demo-trade", active: true });
      addLog("Quotex Tab Opened. Waiting for candles...", "normal");
    } else {
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
    toggleBtn.classList.add('active');
  } else {
    toggleBtn.innerText = "▶ Start";
    toggleBtn.classList.remove('active');
  }
}

saveSettingsBtn.addEventListener('click', () => {
  chrome.storage.local.set({
    enableTelegram: enableTelegramCheck.checked,
    autoTradeEnabled: enableAutoTradeCheck.checked,
    telegramBotToken: botTokenInput.value.trim(),
    telegramChatId: chatIdInput.value.trim()
  }, () => {
    const orig = saveSettingsBtn.innerText;
    saveSettingsBtn.innerText = "Updated! ✅";
    setTimeout(() => saveSettingsBtn.innerText = orig, 2000);
    addLog(`Settings updated. Auto-Trade: ${enableAutoTradeCheck.checked ? 'ON' : 'OFF'}`);
  });
});

function updateSequenceDisplay() {
  sequenceDisplay.innerHTML = '';
  if (currentSequence.length === 0) {
    sequenceDisplay.innerHTML = '<span style="color:var(--text3); font-size:12px;">No candles added</span>';
    return;
  }
  currentSequence.forEach(c => {
    const span = document.createElement('span');
    span.style.fontSize = '20px';
    span.style.marginRight = '4px';
    span.innerText = c === 'G' ? '🟢' : '🔴';
    sequenceDisplay.appendChild(span);
  });
  sequenceDisplay.scrollLeft = sequenceDisplay.scrollWidth;
}

addGreenBtn.addEventListener('click', () => {
  currentSequence.push('G');
  updateSequenceDisplay();
});

addRedBtn.addEventListener('click', () => {
  currentSequence.push('R');
  updateSequenceDisplay();
});

clearBtn.addEventListener('click', () => {
  currentSequence = [];
  patternNameInput.value = '';
  editingPatternIndex = null;
  savePatternBtn.innerText = "💾 Save Pattern";
  updateDirUI('UP');
  updateSequenceDisplay();
});

savePatternBtn.addEventListener('click', () => {
  const name = patternNameInput.value.trim();
  if (!name || currentSequence.length === 0) {
    alert("Enter a name and add at least 1 candle.");
    return;
  }

  const newPattern = {
    name: name,
    sequence: [...currentSequence],
    action: tradeDirection,
    active: true
  };

  chrome.storage.local.get(['savedPatterns'], (res) => {
    let patterns = res.savedPatterns || [];
    
    if (editingPatternIndex !== null) {
      newPattern.active = patterns[editingPatternIndex].active;
      patterns[editingPatternIndex] = newPattern;
      addLog(`Pattern updated: ${name}`);
    } else {
      patterns.push(newPattern);
      addLog(`Pattern created: ${name}`);
    }

    chrome.storage.local.set({ savedPatterns: patterns }, () => {
      patternNameInput.value = '';
      currentSequence = [];
      editingPatternIndex = null;
      savePatternBtn.innerText = "💾 Save Pattern";
      updateDirUI('UP');
      updateSequenceDisplay();
      renderPatterns(patterns);
    });
  });
});

function renderPatterns(patterns) {
  patternsList.innerHTML = '';
  
  if (patterns.length === 0) {
    patternsList.innerHTML = '<p style="color:var(--text3); font-size:12px;">No patterns saved.</p>';
    return;
  }

  patterns.forEach((pattern, index) => {
    const item = document.createElement('div');
    item.className = 'pattern-item';
    
    const seqHtml = pattern.sequence.map(c => c === 'G' ? '🟢' : '🔴').join(' ');
    const actionBadge = pattern.action === 'DOWN' 
        ? `<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">⬇️ DOWN</span>`
        : `<span style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">⬆️ UP</span>`;

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <label class="toggle-label" style="margin:0;">
            <input type="checkbox" class="pattern-toggle" data-index="${index}" ${pattern.active ? 'checked' : ''}>
            <span class="toggle-text" style="font-weight:600; color:var(--text); opacity: ${pattern.active ? '1' : '0.6'};">${pattern.name} ${actionBadge}</span>
          </label>
        </div>
        <div style="display:flex; gap: 8px;">
          <button class="edit-pattern-btn" data-index="${index}" style="background:none; border:none; cursor:pointer; font-size:14px; opacity:0.7;" title="Edit Pattern">✏️</button>
          <button class="delete-pattern-btn" data-index="${index}" style="background:none; border:none; cursor:pointer; font-size:14px; opacity:0.7;" title="Delete Pattern">🗑️</button>
        </div>
      </div>
      <div class="sequence-display" style="min-height:auto; padding:5px; background:var(--bg3); font-size: 16px;">
        ${seqHtml}
      </div>
    `;
    
    patternsList.appendChild(item);
  });

  // Bind Toggle events
  document.querySelectorAll('.pattern-toggle').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index);
      patterns[idx].active = e.target.checked;
      chrome.storage.local.set({ savedPatterns: patterns }, () => renderPatterns(patterns));
    });
  });

  // Bind Edit events
  document.querySelectorAll('.edit-pattern-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      const p = patterns[idx];
      patternNameInput.value = p.name;
      currentSequence = [...p.sequence];
      updateDirUI(p.action || 'UP'); // Fallback to UP for older saved patterns
      updateSequenceDisplay();
      
      editingPatternIndex = idx;
      savePatternBtn.innerText = "💾 Update Pattern";
      document.getElementById('tab-patterns').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Bind Delete events
  document.querySelectorAll('.delete-pattern-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      patterns.splice(idx, 1);
      
      if (editingPatternIndex === idx) {
        patternNameInput.value = '';
        currentSequence = [];
        editingPatternIndex = null;
        savePatternBtn.innerText = "💾 Save Pattern";
        updateSequenceDisplay();
      } else if (editingPatternIndex !== null && editingPatternIndex > idx) {
        editingPatternIndex--;
      }

      chrome.storage.local.set({ savedPatterns: patterns }, () => {
        renderPatterns(patterns);
        addLog("Pattern deleted.");
      });
    });
  });
}
