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
      addLog("Bot Started. Radar Active & Monitoring Patterns...", "match");
    } else {
      addLog("Bot Stopped. Radar Inactive.", "warn");
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
    addLog(`Settings updated successfully.`);
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

// ─── Historical Candles Export Feature ─────────────────────────────────────────
const startHistoryBtn = document.getElementById('startHistoryBtn');
const historyAssetInput = document.getElementById('historyAsset');
const historyHoursSelect = document.getElementById('historyHours');
const customDaysGroup = document.getElementById('customDaysGroup');
const customDaysInput = document.getElementById('customDaysInput');
const historyPeriodSelect = document.getElementById('historyPeriod');
const historyProgressBox = document.getElementById('historyProgressBox');
const historyProgressBar = document.getElementById('historyProgressBar');
const historyStatusTitle = document.getElementById('historyStatusTitle');
const historyStatusMsg = document.getElementById('historyStatusMsg');
const historyCountBadge = document.getElementById('historyCountBadge');
const stopHistoryBtn = document.getElementById('stopHistoryBtn');

if (historyHoursSelect) {
  historyHoursSelect.addEventListener('change', () => {
    if (customDaysGroup) {
      customDaysGroup.style.display = historyHoursSelect.value === 'custom' ? 'block' : 'none';
    }
  });
}

// Auto-fill active asset from storage
chrome.storage.local.get(['currentActiveAsset'], (res) => {
  if (res && res.currentActiveAsset && historyAssetInput) {
    historyAssetInput.value = res.currentActiveAsset;
  }
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.currentActiveAsset && changes.currentActiveAsset.newValue && historyAssetInput) {
    historyAssetInput.value = changes.currentActiveAsset.newValue;
    historyAssetInput.style.borderColor = '#10b981';
    setTimeout(() => { if (historyAssetInput) historyAssetInput.style.borderColor = 'var(--border)'; }, 800);
  }
});

// Also try to query active tab for immediate response
try {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0 && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getCurrentAsset' }, (resp) => {
        if (chrome.runtime.lastError) return;
        if (resp && resp.asset && historyAssetInput) {
          historyAssetInput.value = resp.asset;
        }
      });
    }
  });
} catch(e) {}

if (stopHistoryBtn) {
  stopHistoryBtn.addEventListener('click', () => {
    stopHistoryBtn.innerText = '⏳ Finalizing download...';
    stopHistoryBtn.disabled = true;
    chrome.storage.local.set({ historyAbortTrigger: { timestamp: Date.now() } });
    chrome.tabs.query({}, (tabs) => {
      const targetTabs = tabs.filter(t => t.url && (t.url.includes('quotex') || t.url.includes('qxbroker') || t.url.includes('market-qx')));
      targetTabs.forEach(t => chrome.tabs.sendMessage(t.id, { action: 'abortHistoryFetch' }, () => {
        if (chrome.runtime.lastError) {}
      }));
    });
  });
}

