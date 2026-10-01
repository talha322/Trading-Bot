// Inject a script into the page context to monkey-patch WebSocket
// content.js - Runs in isolated world, listens for messages from inject.js
// Script injection is now handled directly by manifest.json (MAIN world)

let lastSentAlertTime = 0;

let currentAsset = "";
let requestedAsset = "";
let currentPeriod = 60;
let ticks = [];
let candles = []; // Array of 'G' or 'R'
let historicalCandlesMap = new Map();

function getActiveAssetFromDOM() {
  try {
    const activeEl = document.querySelector('.tab__item--active, .tabs__item--active, .instruments-tabs__item--active, [class*="tab"][class*="active"], [class*="item--active"]');
    if (!activeEl) return null;
    const txt = (activeEl.innerText || "").trim();
    const m = txt.match(/([A-Z]{3})\s*[\/]?\s*([A-Z]{3})/i);
    if (m) {
      let sym = (m[1] + m[2]).toUpperCase();
      if (txt.toUpperCase().includes('OTC')) {
        sym += '_otc';
      }
      return sym;
    }
  } catch(e) {}
  return null;
}

function switchActiveAsset(newAsset) {
  if (!newAsset || newAsset === currentAsset) return;
  currentAsset = newAsset;
  chrome.storage.local.set({ currentActiveAsset: currentAsset });
  addAppLog(`Active Chart: ${currentAsset}`, 'normal');
  historicalCandlesMap.clear();
  ticks = [];
  candles = [];
}

// Detect when user clicks on an asset tab on Quotex screen
document.addEventListener('click', () => {
  setTimeout(() => {
    const domAsset = getActiveAssetFromDOM();
    if (domAsset && domAsset !== currentAsset) {
      switchActiveAsset(domAsset);
    }
  }, 150);
});

// Periodic check (every 1.5s) to guarantee alignment with visible screen
setInterval(() => {
  const domAsset = getActiveAssetFromDOM();
  if (domAsset && domAsset !== currentAsset) {
    switchActiveAsset(domAsset);
  }
}, 1500);

