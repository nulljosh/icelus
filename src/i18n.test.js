import { describe, it, expect } from 'vitest';
import { t, resolveLanguage, en, LANGUAGES, LOCALES, loadLanguage } from './i18n.js';

describe('i18n', () => {
  it('fills in values and falls back to English', () => {
    expect(t('opened', { name: 'a.txt' }, 'en')).toBe('Opened a.txt');
    expect(t('no_such_key', {}, 'en')).toBe('no_such_key');
    expect(t('copied', {}, 'xx')).toBe('Copied');
  });

  it('matches a browser language to one we ship, scripts and all', () => {
    expect(resolveLanguage(['en-CA'])).toBe('en');
    expect(resolveLanguage(['zz', 'en-GB'])).toBe('en');
    expect(resolveLanguage([])).toBe('en');
  });

  it('ships 27 languages, each loaded on demand', async () => {
    expect(LANGUAGES).toHaveLength(27);
    await Promise.all(LANGUAGES.map(l => loadLanguage(l)));
    expect(t('copy_share', {}, 'ja')).toBe('共有リンクをコピー');
    expect(resolveLanguage(['zh-TW'])).toBe('zh-Hant');
    expect(resolveLanguage(['pt-BR'])).toBe('pt');
  });

  it('every locale keeps every placeholder its English string has', () => {
    for (const [code, strings] of Object.entries(LOCALES)) {
      for (const [key, value] of Object.entries(strings)) {
        if (!(key in en)) continue;
        const want = (en[key].match(/\{\w+\}/g) || []).sort().join();
        expect([code, key, (value.match(/\{\w+\}/g) || []).sort().join()]).toEqual([code, key, want]);
      }
    }
  });

  it("lists English in the Apple catalog, or English devices get another language", async () => {
    const { readFileSync } = await import("node:fs");
    const catalog = JSON.parse(readFileSync(new URL("../ios/App/Localizable.xcstrings", import.meta.url), "utf8"));
    const missing = Object.keys(catalog.strings).filter(k => !catalog.strings[k].localizations?.en);
    expect(missing).toEqual([]);
  });
});
