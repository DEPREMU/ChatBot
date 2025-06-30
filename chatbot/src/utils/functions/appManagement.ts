import { logError } from "./debug";
import * as Localization from "expo-localization";
import { languagesSupported, LanguagesSupported } from "../translates";
import { loadData, saveData } from "./storageManagement";
import { KEYS_STORAGE } from "../constants";

/**
 * Parses a JSON string into an object of type `T`.
 *
 * @template T - The expected return type, defaults to `object | null`.
 * @param value - The JSON string to parse. If `null`, it will be treated as `"null"`.
 * @returns The parsed object of type `T`. If parsing fails, returns the original value cast to type `T`.
 */
export const parseData = <T = object | null>(value: string | null): T => {
  let parsed: T;
  try {
    parsed = JSON.parse(value || "null") as T;
  } catch {
    parsed = value as T;
  }
  return parsed;
};

/**
 * Converts a given value to its string representation.
 *
 * - If the value is already a string, it returns the value as is.
 * - Otherwise, it attempts to stringify the value using `JSON.stringify`.
 * - If stringification fails, it logs the error and returns an empty string.
 *
 * @param value - The value to be converted to a string.
 * @returns The string representation of the value, or an empty string if an error occurs.
 */
export const stringifyData = (value: any): string => {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch (error) {
    logError(`Error stringifying data: ${error}`);
    return "";
  }
};

/**
 * Creates a debounced version of the provided function that delays its execution until after
 * a specified delay has elapsed since the last time it was invoked.
 *
 * @typeParam T - The type of the function to debounce.
 * @param func - The function to debounce.
 * @param delay - The number of milliseconds to delay.
 * @returns A debounced version of the input function.
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (() => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Replaces placeholders in a message string with corresponding values from an array.
 *
 * Placeholders in the message should be in the format `{0}`, `{1}`, etc.
 * Each placeholder will be replaced by the value at the corresponding index in the `values` array.
 * If a placeholder index does not exist in the array, the placeholder is left unchanged.
 *
 * @param message - The message string containing placeholders.
 * @param values - An array of strings to replace the placeholders.
 * @returns The interpolated message with placeholders replaced by corresponding values.
 *
 * @example
 * ```typescript
 * const msg = "Hello, {0}! You have {1} new messages.";
 * const result = interpolateMessage(msg, ["Alice", "5"]);
 * // result: "Hello, Alice! You have 5 new messages."
 * ```
 */
export const interpolateMessage = (message: string, values: string[]) => {
  if (!message || !values || values.length === 0) return message;
  return message.replace(/\{(\d+)\}/g, (match, index) => {
    const value = values[parseInt(index, 10)];
    return value !== undefined ? value : match;
  });
};

export const getFormattedDate = (
  date: Date,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!locale) {
    const locales = Localization.getLocales()[0];
    locale = locales.languageTag || "es-MX";
  }
  if (!options)
    options = {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Mexico_City",
    };

  return new Intl.DateTimeFormat(locale, options).format(date);
};

/**
 * Retrieves the user's preferred language from storage.
 *
 * This function attempts to load the language preference stored under the
 * `LANGUAGE_KEY_STORAGE` key. If a valid language is found and is included
 * in the list of supported languages, it returns the language. Otherwise,
 * it returns `null`.
 *
 * @returns {Promise<LanguagesSupported | null>} A promise that resolves to the stored language if available and supported, or `null` otherwise.
 */
export const getLanguageFromStorage =
  async (): Promise<LanguagesSupported | null> => {
    const data = await loadData<LanguagesSupported | null>(
      KEYS_STORAGE.LANGUAGE_KEY_STORAGE
    );
    if (data) {
      const languageAvailable = languagesSupported.includes(data);
      if (languageAvailable) return data;
    }
    return null;
  };

/**
 * Retrieves the device's current language and saves it to storage if it is supported.
 *
 * @returns {Promise<LanguagesSupported | null>} The detected and supported language code, or "en" if detection fails.
 *
 * @remarks
 * - Uses the first locale from the device's localization settings.
 * - Checks if the detected language is among the supported languages.
 * - Saves the language to storage using a predefined key.
 * - Returns "en" as a fallback if detection or saving fails.
 *
 * @throws Will log an error if there is an issue during language detection or storage.
 */
export const getLanguageFromDevice =
  async (): Promise<LanguagesSupported | null> => {
    try {
      const locales = Localization.getLocales()[0];
      const language = locales.languageCode as LanguagesSupported;
      const languageAvailable = languagesSupported.includes(language || "");
      if (language && languageAvailable) {
        await saveData(KEYS_STORAGE.LANGUAGE_KEY_STORAGE, language);
        return language;
      }
    } catch (error) {
      logError("./src/utils/functions/checkLanguage() =>", error);
    }
    return "en";
  };

/**
 * Checks the user's language preference and saves it if not already set.
 *
 * @returns The user's preferred language, or "en" if not found.
 *
 * @remarks
 * - This function uses `expo-localization` to get the device's locale.
 * - It checks if the language is supported and saves it to local storage.
 * - If no language is found, it defaults to "en".
 */
export const checkLanguage = async (): Promise<LanguagesSupported> => {
  let lang: LanguagesSupported | null = null;

  lang = await getLanguageFromStorage();
  if (lang) return lang;

  lang = await getLanguageFromDevice();
  if (lang) return lang;

  return "en";
};
