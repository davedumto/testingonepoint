#!/usr/bin/env python3
"""
Convert OnePoint blog post HTML source files into paste-ready GHL blog HTML.

Reads /Users/dumtochukwu/Desktop/testing/ghl/post-*.html
Writes /Users/dumtochukwu/Desktop/testing/blog-content/<slug>.html
"""

import os
import re
from html.parser import HTMLParser

SRC_DIR = "/Users/dumtochukwu/Desktop/testing/ghl"
OUT_DIR = "/Users/dumtochukwu/Desktop/testing/blog-content"

# Mapping from source file -> output slug (output filename without .html)
FILE_MAP = [
    ("post-what-is-liability-coverage-auto-insurance.html",
     "what-is-liability-coverage-auto-insurance.html"),
    ("post-what-is-term-life-insurance.html",
     "what-is-term-life-insurance.html"),
    ("post-what-is-commercial-property-insurance.html",
     "what-is-commercial-property-insurance.html"),
    ("post-how-business-owners-policies-work-bop-insurance.html",
     "how-business-owners-policies-work-bop-insurance.html"),
    ("post-short-term-medical-insurance-guide.html",
     "short-term-medical-insurance-guide.html"),
    ("post-understanding-homeowners-insurance-georgia.html",
     "understanding-homeowners-insurance-what-every-georgia-property-owner-needs-to-know.html"),
    ("post-a-lifetime-of-financial-protection-and-value.html",
     "a-lifetime-of-financial-protection-and-value.html"),
    ("post-what-is-hospitalization-indemnity-insurance.html",
     "what-is-hospitalization-indemnity-insurance.html"),
    ("post-auto-insurance-101.html", "auto-insurance-101.html"),
    ("post-health-insurance-in-2025.html", "health-insurance-in-2025.html"),
    ("post-critical-illness-insurance.html", "critical-illness-insurance.html"),
    ("post-renters-insurance-what-it-covers.html",
     "renters-insurance-what-it-covers.html"),
    ("post-how-much-life-insurance-do-i-need.html",
     "how-much-life-insurance-do-i-need.html"),
    ("post-umbrella-insurance-explained.html", "umbrella-insurance-explained.html"),
    ("post-short-term-vs-long-term-disability-insurance.html",
     "short-term-vs-long-term-disability-insurance.html"),
]

# ---------- helpers ----------

def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def slice_between(text, start_pat, end_pat, start_from=0):
    s = re.search(start_pat, text[start_from:])
    if not s:
        return None, -1
    start_idx = start_from + s.start()
    inner_start = start_from + s.end()
    e = re.search(end_pat, text[inner_start:])
    if not e:
        return None, -1
    inner_end = inner_start + e.start()
    full_end = inner_start + e.end()
    return text[inner_start:inner_end], full_end


def extract_post_accent(raw):
    m = re.search(r"--post-accent:\s*(#[0-9a-fA-F]{3,8})\s*;\s*--post-accent-soft:\s*(rgba\([^)]+\))", raw)
    if m:
        return m.group(1), m.group(2)
    return "#0a3d6b", "rgba(10,61,107,.10)"


def extract_metadata(raw):
    # Title
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", raw, re.DOTALL)
    title = strip_tags(h1.group(1)).strip() if h1 else ""

    # Category tag
    tag = re.search(r'<span class="pp-tag">([^<]+)</span>', raw)
    category = tag.group(1).strip() if tag else ""

    # Read time
    read_time = ""
    rt = re.search(r">\s*(\d+\s*min read)\s*<", raw)
    if rt:
        read_time = rt.group(1).strip()

    # Featured image
    cover = re.search(
        r'<div class="pp-cover">\s*<img[^>]*src="([^"]+)"',
        raw,
    )
    featured = cover.group(1).strip() if cover else ""

    return title, category, read_time, featured


