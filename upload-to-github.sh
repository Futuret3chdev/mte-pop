#!/bin/bash
set -euo pipefail

OWNER="$1"
REPO="$2"
ROOT="$(cd "$(dirname "$0")" && pwd)"
GH="${GH_BIN:-$(cd "$(dirname "$0")" && pwd)/.tools/gh}"
TOKEN=$("$GH" auth token)

api() {
  curl -s -X "$1" \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com$2" \
    ${3:+-d "$3"}
}

# Create repo if missing
api POST "/user/repos" "{\"name\":\"$REPO\",\"description\":\"Toon Blast puzzle game\",\"private\":false}" >/dev/null 2>&1 || true

upload_file() {
  local filepath="$1"
  local repopath="$2"
  local content
  content=$(base64 < "$filepath" | tr -d '\n')
  local existing_sha
  existing_sha=$(api GET "/repos/$OWNER/$REPO/contents/$repopath" | grep -o '"sha": "[^"]*"' | head -1 | cut -d'"' -f4 || true)

  local payload
  if [ -n "$existing_sha" ]; then
    payload="{\"message\":\"Update $repopath\",\"content\":\"$content\",\"sha\":\"$existing_sha\"}"
  else
    payload="{\"message\":\"Add $repopath\",\"content\":\"$content\"}"
  fi
  api PUT "/repos/$OWNER/$REPO/contents/$repopath" "$payload" >/dev/null
  echo "  ✓ $repopath"
}

echo "Uploading files to $OWNER/$REPO..."
while IFS= read -r -d '' file; do
  relpath="${file#$ROOT/}"
  upload_file "$file" "$relpath"
done < <(find "$ROOT" -type f \
  ! -path '*/.git/*' \
  ! -path '*/.vercel/*' \
  ! -name '.DS_Store' \
  ! -name 'deploy.sh' \
  ! -name 'upload-to-github.sh' \
  -print0)

echo "Upload complete."