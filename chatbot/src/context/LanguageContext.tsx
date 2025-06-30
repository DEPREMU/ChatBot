import React, {
  useState,
  useEffect,
  ReactNode,
  useContext,
  createContext,
} from "react";
import {
  saveData,
  languages,
  KEYS_STORAGE,
  typeLanguages,
  checkLanguage,
  LanguagesSupported,
} from "@utils";

interface LanguageContextProps {
  language: LanguagesSupported;
  setLanguage: (language: LanguagesSupported) => void;
  translations: typeLanguages;
}

interface LanguageProviderProps {
  children: ReactNode;
}

/**
 * LanguageContext provides the current language and translations for the application.
 *
 * It allows components to access and update the current language and provides
 * translations based on the selected language.
 *
 * @context
 * @returns {LanguageContextProps} The context value containing the current language,
 * setLanguage function, and translations.
 */
const LanguageContext = createContext<LanguageContextProps | undefined>(
  undefined
);

/**
 * LanguageProvider component wraps the application and provides the LanguageContext.
 *
 * It initializes the current language and translations based on user preferences
 * or default settings.
 *
 * @component
 * @param {LanguageProviderProps} props - The props for the LanguageProvider.
 * @param {ReactNode} props.children - The child components to be wrapped by the provider.
 *
 * @returns {JSX.Element} The LanguageProvider component with context value.
 */
export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
}) => {
  const [language, setLanguage] = useState<LanguagesSupported>("en");

  useEffect(() => {
    const loadLanguage = async () => {
      const data = await checkLanguage();
      setLanguage(data);
    };

    loadLanguage();
  }, []);

  useEffect(() => {
    const saveNewLanguage = async () => {
      await saveData(KEYS_STORAGE.LANGUAGE_KEY_STORAGE, language);
    };

    saveNewLanguage();
  }, [language]);

  const translations = languages[language || "en"];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Custom hook to use the LanguageContext.
 *
 * @returns {LanguageContextProps} The context value containing the current language,
 * setLanguage function, and translations.
 *
 * @throws {Error} If used outside of a LanguageProvider.
 */
export const useLanguage = (): LanguageContextProps => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