def extract_article_inner(raw):
    # Extract inside <article class="pp-body"> ... </article>, then inside <div class="pp-article"> ... </div> (closing before <div class="pp-author">)
    m = re.search(r'<article class="pp-body">(.*?)</article>', raw, re.DOTALL)
    article = m.group(1) if m else ""
    # Now find <div class="pp-article"> ... up to <div class="pp-author">
    start = article.find('<div class="pp-article">')
    if start == -1:
        return ""
    # find matching closer: we look for the next occurrence of '<div class="pp-author">' after start
    author_start = article.find('<div class="pp-author">', start)
    if author_start == -1:
        # fallback: until end
        section = article[start + len('<div class="pp-article">'):]
    else:
        section = article[start + len('<div class="pp-article">'):author_start]
    # section now contains the pp-article inner HTML, ending with `</div>\n    ` before pp-author
    # Trim trailing `</div>` (the pp-article closer)
    section = section.rstrip()
    if section.endswith("</div>"):
        section = section[: -len("</div>")].rstrip()
    return section


def extract_cta_band(raw):
    m = re.search(r'<section class="cta-band">(.*?)</section>', raw, re.DOTALL)
    if not m:
        return None
    block = m.group(1)
    kicker = re.search(r'<div class="section-kicker">([^<]+)</div>', block)
    h2 = re.search(r'<h2 class="section-h2">([^<]+)</h2>', block)
    # paragraph
    p = re.search(r'<p>(.*?)</p>', block, re.DOTALL)
    # button
    btn = re.search(
        r'<a href="([^"]+)"[^>]*class="btn btn-orange"[^>]*>([^<]+)</a>',
        block,
    )
    return {
        "kicker": kicker.group(1).strip() if kicker else "Get a quote",
        "h2": h2.group(1).strip() if h2 else "",
        "p": (p.group(1).strip() if p else ""),
        "btn_url": btn.group(1).strip() if btn else "#",
        "btn_label": btn.group(2).strip() if btn else "Get a Free Quote",
    }


def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s).strip()


# ---------- tokenizer / converter for article body ----------

VOID_TAGS = {"img", "br", "hr", "input", "meta", "link", "source"}


class Tokenizer(HTMLParser):
    """Produce a token list of (kind, data) for the article inner HTML.

    kinds: 'start', 'end', 'startend', 'data', 'comment'
    """

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.tokens = []

    def handle_starttag(self, tag, attrs):
        self.tokens.append(("start", tag, dict(attrs), self.get_starttag_text()))

    def handle_endtag(self, tag):
        self.tokens.append(("end", tag, None, None))

    def handle_startendtag(self, tag, attrs):
        self.tokens.append(("startend", tag, dict(attrs), self.get_starttag_text()))

    def handle_data(self, data):
        self.tokens.append(("data", None, None, data))

    def handle_entityref(self, name):
        self.tokens.append(("data", None, None, f"&{name};"))

    def handle_charref(self, name):
        self.tokens.append(("data", None, None, f"&#{name};"))

    def handle_comment(self, data):
        self.tokens.append(("comment", None, None, data))


def tokens_to_html_inner(tokens, start_idx, end_idx):
    """Serialize tokens[start_idx:end_idx] back to HTML (preserving data verbatim)."""
    parts = []
    for t in tokens[start_idx:end_idx]:
        kind = t[0]
        if kind == "data":
            parts.append(t[3])
        elif kind == "start":
            parts.append(t[3])
        elif kind == "startend":
            parts.append(t[3])
        elif kind == "end":
            parts.append(f"</{t[1]}>")
        elif kind == "comment":
            parts.append(f"<!--{t[3]}-->")
    return "".join(parts)


def find_matching_end(tokens, i):
    """Given tokens[i] is a 'start' tag, return index of its matching 'end' tag.

    Handles nested same-named tags.
    """
    assert tokens[i][0] == "start"
    tag = tokens[i][1]
    depth = 1
    j = i + 1
    while j < len(tokens):
        tk = tokens[j]
        if tk[0] == "start" and tk[1] == tag:
            depth += 1
        elif tk[0] == "end" and tk[1] == tag:
            depth -= 1
            if depth == 0:
                return j
        j += 1
    return -1  # unmatched


