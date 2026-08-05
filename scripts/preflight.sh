#!/usr/bin/env bash
# Preflight for the public portfolio. Run before every push.
# Catches the mechanical leaks; the NDA read-through is still a human job.
set -uo pipefail
cd "$(dirname "$0")/.."

fails=0
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$*"; fails=$((fails + 1)); }
pass() { printf '  \033[32mok\033[0m   %s\n' "$*"; }
warn() { printf '  \033[33mwarn\033[0m %s\n' "$*"; }

echo "== build"
if go vet ./... && go run ./cmd/build >/dev/null 2>&1; then
  pass "site builds"
else
  fail "build or vet failed — run 'make check' for detail"
  exit 1
fi

echo "== secrets"
if grep -rIEq '(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-|-----BEGIN [A-Z ]*PRIVATE KEY-----)' dist; then
  fail "secret-shaped string in dist/"
  grep -rIEno '(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-)' dist | head -5
else
  pass "no secret-shaped strings"
fi

echo "== placeholders"
if grep -rIEq '(TODO|FIXME|XXX|lorem ipsum|Lorem Ipsum|PLACEHOLDER|<your )' dist; then
  fail "placeholder text reached the rendered site"
  grep -rIEno '(TODO|FIXME|XXX|lorem ipsum|PLACEHOLDER|<your )' dist | head -5
else
  pass "no placeholders"
fi

echo "== local leakage"
if grep -rIEq '(localhost:[0-9]+|127\.0\.0\.1|/Users/[a-z._-]+/|/home/[a-z._-]+/)' dist; then
  fail "localhost or local filesystem path in output"
  grep -rIEno '(localhost:[0-9]+|127\.0\.0\.1|/Users/[a-z._-]+/|/home/[a-z._-]+/)' dist | head -5
else
  pass "no local paths"
fi

echo "== contact"
grep -q 'mailto:' dist/index.html && pass "email CTA present" || fail "no email CTA"
grep -q 'wa.me' dist/index.html && pass "whatsapp CTA present" \
  || warn "whatsapp CTA missing — set contact.whatsapp in content/site.yaml"
grep -q 'chat_demo\|Ask my AI agent' dist/index.html && pass "chat demo linked" \
  || warn "chat demo not linked — set contact.chat_demo in content/site.yaml"

echo "== internal links"
broken=0
while read -r link; do
  [ -f "dist${link}index.html" ] || { fail "broken link: $link"; broken=1; }
done < <(grep -rhoE 'href="/work/[^"]*"' dist | sed 's/href="//; s/"//' | sort -u)
[ "$broken" -eq 0 ] && pass "all /work/ links resolve"

echo "== metrics coverage"
missing=$(grep -lE '^metrics: \[\]' content/work/*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$missing" -gt 0 ]; then
  warn "$missing case study(ies) have no metrics — fine to ship, stronger with numbers"
  grep -lE '^metrics: \[\]' content/work/*.md | sed 's/^/       /'
else
  pass "all case studies carry metrics"
fi

echo
if [ "$fails" -gt 0 ]; then
  printf '\033[31m%d check(s) failed — do not push.\033[0m\n' "$fails"
  exit 1
fi
printf '\033[32mPreflight clean.\033[0m Still do the NDA read-through before pushing.\n'
