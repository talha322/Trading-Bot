(function() {
  console.log("🛠️ Quotex Bot: Inject.js started! Hooking Network...");

  // 1. Hook WebSocket safely using Class inheritance
  const OrigWebSocket = window.WebSocket;
  class WSHook extends OrigWebSocket {
      constructor(url, protocols) {
          super(url, protocols);
          console.log("🛠️ Quotex Bot: WebSocket Opened ->", url);
          
          this.addEventListener('message', async (event) => {
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

                  // Check if it's history or quotes stream
                  if (textData.includes('"history"') || textData.includes('history/list')) {
                      window.postMessage({ type: 'QUOTEX_WS_MSG', data: textData }, '*');
                  }
                  
                  // Quotex live ticks arrays contain the asset name (e.g. CADJPY_otc)
                  // Removed .startsWith() because binary data has hidden invisible bytes at the start!
                  if (textData.includes('_otc') || textData.includes('USD') || textData.includes('EUR') || textData.includes('JPY') || textData.includes('GBP')) {
                      window.postMessage({ type: 'QUOTEX_WS_MSG', data: textData }, '*');
                  }
              } catch(e) {}
          });
      }
  }
  window.WebSocket = WSHook;

  // 2. Hook XMLHttpRequest just in case data comes from polling
  const OrigXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
      const xhr = new OrigXHR();
      xhr.addEventListener('load', function() {
          if (xhr.responseText && (xhr.responseText.includes('history') || xhr.responseText.includes('candles'))) {
              console.log("📥 XHR DATA:", xhr.responseText.substring(0, 150));
          }
      });
      return xhr;
  };

  console.log("🛠️ Quotex Bot: Hooks Installed Successfully!");
})();