# ---------- inline style rewriting ----------

P_STYLE = 'style="margin:0 0 22px;font-size:17px;line-height:1.7;color:#1a2e42;"'
LEAD_STYLE = 'style="font-size:19px;line-height:1.55;color:#052847;font-weight:500;padding-left:18px;border-left:3px solid #0a3d6b;margin:0 0 30px;"'
H2_STYLE = 'style="font-size:28px;font-weight:700;color:#052847;margin:44px 0 16px;line-height:1.25;"'
H3_STYLE = 'style="font-size:18px;font-weight:700;color:#052847;margin:28px 0 12px;line-height:1.3;"'
UL_STYLE = 'style="margin:0 0 22px;padding-left:22px;font-size:17px;line-height:1.7;color:#1a2e42;"'
OL_STYLE = UL_STYLE
LI_STYLE = 'style="margin-bottom:8px;line-height:1.65;"'
STRONG_STYLE = 'style="color:#052847;"'
A_STYLE = 'style="color:#0a3d6b;font-weight:600;"'


def rewrite_inline(html):
    """Apply inline-style replacements for <strong>, <em>, <a>, <li> occurring inside already-open content."""
    # <strong>X</strong>  -- but do NOT touch strong tags that are inside callout's strong header (handled separately at callout-level)
    html = re.sub(r"<strong>", f"<strong {STRONG_STYLE}>", html)
    # <a href="X">Y</a>
    def a_sub(m):
        href = m.group(1)
        return f'<a href="{href}" {A_STYLE}>'
    html = re.sub(r'<a\s+href="([^"]+)"\s*>', a_sub, html)
    # <em> stays as-is (already handled by spec, no style change needed, but keep plain)
    # li (bare)
    html = re.sub(r"<li>", f"<li {LI_STYLE}>", html)
    return html


def convert_callout(inner_html):
    """inner_html is the content inside <div class="pp-callout">...</div>.

    Returns replacement HTML string.
    """
    # Look for a leading <strong>...</strong> that serves as kicker.
    # The inner_html often looks like: whitespace, <strong>Real example</strong>\n<ws> Body text...
    stripped = inner_html.strip()
    m = re.match(r"<strong>([^<]+)</strong>(.*)", stripped, re.DOTALL)
    if m:
        kicker_raw = m.group(1).strip()
        body_raw = m.group(2).strip()
    else:
        kicker_raw = "Tip"
        body_raw = stripped

    kicker = kicker_raw.upper()
    # Rewrite inline elements in body (but don't want its strong tags to overshadow our kicker style — but the first <strong> has already been consumed)
    body = rewrite_inline(body_raw)

    return (
        '<div style="background:#f4f7fb;border-left:4px solid #0a3d6b;padding:18px 22px;margin:24px 0;font-size:16px;line-height:1.6;color:#1a2e42;">\n'
        f'  <strong style="display:block;font-size:13px;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px;color:#0a3d6b;">{kicker}</strong>\n'
        f'  {body}\n'
        "</div>"
    )


def convert_mid_cta(inner_html, accent, accent_soft):
    """Return the mid-cta block with var(--post-accent*) replaced by concrete values.

    We resolve vars in all inline style attrs inside the mid-cta block so that GHL renders correctly.
    """
    resolved = inner_html
    resolved = resolved.replace("var(--post-accent-soft)", accent_soft)
    resolved = resolved.replace("var(--post-accent)", accent)
    resolved = resolved.replace("var(--navy)", "#052847")
    resolved = resolved.replace("var(--text)", "#1a2e42")
    resolved = resolved.replace("var(--bg)", "#f4f7fb")
    return resolved


