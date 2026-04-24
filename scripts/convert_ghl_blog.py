#!/usr/bin/env python3
"""
Convert OnePoint blog HTML posts into GHL-ready markdown files.
Each output file has an HTML-comment metadata header for reference,
then pure markdown with inline-styled HTML for callouts, mid-CTA, and final CTA.
"""

from __future__ import annotations

import html
import os
import re
from pathlib import Path

# -------------------------------------------------------------------------
# Config
# -------------------------------------------------------------------------

SRC_DIR = Path("/Users/dumtochukwu/Desktop/testing/ghl")
OUT_DIR = Path("/Users/dumtochukwu/Desktop/testing/blog-content")

# Map source filename -> output filename (URL slug + .md)
FILE_MAP = {
    "post-what-is-liability-coverage-auto-insurance.html":
        "what-is-liability-coverage-auto-insurance.md",
    "post-what-is-term-life-insurance.html":
        "what-is-term-life-insurance.md",
    "post-what-is-commercial-property-insurance.html":
        "what-is-commercial-property-insurance.md",
    "post-how-business-owners-policies-work-bop-insurance.html":
        "how-business-owners-policies-work-bop-insurance.md",
    "post-short-term-medical-insurance-guide.html":
        "short-term-medical-insurance-guide.md",
    "post-understanding-homeowners-insurance-georgia.html":
        "understanding-homeowners-insurance-what-every-georgia-property-owner-needs-to-know.md",
    "post-a-lifetime-of-financial-protection-and-value.html":
        "a-lifetime-of-financial-protection-and-value.md",
    "post-what-is-hospitalization-indemnity-insurance.html":
        "what-is-hospitalization-indemnity-insurance.md",
    "post-auto-insurance-101.html":
        "auto-insurance-101.md",
    "post-health-insurance-in-2025.html":
        "health-insurance-in-2025.md",
    "post-critical-illness-insurance.html":
        "critical-illness-insurance.md",
    "post-renters-insurance-what-it-covers.html":
        "renters-insurance-what-it-covers.md",
    "post-how-much-life-insurance-do-i-need.html":
        "how-much-life-insurance-do-i-need.md",
    "post-umbrella-insurance-explained.html":
        "umbrella-insurance-explained.md",
    "post-short-term-vs-long-term-disability-insurance.html":
        "short-term-vs-long-term-disability-insurance.md",
}

BRAND_BLUE = "#0a3d6b"

# -------------------------------------------------------------------------
# Small helpers
# -------------------------------------------------------------------------

def read_file(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def unescape(s: str) -> str:
    return html.unescape(s)


def strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s).strip()


def collapse_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def post_accent_from_html(src: str) -> str:
    m = re.search(r"--post-accent:\s*(#[0-9a-fA-F]{3,8})", src)
    return m.group(1) if m else BRAND_BLUE


def post_accent_soft_from_html(src: str) -> str:
    m = re.search(r"--post-accent-soft:\s*(rgba\([^)]+\))", src)
    return m.group(1) if m else "rgba(10,61,107,.10)"


# -------------------------------------------------------------------------
# Metadata extraction
# -------------------------------------------------------------------------

def extract_metadata(src: str, slug: str) -> dict:
    # Title from <h1> inside <div class="pp-hero">
    hero = re.search(r'<div class="pp-hero">(.*?)</div>', src, re.S)
    hero_block = hero.group(1) if hero else ""
    title_m = re.search(r"<h1[^>]*>(.*?)</h1>", hero_block, re.S)
    title = collapse_ws(unescape(strip_tags(title_m.group(1)))) if title_m else ""

    # Tag/category
    tag_m = re.search(r'<span class="pp-tag">(.*?)</span>', src, re.S)
    category = collapse_ws(unescape(strip_tags(tag_m.group(1)))) if tag_m else ""

    # Read time — last <span> inside .pp-meta
    meta_m = re.search(r'<div class="pp-meta">(.*?)</div>', src, re.S)
    read_time = ""
    if meta_m:
        spans = re.findall(r"<span[^>]*>(.*?)</span>", meta_m.group(1), re.S)
        for text in reversed(spans):
            t = collapse_ws(unescape(strip_tags(text)))
            if "min read" in t.lower():
                read_time = t
                break

    # Featured image
    img_m = re.search(r'<div class="pp-cover">.*?<img[^>]+src="([^"]+)"', src, re.S)
    featured_image = img_m.group(1) if img_m else ""

    # Lead paragraph
    lead_m = re.search(r'<p class="lead">(.*?)</p>', src, re.S)
    lead_raw = lead_m.group(1) if lead_m else ""
    lead_text = collapse_ws(unescape(strip_tags(lead_raw)))

    # Meta description: first sentence of lead, max 160 chars
    first_sentence = re.split(r"(?<=[.!?])\s", lead_text, maxsplit=1)[0]
    if len(first_sentence) > 160:
        first_sentence = first_sentence[:157].rstrip() + "..."
    meta_desc = first_sentence

    return {
        "title": title,
        "slug": slug,
        "category": category,
        "read_time": read_time,
        "featured_image": featured_image,
        "meta_description": meta_desc,
        "lead_raw": lead_raw,
    }


