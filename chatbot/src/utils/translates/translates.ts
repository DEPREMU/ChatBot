import { en } from "./English";
import { es } from "./Spanish";
import { LanguagesSupported, typeLanguages } from "./typesTranslations";

export const languagesNames: Record<LanguagesSupported, string> = {
  en: "English",
  es: "Español",
};

/**
 * An array containing all supported language codes.
 *
 * @see {@link LanguagesSupported}
 * @see {@link languagesNames}
 */
export const languagesSupported = [
  ...Object.keys(languagesNames),
] as LanguagesSupported[];

/**
 * A record that maps supported languages to their respective translations.
 *
 * @constant
 * @type {Record<LanguagesSupported, typeLanguages>}
 *
 * @property {typeLanguages} language - Translations for any language.
 *
 * Example usage:
 * ```typescript
 * log(languages.en.welcome); // Output: "Welcome"
 * log(languages.es.welcome); // Output: "Bienvenido"
 * ```
 *
 * Practical example:
 * @example
 * const screen: React.FC = () => {
 * const { translations } = useLanguage();

 * return <Text>{translations.welcome}</Text>;
 * };

 */
export const languages: Record<LanguagesSupported, typeLanguages> = {
  en,
  es,
};
