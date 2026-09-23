// Inject a script into the page context to monkey-patch WebSocket
// content.js - Runs in isolated world, listens for messages from inject.js
// Script injection is now handled directly by manifest.json (MAIN world)

let lastSentAlertTime = 0;

let currentAsset = "";
let currentPeriod = 60;
let ticks = [];
let candles = []; // Array of 'G' or 'R'

window.addEventListener('message', function(event) {
  if (event.source !== window || !event.data || event.data.type !== 'QUOTEX_WS_MSG') return;

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
      currentAsset = data.asset;
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
        candles.push(close >= open ? 'G' : 'R');
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
      
      // Only process if it matches the current asset (or if we haven't set one yet)
      if (asset && timestamp && price && (currentAsset === "" || asset === currentAsset)) {
        if (currentAsset === "") currentAsset = asset;

        const time = Math.floor(timestamp / currentPeriod) * currentPeriod;
        
        let lastTickObj = ticks.find(t => t.time === time);
        if (!lastTickObj) {
          // New candle just started! Process the old one.
          if (ticks.length > 0) {
            const lastCandle = ticks[ticks.length - 1];
            const open = lastCandle.prices[0];
            const close = lastCandle.prices[lastCandle.prices.length - 1];
            candles.push(close >= open ? 'G' : 'R');
            
            if (candles.length > 50) candles.shift();
            
            addAppLog(`Candle Closed: ${close >= open ? '🟢 Green' : '🔴 Red'} (Open: ${open}, Close: ${close})`, 'normal');
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
    chrome.runtime.sendMessage({ action: 'playPing' }).catch(() => {});
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
