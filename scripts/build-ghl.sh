#!/bin/bash
# Build GHL-ready self-contained HTML files
# Inlines coverage-pages.css into each page and fixes paths

BASE="https://testingonepoint.vercel.app"
SRC="/Users/dumtochukwu/Desktop/testing"
OUT="/Users/dumtochukwu/Desktop/testing/ghl"
CSS="$SRC/coverage-pages.css"

mkdir -p "$OUT"

process_page() {
  local input="$1"
  local output="$2"
  local depth="$3"  # 0=root, 1=one-level, 2=two-level

  echo "Processing: $input -> $output"

  # Read the file
  cp "$input" "$output"

  # Remove external CSS link and replace with inline CSS
  # Handle both href="../coverage-pages.css" and href="coverage-pages.css" and href="../../coverage-pages.css"
  if [ "$depth" = "0" ]; then
    sed -i '' "s|<link rel=\"stylesheet\" href=\"coverage-pages.css\">|<style>$(sed 's/[&/\]/\\&/g' "$CSS" | tr '\n' '\r')</style>|" "$output" 2>/dev/null || true
  fi

  # For all depths, just replace the link tag with inline style using a different approach
  # First, create a temp file with the CSS content wrapped in style tags
  echo "<style>" > /tmp/ghl_css.tmp
  cat "$CSS" >> /tmp/ghl_css.tmp
  echo "</style>" >> /tmp/ghl_css.tmp

  # Use python for reliable replacement since sed struggles with large multiline content
  python3 -c "
import re, sys
css_content = open('/tmp/ghl_css.tmp').read()
html = open('$output').read()
# Replace any coverage-pages.css link tag
html = re.sub(r'<link[^>]*coverage-pages\.css[^>]*>', css_content, html)
# Fix relative image/link paths to absolute
if $depth == 0:
    html = html.replace('src=\"logo', 'src=\"$BASE/logo')
    html = html.replace('src=\"car', 'src=\"$BASE/car')
    html = html.replace('src=\"home.', 'src=\"$BASE/home.')
    html = html.replace('src=\"health.', 'src=\"$BASE/health.')
    html = html.replace('src=\"life-', 'src=\"$BASE/life-')
    html = html.replace('src=\"working.', 'src=\"$BASE/working.')
    html = html.replace('src=\"business', 'src=\"$BASE/business')
    html = html.replace('src=\"why-', 'src=\"$BASE/why-')
    html = html.replace('src=\"people-', 'src=\"$BASE/people-')
    html = html.replace('src=\"logo-footer', 'src=\"$BASE/logo-footer')
    html = html.replace('href=\"auto/', 'href=\"$BASE/auto/')
    html = html.replace('href=\"home/', 'href=\"$BASE/home/')
    html = html.replace('href=\"health/', 'href=\"$BASE/health/')
    html = html.replace('href=\"life/', 'href=\"$BASE/life/')
    html = html.replace('href=\"disability/', 'href=\"$BASE/disability/')
    html = html.replace('href=\"business/', 'href=\"$BASE/business/')
    html = html.replace('href=\"about/', 'href=\"$BASE/about/')
    html = html.replace('href=\"contact/', 'href=\"$BASE/contact/')
    html = html.replace('href=\"book/', 'href=\"$BASE/book/')
    html = html.replace('href=\"onepointblog/', 'href=\"$BASE/onepointblog/')
    html = html.replace('href=\"privacy/', 'href=\"$BASE/privacy/')
    html = html.replace('href=\"terms/', 'href=\"$BASE/terms/')
    html = html.replace('href=\"auto-quote/', 'href=\"$BASE/auto-quote/')
    html = html.replace('href=\"health-quote/', 'href=\"$BASE/health-quote/')
    html = html.replace('href=\"client-services/', 'href=\"$BASE/client-services/')
    html = html.replace('href=\"policy-request/', 'href=\"$BASE/policy-request/')
    html = html.replace('href=\"partners/', 'href=\"$BASE/partners/')
    html = html.replace('href=\"index.html', 'href=\"$BASE/')
elif $depth == 1:
    html = html.replace('src=\"../', 'src=\"$BASE/')
    html = html.replace('href=\"../', 'href=\"$BASE/')
    html = html.replace('href=\"./', 'href=\"$BASE/')
elif $depth == 2:
    html = html.replace('src=\"../../', 'src=\"$BASE/')
    html = html.replace('href=\"../../', 'href=\"$BASE/')
# Remove quote-modal.js references
html = re.sub(r'<script[^>]*quote-modal\.js[^>]*></script>', '', html)
html = html.replace('<!-- quote-modal.js removed', '<!-- quote-modal removed')
open('$output', 'w').write(html)
"

  echo "  Done: $output"
}

# Root pages
process_page "$SRC/index.html" "$OUT/home.html" 0

# One-level pages
for dir in auto home health life disability business about contact book onepointblog partners client-services policy-request privacy terms; do
  if [ -f "$SRC/$dir/index.html" ]; then
    process_page "$SRC/$dir/index.html" "$OUT/$dir.html" 1
  fi
done

# Quote forms (already self-contained, just copy and fix paths)
for dir in auto-quote health-quote; do
  if [ -f "$SRC/$dir/index.html" ]; then
    cp "$SRC/$dir/index.html" "$OUT/$dir.html"
    # Fix logo path
    sed -i '' "s|src=\"../logo.webp\"|src=\"$BASE/logo.webp\"|g" "$OUT/$dir.html"
    echo "Copied: $OUT/$dir.html"
  fi
done

# Blog posts
for post in what-is-liability-coverage-auto-insurance what-is-term-life-insurance short-term-medical-insurance-guide how-business-owners-policies-work-bop-insurance what-is-commercial-property-insurance; do
  if [ -f "$SRC/post/$post/index.html" ]; then
    process_page "$SRC/post/$post/index.html" "$OUT/post-$post.html" 2
  fi
done

echo ""
echo "=== GHL BUILD COMPLETE ==="
echo "Output: $OUT/"
ls -la "$OUT/"
