const getRequiredEnv = (key, value) => {
  if (!value) {
    throw new Error(
      `Missing required Vite environment variable: ${key}. Add it to your .env or your deployment environment.`
    );
  }
  return value;
};

export const API_URL = getRequiredEnv('VITE_API_URL', import.meta.env.VITE_API_URL);
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';
