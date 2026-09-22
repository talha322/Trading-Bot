chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'playPing' && msg.offscreen) {
        playPing();
    }
});

async function playPing() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // Sharp 1000Hz note
        
        gainNode.connect(audioCtx.destination);
        oscillator.connect(gainNode);
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.7);
        
        setTimeout(() => audioCtx.close(), 1500);
    } catch(e) {
        console.error("Audio play failed:", e);
    }
}
