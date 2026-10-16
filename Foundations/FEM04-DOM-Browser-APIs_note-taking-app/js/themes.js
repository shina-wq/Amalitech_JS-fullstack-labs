const root = document.documentElement;
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
let currentTheme = 'system';

const updateTheme = () => {
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && darkQuery.matches);
  root.classList.toggle('theme-dark', isDark);
};

// Follow OS changes live while "System" is selected
darkQuery.addEventListener('change', updateTheme);

export const applyTheme = (themeName) => {
  currentTheme = themeName;
  updateTheme();
};

export const applyFont = (fontName) => {
  root.classList.toggle('font-serif', fontName === 'serif');
  root.classList.toggle('font-mono', fontName === 'mono');
};
