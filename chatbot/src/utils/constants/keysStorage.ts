export const KEYS_STORAGE = {
  userId: "@userId",
  LANGUAGE_KEY_STORAGE: "@languageKeyStorage",
} as const;

export type KeyStorageKeys = keyof typeof KEYS_STORAGE;

export type KeyStorageValues = (typeof KEYS_STORAGE)[keyof typeof KEYS_STORAGE];
