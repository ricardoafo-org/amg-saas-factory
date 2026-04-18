#!/usr/bin/env bash
# Downloads PocketBase binary for the current platform and places it at ./pocketbase
set -euo pipefail

PB_VERSION="0.28.1"
DEST="./pocketbase"

if [[ -f "$DEST" ]]; then
  echo "PocketBase already present at $DEST — skipping download."
  echo "Run '$DEST --version' to check the version."
  exit 0
fi

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)
    case "$ARCH" in
      x86_64)  FILENAME="pocketbase_${PB_VERSION}_linux_amd64.zip" ;;
      aarch64) FILENAME="pocketbase_${PB_VERSION}_linux_arm64.zip" ;;
      *) echo "Unsupported arch: $ARCH" && exit 1 ;;
    esac
    ;;
  Darwin)
    case "$ARCH" in
      x86_64)  FILENAME="pocketbase_${PB_VERSION}_darwin_amd64.zip" ;;
      arm64)   FILENAME="pocketbase_${PB_VERSION}_darwin_arm64.zip" ;;
      *) echo "Unsupported arch: $ARCH" && exit 1 ;;
    esac
    ;;
  MINGW*|MSYS*|CYGWIN*)
    FILENAME="pocketbase_${PB_VERSION}_windows_amd64.zip"
    DEST="./pocketbase.exe"
    ;;
  *) echo "Unsupported OS: $OS" && exit 1 ;;
esac

URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${FILENAME}"
TMP="$(mktemp -d)"

echo "Downloading PocketBase v${PB_VERSION}..."
curl -fsSL "$URL" -o "$TMP/pb.zip"

# Extract using Python (guaranteed available since Node.js ecosystem requires it on Windows)
PY="$(command -v python3 2>/dev/null || command -v python 2>/dev/null || echo '')"
if [[ -n "$PY" ]]; then
  "$PY" -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$TMP/pb.zip" "$TMP"
elif command -v unzip &>/dev/null; then
  unzip -q "$TMP/pb.zip" -d "$TMP"
else
  echo "ERROR: Python not found. Install Python 3 and retry." && exit 1
fi

if [[ "$OS" == MINGW* ]] || [[ "$OS" == MSYS* ]] || [[ "$OS" == CYGWIN* ]]; then
  cp "$TMP/pocketbase.exe" "$DEST"
else
  mv "$TMP/pocketbase" "$DEST"
  chmod +x "$DEST"
fi

rm -rf "$TMP"

echo ""
echo "PocketBase downloaded to $DEST"
echo ""
echo "Next steps:"
echo "  1. Start PocketBase:  $DEST serve"
echo "  2. Open admin UI:     http://127.0.0.1:8090/_/"
echo "  3. Create admin account, then fill .env:"
echo "       POCKETBASE_ADMIN_EMAIL=your@email.com"
echo "       POCKETBASE_ADMIN_PASSWORD=yourpassword"