# -------------------------------------------------------------------------
# Inline HTML -> Markdown conversion for paragraph/list content
# -------------------------------------------------------------------------

def inline_md(html_text: str) -> str:
    """Convert inline html (strong/em/a) to markdown. Leaves plain text untouched."""
    t = html_text

    # <br> -> newline (rare in this content, but safe)
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.I)

    # <a href="X" ...>Y</a> -> [Y](X). Handle simple cases (no nested tags we care about).
    def _link(m: re.Match) -> str:
        href = m.group(1)
        inner = m.group(2)
        inner = inline_md(inner)  # recurse for nested strong/em
        return f"[{inner.strip()}]({href})"
    t = re.sub(
        r'<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
        _link,
        t,
        flags=re.S,
    )

    # <strong>...</strong> -> **...**
    t = re.sub(r"<strong[^>]*>(.*?)</strong>", lambda m: f"**{inline_md(m.group(1)).strip()}**", t, flags=re.S)
    # <b>...</b> -> **...**
    t = re.sub(r"<b[^>]*>(.*?)</b>", lambda m: f"**{inline_md(m.group(1)).strip()}**", t, flags=re.S)
    # <em>...</em> -> *...*
    t = re.sub(r"<em[^>]*>(.*?)</em>", lambda m: f"*{inline_md(m.group(1)).strip()}*", t, flags=re.S)
    # <i>...</i> -> *...*
    t = re.sub(r"<i[^>]*>(.*?)</i>", lambda m: f"*{inline_md(m.group(1)).strip()}*", t, flags=re.S)

    # Drop any stray tags
    t = re.sub(r"</?span[^>]*>", "", t)

    t = unescape(t)
    # collapse any multi-whitespace but preserve single newlines from <br>
    lines = [collapse_ws(line) for line in t.split("\n")]
    t = "\n".join(line for line in lines if line != "" or True)  # keep as-is
    # final trim
    t = re.sub(r"[ \t]+", " ", t)
    return t.strip()


# -------------------------------------------------------------------------
# Tokenize the <div class="pp-article"> body into ordered elements
# -------------------------------------------------------------------------

def extract_article_body(src: str) -> str:
    """Pull everything inside <div class="pp-article">…</div>."""
    # need to find balanced div — use a manual scan since content doesn't nest pp-article.
    start_m = re.search(r'<div class="pp-article">', src)
    if not start_m:
        raise RuntimeError("No pp-article found")
    i = start_m.end()
    depth = 1
    # scan forward tracking <div ...> and </div>
    tag_re = re.compile(r"<(/?)div\b[^>]*>", re.I)
    pos = i
    while depth > 0:
        m = tag_re.search(src, pos)
        if not m:
            raise RuntimeError("Unbalanced pp-article")
        if m.group(1) == "":  # opening
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                return src[i:m.start()]
        pos = m.end()
    return ""


