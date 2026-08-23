/**
 * Email HTML policy: allow a small tag set, strip handlers, drop trackers.
 * Remote images stay off until the reader opts in. Tighten TRACKER, don't loosen it.
 */
const TRACKER =
  /sendgrid\.net|sendgrid\.com|mailgun|sparkpost|hubspot|marketo|pardot|list-manage|mailchimp|google-analytics|doubleclick|facebook\.com\/tr|linkedin\.com\/li|pixel\.|awstrack|mandrill|postmarkapp|convertkit|beehiiv|openrate|tracking\.|\/track\/|\/open\/|\/pixel|beacon/i;

const ALLOWED = new Set([
  "A",
  "P",
  "BR",
  "DIV",
  "SPAN",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TR",
  "TD",
  "TH",
  "UL",
  "OL",
  "LI",
  "STRONG",
  "EM",
  "B",
  "I",
  "U",
  "S",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "IMG",
  "HR",
  "BLOCKQUOTE",
  "PRE",
  "CODE",
  "FONT",
  "CENTER",
  "SMALL",
  "SUP",
  "SUB",
]);

function isTrackerUrl(url: string) {
  return TRACKER.test(url);
}

function isTiny(el: Element) {
  const w = Number(el.getAttribute("width") || "99");
  const h = Number(el.getAttribute("height") || "99");
  const style = el.getAttribute("style") || "";
  const sw = /width\s*:\s*([0-9.]+)px/i.exec(style);
  const sh = /height\s*:\s*([0-9.]+)px/i.exec(style);
  const pw = sw ? Number(sw[1]) : w;
  const ph = sh ? Number(sh[1]) : h;
  return (pw > 0 && pw <= 2) || (ph > 0 && ph <= 2);
}

function scrubStyle(raw: string) {
  return raw
    .replace(/url\s*\([^)]*\)/gi, "none")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/behavior\s*:[^;]+/gi, "")
    .replace(/-moz-binding[^;]+/gi, "")
    .replace(/position\s*:\s*fixed/gi, "position:static");
}

export function emailHasRemoteImages(html: string) {
  if (!html) return false;
  return /<img\b[^>]*\bsrc\s*=\s*["']https?:/i.test(html);
}

export function prepareEmailHtml(
  html: string,
  opts: { showImages: boolean; fg: string; bg: string },
): string {
  if (typeof document === "undefined") return "";
  const doc = document.implementation.createHTMLDocument("");
  const wrap = doc.createElement("div");
  wrap.innerHTML = html;
  const doomed: Element[] = [];
  for (const el of Array.from(wrap.querySelectorAll("*"))) {
    if (!ALLOWED.has(el.tagName)) {
      doomed.push(el);
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "srcdoc" || name === "srcset") {
        el.removeAttribute(attr.name);
        continue;
      }
      if (name === "href" || name === "src" || name === "xlink:href") {
        const v = attr.value.trim();
        if (/^\s*javascript:/i.test(v) || /^\s*data:text\/html/i.test(v)) {
          el.removeAttribute(attr.name);
        }
      }
      if (name === "style") el.setAttribute("style", scrubStyle(attr.value));
    }
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noreferrer noopener");
    }
    if (el.tagName === "IMG") {
      const src = el.getAttribute("src") || "";
      const remote = /^https?:/i.test(src);
      const track = isTrackerUrl(src) || isTiny(el);
      if (track || src.startsWith("cid:")) {
        doomed.push(el);
        continue;
      }
      if (remote && !opts.showImages) {
        el.removeAttribute("src");
        el.setAttribute("alt", el.getAttribute("alt") || "Image blocked");
        el.setAttribute("style", "display:none");
      }
    }
  }
  for (const el of doomed) el.remove();
  const body = wrap.innerHTML;
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    html,body{margin:0;padding:0;background:${opts.bg};color:${opts.fg};
      font:13px/1.45 "Instrument Sans",system-ui,sans-serif;word-wrap:break-word;}
    img{max-width:100%;height:auto}
    a{color:inherit}
    table{max-width:100%;border-collapse:collapse}
    blockquote{margin:0;padding-left:12px;border-left:2px solid rgba(127,127,127,.35);opacity:.85}
  </style></head><body>${body}</body></html>`;
}