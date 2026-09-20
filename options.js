// Sugan Snippet Expander - dashboard logic
// Reads/writes chrome.storage.local under the "snippets" key.
// Shape: [{ id, shortcut, content, tag, updatedAt }, ...]
// Also reads/writes the "signature" key (plain string) - the sign-off name
// substituted wherever a snippet's content contains the literal
// "{signature}" placeholder. See defaults.js for DEFAULT_SIGNATURE.

const EDIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>';
const TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';

let snippets = [];
let activeTag = 'All';
let editingId = null;
let confirmAction = null;

const els = {
  grid: document.getElementById('grid'),
  searchInput: document.getElementById('searchInput'),
  signatureInput: document.getElementById('signatureInput'),
  tagBar: document.getElementById('tagBar'),
  countLabel: document.getElementById('countLabel'),
  emptyState: document.getElementById('emptyState'),
  emptyTitle: document.getElementById('emptyTitle'),
  emptyText: document.getElementById('emptyText'),
  emptyAddBtn: document.getElementById('emptyAddBtn'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalTitle: document.getElementById('modalTitle'),
  shortcutInput: document.getElementById('shortcutInput'),
  tagInput: document.getElementById('tagInput'),
  tagOptions: document.getElementById('tagOptions'),
  contentInput: document.getElementById('contentInput'),
  saveBtn: document.getElementById('saveBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  deleteBtn: document.getElementById('deleteBtn'),
  newSnippetBtn: document.getElementById('newSnippetBtn'),
  importBtn: document.getElementById('importBtn'),
  importFile: document.getElementById('importFile'),
  exportBtn: document.getElementById('exportBtn'),
  resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
  confirmOverlay: document.getElementById('confirmOverlay'),
  confirmTitle: document.getElementById('confirmTitle'),
  confirmBody: document.getElementById('confirmBody'),
  confirmOkBtn: document.getElementById('confirmOkBtn'),
  confirmCancelBtn: document.getElementById('confirmCancelBtn'),
  toast: document.getElementById('toast'),
};

// ---------- storage ----------
function loadSnippets() {
  chrome.storage.local.get(['snippets'], (res) => {
    if (res.snippets && res.snippets.length) {
      snippets = res.snippets;
      render();
    } else {
      // Self-heal: nothing in storage yet (fresh install, or upgraded from
      // an older hardcoded version). Seed with defaults so the dashboard
      // isn't empty while content.js quietly uses its own fallback copy.
      snippets = DEFAULT_SNIPPETS.map((s) => ({ ...s, updatedAt: Date.now() }));
      chrome.storage.local.set({ snippets }, render);
    }
  });
}

function saveSnippets(next, message) {
  snippets = next;
  chrome.storage.local.set({ snippets }, () => {
    render();
    if (message) showToast(message);
  });
}

function loadSignature() {
  chrome.storage.local.get(['signature'], (res) => {
    els.signatureInput.value = (typeof res.signature === 'string' && res.signature)
      ? res.signature
      : DEFAULT_SIGNATURE;
  });
}

function saveSignature() {
  const value = els.signatureInput.value.trim() || DEFAULT_SIGNATURE;
  els.signatureInput.value = value;
  chrome.storage.local.set({ signature: value }, () => showToast('Signature updated'));
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.snippets) {
    snippets = changes.snippets.newValue || [];
    render();
  }
  if (area === 'local' && changes.signature && document.activeElement !== els.signatureInput) {
    const value = changes.signature.newValue;
    els.signatureInput.value = (typeof value === 'string' && value) ? value : DEFAULT_SIGNATURE;
  }
});

// ---------- utilities ----------
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function normalizeShortcut(v) {
  let s = v.trim();
  if (s && !s.endsWith('/')) s += '/';
  return s;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  requestAnimationFrame(() => els.toast.classList.add('show'));
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    els.toast.classList.remove('show');
    setTimeout(() => { els.toast.hidden = true; }, 200);
  }, 2200);
}

// ---------- rendering ----------
function getTags() {
  const set = new Set();
  snippets.forEach((s) => { if (s.tag) set.add(s.tag); });
  return Array.from(set).sort();
}

