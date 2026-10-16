import * as storage from './storage.js';
import * as noteManager from './noteManager.js';
import * as ui from './ui.js';
import * as themes from './themes.js';
import * as geo from './location.js';

const $ = (id) => document.getElementById(id);
const form = $('note-form');
const titleInput = $('note-title');
const searchInput = $('search-input');
const noteDetail = $('note-detail');
const dialog = $('confirm-dialog');
const desktopQuery = matchMedia('(width >= 80rem)');
const isDesktop = () => desktopQuery.matches;

const state = {
  view: 'all',
  tag: '',
  query: '',
  selectedId: null,
  creating: false,
  pendingLocation: null, // location fetched for the open editor, saved with the note
  settingsPanel: 'color',
};

let prefs = storage.loadPreferences();

const TOASTS = {
  archive: ['Note archived.', { linkText: 'Archived Notes', linkView: 'archived' }],
  restore: ['Note restored to active notes.', { linkText: 'All Notes', linkView: 'all' }],
  delete: ['Note permanently deleted.'],
};

const NOTE_ACTIONS = {
  archive: noteManager.archiveNote,
  restore: noteManager.restoreNote,
  delete: noteManager.deleteNote,
};

// Rendering

const getVisibleNotes = () => {
  if (state.view === 'archived') return noteManager.getNotes({ archived: true });
  if (state.view === 'tag') return noteManager.filterByTag(state.tag);
  if (state.view === 'search' && state.query) return noteManager.searchNotes(state.query);
  return noteManager.getNotes();
};

// Re-renders list + tags; on desktop a note is always selected when the list isn't empty
const showNotes = () => {
  const notes = getVisibleNotes();
  if (!state.creating && !notes.some((note) => note.id === state.selectedId)) {
    state.selectedId = isDesktop() ? notes[0]?.id ?? null : null;
  }
  ui.updateTagList(noteManager.getAllTags(), state.view === 'tag' ? state.tag : '');
  ui.renderAllNotes(notes, { selectedId: state.selectedId, query: state.query });
};

const showEditor = () => {
  const note = noteManager.getNote(state.selectedId);
  state.pendingLocation = null;
  if (state.creating) ui.renderEditor(null);
  else if (note) ui.renderEditor(note);
  else ui.hideEditor();
  ui.setSaveEnabled(titleInput.value.trim() !== '');
};

const focusList = () => {
  const target = document.querySelector('.note-item[aria-current]')
    ?? document.querySelector(isDesktop() ? '.create-btn' : '.fab');
  target?.focus();
};

const revertPreferences = () => {
  themes.applyTheme(prefs.theme);
  themes.applyFont(prefs.font);
  ui.setPreferenceInputs(prefs);
};

// Navigation

const navigate = (view, { tag = '' } = {}) => {
  if (view !== 'search') {
    state.query = '';
    searchInput.value = '';
  }
  Object.assign(state, { view, tag, creating: false });
  storage.clearDraft();
  revertPreferences();
  ui.setView(view, { tag, query: state.query });
  ui.setDetailOpen(false);

  if (view === 'settings') {
    ui.showSettingsPanel(state.settingsPanel);
    return;
  }
  showNotes();
  showEditor();
};

const openSettingsPanel = (name) => {
  state.settingsPanel = name;
  revertPreferences();
  ui.showSettingsPanel(name);
  ui.setDetailOpen(true);
  document.querySelector(`[data-setting-panel="${name}"] :checked`)?.focus();
};

// Notes

const openNote = (id) => {
  Object.assign(state, { selectedId: id, creating: false });
  storage.clearDraft();
  showNotes();
  showEditor();
  ui.setDetailOpen(true);
  // Re-rendering the list drops focus, so put it back
  if (isDesktop()) focusList();
  else titleInput.focus();
};

const openNewNote = () => {
  Object.assign(state, { selectedId: null, creating: true });
  storage.clearDraft();
  showNotes();
  showEditor();
  ui.setDetailOpen(true);
  titleInput.focus();
};

// Cancel / Go Back / Escape: discard edits and return to the list
const closeEditor = () => {
  state.creating = false;
  storage.clearDraft();
  ui.setDetailOpen(false);
  showNotes();
  showEditor();
  if (!isDesktop()) focusList();
};

const validateTitle = () => {
  const isValid = titleInput.value.trim() !== '';
  if (isValid) ui.clearValidationError(titleInput);
  else ui.showValidationError(titleInput, 'Please enter a title for your note.');
  return isValid;
};

const saveNote = () => {
  if (!validateTitle()) {
    titleInput.focus();
    return;
  }
  const { title, tags, content } = form.elements;
  const data = {
    title: title.value,
    content: content.value,
    tags: noteManager.parseTags(tags.value),
    location: state.pendingLocation ?? undefined, // undefined keeps the saved location
  };

  try {
    const note = state.creating
      ? noteManager.createNote(data.title, data.content, data.tags, data.location)
      : noteManager.updateNote(state.selectedId, data);
    storage.clearDraft();
    Object.assign(state, { selectedId: note.id, creating: false });

    // A new note may not belong to the current view (e.g. Archived)
    if (!getVisibleNotes().includes(note)) {
      Object.assign(state, { view: 'all', tag: '', query: '' });
      searchInput.value = '';
      ui.setView('all');
    }
    showNotes();
    showEditor();
    ui.showToast('Note saved successfully!');
  } catch (error) {
    ui.showToast(error.message, { isError: true });
  }
};

