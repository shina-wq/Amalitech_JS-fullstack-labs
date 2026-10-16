// Keys are namespaced because every lab on localhost shares the same storage
const KEYS = {
  notes: 'note-app.notes',
  prefs: 'note-app.prefs',
  draft: 'note-app.draft',
};

const DEFAULT_PREFS = { theme: 'system', font: 'sans' };

const read = (store, key) => {
  try {
    return JSON.parse(store.getItem(key));
  } catch {
    return null;
  }
};

// Returns false when storage is full (QuotaExceededError) or unavailable
const write = (store, key, value) => {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

// null means nothing saved yet (first visit)
export const loadNotes = () => {
  const notes = read(localStorage, KEYS.notes);
  return Array.isArray(notes) ? notes : null;
};

export const saveNotes = (notes) => write(localStorage, KEYS.notes, notes);

export const loadPreferences = () => ({ ...DEFAULT_PREFS, ...read(localStorage, KEYS.prefs) });

export const savePreferences = (prefs) => write(localStorage, KEYS.prefs, prefs);

export const loadDraft = () => read(sessionStorage, KEYS.draft);

export const saveDraft = (draft) => write(sessionStorage, KEYS.draft, draft);

export const clearDraft = () => {
  try {
    sessionStorage.removeItem(KEYS.draft);
  } catch {
    // Storage unavailable: nothing to clear
  }
};
