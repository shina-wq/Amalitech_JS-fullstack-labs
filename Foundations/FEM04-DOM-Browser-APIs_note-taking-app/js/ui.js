const $ = (id) => document.getElementById(id);

const app = document.querySelector('.app');
const els = {
  title: $('page-title'),
  description: $('list-description'),
  empty: $('empty-state'),
  list: $('note-list'),
  tagList: $('tag-list'),
  detail: $('note-detail'),
  actions: $('note-actions'),
  form: $('note-form'),
  noteTitle: $('note-title'),
  noteTags: $('note-tags'),
  noteContent: $('note-content'),
  noteDate: $('note-date'),
  statusRow: $('status-row'),
  locationRow: $('location-row'),
  noteLocation: $('note-location'),
  toasts: $('toast-region'),
  dialog: $('confirm-dialog'),
};

const VIEWS = {
  all: () => ({
    title: 'All Notes',
    empty: 'You don’t have any notes yet. Start a new note to capture your thoughts and ideas.',
  }),
  archived: () => ({
    title: 'Archived Notes',
    description: 'All your archived notes are stored here. You can restore or delete them anytime.',
    empty: 'No notes have been archived yet. Move notes here for safekeeping, or create a new note.',
  }),
  tag: ({ tag }) => ({
    title: `Notes Tagged: ${tag}`,
    description: `All notes with the “${tag}” tag are shown here.`,
    empty: 'No notes found with this tag. Try another tag or create a new note.',
  }),
  search: ({ query }) => ({
    title: query ? `Showing results for: ${query}` : 'Search',
    description: query && `All notes matching “${query}” are displayed below.`,
    empty: 'No notes match your search. Try a different keyword or create a new note.',
  }),
  tags: () => ({ title: 'Tags' }),
  settings: () => ({ title: 'Settings' }),
};

const CONFIRM = {
  delete: {
    title: 'Delete Note',
    message: 'Are you sure you want to permanently delete this note? This action cannot be undone.',
    icon: 'delete',
    button: 'btn-danger',
  },
  archive: {
    title: 'Archive Note',
    message: 'Are you sure you want to archive this note? You can find it in the Archived Notes section and restore it anytime.',
    icon: 'archive',
    button: 'btn-primary',
  },
};

const TOAST_DURATION = 4000;

// Helpers

const icon = (name) => {
  const el = document.createElement('span');
  el.className = `icon icon-${name}`;
  el.setAttribute('aria-hidden', 'true');
  return el;
};

const cloneTemplate = (id) => $(id).content.firstElementChild.cloneNode(true);

const setCurrent = (el, isCurrent) =>
  isCurrent ? el.setAttribute('aria-current', 'page') : el.removeAttribute('aria-current');

export const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${String(date.getDate()).padStart(2, '0')} ${month} ${date.getFullYear()}`;
};

const formatLocation = ({ city, latitude, longitude }) =>
  city || `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Wraps matches of query in <mark>; text nodes keep user content safe from HTML injection
const highlight = (text, query) => {
  const fragment = document.createDocumentFragment();
  if (!query) {
    fragment.append(text);
    return fragment;
  }
  // Splitting on a capture group puts the matches at odd indexes
  text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi')).forEach((part, i) => {
    if (i % 2) {
      const mark = document.createElement('mark');
      mark.textContent = part;
      fragment.append(mark);
    } else {
      fragment.append(part);
    }
  });
  return fragment;
};

// Views & navigation

export const setView = (view, { tag = '', query = '' } = {}) => {
  const copy = VIEWS[view]({ tag, query });
  app.dataset.view = view;
  els.title.textContent = copy.title;
  els.description.textContent = copy.description || '';
  els.description.hidden = !copy.description;
  els.empty.textContent = copy.empty || '';

  // Mobile has one "Tags" tab for both the tag list and a selected tag
  const navView = view === 'tag' ? 'tags' : view;
  document.querySelectorAll('.nav-link[data-view], .bottom-nav-link').forEach((link) =>
    setCurrent(link, link.dataset.view === navView));
  els.tagList.querySelectorAll('[data-tag]').forEach((link) =>
    setCurrent(link, view === 'tag' && link.dataset.tag === tag));
};

export const toggleArchiveView = (showArchived) => setView(showArchived ? 'archived' : 'all');

// Mobile/tablet: show a note or settings panel instead of the list
export const setDetailOpen = (open) => app.classList.toggle('is-detail', open);

// Notes list

