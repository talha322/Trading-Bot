async function setupOffscreenDocument(path) {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
        url: path,
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play alert sound when pattern matches'
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'playPing' && !msg.offscreen) {
        setupOffscreenDocument('offscreen.html').then(() => {
            chrome.runtime.sendMessage({ action: 'playPing', offscreen: true }).catch(() => {});
        });
    }
});