def convert_body(body_html: str) -> str:
    """Walk the article body HTML and emit markdown + inline-styled blocks."""
    out: list[str] = []
    pos = 0
    n = len(body_html)

    # Regex to find the next top-level block we care about.
    # We scan forward for the next <tag ...> match and handle it.
    block_re = re.compile(
        r"<(p|h2|h3|h4|ul|ol|div|hr)\b([^>]*)>",
        re.I,
    )

    while pos < n:
        m = block_re.search(body_html, pos)
        if not m:
            break
        tag = m.group(1).lower()
        attrs = m.group(2)
        start = m.end()

        if tag == "hr":
            out.append("---")
            pos = start
            continue

        # Find matching close tag (allow same-tag nesting for <div> only)
        close_tag = f"</{tag}>"
        if tag == "div":
            # match nested divs
            depth = 1
            sub_re = re.compile(r"<(/?)div\b[^>]*>", re.I)
            p = start
            end_idx = -1
            while True:
                sm = sub_re.search(body_html, p)
                if not sm:
                    break
                if sm.group(1) == "":
                    depth += 1
                else:
                    depth -= 1
                    if depth == 0:
                        end_idx = sm.start()
                        close_end = sm.end()
                        break
                p = sm.end()
            if end_idx < 0:
                break
            inner = body_html[start:end_idx]
            pos = close_end
        else:
            idx = body_html.lower().find(close_tag, start)
            if idx < 0:
                break
            inner = body_html[start:idx]
            pos = idx + len(close_tag)

        cls_m = re.search(r'class="([^"]*)"', attrs)
        cls = cls_m.group(1) if cls_m else ""

        if tag == "p":
            if "lead" in cls.split():
                lead_text = inline_md(inner)
                out.append(f"> **{lead_text}**")
            elif "pp-faq-q" in cls.split():
                out.append(f"### {inline_md(inner)}")
            else:
                txt = inline_md(inner)
                if txt:
                    out.append(txt)
        elif tag == "h2":
            out.append(f"## {inline_md(inner)}")
        elif tag == "h3":
            out.append(f"### {inline_md(inner)}")
        elif tag == "h4":
            out.append(f"#### {inline_md(inner)}")
        elif tag == "ul":
            items = re.findall(r"<li[^>]*>(.*?)</li>", inner, re.S | re.I)
            for it in items:
                out.append(f"- {inline_md(it)}")
        elif tag == "ol":
            items = re.findall(r"<li[^>]*>(.*?)</li>", inner, re.S | re.I)
            for i, it in enumerate(items, 1):
                out.append(f"{i}. {inline_md(it)}")
        elif tag == "div":
            classes = cls.split()
            if "pp-callout" in classes:
                out.append(render_callout(inner))
            elif "pp-mid-cta" in classes:
                # keep block as-is, but resolve CSS variables to hex
                full_block = body_html[m.start():pos]
                out.append(resolve_css_vars(full_block))
            elif "pp-author" in classes:
                # skip
                pass
            else:
                # unknown div - include text content
                txt = inline_md(strip_tags(inner))
                if txt:
                    out.append(txt)
        # Note: other tags skipped

    # join with blank lines between blocks
    return "\n\n".join(out).strip() + "\n"


# -------------------------------------------------------------------------
# Callout replacement
# -------------------------------------------------------------------------

def render_callout(inner_html: str) -> str:
    """Convert a <div class="pp-callout"> inner to the inline-styled HTML block."""
    # Find a leading <strong>...</strong> as the kicker.
    kicker_m = re.match(r"\s*<strong[^>]*>(.*?)</strong>", inner_html, re.S | re.I)
    if kicker_m:
        kicker = collapse_ws(unescape(strip_tags(kicker_m.group(1)))).upper()
        rest = inner_html[kicker_m.end():]
    else:
        kicker = "TIP"
        rest = inner_html

    body_md = inline_md(rest)
    # If body contains list-looking content, it's rare inside callouts; leave as inline text.
    body_md = body_md.strip()

    return (
        f'<div style="background:#f4f7fb;border-left:4px solid {BRAND_BLUE};'
        f'padding:18px 22px;margin:24px 0;font-size:16px;line-height:1.6;color:#1a2e42;">\n'
        f'<strong style="display:block;font-size:13px;letter-spacing:.04em;'
        f'text-transform:uppercase;margin-bottom:6px;color:{BRAND_BLUE};">{kicker}</strong>\n'
        f'{body_md}\n'
        f'</div>'
    )


# -------------------------------------------------------------------------
# Resolve CSS variables inside pp-mid-cta block (GHL won't see <style>)
# -------------------------------------------------------------------------