if (startHistoryBtn) {
  startHistoryBtn.addEventListener('click', () => {
    const rawAsset = (historyAssetInput && historyAssetInput.value.trim()) || 'USDARS_otc';
    
    let hours = 24;
    if (historyHoursSelect && historyHoursSelect.value === 'custom') {
      const days = Math.max(1, parseInt(customDaysInput ? customDaysInput.value : 7) || 7);
      hours = days * 24;
    } else if (historyHoursSelect) {
      hours = parseInt(historyHoursSelect.value || 24);
    }
    const period = parseInt(historyPeriodSelect ? historyPeriodSelect.value : 60) || 60;
    const timeLabel = hours >= 24 ? `${(hours / 24).toFixed(0)} Days (${hours} Hours)` : `${hours} Hours`;

    historyProgressBox.style.display = 'block';
    if (historyProgressBar) historyProgressBar.style.width = '2%';
    if (stopHistoryBtn) {
      stopHistoryBtn.style.display = 'block';
      stopHistoryBtn.disabled = false;
      stopHistoryBtn.innerText = '⏹ Stop & Download What\'s Fetched';
    }

    historyStatusTitle.innerText = `Fetching ${rawAsset}...`;
    historyStatusMsg.innerText = `Initiating download for past ${timeLabel}...`;
    historyCountBadge.innerText = '0 Candles';
    startHistoryBtn.disabled = true;
    startHistoryBtn.innerText = '⏳ Fetching in progress...';

    // 1. Trigger via chrome.storage.local (100% reliable across all contexts)
    chrome.storage.local.set({
      historyFetchTrigger: {
        asset: rawAsset,
        hours: hours,
        period: period,
        timestamp: Date.now()
      }
    });

    // 2. Also send via runtime tab message as fast-path
    chrome.tabs.query({}, (tabs) => {
      const targetTabs = tabs.filter(t => t.url && (t.url.includes('quotex') || t.url.includes('qxbroker') || t.url.includes('market-qx')));
      if (targetTabs.length === 0) {
        historyStatusTitle.innerText = '❌ Quotex Tab Not Found';
        historyStatusMsg.innerText = 'Pehle browser me Quotex open karein.';
        startHistoryBtn.disabled = false;
        startHistoryBtn.innerText = '📥 Download History (.json)';
        if (stopHistoryBtn) stopHistoryBtn.style.display = 'none';
        return;
      }

      let tabResponded = false;
      targetTabs.forEach(t => {
        chrome.tabs.sendMessage(t.id, {
          action: 'startHistoryFetch',
          asset: rawAsset,
          hours: hours,
          period: period
        }, (resp) => {
          if (chrome.runtime.lastError) {
            // Disconnected or inactive tab
          } else if (resp && resp.status === 'initiated') {
            tabResponded = true;
          }
        });
      });

      // Verification: If after 1.5s tab hasn't acknowledged and no chunk arrived, notify user to refresh Quotex
      setTimeout(() => {
        if (!tabResponded && startHistoryBtn && startHistoryBtn.disabled) {
          chrome.storage.local.get(['historyChunkProgress'], (res) => {
            const lastTime = res.historyChunkProgress ? res.historyChunkProgress.timestamp || 0 : 0;
            if (Date.now() - lastTime > 2500) {
              historyStatusTitle.innerText = '⚠️ Quotex Tab Reload Karein';
              historyStatusMsg.innerText = 'Extension update hui hai. Quotex tab par ja kar page ko Reload (F5) karein, phir dobara click karein.';
              startHistoryBtn.disabled = false;
              startHistoryBtn.innerText = '📥 Download History (.json)';
              if (stopHistoryBtn) stopHistoryBtn.style.display = 'none';
            }
          });
        }
      }, 1500);
    });
  });
}

// Handle completion and progress via storage listener
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.historyChunkProgress && changes.historyChunkProgress.newValue) {
      const cp = changes.historyChunkProgress.newValue;
      if (historyProgressBar) historyProgressBar.style.width = `${cp.percent}%`;
      if (historyStatusMsg) historyStatusMsg.innerText = `Chunk ${cp.chunk} of ${cp.total} (${cp.percent}%) | ${cp.count} candles...`;
      if (historyCountBadge) historyCountBadge.innerText = `${cp.count} Candles`;
    } else if (changes.historyFetchProgress && changes.historyFetchProgress.newValue) {
      const p = changes.historyFetchProgress.newValue;
      if (historyCountBadge) historyCountBadge.innerText = `${p.count} Candles`;
      if (historyStatusMsg) historyStatusMsg.innerText = `Received ${p.count} candles so far...`;
    }
    if (changes.historyFetchResult && changes.historyFetchResult.newValue) {
      handleHistoryResult(changes.historyFetchResult.newValue);
    }
  }
});

