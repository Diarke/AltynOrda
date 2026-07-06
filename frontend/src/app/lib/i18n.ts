import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "../locales/en.json";
import kk from "../locales/kk.json";
import ru from "../locales/ru.json";

export const SUPPORTED_LANGUAGES = ["kk", "ru", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = "kk";
export const LANGUAGE_STORAGE_KEY = "orda-language";

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      kk: { translation: kk },
      ru: { translation: ru },
      en: { translation: en },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    detection: {
      // Kazakh is the platform default for first-time visitors — do not
      // auto-switch based on browser/OS locale. Only an explicit prior choice
      // (remembered in localStorage) should override it.
      order: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;
