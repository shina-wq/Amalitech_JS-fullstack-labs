import * as storage from './storage.js';

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
    const exists = this.tags.some((t) => t.toLowerCase() === name.toLowerCase());
    if (name && !exists) this.tags.push(name);
  }
}

let notes = [];

const byNewest = (a, b) => b.timestamp.localeCompare(a.timestamp);

const persist = () => {
  if (!storage.saveNotes(notes)) {
    throw new Error('Storage is full. Delete some notes and try again.');
  }
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

export const getAllTags = () =>
  [...new Set(notes.flatMap((note) => note.tags))].sort((a, b) => a.localeCompare(b));

export const createNote = (title, content, tags, location = null) => {
  const note = new Note(title, content, tags);
  note.location = location;
  notes.push(note);
  persist();
  return note;
};

export const updateNote = (id, { title, content, tags }) => {
  const note = getNote(id);
  if (!note) return null;
  if (title !== undefined) note.title = title.trim();
  if (content !== undefined) note.content = content;
  if (tags !== undefined) {
    note.tags = [];
    tags.forEach((tag) => note.addTag(tag));
  }
  note.timestamp = new Date().toISOString();
  persist();
  return note;
};

export const archiveNote = (id) => {
  getNote(id)?.archive();
  persist();
};

export const restoreNote = (id) => {
  getNote(id)?.restore();
  persist();
};

export const deleteNote = (id) => {
  notes = notes.filter((note) => note.id !== id);
  persist();
};

// Search and tag filters cover archived notes too, as in the design
export const searchNotes = (query) => {
  const q = query.trim().toLowerCase();
  return notes
    .filter((note) => [note.title, note.content, ...note.tags].some((field) => field.toLowerCase().includes(q)))
    .sort(byNewest);
};

export const filterByTag = (tag) => notes.filter((note) => note.tags.includes(tag)).sort(byNewest);