// Also handle direct runtime messages
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'historyChunkProgress') {
    if (historyProgressBar) historyProgressBar.style.width = `${msg.percent}%`;
    if (historyStatusMsg) historyStatusMsg.innerText = `Chunk ${msg.chunk} of ${msg.total} (${msg.percent}%) | ${msg.count} candles...`;
    if (historyCountBadge) historyCountBadge.innerText = `${msg.count} Candles`;
  } else if (msg.action === 'historyProgress') {
    if (historyCountBadge) historyCountBadge.innerText = `${msg.count} Candles`;
    if (historyStatusMsg) historyStatusMsg.innerText = `Received ${msg.count} candles so far...`;
  }
  if (msg.action === 'historyCompleted') {
    handleHistoryResult(msg);
  }
  if (msg.action === 'historyError') {
    handleHistoryResult({ status: 'error', message: msg.message });
  }
});

let lastProcessedResultTime = 0;

function handleHistoryResult(data) {
  const now = Date.now();
  if (data.timestamp && data.timestamp === lastProcessedResultTime) return;
  if (now - lastProcessedResultTime < 2500) return;
  lastProcessedResultTime = data.timestamp || now;

  if (startHistoryBtn) {
    startHistoryBtn.disabled = false;
    startHistoryBtn.innerText = '📥 Download History (.json)';
  }
  if (stopHistoryBtn) {
    stopHistoryBtn.style.display = 'none';
    stopHistoryBtn.innerText = '⏹ Stop & Download What\'s Fetched';
    stopHistoryBtn.disabled = false;
  }
  if (historyProgressBar) {
    historyProgressBar.style.width = '100%';
  }

  if (data.status === 'error') {
    if (historyStatusTitle) historyStatusTitle.innerText = '❌ Failed';
    if (historyStatusMsg) historyStatusMsg.innerText = data.message || 'Error occurred';
    return;
  }

  const candles = data.candles || [];
  if (candles.length === 0) {
    if (historyStatusTitle) historyStatusTitle.innerText = '⚠️ No Candles Received';
    if (historyStatusMsg) historyStatusMsg.innerText = 'Koi candle nahi mili. Chart ko mouse se ek dafa move karke dobara try karein.';
    return;
  }

  const assetName = data.asset || (historyAssetInput ? historyAssetInput.value : 'USDARS_otc');
  if (historyStatusTitle) historyStatusTitle.innerText = '✅ Complete!';
  if (historyCountBadge) historyCountBadge.innerText = `${candles.length} Candles`;
  const daysEstimate = (candles.length / 1440).toFixed(1);
  if (historyStatusMsg) historyStatusMsg.innerText = `Successfully fetched ${candles.length} candles (~${daysEstimate} days). Downloading file...`;

  const period = parseInt(historyPeriodSelect ? historyPeriodSelect.value : 60) || 60;
  downloadCandlesJson(candles, assetName, period);
}

function downloadCandlesJson(candles, asset, period) {
  const p = period || 60;
  const coverageHours = (candles.length * p / 3600).toFixed(1);
  const coverageDays = (candles.length * p / 86400).toFixed(1);

  const formattedCandles = candles.map((c, idx) => {
    const openVal = Number(c.open || 0);
    const closeVal = Number(c.close || 0);
    const highVal = Number(c.high || openVal);
    const lowVal = Number(c.low || closeVal);
    const color = closeVal >= openVal ? "G" : "R";
    const dt = new Date(c.time * 1000).toLocaleString('sv-SE');

    return {
      index: idx + 1,
      time: c.time,
      datetime: dt,
      color: color,
      open: openVal,
      close: closeVal,
      high: highVal,
      low: lowVal,
      ticks: c.ticks || 1
    };
  });

  const exportObj = {
    asset: asset,
    period: p,
    total_candles: candles.length,
    coverage_hours: parseFloat(coverageHours),
    coverage_days: parseFloat(coverageDays),
    exported_at: new Date().toISOString(),
    candles: formattedCandles
  };

  const jsonStr = JSON.stringify(exportObj, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `candles_${asset}_${candles.length}_candles.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