window.addEventListener('message', function(event) {
  if (event.source !== window || !event.data) return;

  // Handle Historical Chunk from history/load
  if (event.data.type === 'QUOTEX_HISTORY_CHUNK') {
    let payload = event.data.data;
    if (payload) {
      try {
        let fb = payload.indexOf('{');
        if (fb !== -1) {
          let d = JSON.parse(payload.substring(fb));
          if (d.data && Array.isArray(d.data)) {
            d.data.forEach(c => historicalCandlesMap.set(c.time, c));
            const progressData = {
              count: historicalCandlesMap.size,
              asset: requestedAsset || currentAsset || d.asset,
              timestamp: Date.now()
            };
            chrome.storage.local.set({ historyFetchProgress: progressData });
            chrome.runtime.sendMessage({ action: 'historyProgress', ...progressData }, () => {
              if (chrome.runtime.lastError) {}
            });
          }
        }
      } catch(e) {}
    }
    return;
  }

  // Handle Chunk Progress events (for live progress bar)
  if (event.data.type === 'QUOTEX_FETCH_CHUNK_PROGRESS') {
    const chunkProg = {
      action: 'historyChunkProgress',
      chunk: event.data.chunk,
      total: event.data.total,
      percent: event.data.percent,
      count: historicalCandlesMap.size,
      asset: requestedAsset || currentAsset,
      timestamp: Date.now()
    };
    chrome.storage.local.set({ historyChunkProgress: chunkProg });
    chrome.runtime.sendMessage(chunkProg, () => {
      if (chrome.runtime.lastError) {}
    });
    return;
  }

  // Handle History Status events
  if (event.data.type === 'QUOTEX_FETCH_HISTORY_STATUS') {
    if (event.data.status === 'completed') {
      const candlesList = Array.from(historicalCandlesMap.values()).sort((a,b) => a.time - b.time);
      const resultData = {
        status: 'completed',
        candles: candlesList,
        asset: requestedAsset || currentAsset,
        timestamp: Date.now()
      };
      chrome.storage.local.set({ historyFetchResult: resultData });
      chrome.runtime.sendMessage({ action: 'historyCompleted', ...resultData }, () => {
        if (chrome.runtime.lastError) {}
      });
    } else if (event.data.status === 'error') {
      const errorData = {
        status: 'error',
        message: event.data.message,
        timestamp: Date.now()
      };
      chrome.storage.local.set({ historyFetchResult: errorData });
      chrome.runtime.sendMessage({ action: 'historyError', ...errorData }, () => {
        if (chrome.runtime.lastError) {}
      });
    }
    return;
  }

  if (event.data.type !== 'QUOTEX_WS_MSG') return;

  let payload = event.data.data;
  if (!payload || typeof payload !== 'string') return;

  try {
    // Safely extract JSON by finding the first { or [ to bypass any binary hidden headers
    const firstBrace = payload.indexOf('{');
    const firstBracket = payload.indexOf('[');
    
    let jsonStr = "";
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        jsonStr = payload.substring(firstBrace);
    } else if (firstBracket !== -1) {
        jsonStr = payload.substring(firstBracket);
    } else {
        return; // No JSON found
    }

    const data = JSON.parse(jsonStr);

    // --- 1. HISTORY DATA ---
    if (data.history && data.asset) {
      switchActiveAsset(data.asset);
      currentPeriod = data.period || 60;
      
      let grouped = {};
      data.history.forEach(tick => {
        const time = Math.floor(tick[0] / currentPeriod) * currentPeriod;
        if (!grouped[time]) grouped[time] = [];
        grouped[time].push(tick[1]); 
      });
      
      const sortedTimes = Object.keys(grouped).sort();
      
      // Sab se aakhri time wali candle abhi chal rahi hai (incomplete). 
      // Isay history se nikal kar live 'ticks' mein daal dete hain taake live stream isay poora kare.
      const currentIncompleteTime = sortedTimes.pop();
      if (currentIncompleteTime) {
        ticks = [ { time: parseInt(currentIncompleteTime), prices: grouped[currentIncompleteTime] } ];
      }

      candles = []; 
      sortedTimes.forEach(t => {
        const prices = grouped[t];
        const open = prices[0];
        const close = prices[prices.length - 1];
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        const color = close >= open ? 'G' : 'R';
        candles.push(color);

        // Also add to historical candles map
        historicalCandlesMap.set(parseInt(t), {
          symbol_id: 0,
          time: parseInt(t),
          open: open,
          close: close,
          high: high,
          low: low,
          ticks: prices.length
        });
      });
      
      const historyEmojis = candles.map(c => c === 'G' ? '🟢' : '🔴').join('');
      addAppLog(`Loaded ${candles.length} history candles for ${currentAsset}: ${historyEmojis}`, 'normal');
      checkPatterns(candles, currentAsset);
    } 
    // --- 2. LIVE TICK DATA ---
    // If it's an array and looks like a live tick stream e.g. [["CADJPY_otc", timestamp, price, 1]]
    else if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0]) && typeof data[0][0] === 'string') {
      const tick = data[0];
      const asset = tick[0];
      const timestamp = tick[1];
      const price = tick[2];
      
      // If no active asset is set yet, initialize it
      if (!currentAsset) {
        const domAsset = getActiveAssetFromDOM();
        switchActiveAsset(domAsset || asset);
      }

      // STRICT FILTER: Only process ticks for the currently visible active chart!
      // Ignore background ticks from other tabs open in Quotex tab bar!
      if (asset !== currentAsset) {
        return;
      }

      if (asset && timestamp && price) {
        const time = Math.floor(timestamp / currentPeriod) * currentPeriod;
        
        let lastTickObj = ticks.find(t => t.time === time);
        if (!lastTickObj) {
          // New candle just started! Process the old one.
          if (ticks.length > 0) {
            const lastCandle = ticks[ticks.length - 1];
            const open = lastCandle.prices[0];
            const close = lastCandle.prices[lastCandle.prices.length - 1];
            const high = Math.max(...lastCandle.prices);
            const low = Math.min(...lastCandle.prices);
            const color = close >= open ? 'G' : 'R';
            candles.push(color);
            
            // Add closed candle to historical map
            historicalCandlesMap.set(lastCandle.time, {
              symbol_id: 0,
              time: lastCandle.time,
              open: open,
              close: close,
              high: high,
              low: low,
              ticks: lastCandle.prices.length
            });

            if (candles.length > 50) candles.shift();
            
            addAppLog(`Candle Closed: ${color === 'G' ? '🟢 Green' : '🔴 Red'} (Open: ${open}, Close: ${close})`, 'normal');
            
            checkPatterns(candles, currentAsset);
            
            ticks = [];
          }
          ticks.push({ time: time, prices: [price] });
        } else {
          lastTickObj.prices.push(price);
        }
      }
    }
  } catch (e) {
    // If it fails to parse, it's just an irrelevant packet
  }
});

function addAppLog(message, type = 'normal') {
  chrome.storage.local.get(['appLogs'], (res) => {
    let logs = res.appLogs || [];
    const timeString = new Date().toLocaleTimeString([], { hour12: false });
    logs.unshift({ time: timeString, message, type });
    if (logs.length > 50) logs.pop();
    chrome.storage.local.set({ appLogs: logs });
  });
}

function checkPatterns(candleColors, asset) {
  chrome.storage.local.get(['savedPatterns', 'telegramBotToken', 'telegramChatId', 'enableTelegram', 'autoTradeEnabled', 'botRunning'], (result) => {
    
    if (!result.botRunning) return;

    const patterns = result.savedPatterns || [];
    
    patterns.forEach(pattern => {
      if (!pattern.active) return;
      
      const seq = pattern.sequence;
      const seqLength = seq.length;
      
      if (candleColors.length >= seqLength) {
        const recentColors = candleColors.slice(-seqLength);
        
        let isMatch = true;
        for (let i = 0; i < seqLength; i++) {
          if (recentColors[i] !== seq[i]) {
            isMatch = false;
            break;
          }
        }
        
        if (isMatch) {
          addAppLog(`🎯 Pattern Matched: "${pattern.name}" (Asset: ${asset})`, 'match');
          
          // 🔥 AUTOMATIC TRADE EXECUTION 🔥
          if (pattern.action && result.autoTradeEnabled) {
             executeTrade(pattern.action);
          } else if (pattern.action && !result.autoTradeEnabled) {
             addAppLog(`🔔 Auto-Trade is OFF. Manual action required.`, 'normal');
          }

          sendTelegramAlert(pattern.name, asset, recentColors, result.telegramBotToken, result.telegramChatId, result.enableTelegram);
        }
      }
    });
  });
}

