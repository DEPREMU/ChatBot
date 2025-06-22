import { logError } from "./debug";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KeyStorageValues } from "../constants/keysStorage";
import { parseData, stringifyData } from "./appManagement";

/**
 * Stores data under a specified key.
 *
 * - On **web**, uses `localStorage`.
 * - On **native**, uses `AsyncStorage`.
 *
 * @param key - The key to store the value under.
 * @param value - The value to store. Non-string values will be stringified.
 */
export const saveData = async <T = undefined, K = any>(
  key: KeyStorageValues,
  value: K,
  callback: () => T = () => undefined as T
): Promise<T> => {
  const stringValue = stringifyData(value);

  if (Platform.OS === "web") localStorage.setItem(key, stringValue);
  else await AsyncStorage.setItem(key, stringValue);
  return callback?.();
};

/**
 * Loads data associated with a given key.
 *
 * - On **web**, reads from `localStorage`.
 * - On **native**, uses `AsyncStorage`.
 *
 * @param key - The key to retrieve the value from.
 * @returns The stored value as a string, or `null` if not found.
 */
export const loadData = async <T = string | null>(
  key: KeyStorageValues,
  callback?: (value: T) => T
): Promise<T> => {
  let value: string | null;

  if (Platform.OS === "web") {
    value = localStorage.getItem(key);
  } else {
    value = await AsyncStorage.getItem(key);
  }
  const parsed = parseData<T>(value);
  if (callback) return callback(parsed);
  return parsed;
};

/**
 * Removes data associated with a specified key.
 *
 * - On **web**, removes from `localStorage`.
 * - On **native**, removes from `AsyncStorage`.
 *
 * @param key - The key of the value to remove.
 * @param callback - Optional callback executed after deletion.
 */
export const removeData = async <T = undefined>(
  key: KeyStorageValues,
  callback: (err?: Error) => T = () => undefined as T
): Promise<T> => {
  try {
    if (Platform.OS === "web") localStorage.removeItem(key);
    else await AsyncStorage.removeItem(key);
  } catch (error) {
    logError(`removeData() => ${error}`);
    return callback(
      new Error(error instanceof Error ? error.message : String(error))
    );
  }
  return callback();
};
