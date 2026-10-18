import * as storage from './storage.js';

const sameTag = (a, b) => a.toLowerCase() === b.toLowerCase();

export class Note {
  constructor(title, content = '', tags = []) {
    this.id = crypto.randomUUID();
    this.title = title.trim();
    this.content = content;
    this.tags = [];
    tags.forEach((tag) => this.addTag(tag));
    this.archived = false;
    this.timestamp = new Date().toISOString();
    this.location = null;
  }

  // Rebuild a Note from plain JSON (localStorage / seed data)
  static from(data) {
    return Object.assign(Object.create(Note.prototype), data);
  }

  archive() {
    this.archived = true;
  }

  restore() {
    this.archived = false;
  }

  // Ignores blanks and case-insensitive duplicates
  addTag(tag) {
    const name = tag.trim();
    const exists = this.tags.some((t) => sameTag(t, name));
    if (name && !exists) this.tags.push(name);
  }
}

let notes = [];

const byNewest = (a, b) => b.timestamp.localeCompare(a.timestamp);

// Runs a change and saves it; if saving fails the change is undone so memory matches storage
const commit = (change) => {
  const backup = structuredClone(notes);
  const result = change();
  if (!storage.saveNotes(notes)) {
    notes = backup.map(Note.from);
    throw new Error('Storage is full. Delete some notes and try again.');
  }
  return result;
};

// Load saved notes, or seed with sample notes on the first visit
export const initNotes = async () => {
  const saved = storage.loadNotes();
  if (saved) {
    notes = saved.map(Note.from);
    return;
  }
  try {
    const seed = await fetch('assets/data.json').then((res) => res.json());
    notes = seed.map(Note.from);
    storage.saveNotes(notes);
  } catch {
    notes = [];
  }
};

export const getNote = (id) => notes.find((note) => note.id === id);

export const parseTags = (text) => text.split(',');

export const getNotes = ({ archived = false } = {}) =>
  notes.filter((note) => note.archived === archived).sort(byNewest);

// One entry per tag regardless of case ("dev" and "Dev" are the same tag)
export const getAllTags = () => {
  const tags = new Map();
  notes.flatMap((note) => note.tags).forEach((tag) => {
    if (!tags.has(tag.toLowerCase())) tags.set(tag.toLowerCase(), tag);
  });
  return [...tags.values()].sort((a, b) => a.localeCompare(b));
};

export const createNote = (title, content, tags, location = null) =>
  commit(() => {
    const note = new Note(title, content, tags);
    note.location = location;
    notes.push(note);
    return note;
  });

export const updateNote = (id, { title, content, tags, location }) => {
  // e.g. deleted in another tab
  if (!getNote(id)) throw new Error('This note no longer exists.');
  return commit(() => {
    const note = getNote(id);
    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content;
    if (location !== undefined) note.location = location;
    if (tags !== undefined) {
      note.tags = [];
      tags.forEach((tag) => note.addTag(tag));
    }
    note.timestamp = new Date().toISOString();
    return note;
  });
};

export const archiveNote = (id) => commit(() => getNote(id)?.archive());

export const restoreNote = (id) => commit(() => getNote(id)?.restore());

export const deleteNote = (id) =>
  commit(() => {
    notes = notes.filter((note) => note.id !== id);
  });

// Search and tag filters cover archived notes too, as in the design
export const searchNotes = (query) => {
  const q = query.trim().toLowerCase();
  return notes
    .filter((note) => [note.title, note.content, ...note.tags].some((field) => field.toLowerCase().includes(q)))
    .sort(byNewest);
};

export const filterByTag = (tag) =>
  notes.filter((note) => note.tags.some((t) => sameTag(t, tag))).sort(byNewest);