export const renderNote = (note, { selected = false, query = '' } = {}) => {
  const item = cloneTemplate('note-item-template');
  const button = item.querySelector('.note-item');
  button.dataset.id = note.id;
  button.classList.toggle('is-archived', note.archived);
  if (selected) button.setAttribute('aria-current', 'true');

  item.querySelector('.note-item-title').append(highlight(note.title, query));
  item.querySelector('.tag-chips').append(...note.tags.map((tag) => {
    const chip = document.createElement('span');
    chip.className = 'tag';
    chip.append(highlight(tag, query));
    return chip;
  }));

  const time = item.querySelector('time');
  time.dateTime = note.timestamp;
  time.textContent = formatDate(note.timestamp);
  return item;
};

export const renderAllNotes = (notes, { selectedId = null, query = '' } = {}) => {
  els.list.replaceChildren(...notes.map((note) => renderNote(note, { selected: note.id === selectedId, query })));
  els.empty.hidden = notes.length > 0 || !els.empty.textContent;
};

export const updateTagList = (tags, activeTag = '') => {
  els.tagList.replaceChildren(...tags.map((tag) => {
    const item = cloneTemplate('tag-item-template');
    const button = item.querySelector('[data-tag]');
    button.dataset.tag = tag;
    button.querySelector('.tag-name').textContent = tag;
    setCurrent(button, tag === activeTag);
    return item;
  }));
};

// Editor

// note = null opens a blank editor for a new note
export const renderEditor = (note) => {
  const isNew = !note;
  els.form.dataset.id = note?.id ?? '';
  els.noteTitle.value = note?.title ?? '';
  els.noteTags.value = note?.tags.join(', ') ?? '';
  els.noteContent.value = note?.content ?? '';
  els.noteDate.textContent = note ? formatDate(note.timestamp) : 'Not yet saved';
  els.statusRow.hidden = !note?.archived;
  els.locationRow.hidden = !note?.location;
  els.noteLocation.textContent = note?.location ? formatLocation(note.location) : '';
  clearValidationError(els.noteTitle);

  document.querySelectorAll('#note-detail [data-action], #note-actions [data-action]').forEach((button) => {
    const { action } = button.dataset;
    if (action === 'archive') button.hidden = isNew || note.archived;
    if (action === 'restore') button.hidden = isNew || !note.archived;
    if (action === 'delete') button.hidden = isNew;
  });

  els.detail.hidden = false;
  els.actions.hidden = isNew;
};

export const hideEditor = () => {
  els.detail.hidden = true;
  els.actions.hidden = true;
  els.form.dataset.id = '';
};

export const setSaveEnabled = (enabled) => {
  els.form.querySelectorAll('[type="submit"]').forEach((button) => {
    button.disabled = !enabled;
  });
};

// Validation

export const showValidationError = (field, message) => {
  const error = $(field.getAttribute('aria-describedby'));
  error.replaceChildren(icon('info'), message);
  error.hidden = false;
  field.setAttribute('aria-invalid', 'true');
};

export const clearValidationError = (field) => {
  $(field.getAttribute('aria-describedby')).hidden = true;
  field.removeAttribute('aria-invalid');
};

// Feedback

export const showToast = (message, { linkText = '', linkView = '', isError = false } = {}) => {
  const toast = cloneTemplate('toast-template');
  toast.querySelector('.toast-message').textContent = message;
  toast.classList.toggle('toast-error', isError);
  if (isError) toast.querySelector('.toast-icon').classList.replace('icon-checkmark', 'icon-info');
  if (linkText) {
    const link = toast.querySelector('.toast-link');
    link.textContent = linkText;
    link.dataset.view = linkView;
    link.hidden = false;
  }
  els.toasts.append(toast);
  setTimeout(() => toast.remove(), TOAST_DURATION);
};

// Resolves true when the user confirms; Escape or Cancel resolves false
export const confirmAction = (type) => {
  const { title, message, icon: iconName, button } = CONFIRM[type];
  $('confirm-title').textContent = title;
  $('confirm-message').textContent = message;
  $('confirm-icon').className = `icon icon-${iconName}`;
  const confirmButton = $('confirm-btn');
  confirmButton.textContent = title;
  confirmButton.className = `btn ${button}`;

  els.dialog.returnValue = '';
  els.dialog.showModal();
  return new Promise((resolve) => {
    els.dialog.addEventListener('close', () => resolve(els.dialog.returnValue === 'confirm'), { once: true });
  });
};

// Settings

export const showSettingsPanel = (name) => {
  document.querySelectorAll('[data-setting]').forEach((link) => setCurrent(link, link.dataset.setting === name));
  document.querySelectorAll('[data-setting-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.settingPanel !== name;
  });
};

export const setPreferenceInputs = ({ theme, font }) => {
  $('color-form').elements.theme.value = theme;
  $('font-form').elements.font.value = font;
};