function renderTagBar() {
  const tags = ['All', ...getTags()];
  els.tagBar.innerHTML = '';
  tags.forEach((tag) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (tag === activeTag ? ' active' : '');
    chip.textContent = tag;
    chip.addEventListener('click', () => { activeTag = tag; render(); });
    els.tagBar.appendChild(chip);
  });
  els.tagOptions.innerHTML = getTags().map((t) => `<option value="${escapeHtml(t)}"></option>`).join('');
}

function matchesSearch(s, q) {
  if (!q) return true;
  q = q.toLowerCase();
  return s.shortcut.toLowerCase().includes(q) ||
         s.content.toLowerCase().includes(q) ||
         (s.tag || '').toLowerCase().includes(q);
}

function render() {
  if (activeTag !== 'All' && !getTags().includes(activeTag)) activeTag = 'All';
  renderTagBar();

  const q = els.searchInput.value.trim();
  const filtered = snippets
    .filter((s) => activeTag === 'All' || s.tag === activeTag)
    .filter((s) => matchesSearch(s, q))
    .sort((a, b) => a.shortcut.localeCompare(b.shortcut));

  els.countLabel.textContent = `${snippets.length} snippet${snippets.length === 1 ? '' : 's'}` +
    (filtered.length !== snippets.length ? ` \u00b7 ${filtered.length} shown` : '');

  els.grid.innerHTML = '';

  if (filtered.length === 0) {
    els.emptyState.hidden = false;
    if (snippets.length === 0) {
      els.emptyTitle.textContent = 'No snippets yet';
      els.emptyText.textContent = "Create your first shortcut and it'll expand anywhere you type - Zoho Desk, Gmail, Freshservice, anywhere.";
      els.emptyAddBtn.hidden = false;
    } else {
      els.emptyTitle.textContent = 'No matches';
      els.emptyText.textContent = 'Try a different search term or tag.';
      els.emptyAddBtn.hidden = true;
    }
  } else {
    els.emptyState.hidden = true;
    filtered.forEach((s) => els.grid.appendChild(buildCard(s)));
  }
}

function buildCard(s) {
  const card = document.createElement('div');
  card.className = 'card glass';

  const preview = s.content.length > 160 ? s.content.slice(0, 160) + '\u2026' : s.content;

  card.innerHTML = `
    <div class="card-top">
      <span class="shortcut-pill">${escapeHtml(s.shortcut)}</span>
      ${s.tag ? `<span class="tag-pill">${escapeHtml(s.tag)}</span>` : ''}
    </div>
    <div class="card-content">${escapeHtml(preview)}</div>
    <div class="card-footer">
      <button class="icon-btn edit-btn" type="button" title="Edit" aria-label="Edit">${EDIT_ICON}</button>
      <button class="icon-btn delete-btn" type="button" title="Delete" aria-label="Delete">${TRASH_ICON}</button>
    </div>
  `;

  card.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); openModal(s); });
  card.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); confirmDelete(s); });
  card.addEventListener('click', () => openModal(s));

  return card;
}

// ---------- editor modal ----------
function openModal(s) {
  editingId = s ? s.id : null;
  els.modalTitle.textContent = s ? 'Edit Snippet' : 'New Snippet';
  els.shortcutInput.value = s ? s.shortcut : '';
  els.tagInput.value = s ? (s.tag || '') : '';
  els.contentInput.value = s ? s.content : '';
  els.deleteBtn.hidden = !s;
  els.modalOverlay.hidden = false;
  setTimeout(() => els.shortcutInput.focus(), 0);
}

function closeModal() {
  els.modalOverlay.hidden = true;
  editingId = null;
}

function handleSave() {
  const shortcut = normalizeShortcut(els.shortcutInput.value);
  const content = els.contentInput.value;
  const tag = els.tagInput.value.trim();

  if (!shortcut || shortcut.length < 2) {
    els.shortcutInput.focus();
    showToast(shortcut ? 'Add at least one character before the /' : "Shortcut can't be empty");
    return;
  }
  if (!content.trim()) {
    els.contentInput.focus();
    showToast("Expansion text can't be empty");
    return;
  }
  const dup = snippets.find((s) => s.shortcut === shortcut && s.id !== editingId);
  if (dup) {
    showToast(`"${shortcut}" is already used by another snippet`);
    return;
  }

  let next;
  if (editingId) {
    next = snippets.map((s) => s.id === editingId
      ? { ...s, shortcut, content, tag, updatedAt: Date.now() }
      : s);
  } else {
    next = [...snippets, { id: uid(), shortcut, content, tag, updatedAt: Date.now() }];
  }
  saveSnippets(next, editingId ? 'Snippet updated' : 'Snippet created');
  closeModal();
}

