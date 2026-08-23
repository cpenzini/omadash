#!/usr/bin/env bash
# Install a compiled Omadash bundle into ~/.local (or $OMADASH_PREFIX).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PREFIX="${OMADASH_PREFIX:-$HOME/.local}"
LIBDIR="$PREFIX/lib/omadash"
BINDIR="$PREFIX/bin"
APPDIR="$PREFIX/share/applications"

if [[ ! -x "$HERE/omadash" ]]; then
  echo "Run this from the extracted release folder (omadash binary not found next to install.sh)." >&2
  exit 1
fi

rm -rf "$LIBDIR"
mkdir -p "$LIBDIR" "$BINDIR" "$APPDIR"

for item in "$HERE"/* "$HERE"/.[!.]*; do
  [[ -e "$item" ]] || continue
  name="$(basename "$item")"
  case "$name" in
    install.sh | README.txt | LICENSE) continue ;;
  esac
  cp -a "$item" "$LIBDIR/"
done

chmod +x "$LIBDIR/omadash"
ln -sfn "$LIBDIR/omadash" "$BINDIR/omadash"

cat > "$APPDIR/omadash.desktop" <<EOF
[Desktop Entry]
Name=Omadash
Comment=Mail on the home row
Exec=$LIBDIR/omadash
Icon=mail-app
Terminal=false
Type=Application
Categories=Network;Email;Office;
StartupNotify=true
StartupWMClass=omadash
EOF

echo "Installed Omadash to $LIBDIR"
echo "Launcher: $BINDIR/omadash"
echo
echo "Bind in Hyprland:"
echo "  bindd = SUPER, M, Omadash, exec, omadash"
