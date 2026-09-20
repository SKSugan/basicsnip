// Sugan Snippet Expander - background service worker
// 1) Makes sure chrome.storage.local has a snippet list (seeds the
//    defaults on first install, or any time storage is found empty -
//    e.g. right after upgrading from the old hardcoded version), and a
//    signature name (seeds DEFAULT_SIGNATURE the same way - editable any
//    time from the dashboard, so anyone using this extension can swap in
//    their own name).
// 2) Opens the dashboard when the toolbar icon is clicked.

importScripts('defaults.js');

function ensureSeeded() {
  chrome.storage.local.get(['snippets', 'signature'], (res) => {
    const updates = {};
    if (!res.snippets || !res.snippets.length) {
      updates.snippets = DEFAULT_SNIPPETS;
    }
    if (typeof res.signature !== 'string' || !res.signature) {
      updates.signature = DEFAULT_SIGNATURE;
    }
    if (Object.keys(updates).length) {
      chrome.storage.local.set(updates);
    }
  });
}

chrome.runtime.onInstalled.addListener(ensureSeeded);

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
