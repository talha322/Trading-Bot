(function() {
  console.log("🚀 Quotex Bot [Inject.js]: Active & Hooking Network...");

  const allSockets = new Set();
  let activeSocket = null;
  window.__quotexActiveSocket = null;
  window.__quotexCurrentAsset = "";
  window.__quotexEarliestTime = null;

  let lastTickLogTime = 0;
  let isHistoryAborted = false;

  function setupSocketHook(ws) {
    if (ws._quotexHooked) return;
    ws._quotexHooked = true;
    allSockets.add(ws);

    // Prefer socket.io trading socket
    if (!activeSocket || (ws.url && ws.url.includes('socket.io'))) {
      activeSocket = ws;
      window.__quotexActiveSocket = ws;
    }

    ws.addEventListener('message', async (event) => {
      let payload = event.data;
      try {
        let textData = "";
        if (typeof payload === 'string') {
          textData = payload;
        } else if (payload instanceof ArrayBuffer) {
          textData = new TextDecoder().decode(payload);
        } else if (payload instanceof Blob) {
          textData = await payload.text();
        }

        if (!textData) return;

        // 1. Check for historical candles chunk from history/load
        if (textData.includes('"data":[') && textData.includes('"open":')) {
          try {
            const fb = textData.indexOf('{');
            if (fb !== -1) {
              const d = JSON.parse(textData.substring(fb));
              if (d.data && Array.isArray(d.data) && d.data.length > 0) {
                const minTime = d.data[0].time;
                if (!window.__quotexEarliestTime || minTime < window.__quotexEarliestTime) {
                  window.__quotexEarliestTime = minTime;
                }
              }
            }
          } catch(e) {}
          window.postMessage({ type: 'QUOTEX_HISTORY_CHUNK', data: textData }, '*');
          return;
        }

        // 2. Check if it's initial chart history
        if (textData.includes('"history"') && textData.includes('"asset"')) {
          console.log("📊 Quotex Bot: Initial Chart History Received (" + textData.length + " bytes)");
          try {
            const fb = textData.indexOf('{');
            if (fb !== -1) {
              const d = JSON.parse(textData.substring(fb));
              if (d.asset) window.__quotexCurrentAsset = d.asset;
              if (d.history && Array.isArray(d.history) && d.history.length > 0) {
                const times = d.history.map(h => Array.isArray(h) ? h[0] : (h.time || h[0]));
                const minTime = Math.min(...times);
                if (minTime > 0) {
                  window.__quotexEarliestTime = minTime;
                  console.log(`⏱️ Quotex Bot: Chart loaded with candles back to: ${minTime} (${new Date(minTime * 1000).toLocaleTimeString()})`);
                }
              }
            }
          } catch(e) {}
          window.postMessage({ type: 'QUOTEX_WS_MSG', data: textData }, '*');
          return;
        }

        // 3. Live ticks or quotes stream
        if (textData.includes('_otc') || textData.includes('USD') || textData.includes('EUR') || textData.includes('JPY') || textData.includes('GBP') || textData.includes('AUD') || textData.includes('CAD') || textData.includes('NZD') || textData.includes('CHF')) {
          const now = Date.now();
          if (now - lastTickLogTime > 4000) {
            lastTickLogTime = now;
            console.log("📈 Quotex Bot: Live Stream Active ->", textData.substring(0, 100));
          }
          window.postMessage({ type: 'QUOTEX_WS_MSG', data: textData }, '*');
          return;
        }
      } catch(e) {
        console.error("Quotex Bot: Error reading message", e);
      }
    });

    ws.addEventListener('close', () => {
      allSockets.delete(ws);
      if (activeSocket === ws) {
        activeSocket = null;
        for (const s of allSockets) {
          if (s.readyState === WebSocket.OPEN) {
            activeSocket = s;
            window.__quotexActiveSocket = s;
            break;
          }
        }
      }
    });
  }

  // Hook WebSocket Constructor
  const OrigWebSocket = window.WebSocket;
  class WSHook extends OrigWebSocket {
    constructor(url, protocols) {
      super(url, protocols);
      console.log("🛠️ Quotex Bot: WebSocket Instantiated ->", url);
      setupSocketHook(this);
    }
  }
  window.WebSocket = WSHook;

  // Hook WebSocket.prototype.send
  const origSend = OrigWebSocket.prototype.send;
  OrigWebSocket.prototype.send = function(...args) {
    setupSocketHook(this);

    if (typeof args[0] === 'string' && args[0].includes('history/load')) {
      console.log("📤 Quotex Bot: Outgoing history/load intercepted:", args[0]);
      try {
        const parsed = JSON.parse(args[0].substring(2));
        if (parsed && parsed[1]) {
          if (parsed[1].asset) window.__quotexCurrentAsset = parsed[1].asset;
          if (parsed[1].time && (!window.__quotexEarliestTime || parsed[1].time < window.__quotexEarliestTime)) {
            window.__quotexEarliestTime = parsed[1].time;
          }
        }
      } catch(e) {}
    }

    return origSend.apply(this, args);
  };

  // Helper to find currently open trading socket
  function getOpenSocket() {
    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) return activeSocket;
    if (window.__quotexActiveSocket && window.__quotexActiveSocket.readyState === WebSocket.OPEN) return window.__quotexActiveSocket;
    for (const s of allSockets) {
      if (s.readyState === WebSocket.OPEN) return s;
    }
    return null;
  }

  // Listen for abort request from user
  window.addEventListener('message', (e) => {
    if (e.source === window && e.data && e.data.type === 'QUOTEX_ABORT_HISTORY_REQUEST') {
      console.log("🛑 Quotex Bot: User clicked Stop! Aborting history fetch...");
      isHistoryAborted = true;
    }
  });

  // Listen for history fetch requests
  window.addEventListener('message', async (e) => {
    if (e.source !== window || !e.data || e.data.type !== 'QUOTEX_FETCH_HISTORY_REQUEST') return;

    const ws = getOpenSocket();
    if (!ws) {
      console.warn("Quotex Bot: No open WebSocket found.");
      window.postMessage({
        type: 'QUOTEX_FETCH_HISTORY_STATUS',
        status: 'error',
        message: 'WebSocket active nahi mila. Quotex tab me chart ko mouse se thora drag karein ya refresh karein.'
      }, '*');
      return;
    }

    isHistoryAborted = false;
    const rawAsset = e.data.asset || window.__quotexCurrentAsset || "USDARS_otc";
    const hours = Math.max(1, parseInt(e.data.hours || 6));
    const period = parseInt(e.data.period || 60);

    console.log(`🚀 Quotex Bot: Starting historical download -> Asset: ${rawAsset}, Hours: ${hours} (~${(hours/24).toFixed(1)} Days), Period: ${period}s`);
    window.postMessage({ type: 'QUOTEX_FETCH_HISTORY_STATUS', status: 'started', totalHours: hours, asset: rawAsset }, '*');

    // Determine initial target timestamp
    let targetTime = e.data.startTime || window.__quotexEarliestTime;
    if (!targetTime) {
      const nowSec = Math.floor(Date.now() / 1000);
      targetTime = Math.floor(nowSec / 60) * 60 - 60;
    }

    console.log(`⏱️ Quotex Bot: Starting backwards from timestamp: ${targetTime} (${new Date(targetTime * 1000).toLocaleString()})`);

    let consecutiveFails = 0;
    for (let chunkIdx = 0; chunkIdx < hours; chunkIdx++) {
      if (isHistoryAborted) {
        console.log(`⏹️ Quotex Bot: Aborted by user at chunk ${chunkIdx + 1}/${hours}`);
        break;
      }

      // Send progress update
      window.postMessage({
        type: 'QUOTEX_FETCH_CHUNK_PROGRESS',
        chunk: chunkIdx + 1,
        total: hours,
        percent: Math.min(99, Math.round(((chunkIdx + 1) / hours) * 100))
      }, '*');

      // Index in Quotex is 12 digits: Math.floor(Date.now() / 10)
      const index = Math.floor(Date.now() / 10);
      const payload = JSON.stringify(["history/load", {
        asset: rawAsset,
        index: index,
        time: targetTime,
        offset: 3600,
        period: period
      }]);

      if (chunkIdx % 10 === 0 || chunkIdx === hours - 1) {
        console.log(`📤 Quotex Bot: Fetching chunk [${chunkIdx + 1}/${hours}] | Time: ${new Date(targetTime * 1000).toLocaleDateString()}`);
      }

      const chunkText = await new Promise((resolve) => {
        let finished = false;

        const onChunk = (evt) => {
          if (evt.source !== window || !evt.data || evt.data.type !== 'QUOTEX_HISTORY_CHUNK') return;
          const txt = evt.data.data;
          if (txt && (txt.includes(rawAsset) || txt.includes(rawAsset.replace(/_otc$/i, '')))) {
            if (!finished) {
              finished = true;
              window.removeEventListener('message', onChunk);
              resolve(txt);
            }
          }
        };

        window.addEventListener('message', onChunk);

        try {
          ws.send("42" + payload);
        } catch (err) {
          console.warn("Quotex Bot: ws.send error:", err);
          if (!finished) {
            finished = true;
            window.removeEventListener('message', onChunk);
            resolve(null);
          }
        }

        // Timeout safety per chunk: 2.0 seconds
        setTimeout(() => {
          if (!finished) {
            finished = true;
            window.removeEventListener('message', onChunk);
            resolve(null);
          }
        }, 2000);
      });

      if (chunkText) {
        consecutiveFails = 0;
        try {
          const fb = chunkText.indexOf('{');
          if (fb !== -1) {
            const d = JSON.parse(chunkText.substring(fb));
            if (d.data && Array.isArray(d.data) && d.data.length > 0) {
              const earliestInChunk = d.data[0].time; // sorted asc
              targetTime = earliestInChunk;
              window.__quotexEarliestTime = earliestInChunk;
            } else {
              targetTime -= 3600;
              consecutiveFails++;
            }
          } else {
            targetTime -= 3600;
            consecutiveFails++;
          }
        } catch(e) {
          targetTime -= 3600;
          consecutiveFails++;
        }
      } else {
        consecutiveFails++;
        targetTime -= 3600;
      }

      // If server returned no candles 3 times consecutively, we reached server history limit
      if (consecutiveFails >= 3) {
        console.log(`🏁 Quotex Bot: Server history limit reached at chunk ${chunkIdx + 1}. Wrapping up available candles.`);
        break;
      }

      // Fast pacing: 120ms between chunks
      await new Promise(r => setTimeout(r, 120));
    }

    console.log("🎉 Quotex Bot: History fetch finished! Packaging file for download...");
    setTimeout(() => {
      window.postMessage({
        type: 'QUOTEX_FETCH_HISTORY_STATUS',
        status: 'completed',
        asset: rawAsset
      }, '*');
    }, 800);
  });

  console.log("🛠️ Quotex Bot: Hooks & Deep History Engine Ready!");
})();