def process_article(article_html, accent, accent_soft):
    """Walk tokens in article_html and emit converted HTML, per the spec rules."""
    tok = Tokenizer()
    tok.feed(article_html)
    tokens = tok.tokens

    out_parts = []

    i = 0
    n = len(tokens)

    while i < n:
        t = tokens[i]
        kind = t[0]

        if kind == "data":
            out_parts.append(t[3])
            i += 1
            continue

        if kind == "comment":
            out_parts.append(f"<!--{t[3]}-->")
            i += 1
            continue

        if kind == "start":
            tag = t[1]
            attrs = t[2]
            raw_tag = t[3]

            # <p class="lead">
            if tag == "p" and attrs.get("class") == "lead":
                end_idx = find_matching_end(tokens, i)
                inner = tokens_to_html_inner(tokens, i + 1, end_idx)
                inner = rewrite_inline(inner)
                out_parts.append(f"<p {LEAD_STYLE}>{inner}</p>")
                i = end_idx + 1
                continue

            # <p class="pp-faq-q">
            if tag == "p" and attrs.get("class") == "pp-faq-q":
                end_idx = find_matching_end(tokens, i)
                inner = tokens_to_html_inner(tokens, i + 1, end_idx)
                inner = rewrite_inline(inner)
                out_parts.append(f"<h3 {H3_STYLE}>{inner}</h3>")
                i = end_idx + 1
                continue

            # Generic <p> (no class, or other)
            if tag == "p" and not attrs.get("class"):
                end_idx = find_matching_end(tokens, i)
                inner = tokens_to_html_inner(tokens, i + 1, end_idx)
                inner = rewrite_inline(inner)
                out_parts.append(f"<p {P_STYLE}>{inner}</p>")
                i = end_idx + 1
                continue

            # any other <p class="..."> fall back to plain
            if tag == "p":
                end_idx = find_matching_end(tokens, i)
                inner = tokens_to_html_inner(tokens, i + 1, end_idx)
                inner = rewrite_inline(inner)
                out_parts.append(f"<p {P_STYLE}>{inner}</p>")
                i = end_idx + 1
                continue

            # h2
            if tag == "h2":
                end_idx = find_matching_end(tokens, i)
                inner = tokens_to_html_inner(tokens, i + 1, end_idx)
                inner = rewrite_inline(inner)
                out_parts.append(f"<h2 {H2_STYLE}>{inner}</h2>")
                i = end_idx + 1
                continue

            if tag == "h3":
                end_idx = find_matching_end(tokens, i)
                inner = tokens_to_html_inner(tokens, i + 1, end_idx)
                inner = rewrite_inline(inner)
                out_parts.append(f"<h3 {H3_STYLE}>{inner}</h3>")
                i = end_idx + 1
                continue

            # ul / ol
            if tag in ("ul", "ol"):
                end_idx = find_matching_end(tokens, i)
                inner = tokens_to_html_inner(tokens, i + 1, end_idx)
                inner = rewrite_inline(inner)
                style = UL_STYLE if tag == "ul" else OL_STYLE
                out_parts.append(f"<{tag} {style}>{inner}</{tag}>")
                i = end_idx + 1
                continue

            # div.pp-callout
            if tag == "div" and attrs.get("class") == "pp-callout":
                end_idx = find_matching_end(tokens, i)
                inner = tokens_to_html_inner(tokens, i + 1, end_idx)
                out_parts.append(convert_callout(inner))
                i = end_idx + 1
                continue

            # div.pp-mid-cta
            if tag == "div" and attrs.get("class") == "pp-mid-cta":
                end_idx = find_matching_end(tokens, i)
                # Reconstruct the full div including its opening tag with its style attrs
                raw_inner = tokens_to_html_inner(tokens, i, end_idx + 1)
                resolved = convert_mid_cta(raw_inner, accent, accent_soft)
                out_parts.append(resolved)
                i = end_idx + 1
                continue

            # hr
            if tag == "hr":
                out_parts.append('<hr style="border:none;border-top:1px solid #dbe2ec;margin:40px 0;">')
                i += 1
                continue

            # Unknown start tag — emit as-is
            out_parts.append(raw_tag)
            i += 1
            continue

        if kind == "startend":
            # self-closing tags (img, br etc.)
            out_parts.append(t[3])
            i += 1
            continue

        if kind == "end":
            out_parts.append(f"</{t[1]}>")
            i += 1
            continue

        i += 1

    result = "".join(out_parts)
    # Tidy leading/trailing whitespace
    return result.strip()


