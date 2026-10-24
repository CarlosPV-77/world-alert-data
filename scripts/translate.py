# Translates the press headlines of conflictos.json and atentados.json into Spanish with Argos Translate
# models (CTranslate2 + SentencePiece), offline: free, no key and no limit. Each headline keeps its original
# text and language, so the map can switch between both. Headlines translated in an earlier run are reused
# from the copy on the live branch, so only new ones go through the models.
#
# Usage: python scripts/translate.py <models dir> <data file>...
# The models dir holds one unpacked Argos package per pair, named like the pair: en_es/, fr_en/...
import json
import sys
import urllib.request
from pathlib import Path

import ctranslate2
import sentencepiece
from langdetect import DetectorFactory, detect_langs

DetectorFactory.seed = 0
MIRROR = "https://raw.githubusercontent.com/CarlosPV-77/world-alert-data/live/"
# Languages Argos brings to Spanish here, directly or through English. GDELT links are nearly all in English;
# headlines in other languages keep their original text, and the map can translate them in the browser.
ROUTES = {"en": ["en_es"], "pt": ["pt_es"], "fr": ["fr_en", "en_es"]}
SPANISH = "es"

models_dir = Path(sys.argv[1])
files = [Path(p) for p in sys.argv[2:]]
loaded = {}


def model(pair):
    if pair not in loaded:
        root = models_dir / pair
        path = next(root.rglob("model.bin"), None)
        sp = next(root.rglob("sentencepiece.model"), None)
        loaded[pair] = (ctranslate2.Translator(str(path.parent), device="cpu", inter_threads=2), sentencepiece.SentencePieceProcessor(model_file=str(sp))) if path and sp else None
    return loaded[pair]


def run(pair, texts):
    m = model(pair)
    if not m:
        raise RuntimeError(f"no model for {pair}")
    translator, sp = m
    out = translator.translate_batch([sp.encode(t, out_type=str) for t in texts], beam_size=4, max_decoding_length=160, replace_unknowns=True)
    return [sp.decode(r.hypotheses[0]).strip() for r in out]


# Slugs are short, lower case and without accents, which trips plain detectors. Common short words decide
# first, then the outlet's country domain, then a confident langdetect guess, else English.
STOP = {
    "en": "the of in to after for and with at on by from says as over amid is are was",
    "es": "el la los las del en por para con una tras que se al su sus contra",
    "fr": "le la les des du en pour une dans apres sur et au aux est contre",
    "de": "der die das und nach mit fur von ein eine im bei auf zu den ist",
    "it": "il di della per con dopo una nel che gli alla sul del dei",
    "pt": "do da dos das em para com uma apos no na que ao pelo pela",
}
STOP = {k: set(v.split()) for k, v in STOP.items()}
TLD = {"es": "es", "mx": "es", "ar": "es", "co": "es", "cl": "es", "pe": "es", "ve": "es", "uy": "es", "ec": "es", "fr": "fr", "de": "de", "at": "de", "it": "it", "br": "pt", "pt": "pt"}


def language(text, url=""):
    words = text.lower().split()
    score = {k: sum(w in v for w in words) for k, v in STOP.items()}
    top = sorted(score.items(), key=lambda kv: -kv[1])
    if top[0][1] and top[0][1] > top[1][1]:
        return top[0][0]
    host = url.split("/")[2] if url.count("/") >= 2 else ""
    if host.rsplit(".", 1)[-1] in TLD:
        return TLD[host.rsplit(".", 1)[-1]]
    try:
        # Most GDELT outlets write in English, so another language needs a confident guess.
        return next((l.lang for l in detect_langs(text) if l.lang in STOP and l.prob >= 0.9), "en")
    except Exception:
        return "en"


def previous(name):
    try:
        with urllib.request.urlopen(MIRROR + name, timeout=20) as r:
            events = json.load(r).get("events", [])
    except Exception as e:
        print(f"{name}: no earlier copy ({e})")
        return {}
    return {e["headline"]: (e.get("hlang"), e.get("headlineEs")) for e in events if e.get("headline") and e.get("hlang")}


for f in files:
    data = json.loads(f.read_text())
    cache = previous(f.name)
    todo = {}
    for e in data.get("events", []):
        h = e.get("headline")
        if not h:
            continue
        lang, es = cache.get(h) or (language(h, e.get("url", "")), None)
        e["hlang"] = lang
        if es:
            e["headlineEs"] = es
        elif lang != SPANISH and lang in ROUTES:
            todo.setdefault(lang, []).append(e)
    done = 0
    for lang, events in todo.items():
        texts = [e["headline"] for e in events]
        try:
            for pair in ROUTES[lang]:
                texts = run(pair, texts)
        except Exception as err:
            print(f"{f.name}: {lang} not translated ({err})")
            continue
        for e, t in zip(events, texts):
            if t:
                e["headlineEs"] = t[0].upper() + t[1:]
                done += 1
                if done <= 5:  # a few in the log, to keep an eye on the quality
                    print(f"  {lang}: {e['headline']}\n  es: {e['headlineEs']}")
    f.write_text(json.dumps(data, ensure_ascii=False))
    print(f"{f.name}: {done} new translations, {len(cache)} known from the earlier copy")