const runNoteAction = async (action) => {
  const id = state.selectedId;
  const needsConfirm = action === 'archive' || action === 'delete';
  if (needsConfirm && !(await ui.confirmAction(action))) return;

  try {
    NOTE_ACTIONS[action](id);
  } catch (error) {
    ui.showToast(error.message, { isError: true });
    return;
  }
  if (!isDesktop()) {
    state.selectedId = null;
    ui.setDetailOpen(false);
  }
  showNotes();
  showEditor();
  focusList();
  ui.showToast(...TOASTS[action]);
};

const addLocation = async () => {
  const editorKey = () => (state.creating ? 'new' : state.selectedId);
  const startedFor = editorKey();
  ui.setLocationBusy(true);
  try {
    const location = await geo.getCurrentLocation();
    // Ignore the result if the user opened another note meanwhile
    if (editorKey() !== startedFor) return;
    state.pendingLocation = location;
    ui.setLocation(location);
  } catch (error) {
    ui.showToast(error.message, { isError: true });
  } finally {
    ui.setLocationBusy(false);
  }
};

const restoreDraft = (draft) => {
  if (!draft) return;
  if (draft.id && !noteManager.getNote(draft.id)) {
    storage.clearDraft();
    return;
  }
  // Opening clears the draft, so write it back after filling the form
  if (draft.id) openNote(draft.id);
  else openNewNote();
  const { title, tags, content } = form.elements;
  title.value = draft.title;
  tags.value = draft.tags;
  content.value = draft.content;
  storage.saveDraft(draft);
  ui.setSaveEnabled(draft.title.trim() !== '');
  ui.showToast('Unsaved changes restored.');
};

// Settings

const applyPreferences = (settingsForm) => {
  prefs = { ...prefs, ...Object.fromEntries(new FormData(settingsForm)) };
  if (storage.savePreferences(prefs)) ui.showToast('Settings updated successfully!');
  else ui.showToast('Could not save your settings.', { isError: true });
};

// Event handlers (delegated from document)

const actions = {
  create: openNewNote,
  back: closeEditor,
  cancel: closeEditor,
  archive: () => runNoteAction('archive'),
  restore: () => runNoteAction('restore'),
  delete: () => runNoteAction('delete'),
  'add-location': addLocation,
  'settings-back': () => {
    revertPreferences();
    ui.setDetailOpen(false);
  },
  'dismiss-toast': (button) => button.closest('.toast').remove(),
};

const handleClick = (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const { id, tag, view, setting, action } = button.dataset;

  if (id) openNote(id);
  else if (tag) navigate('tag', { tag });
  else if (view) {
    navigate(view);
    if (view === 'search') searchInput.focus();
  } else if (setting) openSettingsPanel(setting);
  else if (action) actions[action]?.(button);
};

const handleSubmit = (event) => {
  const target = event.target;
  if (target.method === 'dialog') return; // let the confirm dialog close itself
  event.preventDefault();
  if (target === form) saveNote();
  else if (target.dataset.settingPanel) applyPreferences(target);
};

const handleInput = (event) => {
  if (event.target === searchInput) {
    state.query = searchInput.value.trim();
    if (!state.query && isDesktop()) {
      navigate('all');
    } else if (state.view !== 'search') {
      navigate('search');
    } else {
      const previousId = state.selectedId;
      ui.setView('search', { query: state.query });
      showNotes();
      if (state.selectedId !== previousId) showEditor();
    }
    return;
  }

  if (form.contains(event.target)) {
    const { title, tags, content } = form.elements;
    storage.saveDraft({
      id: state.creating ? null : state.selectedId,
      title: title.value,
      tags: tags.value,
      content: content.value,
    });
    ui.setSaveEnabled(title.value.trim() !== '');
    if (event.target === titleInput && title.value.trim()) ui.clearValidationError(titleInput);
  }
};

// Theme/font radios preview instantly; "Apply Changes" saves them
const handleChange = ({ target }) => {
  if (target.name === 'theme') themes.applyTheme(target.value);
  if (target.name === 'font') themes.applyFont(target.value);
};

const handleKeydown = (event) => {
  const { key, target } = event;

  // The dialog handles its own Escape; search inputs use Escape to clear
  if (key === 'Escape' && !dialog.open && target !== searchInput && !noteDetail.hidden) {
    closeEditor();
  }

  if ((key === 'ArrowDown' || key === 'ArrowUp') && target.matches('.note-item')) {
    event.preventDefault();
    const items = [...document.querySelectorAll('.note-item')];
    items[items.indexOf(target) + (key === 'ArrowDown' ? 1 : -1)]?.focus();
  }
};

// Init

const init = async () => {
  revertPreferences();
  await noteManager.initNotes();
  // Read the draft before navigate() clears it
  const draft = storage.loadDraft();
  navigate('all');
  restoreDraft(draft);

  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleSubmit);
  document.addEventListener('input', handleInput);
  document.addEventListener('change', handleChange);
  document.addEventListener('keydown', handleKeydown);
  titleInput.addEventListener('blur', validateTitle);

  // Crossing the desktop breakpoint changes whether a note should be auto-selected
  desktopQuery.addEventListener('change', () => {
    if (state.view === 'settings' || state.creating) return;
    showNotes();
    showEditor();
  });
};

init();
