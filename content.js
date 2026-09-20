// Global snippet expander - v5
// Zoho Desk fix: Zoho rebuilds its editor iframe document (document.write),
// which silently destroys attached listeners. We re-scan every second and
// re-attach whenever we see a document we haven't hooked yet.
//
// v5: snippets are no longer hardcoded here. They live in
// chrome.storage.local and are managed from the dashboard (click the
// toolbar icon). Edits made in the dashboard apply here live, with no
// page reload needed, via chrome.storage.onChanged.
//
// v5.1: the sign-off name isn't hardcoded either. Snippets can contain the
// literal placeholder "{signature}", which gets swapped for whatever name
// is saved in chrome.storage.local under "signature" (edited from the
// dashboard) right before the text is inserted - same live-update wiring
// as the snippets themselves.
//
// Debug logging included - open DevTools Console and filter by [Snippet].

const DEBUG = true; // set to false once everything works
const log = (...a) => DEBUG && console.log('[Snippet]', ...a);

// Fallback used only if storage hasn't returned anything yet (e.g. a brief
// race right after install, before the background script finishes seeding).
function buildFallbackMap() {
  const map = {};
  (typeof DEFAULT_SNIPPETS !== 'undefined' ? DEFAULT_SNIPPETS : []).forEach((s) => {
    if (s && s.shortcut) map[s.shortcut] = s.content || '';
  });
  return map;
}

let SNIPPETS = buildFallbackMap();
// Longest shortcut first, so a more specific trigger (e.g. "formmiss/")
// wins over a shorter one that happens to be a trailing substring of it
// (e.g. a hypothetical "miss/").
let KEYS = Object.keys(SNIPPETS).sort((a, b) => b.length - a.length);

// Fallback used only if storage hasn't returned anything yet - mirrors the
// SNIPPETS fallback above.
let SIGNATURE = typeof DEFAULT_SIGNATURE !== 'undefined' ? DEFAULT_SIGNATURE : '';

function applySnippetList(list) {
  const map = {};
  (list || []).forEach((s) => {
    if (s && s.shortcut) map[s.shortcut] = s.content || '';
  });
  SNIPPETS = Object.keys(map).length ? map : buildFallbackMap();
  KEYS = Object.keys(SNIPPETS).sort((a, b) => b.length - a.length);
  log('snippets loaded:', KEYS);
}

function applySignature(value) {
  SIGNATURE = (typeof value === 'string' && value)
    ? value
    : (typeof DEFAULT_SIGNATURE !== 'undefined' ? DEFAULT_SIGNATURE : '');
  log('signature loaded:', SIGNATURE);
}

// Swaps the "{signature}" placeholder for the configured name. Plain
// string substitution - same lightweight, non-templating approach as the
// existing "{}" fill-in-the-blank placeholder already used in snippets.
function fillTemplate(text) {
  return text.split('{signature}').join(SIGNATURE);
}

function loadSnippets() {
  try {
    chrome.storage.local.get(['snippets', 'signature'], (res) => {
      applySnippetList(res.snippets);
      applySignature(res.signature);
    });
  } catch (e) {
    log('storage unavailable, using fallback defaults', e);
  }
}

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.snippets) {
      applySnippetList(changes.snippets.newValue);
    }
    if (area === 'local' && changes.signature) {
      applySignature(changes.signature.newValue);
    }
  });
} catch (e) {
  /* ignore - storage API not available in this context */
}

loadSnippets();

// ---------- INPUT / TEXTAREA ----------
function expandInInput(el) {
  const pos = el.selectionStart;
  if (pos == null) return;
  const before = el.value.slice(0, pos);
  for (const key of KEYS) {
    if (before.endsWith(key)) {
      const snippet = fillTemplate(SNIPPETS[key]);
      el.value = before.slice(0, -key.length) + snippet + el.value.slice(pos);
      const newPos = pos - key.length + snippet.length;
      el.setSelectionRange(newPos, newPos);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      log('expanded', key, 'in input/textarea');
      return;
    }
  }
}

function expandInEditable(doc) {
  const win = doc.defaultView;
  const sel = win.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) {
    log('caret not in a text node, skipping');
    return;
  }
  const textBefore = node.textContent.slice(0, range.startOffset);
  for (const key of KEYS) {
    if (textBefore.endsWith(key)) {
      const keyRange = doc.createRange();
      keyRange.setStart(node, range.startOffset - key.length);
      keyRange.setEnd(node, range.startOffset);
      sel.removeAllRanges();
      sel.addRange(keyRange);
      const lines = fillTemplate(SNIPPETS[key]).split('\n');
      doc.execCommand('insertText', false, lines[0]);
      for (let i = 1; i < lines.length; i++) {
        const ok = doc.execCommand('insertParagraph') ||
                   doc.execCommand('insertLineBreak');
        if (!ok) doc.execCommand('insertHTML', false, '<br>');
        if (lines[i]) doc.execCommand('insertText', false, lines[i]);
      }
      log('expanded', key, 'in rich editor');
      return;
    }
  }
}

// ---------- keyup handler factory ----------
function makeHandler(doc) {
  return (e) => {
    if (e.key !== '/') return;
    const el = e.target;
    log('slash typed in', doc === document ? 'main page' : 'iframe',
        '| target:', el && (el.tagName || el.nodeName));
    if (!el) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      expandInInput(el);
    } else {
      expandInEditable(doc);
    }
  };
}

// ---------- attach + keep re-attaching ----------
const attachedDocs = new WeakSet();
function attachToDocument(doc, label) {
  if (!doc || attachedDocs.has(doc)) return;
  attachedDocs.add(doc);
  doc.addEventListener('keyup', makeHandler(doc), true);
  try { doc.defaultView.addEventListener('keyup', makeHandler(doc), true); } catch (_) {}
  log('attached to', label);
}

function scanAllFrames(doc, label) {
  attachToDocument(doc, label);
  const frames = doc.querySelectorAll('iframe');
  frames.forEach((frame, i) => {
    let innerDoc = null;
    try { innerDoc = frame.contentDocument; } catch (_) { /* cross-origin */ }
    if (innerDoc) {
      const name = frame.name || frame.className || `iframe#${i}`;
      scanAllFrames(innerDoc, `${label} > ${name}`);
    }
  });
}

// Initial scan + poll every second (fixes Zoho's document.write rebuilds).
scanAllFrames(document, location.hostname || 'page');
setInterval(() => scanAllFrames(document, location.hostname || 'page'), 1000);