# ---------- final CTA-band ----------

def build_cta_band(band):
    if not band:
        return ""
    return (
        '<div style="background:#0a3d6b;padding:48px 32px;margin:56px 0 0;text-align:center;color:#fff;">\n'
        f'  <p style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.85);margin:0 0 12px;">{band["kicker"]}</p>\n'
        f'  <h2 style="font-size:28px;font-weight:700;color:#fff;margin:0 0 14px;line-height:1.25;">{band["h2"]}</h2>\n'
        f'  <p style="font-size:16px;color:rgba(255,255,255,.75);max-width:520px;margin:0 auto 24px;">{band["p"]}</p>\n'
        f'  <a href="{band["btn_url"]}" style="display:inline-block;padding:14px 32px;background:#fff;color:#0a3d6b;font-weight:700;font-size:15px;text-decoration:none;margin-right:10px;">{band["btn_label"]}</a>\n'
        '  <a href="tel:888-899-8117" style="display:inline-block;padding:14px 32px;background:transparent;color:#fff;font-weight:700;font-size:15px;text-decoration:none;border:2px solid rgba(255,255,255,.55);">Call 888-899-8117</a>\n'
        '</div>'
    )


# ---------- meta description ----------

def meta_description(article_html):
    # First <p class="lead">...
    m = re.search(r'<p class="lead">(.*?)</p>', article_html, re.DOTALL)
    if not m:
        m = re.search(r'<p>(.*?)</p>', article_html, re.DOTALL)
        if not m:
            return ""
    text = strip_tags(m.group(1)).strip()
    # First sentence
    sent_match = re.match(r"(.*?[.!?])(\s|$)", text)
    first = sent_match.group(1) if sent_match else text
    if len(first) > 160:
        first = first[:157].rstrip() + "..."
    return first


# ---------- main ----------

def process_file(src_name, out_name):
    src_path = os.path.join(SRC_DIR, src_name)
    out_path = os.path.join(OUT_DIR, out_name)
    raw = read(src_path)

    title, category, read_time, featured = extract_metadata(raw)
    accent, accent_soft = extract_post_accent(raw)
    article_inner = extract_article_inner(raw)
    meta_desc = meta_description(article_inner)
    band = extract_cta_band(raw)

    converted = process_article(article_inner, accent, accent_soft)
    cta_band_html = build_cta_band(band)

    slug = out_name[:-5]  # strip .html

    comment = (
        "<!--\n"
        "GHL Blog Post — Fill these fields in the blog-post form\n"
        "─────────────────────────────────────────────────────────\n"
        f"TITLE: {title}\n"
        f"URL SLUG: {slug}\n"
        f"CATEGORY: {category}\n"
        "AUTHOR: OnePoint Insurance Agency\n"
        "PUBLISH DATE: July 15, 2025\n"
        f"READ TIME: {read_time}\n"
        f"FEATURED IMAGE URL: {featured}\n"
        f"META DESCRIPTION: {meta_desc}\n"
        "─────────────────────────────────────────────────────────\n"
        "Paste everything BELOW this comment block into GHL's body editor via the code-view (<>) icon.\n"
        "-->\n"
    )

    body = converted
    if cta_band_html:
        body = body.rstrip() + "\n\n" + cta_band_html + "\n"

    final = comment + "\n" + body + "\n"

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(final)
    return len(final)


def main():
    sizes = []
    for src, out in FILE_MAP:
        size = process_file(src, out)
        sizes.append((out, size))
        print(f"  wrote {out}  ({size} bytes)")
    print(f"\nTotal files: {len(sizes)}")
    print(f"Size range: {min(s for _, s in sizes)} – {max(s for _, s in sizes)} bytes")


if __name__ == "__main__":
    main()
