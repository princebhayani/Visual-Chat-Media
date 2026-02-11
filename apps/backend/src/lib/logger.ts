const timestamp = () => new Date().toISOString();

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[${timestamp()}] INFO: ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[${timestamp()}] WARN: ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[${timestamp()}] ERROR: ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${timestamp()}] DEBUG: ${message}`, ...args);
    }
  },
};
