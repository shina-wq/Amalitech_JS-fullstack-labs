const debugEnabled = Boolean(process.env.DEBUG);

export const logger = {
  info: (...args) => console.log('ℹ', ...args),
  warn: (...args) => console.warn('⚠', ...args),
  error: (...args) => console.error('✖', ...args),
  debug: (...args) => debugEnabled && console.debug('[debug]', ...args),
};
