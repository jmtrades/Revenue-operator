#!/usr/bin/env python3
"""
One-off script: replace English-identical values in locale files with translations.
Reads translations from translations_data.json (en_value -> { locale: translated }).
No code changes to app — only edits src/i18n/messages/{locale}.json.
"""
import json
import os

BASE = os.path.join(os.path.dirname(__file__), "..", "src", "i18n", "messages")
EN_PATH = os.path.join(BASE, "en.json")
DATA_PATH = os.path.join(os.path.dirname(__file__), "translations_data.json")

def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def walk_and_apply(en_obj, lang_obj, translations, locale, path=""):
    if not isinstance(en_obj, dict) or not isinstance(lang_obj, dict):
        return
    for k in en_obj:
        if k not in lang_obj:
            continue
        p = f"{path}.{k}" if path else k
        if isinstance(en_obj[k], str) and isinstance(lang_obj[k], str):
            en_val = en_obj[k]
            if en_val == lang_obj[k] and en_val in translations and locale in translations[en_val]:
                lang_obj[k] = translations[en_val][locale]
        else:
            walk_and_apply(en_obj[k], lang_obj[k], translations, locale, p)

def main():
    en = load_json(EN_PATH)
    if not os.path.exists(DATA_PATH):
        print("No translations_data.json found. Create it with { en_string: { es: ..., fr: ..., de: ..., pt: ..., ja: ... } }")
        return
    translations = load_json(DATA_PATH)
    for locale in ["es", "fr", "de", "pt", "ja"]:
        path = os.path.join(BASE, f"{locale}.json")
        data = load_json(path)
        walk_and_apply(en, data, translations, locale)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Updated {locale}.json")
    print("Done.")

if __name__ == "__main__":
    main()