function confirmDelete(s) {
  openConfirm(
    'Delete this snippet?',
    `"${s.shortcut}" will be removed. This can't be undone.`,
    () => saveSnippets(snippets.filter((x) => x.id !== s.id), 'Snippet deleted')
  );
}

// ---------- confirm modal ----------
function openConfirm(title, body, onConfirm) {
  els.confirmTitle.textContent = title;
  els.confirmBody.textContent = body;
  confirmAction = onConfirm;
  els.confirmOverlay.hidden = false;
}

function closeConfirm() {
  els.confirmOverlay.hidden = true;
  confirmAction = null;
}

// ---------- import / export ----------
function exportSnippets() {
  const blob = new Blob([JSON.stringify(snippets, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `snippets-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importSnippets(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('not an array');

      const cleaned = data
        .filter((d) => d && typeof d.shortcut === 'string' && typeof d.content === 'string')
        .map((d) => ({
          id: d.id || uid(),
          shortcut: normalizeShortcut(d.shortcut),
          content: d.content,
          tag: d.tag || '',
          updatedAt: Date.now(),
        }))
        .filter((d) => d.shortcut.length >= 2);

      if (!cleaned.length) throw new Error('no valid snippets found');

      openConfirm(
        'Import snippets?',
        `Found ${cleaned.length} snippet${cleaned.length === 1 ? '' : 's'}. Any existing shortcut with the same name will be overwritten.`,
        () => {
          const map = new Map(snippets.map((s) => [s.shortcut, s]));
          cleaned.forEach((s) => map.set(s.shortcut, s));
          saveSnippets(Array.from(map.values()), 'Snippets imported');
        }
      );
    } catch (err) {
      showToast('Could not read that file - is it a valid export?');
    }
  };
  reader.readAsText(file);
}

function resetDefaults() {
  openConfirm(
    'Reset to default snippets?',
    "This replaces ALL current snippets with the built-in defaults. This can't be undone.",
    () => {
      const fresh = DEFAULT_SNIPPETS.map((s) => ({ ...s, updatedAt: Date.now() }));
      saveSnippets(fresh, 'Restored default snippets');
    }
  );
}

// ---------- events ----------
els.newSnippetBtn.addEventListener('click', () => openModal(null));
els.emptyAddBtn.addEventListener('click', () => openModal(null));
els.cancelBtn.addEventListener('click', closeModal);
els.closeModalBtn.addEventListener('click', closeModal);
els.saveBtn.addEventListener('click', handleSave);
els.deleteBtn.addEventListener('click', () => {
  const s = snippets.find((x) => x.id === editingId);
  closeModal();
  if (s) confirmDelete(s);
});
els.modalOverlay.addEventListener('click', (e) => { if (e.target === els.modalOverlay) closeModal(); });

els.confirmCancelBtn.addEventListener('click', closeConfirm);
els.confirmOverlay.addEventListener('click', (e) => { if (e.target === els.confirmOverlay) closeConfirm(); });
els.confirmOkBtn.addEventListener('click', () => {
  const fn = confirmAction;
  closeConfirm();
  if (fn) fn();
});

els.signatureInput.addEventListener('change', saveSignature);
els.signatureInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); els.signatureInput.blur(); }
});

els.searchInput.addEventListener('input', render);
els.exportBtn.addEventListener('click', exportSnippets);
els.importBtn.addEventListener('click', () => els.importFile.click());
els.importFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) importSnippets(file);
  e.target.value = '';
});
els.resetDefaultsBtn.addEventListener('click', resetDefaults);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!els.confirmOverlay.hidden) closeConfirm();
    else if (!els.modalOverlay.hidden) closeModal();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !els.modalOverlay.hidden) {
    handleSave();
  }
});

// ---------- init ----------
loadSnippets();
loadSignature();
