#!/bin/bash
set -e

# Fine Print - Packaging Script
# Stamps git commit SHA, generates file hashes, and creates distributable zip

REPO_URL="https://github.com/CEA-Brad/fine-print"
COMMIT=$(git rev-parse HEAD)
SHORT_COMMIT=$(git rev-parse --short HEAD)
VERSION=$(grep '"version"' manifest.json | sed 's/.*: *"\(.*\)".*/\1/')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "Packaging Fine Print v${VERSION} (${SHORT_COMMIT})"

# Generate file hashes for all source files
echo "Generating file hashes..."
HASHES="{"
FIRST=true
for f in manifest.json src/*.js src/*.css src/*.html; do
  HASH=$(shasum -a 256 "$f" | cut -d' ' -f1)
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    HASHES="$HASHES,"
  fi
  HASHES="$HASHES
    \"$f\": \"$HASH\""
done
HASHES="$HASHES
  }"

# Write build info file
cat > src/build-info.json << BUILDEOF
{
  "commit": "${COMMIT}",
  "commitShort": "${SHORT_COMMIT}",
  "version": "${VERSION}",
  "builtAt": "${TIMESTAMP}",
  "repoUrl": "${REPO_URL}",
  "fileHashes": ${HASHES}
}
BUILDEOF

echo "Build info written to src/build-info.json"

# Create zip (exclude git files and dev files)
ZIP_NAME="fine-print-v${VERSION}-${SHORT_COMMIT}.zip"
rm -f "$ZIP_NAME"
zip -r "$ZIP_NAME" \
  manifest.json \
  src/ \
  icons/ \
  LICENSE \
  -x "*.DS_Store"

echo ""
echo "Package created: ${ZIP_NAME}"
echo "Commit: ${COMMIT}"
echo "Upload this zip to the Chrome Web Store."
