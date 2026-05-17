(function () {
  'use strict';

  let expansions = {};
  let maxTriggerLen = 0;

  function setExpansions(data) {
    expansions = data || {};
    const keys = Object.keys(expansions);
    maxTriggerLen = keys.length ? Math.max(...keys.map(k => k.length)) : 0;
  }

  // Busca expansions via background
  chrome.runtime.sendMessage({ type: 'GET_EXPANSIONS' }, (resp) => {
    if (chrome.runtime.lastError) return;
    if (resp && resp.expansions) setExpansions(resp.expansions);
  });

  // Recebe updates quando popup salvar
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'EXPANSIONS_UPDATED') setExpansions(msg.expansions);
  });

  function isEditable(el) {
    if (!el) return false;
    if (el.tagName === 'INPUT') {
      const t = (el.type || '').toLowerCase();
      return !['button','submit','reset','checkbox','radio','file','image','range','color','hidden'].includes(t);
    }
    return el.tagName === 'TEXTAREA' || el.isContentEditable;
  }

  function getTextBeforeCursor(el) {
    if (el.isContentEditable) {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return '';
      const node = sel.getRangeAt(0).startContainer;
      if (node.nodeType === Node.TEXT_NODE)
        return node.textContent.slice(0, sel.getRangeAt(0).startOffset);
      return '';
    }
    return (el.value || '').slice(0, el.selectionStart || 0);
  }

  function replaceText(el, trigger, replacement) {
    if (el.isContentEditable) {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return;
      const offset = range.startOffset;
      const start = offset - trigger.length;
      if (start < 0) return;
      node.textContent = node.textContent.slice(0, start) + replacement + node.textContent.slice(offset);
      const newRange = document.createRange();
      newRange.setStart(node, start + replacement.length);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      const pos = el.selectionStart;
      const start = pos - trigger.length;
      if (start < 0) return;
      el.setSelectionRange(start, pos);
      const ok = document.execCommand('insertText', false, replacement);
      if (!ok) {
        const val = el.value;
        el.value = val.slice(0, start) + replacement + val.slice(pos);
        el.setSelectionRange(start + replacement.length, start + replacement.length);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  document.addEventListener('keyup', (e) => {
    const el = document.activeElement;
    if (!isEditable(el)) return;
    if (e.key.length !== 1 && e.key !== 'Backspace') return;
    if (Object.keys(expansions).length === 0) return;

    const text = getTextBeforeCursor(el);
    const buf = text.slice(-(maxTriggerLen || 64));

    for (const [trigger, replacement] of Object.entries(expansions)) {
      if (buf.endsWith(trigger)) {
        replaceText(el, trigger, replacement);
        break;
      }
    }
  }, true);

})();
