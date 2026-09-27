// Initialize Side Panel to open on extension icon click
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
});

async function setupOffscreenDocument(path) {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
        url: path,
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play alert sound when pattern matches'
    });
}

function addAppLog(message, type = 'normal') {
  chrome.storage.local.get(['appLogs'], (res) => {
    let logs = res.appLogs || [];
    const timeString = new Date().toLocaleTimeString([], { hour12: false });
    logs.unshift({ time: timeString, message, type });
    if (logs.length > 50) logs.pop();
    chrome.storage.local.set({ appLogs: logs });
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'playPing' && !msg.offscreen) {
        setupOffscreenDocument('offscreen.html').then(() => {
            chrome.runtime.sendMessage({ action: 'playPing', offscreen: true }).catch(() => {});
        });
    }

    if (msg.action === 'saveCandle' && msg.candle) {
        chrome.storage.local.get(['backendServerUrl'], (res) => {
            const baseUrl = (res.backendServerUrl || 'http://localhost:8000').replace(/\/+$/, '');
            fetch(`${baseUrl}/api/v1/candles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(msg.candle)
            })
            .then(r => r.json())
            .then(data => {
                if (data.status === 'saved') {
                    console.log(`📡 Candle saved to DB [ID: ${data.id}]`);
                    addAppLog(`📡 Saved to DB: ${msg.candle.asset} (${msg.candle.color === 'G' ? '🟢' : '🔴'})`);

                    // ⚡ Realtime Event: Notify open dashboard tab to update immediately!
                    try {
                        chrome.tabs.query({}, (tabs) => {
                            tabs.forEach(tab => {
                                if (tab.url && (tab.url.startsWith(baseUrl) || tab.url.includes('localhost:8000') || tab.url.includes('127.0.0.1:8000'))) {
                                    chrome.scripting.executeScript({
                                        target: { tabId: tab.id },
                                        func: () => {
                                            window.dispatchEvent(new CustomEvent('candle-saved-event'));
                                        }
                                    }).catch(() => {});
                                }
                            });
                        });
                    } catch (e) {}
                } else if (data.status === 'skipped') {
                    console.log(`📡 Candle skipped (duplicate): ${msg.candle.candle_time}`);
                }
            })
            .catch(err => {
                console.warn('📡 Backend save error:', err);
            });
        });
    }
});
