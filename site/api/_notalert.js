// Text that talks about a hazard without reporting one happening now: studies and research, explainers,
// opinion, speculation ("could", "podría"), drills, anniversaries, films and books, and clickbait.
// Used on press headlines, on GDELT article links (their slugs) and on social posts.
const WORDS = new RegExp("(?<![\\p{L}\\d])(" + [
  // research and reports
  "stud(y|ies)", "research(ers?)?", "scientists?", "survey", "new paper", "report finds", "according to (a )?new",
  "estudios?", "investigaci[oó]n(es)?", "investigador(es|as)?", "cient[ií]fic[oa]s", "encuesta", "seg[uú]n un (nuevo )?(estudio|informe)",
  // speculation and explainers
  "could", "might", "may (be|have|hit|strike)", "what we know", "explained", "explainer", "how to", "tips", "guide to", "why (do|does|is|are|did)",
  "podr[ií]a(n)?", "qu[eé] sabemos", "las claves", "explicad[oa]", "c[oó]mo (actuar|prepararse|evitar|saber)", "consejos", "gu[ií]a", "por qu[eé]",
  // opinion and features
  "opinion", "op-ed", "editorial", "column", "podcast", "quiz", "review", "in pictures", "documentary", "movie", "film", "book", "novel",
  "opini[oó]n", "tribuna", "columna", "en im[aá]genes", "documental", "pel[ií]cula", "libro", "novela",
  // drills and anniversaries
  "drill", "simulacro", "anniversary", "aniversario", "years ago", "hace \\d+ a[nñ]os", "\\d+ years (after|since|on)",
  // clickbait
  "you won['’]?t believe", "shocking", "goes viral", "viral video", "no te lo vas a creer", "impactante", "se hace viral",
].join("|") + ")(?![\\p{L}\\d])", "iu");
// Section labels at the start of a headline: "Opinion: …", "Análisis | …".
const PREFIX = /^\s*(opinion|analysis|opini[oó]n|an[aá]lisis|tribuna)\s*[:|]/i;

export const notAlert = (text) => !!text && (PREFIX.test(text) || WORDS.test(text));
// The readable words of an article link: "/2026/10/24/study-finds-quakes-could-hit" -> "2026 10 24 study finds quakes could hit".
export const slugText = (url) => { try { return decodeURIComponent(new URL(url).pathname).replace(/[-_/.+]+/g, " "); } catch { return ""; } };