def resolve_css_vars(block_html: str, accent: str = None, accent_soft: str = None) -> str:
    """Replace var(--post-accent*), var(--navy), etc. with hex values."""
    accent = accent or BRAND_BLUE
    accent_soft = accent_soft or "rgba(10,61,107,.10)"
    replacements = {
        r"var\(--post-accent-soft\)": accent_soft,
        r"var\(--post-accent\)": accent,
        r"var\(--navy\)": "#1a2e42",
        r"var\(--blue\)": BRAND_BLUE,
        r"var\(--orange\)": "#ff6b1a",
        r"var\(--text\)": "#1a2e42",
        r"var\(--muted\)": "#5a6b7c",
        r"var\(--subtle\)": "#9aa5b1",
        r"var\(--border\)": "#e3e8ed",
        r"var\(--bg\)": "#f4f7fb",
    }
    out = block_html
    for pat, val in replacements.items():
        out = re.sub(pat, val, out)
    return out


# -------------------------------------------------------------------------
# Final CTA-band replacement
# -------------------------------------------------------------------------

def render_final_cta(src: str) -> str:
    sec_m = re.search(r'<section class="cta-band">(.*?)</section>', src, re.S)
    if not sec_m:
        return ""
    section = sec_m.group(1)

    kicker_m = re.search(r'<div class="section-kicker">(.*?)</div>', section, re.S)
    kicker = collapse_ws(unescape(strip_tags(kicker_m.group(1)))) if kicker_m else ""

    headline_m = re.search(r'<h2 class="section-h2">(.*?)</h2>', section, re.S)
    headline = collapse_ws(unescape(strip_tags(headline_m.group(1)))) if headline_m else ""

    # First <p> inside .container
    p_m = re.search(r'<p[^>]*>(.*?)</p>', section, re.S)
    paragraph = collapse_ws(unescape(strip_tags(p_m.group(1)))) if p_m else ""

    btn_m = re.search(
        r'<a[^>]*href="([^"]+)"[^>]*class="btn btn-orange"[^>]*>(.*?)</a>',
        section, re.S
    )
    cta_url = btn_m.group(1) if btn_m else "https://onepointinsuranceagency.com/"
    cta_label = collapse_ws(unescape(strip_tags(btn_m.group(2)))) if btn_m else "Get Started"

    return (
        f'<div style="background:{BRAND_BLUE};padding:48px 32px;margin:56px 0 0;'
        f'text-align:center;color:#fff;">\n'
        f'<p style="font-size:12px;font-weight:700;letter-spacing:.08em;'
        f'text-transform:uppercase;color:rgba(255,255,255,.85);margin:0 0 12px;">{kicker}</p>\n'
        f'<h2 style="font-size:28px;font-weight:700;color:#fff;margin:0 0 14px;'
        f'line-height:1.25;">{headline}</h2>\n'
        f'<p style="font-size:16px;color:rgba(255,255,255,.75);max-width:520px;'
        f'margin:0 auto 24px;">{paragraph}</p>\n'
        f'<a href="{cta_url}" style="display:inline-block;padding:14px 32px;background:#fff;'
        f'color:{BRAND_BLUE};font-weight:700;font-size:15px;text-decoration:none;'
        f'margin-right:10px;">{cta_label}</a>\n'
        f'<a href="tel:888-899-8117" style="display:inline-block;padding:14px 32px;'
        f'background:transparent;color:#fff;font-weight:700;font-size:15px;'
        f'text-decoration:none;border:2px solid rgba(255,255,255,.55);">Call 888-899-8117</a>\n'
        f'</div>'
    )


# -------------------------------------------------------------------------
# Per-file orchestrator
# -------------------------------------------------------------------------

def convert_one(src_name: str, out_name: str) -> tuple[Path, int]:
    src_path = SRC_DIR / src_name
    out_path = OUT_DIR / out_name
    src = read_file(src_path)

    slug = out_name[:-3]  # strip .md
    meta = extract_metadata(src, slug)
    accent = post_accent_from_html(src)
    accent_soft = post_accent_soft_from_html(src)

    body_html = extract_article_body(src)
    body_md = convert_body_with_accent(body_html, accent, accent_soft)
    final_cta = render_final_cta(src)

    header = (
        "<!--\n"
        "GHL Blog Post — Fill these fields in the blog-post form\n"
        "─────────────────────────────────────────────────────────\n"
        f"TITLE: {meta['title']}\n"
        f"URL SLUG: {meta['slug']}\n"
        f"CATEGORY: {meta['category']}\n"
        "AUTHOR: OnePoint Insurance Agency\n"
        "PUBLISH DATE: July 15, 2025\n"
        f"READ TIME: {meta['read_time']}\n"
        f"FEATURED IMAGE URL: {meta['featured_image']}\n"
        f"META DESCRIPTION: {meta['meta_description']}\n"
        "─────────────────────────────────────────────────────────\n"
        "The body content below is for the post's main body field.\n"
        "Paste it into GHL's rich-text editor (use the code/HTML view `<>` for inline-styled blocks to render correctly).\n"
        "-->\n\n"
    )

    parts = [header, body_md]
    if final_cta:
        parts.append("\n" + final_cta + "\n")
    content = "".join(parts)

    out_path.write_text(content, encoding="utf-8")
    return out_path, len(content)


