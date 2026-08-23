#!/usr/bin/env bash
# Stage the Flutter Linux bundle as omadash-<version>-linux-x64.tar.gz
set -euo pipefail
NATIVE="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$NATIVE/.." && pwd)"
VERSION="$(awk '/^version:/ { print $2 }' "$NATIVE/pubspec.yaml" | cut -d+ -f1)"
BUNDLE="$NATIVE/build/linux/x64/release/bundle"
NAME="omadash-${VERSION}-linux-x64"
STAGE="$ROOT/dist/$NAME"
OUT="$ROOT/dist/${NAME}.tar.gz"

if [[ ! -x "$BUNDLE/omadash" ]]; then
  echo "Build first: flutter build linux --release --no-tree-shake-icons" >&2
  echo "Expected $BUNDLE/omadash" >&2
  exit 1
fi

rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -a "$BUNDLE"/. "$STAGE/"
install -m 0755 "$NATIVE/packaging/install.sh" "$STAGE/install.sh"
if [[ -f "$ROOT/LICENSE" ]]; then
  cp "$ROOT/LICENSE" "$STAGE/LICENSE"
fi
cat > "$STAGE/README.txt" <<EOF
Omadash ${VERSION}

Keyboard-first mail for Omarchy. This folder is the compiled GTK app.

  ./install.sh

That copies the bundle to ~/.local/lib/omadash and puts omadash on your PATH.

  bindd = SUPER, M, Omadash, exec, omadash

Do not move the omadash binary without its lib/ and data/ directories.
Source and docs: https://github.com/cpenzini/omadash
EOF

tar -C "$ROOT/dist" -czf "$OUT" "$NAME"
rm -rf "$STAGE"
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$ROOT/dist" && sha256sum "${NAME}.tar.gz" > "${NAME}.tar.gz.sha256")
elif command -v shasum >/dev/null 2>&1; then
  (cd "$ROOT/dist" && shasum -a 256 "${NAME}.tar.gz" > "${NAME}.tar.gz.sha256")
fi

echo "Wrote $OUT"
ls -lh "$OUT" "$OUT.sha256" 2>/dev/null || true
