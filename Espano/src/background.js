'use strict';

// Inicializa com exemplos
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('expansions', (data) => {
    if (!data.expansions) {
      chrome.storage.sync.set({ expansions: {
        ':email:': 'meu@email.com',
        ':att:': 'Atenciosamente,',
        ':obg:': 'Obrigado!'
      }});
    }
  });
});

// Responde pedidos do content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_EXPANSIONS') {
    chrome.storage.sync.get('expansions', (data) => {
      sendResponse({ expansions: data.expansions || {} });
    });
    return true; // async
  }
});

// Notifica content scripts quando storage mudar
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.expansions) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'EXPANSIONS_UPDATED',
          expansions: changes.expansions.newValue || {}
        }).catch(() => {}); // ignora tabs sem content script
      });
    });
  }
});