# convert_body needs access to accent for pp-mid-cta resolution.
# Wrap with a version that sets globals.

def convert_body_with_accent(body_html: str, accent: str, accent_soft: str) -> str:
    """Same as convert_body but resolves pp-mid-cta css vars using this post's accent."""
    out: list[str] = []
    pos = 0
    n = len(body_html)

    block_re = re.compile(r"<(p|h2|h3|h4|ul|ol|div|hr)\b([^>]*)>", re.I)

    while pos < n:
        m = block_re.search(body_html, pos)
        if not m:
            break
        tag = m.group(1).lower()
        attrs = m.group(2)
        start = m.end()

        if tag == "hr":
            out.append("---")
            pos = start
            continue

        if tag == "div":
            depth = 1
            sub_re = re.compile(r"<(/?)div\b[^>]*>", re.I)
            p = start
            end_idx = -1
            close_end = n
            while True:
                sm = sub_re.search(body_html, p)
                if not sm:
                    break
                if sm.group(1) == "":
                    depth += 1
                else:
                    depth -= 1
                    if depth == 0:
                        end_idx = sm.start()
                        close_end = sm.end()
                        break
                p = sm.end()
            if end_idx < 0:
                break
            inner = body_html[start:end_idx]
            full_block = body_html[m.start():close_end]
            pos = close_end
        else:
            close_tag = f"</{tag}>"
            idx = body_html.lower().find(close_tag, start)
            if idx < 0:
                break
            inner = body_html[start:idx]
            full_block = body_html[m.start():idx + len(close_tag)]
            pos = idx + len(close_tag)

        cls_m = re.search(r'class="([^"]*)"', attrs)
        cls = cls_m.group(1) if cls_m else ""
        classes = cls.split()

        if tag == "p":
            if "lead" in classes:
                out.append(f"> **{inline_md(inner)}**")
            elif "pp-faq-q" in classes:
                out.append(f"### {inline_md(inner)}")
            else:
                txt = inline_md(inner)
                if txt:
                    out.append(txt)
        elif tag == "h2":
            out.append(f"## {inline_md(inner)}")
        elif tag == "h3":
            out.append(f"### {inline_md(inner)}")
        elif tag == "h4":
            out.append(f"#### {inline_md(inner)}")
        elif tag == "ul":
            items = re.findall(r"<li[^>]*>(.*?)</li>", inner, re.S | re.I)
            for it in items:
                out.append(f"- {inline_md(it)}")
        elif tag == "ol":
            items = re.findall(r"<li[^>]*>(.*?)</li>", inner, re.S | re.I)
            for i, it in enumerate(items, 1):
                out.append(f"{i}. {inline_md(it)}")
        elif tag == "div":
            if "pp-callout" in classes:
                out.append(render_callout(inner))
            elif "pp-mid-cta" in classes:
                out.append(resolve_css_vars(full_block, accent, accent_soft))
            elif "pp-author" in classes:
                pass
            else:
                txt = inline_md(strip_tags(inner))
                if txt:
                    out.append(txt)

    return "\n\n".join(out).strip() + "\n"


# -------------------------------------------------------------------------
# Main
# -------------------------------------------------------------------------

def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sizes = []
    for src_name, out_name in FILE_MAP.items():
        out_path, size = convert_one(src_name, out_name)
        sizes.append((out_path.name, size))
        print(f"WROTE {out_path.name:70s} {size:>6} bytes")
    print(f"\n{len(sizes)} files written")
    avg = sum(s for _, s in sizes) / len(sizes)
    print(f"Average size: {avg:.0f} bytes")


if __name__ == "__main__":
    main()
