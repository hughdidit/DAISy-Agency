<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { Locale, TranslationMap } from "./types";
import { en } from "../locales/en";
=======
import { en } from "../locales/en.ts";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  loadLazyLocaleTranslation,
  resolveNavigatorLocale,
} from "./registry.ts";
import type { Locale, TranslationMap } from "./types.ts";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { Locale, TranslationMap } from "./types.ts";
import { en } from "../locales/en.ts";
>>>>>>> 742e6543c (fix(ui): preserve locale bootstrap and trusted-proxy overview behavior)
=======
import { en } from "../locales/en.ts";
import type { Locale, TranslationMap } from "./types.ts";
>>>>>>> 01ea80887 (chore: Format files.)
=======
import type { Locale, TranslationMap } from "./types.ts";
import { en } from "../locales/en.ts";
>>>>>>> ed11e93cf (chore(format))
=======
import { en } from "../locales/en.ts";
import type { Locale, TranslationMap } from "./types.ts";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { Locale, TranslationMap } from "./types.ts";
import { en } from "../locales/en.ts";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { en } from "../locales/en.ts";
import type { Locale, TranslationMap } from "./types.ts";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)

type Subscriber = (locale: Locale) => void;

<<<<<<< HEAD
export const SUPPORTED_LOCALES: ReadonlyArray<Locale> = ["en", "zh-CN", "zh-TW", "pt-BR"];

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return value !== null && value !== undefined && SUPPORTED_LOCALES.includes(value as Locale);
}
=======
export { SUPPORTED_LOCALES, isSupportedLocale };
>>>>>>> e1f3ded03 (refactor: split telegram delivery and unify media/frontmatter/i18n pipelines)

class I18nManager {
  private locale: Locale = DEFAULT_LOCALE;
  private translations: Partial<Record<Locale, TranslationMap>> = { [DEFAULT_LOCALE]: en };
  private subscribers: Set<Subscriber> = new Set();

  constructor() {
    this.loadLocale();
  }

  private resolveInitialLocale(): Locale {
    const saved = localStorage.getItem("openclaw.i18n.locale");
    if (isSupportedLocale(saved)) {
      return saved;
    }
<<<<<<< HEAD
    const navLang = navigator.language;
    if (navLang.startsWith("zh")) {
      return navLang === "zh-TW" || navLang === "zh-HK" ? "zh-TW" : "zh-CN";
    }
    if (navLang.startsWith("pt")) {
      return "pt-BR";
    }
    return "en";
=======
    return resolveNavigatorLocale(navigator.language);
>>>>>>> e1f3ded03 (refactor: split telegram delivery and unify media/frontmatter/i18n pipelines)
  }

  private loadLocale() {
    const initialLocale = this.resolveInitialLocale();
    if (initialLocale === DEFAULT_LOCALE) {
      this.locale = DEFAULT_LOCALE;
      return;
    }
    // Use the normal locale setter so startup locale loading follows the same
    // translation-loading + notify path as manual locale changes.
    void this.setLocale(initialLocale);
  }

  public getLocale(): Locale {
    return this.locale;
  }

  public async setLocale(locale: Locale) {
<<<<<<< HEAD
<<<<<<< HEAD
    if (this.locale === locale) return;
=======
    const needsTranslationLoad = !this.translations[locale];
=======
    const needsTranslationLoad = locale !== DEFAULT_LOCALE && !this.translations[locale];
>>>>>>> e1f3ded03 (refactor: split telegram delivery and unify media/frontmatter/i18n pipelines)
    if (this.locale === locale && !needsTranslationLoad) {
      return;
    }
>>>>>>> 053b0df7d (fix(ui): load saved locale on startup)

    if (needsTranslationLoad) {
      try {
<<<<<<< HEAD
        let module;
        if (locale === "zh-CN") {
          module = await import("../locales/zh-CN");
        } else if (locale === "zh-TW") {
          module = await import("../locales/zh-TW");
        } else if (locale === "pt-BR") {
          module = await import("../locales/pt-BR");
        } else {
=======
        const translation = await loadLazyLocaleTranslation(locale);
        if (!translation) {
>>>>>>> e1f3ded03 (refactor: split telegram delivery and unify media/frontmatter/i18n pipelines)
          return;
        }
        this.translations[locale] = translation;
      } catch (e) {
        console.error(`Failed to load locale: ${locale}`, e);
        return;
      }
    }

    this.locale = locale;
    localStorage.setItem("openclaw.i18n.locale", locale);
    this.notify();
  }

  public registerTranslation(locale: Locale, map: TranslationMap) {
    this.translations[locale] = map;
  }

  public subscribe(sub: Subscriber) {
    this.subscribers.add(sub);
    return () => this.subscribers.delete(sub);
  }

  private notify() {
    this.subscribers.forEach((sub) => sub(this.locale));
  }

  public t(key: string, params?: Record<string, string>): string {
    const keys = key.split(".");
<<<<<<< HEAD
    let value: any = this.translations[this.locale] || this.translations["en"];
=======
    let value: unknown = this.translations[this.locale] || this.translations[DEFAULT_LOCALE];
>>>>>>> e1f3ded03 (refactor: split telegram delivery and unify media/frontmatter/i18n pipelines)

    for (const k of keys) {
      if (value && typeof value === "object") {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }

    // Fallback to English.
    if (value === undefined && this.locale !== DEFAULT_LOCALE) {
      value = this.translations[DEFAULT_LOCALE];
      for (const k of keys) {
        if (value && typeof value === "object") {
          value = value[k];
        } else {
          value = undefined;
          break;
        }
      }
    }

    if (typeof value !== "string") {
      return key;
    }

    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, k) => params[k] || `{${k}}`);
    }

    return value;
  }
}

export const i18n = new I18nManager();
export const t = (key: string, params?: Record<string, string>) => i18n.t(key, params);
