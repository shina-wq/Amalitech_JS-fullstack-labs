// ---Text analysis---

const WORDS_PER_MINUTE = 200;
const DENSITY_PREVIEW = 5;
const LIMIT_WARNING_RATIO = 0.9; // heads-up once 90% of the limit is used

const countWords = (text) => text.match(/\S+/g)?.length ?? 0;

// Fragments between ., ! or ? — an unfinished last sentence still counts
const countSentences = (text) => text.split(/[.!?]+/).filter((part) => part.trim()).length;

const padCount = (count) => String(count).padStart(2, "0");

function readingTime(words) {
  if (!words) return "0 minute";
  const minutes = Math.round(words / WORDS_PER_MINUTE);
  if (!minutes) return "<1 minute";
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

// Letter frequencies, most common first, as { letter, count, percent }. //
function letterDensity(text) {
  const letters = text.toUpperCase().match(/\p{L}/gu) ?? [];
  const counts = new Map();
  for (const letter of letters) counts.set(letter, (counts.get(letter) ?? 0) + 1);

  return [...counts]
    .map(([letter, count]) => ({ letter, count, percent: (count / letters.length) * 100 }))
    .sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter));
}

// ---DOM---

const byId = (id) => document.getElementById(id);
const THEME_KEY = "character-counter:theme"; // also read by the inline script in <head>
const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");

const textarea = byId("text-input");
const excludeSpaces = byId("exclude-spaces");
const charLabel = byId("char-label");
const charCount = byId("char-count");
const wordCount = byId("word-count");
const sentenceCount = byId("sentence-count");
const readingTimeText = byId("reading-time");
const limitToggle = byId("limit-toggle");
const limitInput = byId("limit-input");
const limitMessage = byId("limit-message");
const limitText = byId("limit-text");
const densityEmpty = byId("density-empty");
const densityList = byId("density-list");
const densityToggle = byId("density-toggle");
const densityRow = byId("density-row");

// ---Render. the DOM holds the state, so every change simply re-renders---

function render() {
  const text = textarea.value;
  const words = countWords(text);
  const characters = excludeSpaces.checked ? text.replace(/\s/g, "") : text;

  charLabel.textContent = excludeSpaces.checked ? "Total Characters (no space)" : "Total Characters";
  charCount.textContent = padCount(characters.length);
  wordCount.textContent = padCount(words);
  sentenceCount.textContent = padCount(countSentences(text));
  readingTimeText.textContent = readingTime(words);
  renderLimit(text.length);
  renderDensity(letterDensity(text));
}

// Native maxlength stops typing and pasting at the limit. Lowering the limit
// below the current text keeps the text and shows the "exceeds" message instead.
function renderLimit(length) {
  const limit = limitToggle.checked ? Math.floor(limitInput.valueAsNumber) : NaN;
  const active = limit >= 1;
  const reached = active && length >= limit;
  const approaching = active && !reached && length >= limit * LIMIT_WARNING_RATIO;

  limitInput.hidden = !limitToggle.checked;
  if (active) textarea.maxLength = limit;
  else textarea.removeAttribute("maxlength");

  // Fixed wording (no live count) so the alert is announced once, not on every keystroke
  let message = "";
  if (reached) message = `Limit reached! Your text ${length > limit ? "exceeds" : "has reached"} ${limit} characters.`;
  else if (approaching) message = `Almost there! You're close to the ${limit}-character limit.`;

  limitMessage.hidden = !message;
  limitMessage.classList.toggle("limit-message--warning", approaching);
  // Write only on change: re-setting the same text in a role="alert" can make screen readers repeat it
  if (limitText.textContent !== message) limitText.textContent = message;
  textarea.setAttribute("aria-invalid", reached);
  if (message) textarea.setAttribute("aria-describedby", "limit-message");
  else textarea.removeAttribute("aria-describedby");
}

function renderDensity(rows) {
  const expanded = densityToggle.getAttribute("aria-expanded") === "true";
  const visible = expanded ? rows : rows.slice(0, DENSITY_PREVIEW);

  densityEmpty.hidden = rows.length > 0;
  densityToggle.hidden = rows.length <= DENSITY_PREVIEW;
  densityList.replaceChildren(...visible.map(createDensityRow));
}

function createDensityRow({ letter, count, percent }) {
  const row = densityRow.content.firstElementChild.cloneNode(true);
  row.querySelector(".density-letter").textContent = letter;
  row.querySelector(".density-bar span").style.setProperty("--percent", `${percent}%`);
  row.querySelector(".density-value").textContent = `${count} (${percent.toFixed(2)}%)`;
  return row;
}

// ---Events---

// One listener covers typing, both checkboxes and the limit field
document.querySelector(".analyzer").addEventListener("input", render);

densityToggle.addEventListener("click", () => {
  const expanded = densityToggle.getAttribute("aria-expanded") !== "true";
  densityToggle.setAttribute("aria-expanded", expanded);
  densityToggle.firstElementChild.textContent = expanded ? "See less" : "See more";
  render();
});

themeToggle.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, root.dataset.theme);
  } catch {} // Storage can be blocked; the theme still switches for this visit
  updateThemeLabel();
});

// The label describes the action, e.g. "Switch to light theme"
function updateThemeLabel() {
  themeToggle.setAttribute("aria-label", `Switch to ${root.dataset.theme === "dark" ? "light" : "dark"} theme`);
}

updateThemeLabel();
render();
