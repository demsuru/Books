const isDev = import.meta.env?.MODE !== 'production';

const tag = (level) => `[${level}] ${new Date().toISOString()}`;

const logger = {
  info: (msg, ...args) => isDev && console.info(tag('INFO'), msg, ...args),
  warn: (msg, ...args) => isDev && console.warn(tag('WARN'), msg, ...args),
  error: (msg, ...args) => console.error(tag('ERROR'), msg, ...args),
};

export default logger;
