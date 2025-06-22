export const KEYS_STORAGE = {
  userId: "@userId",
} as const;

export type KeyStorageKeys = keyof typeof KEYS_STORAGE;

export type KeyStorageValues = (typeof KEYS_STORAGE)[keyof typeof KEYS_STORAGE];
