'use strict';

let expansions = {};
let editingTrigger = null;

const $ = (id) => document.getElementById(id);

function saveExpansions() {
  chrome.storage.sync.set({ expansions });
  render();
}

function render() {
  const query = $('search').value.trim().toLowerCase();
  const list = $('list');
  const keys = Object.keys(expansions);

  $('count-badge').textContent = keys.length;

  const filtered = keys.filter(k => {
    if (!query) return true;
    return k.toLowerCase().includes(query) || expansions[k].toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty">
      <div class="empty-icon">${query ? '🔍' : '✦'}</div>
      <div class="empty-text">${query ? 'Nenhum resultado para "<strong>' + query + '</strong>".' : 'Nenhuma expansão ainda.<br>Clique em <strong>+</strong> para adicionar.'}</div>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(trigger => {
    const replacement = expansions[trigger];
    const preview = replacement.length > 40 ? replacement.slice(0, 40) + '…' : replacement;
    return `<div class="item" data-trigger="${encodeURIComponent(trigger)}">
      <div class="item-text">
        <div class="item-trigger">${escHtml(trigger)}</div>
        <div class="item-replacement">${escHtml(preview)}</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" data-action="edit" data-trigger="${encodeURIComponent(trigger)}" title="Editar">✎</button>
        <button class="btn-icon danger" data-action="delete" data-trigger="${encodeURIComponent(trigger)}" title="Remover">✕</button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const trigger = decodeURIComponent(btn.dataset.trigger);
      if (btn.dataset.action === 'edit') openForm(trigger);
      if (btn.dataset.action === 'delete') deleteTrigger(trigger);
    });
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function openForm(trigger = null) {
  editingTrigger = trigger;
  $('form-title').textContent = trigger ? 'Editar expansão' : 'Nova expansão';
  $('f-trigger').value = trigger || '';
  $('f-replacement').value = trigger ? expansions[trigger] : '';
  $('f-trigger').disabled = !!trigger;
  $('err-trigger').style.display = 'none';
  $('form-overlay').classList.add('open');
  (trigger ? $('f-replacement') : $('f-trigger')).focus();
}

function closeForm() {
  $('form-overlay').classList.remove('open');
  editingTrigger = null;
}

function saveForm() {
  const trigger = $('f-trigger').value.trim();
  const replacement = $('f-replacement').value;
  const err = $('err-trigger');

  if (!trigger) { err.textContent = 'Trigger não pode ser vazio.'; err.style.display = 'block'; return; }
  if (!editingTrigger && expansions.hasOwnProperty(trigger)) {
    err.textContent = 'Esse trigger já existe.'; err.style.display = 'block'; return;
  }
  if (!replacement) { err.textContent = 'Expansão não pode ser vazia.'; err.style.display = 'block'; return; }

  if (editingTrigger) delete expansions[editingTrigger];
  expansions[trigger] = replacement;
  saveExpansions();
  closeForm();
}

function deleteTrigger(trigger) {
  delete expansions[trigger];
  saveExpansions();
}

// Exporta JSON
$('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(expansions, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'espano-expansions.json';
  a.click(); URL.revokeObjectURL(url);
});

$('btn-add').addEventListener('click', () => openForm());
$('btn-back').addEventListener('click', closeForm);
$('btn-cancel').addEventListener('click', closeForm);
$('btn-save').addEventListener('click', saveForm);
$('search').addEventListener('input', render);

$('f-trigger').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('f-replacement').focus(); });
$('f-replacement').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.ctrlKey) saveForm(); });

// Carrega
chrome.storage.sync.get('expansions', (data) => {
  expansions = data.data || data.expansions || {};
  render();
});
