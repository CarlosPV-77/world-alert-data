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

// A headline can name an attack without reporting one: "El Papa condena el atentado", "Three arrested over last week's
// church attack", "Delegations meet amid fears of renewed fighting". These are news about an incident, not the incident:
// reactions and condemnations, tributes, trials and arrests, aid and visits, talks and politics, fears and warnings.
const AFTER = new RegExp("(?<![\\p{L}\\d])(" + [
  // reactions
  "condemn(s|ed|ing|ation)?", "denounc(e|es|ed)", "deplor(e|es|ed)", "mourn(s|ed|ing|ers)?", "condolences?", "sympathy", "pray(s|ing)? for", "solidarity", "tributes?", "vigils?", "memorial", "commemorat\\w*", "pays? (respects|homage)",
  "conden(a|an|ó|aron|ado|ados|ada|adas)", "repulsa", "lament(a|an|ó)", "luto", "condolencias?", "p[eé]same", "solidaridad", "homenajes?", "minuto de silencio", "vigilia", "conmemor\\w*", "recuerd(a|an)", "reza(n)? por",
  // justice
  "trials?", "sentenc(e|ed|es|ing)", "verdict", "convicted", "acquitted", "jury", "(in|to|before) court", "court (rules|ruled|hears|orders|case)", "prosecutors?", "case filed", "lawsuit", "sues?", "sued", "inquiry", "probe", "investigat(e|es|ed|ing|ion)", "extradit\\w*",
  "arrest(s|ed)?", "detain(s|ed)?", "charged", "suspects?",
  "juicio", "juzga(do|dos|da)?", "sentencia", "veredicto", "absuelt[oa]s?", "jurado", "tribunal(es)?", "fiscal(es|[ií]a)?", "demanda", "investiga(n|ci[oó]n)?", "extradi\\w*",
  "deten(ido|idos|ida|idas|ci[oó]n)", "detien(e|en)", "arrest(a|an|ado|ados)", "acusad[oa]s?", "imputad[oa]s?", "sospechos[oa]s?", "declara ante",
  // aid and visits
  "donat(e|es|ed|ion|ions)", "donan?", "don[oó]", "donaci[oó]n", "donativos?", "fundrais\\w*", "compensation", "indemniza\\w*", "visit(s|ed)? (the )?(victims|wounded|site)", "visita (a )?(los heridos|las v[ií]ctimas|la zona)",
  // talks and politics
  "talks", "negotiat\\w*", "summit", "delegations?", "meet(s|ing)?", "agreement", "deal", "sanctions?", "ceasefire (talks|deal|agreement|proposal|begins|starts|holds)", "truce", "elections?", "(passes|approves|signs) (a )?(bill|law)", "new law",
  "conversaciones", "negocia\\w*", "cumbre", "delegaci[oó]n(es)?", "se re[uú]ne(n)?", "reuni[oó]n", "acuerdo", "tregua", "alto el fuego(?! (roto|violado))", "sanci[oó]n(es)?", "elecci[oó]n(es)?", "campa[nñ]a electoral", "ley", "aprueba(n)?", "votaci[oó]n",
  // fears, threats and denials
  "fears?", "warns?", "warning", "threat(s|ens)?", "potential", "risk of", "denies", "denied",
  "temor(es)?", "advierte(n)?", "amenaza(n)?", "riesgo de", "niega(n)?", "desmiente(n)?",
  // looking back
  "last (week|month|year)['’]?s?", "(weeks|months|years) (after|later|on)", "la semana pasada", "el (mes|a[nñ]o) pasado", "(semanas|meses|a[nñ]os) despu[eé]s",
].join("|") + ")(?![\\p{L}\\d])", "iu");
// The words that say something is happening: deaths and wounded, attacks, blasts, shots, strikes, fighting, fires, crashes.
const CUE = new RegExp("(?<![\\p{L}\\d])(" + [
  "kill(s|ed|ing)?", "dead", "deaths?", "die[ds]?", "dying", "injur\\w*", "wounded", "casualties", "massacre", "attack(s|ed|ing)?", "assault(s|ed)?", "ambush(ed)?",
  "bomb(s|ed|ing|ings|ers?)?", "bombard\\w*", "blasts?", "explo(sion|sions|des|ded|sive|sives)", "detonat\\w*", "airstrikes?", "air strikes?", "strikes? (on|in|at|against|hits?|kills?)", "(drone|missile|rocket)s? (strikes?|attacks?|hits?|fire|barrage)",
  "shell(s|ed|ing)", "artillery", "missiles?", "rockets?", "drones?", "shoot(s|ing|ings|out)?", "shot", "gun(man|men|fire|fight)", "stabb(ed|ing)", "hostages?", "kidnap\\w*", "abduct\\w*",
  "clash(es|ed)?", "fighting", "offensive", "invasion", "invade[ds]?", "incursion", "siege", "riots?", "unrest", "fires?", "blaze", "wildfires?", "crash(es|ed)?", "collapse[ds]?", "derail\\w*", "sinks?", "sank|capsiz\\w*", "evacuat\\w*", "terror(ist|ists)? attack",
  "muert(o|os|a|as|e|es)", "mueren", "muere", "fallec\\w*", "matan?", "mat[oó]", "asesina\\w*", "herid(o|os|a|as)", "v[ií]ctimas mortales", "masacre", "matanza", "ataque(s)?", "atac(a|an|ó|aron|ado)", "atentados?", "emboscada",
  "bomba(s)?", "bombarde\\w*", "explosi[oó]n(es)?", "explot\\w*", "estall\\w*", "detona\\w*", "deflagraci[oó]n", "misil(es)?", "cohetes?", "drones?", "proyectil(es)?", "artiller[ií]a", "disparos?", "dispar(a|an|ó|aron)", "tiroteos?", "tiros", "acribill\\w*",
  "apu[nñ]al\\w*", "reh[eé]n(es)?", "secuestr\\w*", "combates?", "enfrentamientos?", "ofensiva", "invasi[oó]n", "incursi[oó]n", "asedio", "disturbios", "incendios?", "llamas", "accidente", "choque", "colisi[oó]n", "derrumbe", "se derrumba", "descarril\\w*", "naufrag\\w*", "se hunde", "evacu\\w*",
].join("|") + ")(?![\\p{L}\\d])", "iu");

export const aftermath = (text) => !!text && AFTER.test(text);
// A headline reports an incident when it says something is happening and is not a study, a reaction or a follow-up.
// `more` (the first sentence of a story) can supply the words of the event, never excuse a reaction in the headline.
export const isIncident = (head, more = "") => !!head && !notAlert(head) && !aftermath(head) && CUE.test(`${head} ${more}`);
