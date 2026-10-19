#!/usr/bin/env python3
"""Builds ios/App/Localizable.xcstrings from the web's translations (src/locales/*.json) plus the strings only
the apps have (ios/strings.json). English text is the catalog key, as SwiftUI looks strings up by it.
Run from the repo root after either source changes: python3 tools/strings.py"""
import json, glob, os, re, subprocess

ROOT = os.getcwd()
# English text in the apps -> the web key that already has its translations.
WEB = {"Undo": "undo", "Redo": "redo", "Clear": "clear", "Stop tracing": "stop_tracing", "Save to palette": "save_to_palette",
       "Edit text": "edit_text", "Duplicate": "duplicate", "Delete": "delete", "Highlight": "highlight", "Box style": "box_style",
       "Export": "export", "Copy text": "copy_text", "Copy as typed lines": "copy_lines", "Copy as Markdown": "copy_markdown",
       "Copy all screens": "copy_screens", "Cancel": "cancel", "Save": "save", "Draw it": "draw_it", "Type a screen": "type_title"}

# Part labels and categories: the web keys them part_<id> and cat_<name>; the apps by their English text.
en = json.loads(subprocess.run(["node", "-e", """
Promise.all([import('./src/lib/presets.js'), import('./src/lib/syntax.js')]).then(([p, s]) => {
  const out = {};
  for (const c of ['Draw', 'Screens', 'Mine', ...p.CATEGORIES, ...p.PACK_CATEGORIES]) out['cat_' + c] = c;
  for (const x of [...p.PRESETS, ...p.PACKS, p.LINE_TOOL, p.TEXT_TOOL, p.BANNER_TOOL, p.BOXY_TOOL, p.TYPE_TOOL, p.PHOTO_TOOL,
    p.TRACE_TOOL, p.SCREEN_TOOL, ...s.SCREEN_TEMPLATES]) out['part_' + x.id] = x.label;
  console.log(JSON.stringify(out));
});"""], capture_output=True, text=True, cwd=ROOT, check=True).stdout)
for key, label in en.items():
    WEB.setdefault(label, key)

locales = {os.path.basename(f)[:-5]: json.load(open(f)) for f in sorted(glob.glob("src/locales/*.json"))}
native = json.load(open("ios/strings.json"))  # {english key: {lang: text}}

strings = {}
for text, key in WEB.items():
    strings[text] = {lang: d[key] for lang, d in locales.items() if key in d}
for text, by_lang in native.items():
    strings[text] = by_lang

# English is listed too, or the app ships no en.lproj and English devices fall back to another language.
for text, by_lang in strings.items():
    by_lang.setdefault("en", text)

catalog = {"sourceLanguage": "en", "version": "1.0", "strings": {
    text: {"localizations": {lang: {"stringUnit": {"state": "translated", "value": value}} for lang, value in sorted(by_lang.items())}}
    for text, by_lang in sorted(strings.items())}}
json.dump(catalog, open("ios/App/Localizable.xcstrings", "w"), ensure_ascii=False, indent=2)
print(f"{len(catalog['strings'])} strings, {len(locales)} languages")
