#!/usr/bin/env bash
# Create the Linux/macOS/Windows runner, strip the GTK title bar, optionally install.
set -euo pipefail
cd "$(dirname "$0")/.."

INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --install) INSTALL=1 ;;
  esac
done

if ! command -v flutter >/dev/null 2>&1; then
  cat <<'EOF'
Flutter SDK not found. On Omarchy:

  sudo pacman -S --needed clang cmake ninja pkgconf gtk3 xz gcc glu libsecret
  mise plugin add flutter
  mise use -g flutter@latest

Then re-run ./tool/bootstrap.sh
EOF
  exit 1
fi

echo "→ flutter create (linux, macos, windows)"
flutter create --platforms=linux,macos,windows --org dev.omarchy --project-name omadash --no-overwrite .

APP_CC=linux/runner/my_application.cc
if [[ -f "$APP_CC" ]]; then
  echo "→ strip GTK header bar"
  python3 - "$APP_CC" <<'PY'
import pathlib, re, sys
p = pathlib.Path(sys.argv[1])
c = p.read_text()
c = c.replace("use_header_bar = TRUE", "use_header_bar = FALSE")
if "first-frame" not in c:
    c = c.replace(
        "static void my_application_activate(GApplication* application) {",
        "// Show the window only after the first Flutter frame (no black flash).\n"
        "static void first_frame_cb(MyApplication* self, FlView* view) {\n"
        "  gtk_widget_show(gtk_widget_get_toplevel(GTK_WIDGET(view)));\n"
        "}\n\n"
        "static void my_application_activate(GApplication* application) {",
    )
    c = re.sub(
        r"gtk_window_set_default_size\(window, \d+, \d+\);\s*\n\s*gtk_widget_show\(GTK_WIDGET\(window\)\);",
        "gtk_window_set_default_size(window, 1280, 720);",
        c,
        count=1,
    )
    c = c.replace(
        "fl_register_plugins(FL_PLUGIN_REGISTRY(view));",
        'g_signal_connect_swapped(view, "first-frame",\n'
        "                           G_CALLBACK(first_frame_cb), self);\n"
        "  gtk_widget_realize(GTK_WIDGET(view));\n\n"
        "  fl_register_plugins(FL_PLUGIN_REGISTRY(view));",
        1,
    )
p.write_text(c)
print(f"patched {p}")
PY
fi

echo "→ flutter pub get"
flutter pub get

if [[ "$INSTALL" -eq 1 ]]; then
  echo "→ flutter build linux --release"
  flutter build linux --release
  BUNDLE="$(pwd)/build/linux/x64/release/bundle"
  BIN="$HOME/.local/bin"
  APP="$HOME/.local/share/applications"
  mkdir -p "$BIN" "$APP"
  cat > "$APP/omadash.desktop" <<EOF
[Desktop Entry]
Name=Omadash
Comment=Mail on the home row
Exec=$BUNDLE/omadash
Icon=mail-app
Terminal=false
Type=Application
Categories=Network;Email;Office;
StartupNotify=true
EOF
  ln -sfn "$BUNDLE/omadash" "$BIN/omadash"
  echo
  echo "Installed launcher. Bind in Hyprland:"
  echo "  bindd = SUPER, M, Omadash, exec, omadash"
fi

echo
echo "Done. Build with:"
echo "  flutter build linux --release"
echo "Binary:"
echo "  build/linux/x64/release/bundle/omadash"