function executeTrade(action) {
  try {
    const textToFind = action === 'UP' ? 'Up' : 'Down';
    
    // Find all spans and locate the one containing the text "Up" or "Down"
    const spans = Array.from(document.querySelectorAll('span'));
    const targetSpan = spans.find(span => span.innerText.trim() === textToFind);
    
    if (targetSpan) {
      // Find the parent button of this span
      const btn = targetSpan.closest('button');
      if (btn) {
        btn.click();
        addAppLog(`⚡ Auto-Trade Executed: ${action} Button Clicked!`, 'match');
      } else {
        addAppLog(`❌ Trade Error: Button for ${action} not clickable.`, 'warn');
      }
    } else {
      addAppLog(`❌ Trade Error: Could not find ${action} on screen.`, 'warn');
    }
  } catch (e) {
    addAppLog(`❌ Trade Error: Exception occurred during click.`, 'warn');
  }
}

function playPing() {
  try {
    chrome.runtime.sendMessage({ action: 'playPing' }, () => {
      if (chrome.runtime.lastError) {}
    });
  } catch (e) {
    console.log("Failed to send ping message to background");
  }
}

function sendTelegramAlert(patternName, asset, colorsMatched, token, chatId, enableTelegram) {
  // Hamesha beep bajayega jab bhi pattern match hoga (Offscreen API ke zariye)
  playPing();

  // Agar user ne settings se Telegram disable kiya hua hai
  if (!enableTelegram) {
    console.log("Quotex Bot: Telegram alerts disabled in settings. Bypassed Telegram, only played beep.");
    return;
  }

  if (!token || !chatId || token.trim() === "" || chatId.trim() === "") {
    console.log("Quotex Bot: Telegram credentials missing. Bypassed Telegram, only played beep.");
    return;
  }

  const colorEmojis = colorsMatched.map(c => c === 'G' ? '🟢' : '🔴').join('');
  const text = encodeURIComponent(`🚨 *Quotex Pattern Match!*\n\n*Pattern:* ${patternName}\n*Asset:* ${asset}\n*Sequence:* ${colorEmojis}\n\n_Time to trade!_`);
  const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${text}&parse_mode=Markdown`;

  fetch(url)
    .then(res => res.json())
    .then(data => console.log("Quotex Bot: Telegram Alert Sent!", data))
    .catch(err => console.error("Quotex Bot: Failed to send alert.", err));
}

// 📨 Listen for commands from Popup via storage AND runtime messages
let lastFetchTriggerTime = 0;
function triggerHistoryFetch(assetToFetch, hours, period) {
  const now = Date.now();
  if (now - lastFetchTriggerTime < 1200) {
    return; // Prevent duplicate concurrent requests
  }
  lastFetchTriggerTime = now;

  const targetAsset = assetToFetch || currentAsset || 'USDARS_otc';
  // If user requested a different asset than currently loaded, clear map
  if (requestedAsset && requestedAsset !== targetAsset) {
    historicalCandlesMap.clear();
  }
  requestedAsset = targetAsset;

  // Determine earliest known timestamp in our candle collection
  let earliestTime = null;
  if (historicalCandlesMap.size > 0) {
    earliestTime = Math.min(...Array.from(historicalCandlesMap.keys()));
  }

  console.log(`📡 Quotex Content.js: Triggering fetch for ${requestedAsset}, earliest known candle: ${earliestTime}, count so far: ${historicalCandlesMap.size}`);

  window.postMessage({
    type: 'QUOTEX_FETCH_HISTORY_REQUEST',
    asset: requestedAsset,
    startTime: earliestTime,
    hours: hours || 6,
    period: period || currentPeriod || 60
  }, '*');
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.historyFetchTrigger && changes.historyFetchTrigger.newValue) {
    const req = changes.historyFetchTrigger.newValue;
    triggerHistoryFetch(req.asset, req.hours, req.period);
  }
  if (area === 'local' && changes.historyAbortTrigger && changes.historyAbortTrigger.newValue) {
    window.postMessage({ type: 'QUOTEX_ABORT_HISTORY_REQUEST' }, '*');
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'startHistoryFetch') {
    triggerHistoryFetch(msg.asset, msg.hours, msg.period);
    sendResponse({ status: 'initiated', asset: msg.asset || currentAsset });
  } else if (msg.action === 'abortHistoryFetch') {
    window.postMessage({ type: 'QUOTEX_ABORT_HISTORY_REQUEST' }, '*');
    sendResponse({ status: 'aborted' });
  } else if (msg.action === 'getCurrentAsset') {
    sendResponse({ asset: currentAsset, period: currentPeriod });
  }
  return true;
});

