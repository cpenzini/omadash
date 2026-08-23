# Omadash — native Linux

Keyboard-first mail and calendar for [Omarchy](https://omarchy.org). This folder is the Flutter app. It compiles to a GTK binary — no Electron, no browser chrome. Theme follows `~/.local/state/omarchy/current/theme/colors.toml`.

Version **0.2.0**. Users should [download the compiled tarball](https://github.com/cpenzini/omadash/releases/latest), not build this. The rest of this file is for people changing the code.

## Compile on Omarchy

```bash
sudo pacman -S --needed clang cmake ninja pkgconf gtk3 xz gcc glu libsecret
mise plugin add flutter   # once
mise use -g flutter@latest

git clone https://github.com/cpenzini/omadash.git
cd omadash/native
chmod +x tool/bootstrap.sh
./tool/bootstrap.sh
flutter test
flutter build linux --release
./tool/package.sh
```

`bootstrap.sh --install` also writes `~/.local/share/applications/omadash.desktop` pointing at the build bundle.

Binary:

```
build/linux/x64/release/bundle/omadash
```

Copy the whole `bundle/` directory (it has `lib/` next to the binary). CI does the same compile on every `v*` tag and attaches `omadash-*-linux-x64.tar.gz`.

```
bindd = SUPER, M, Omadash, exec, omadash
```

## Layout of this folder

| Path | Role |
| --- | --- |
| `lib/main.dart` | `Omarchy.initialize`, hydrate store, run app |
| `lib/src/app.dart` | `OmarchyApp` + inherited `MailStore` |
| `lib/src/store.dart` | Threads, folders, compose, undo, sync |
| `lib/src/imap.dart` | Presets, libsecret, IMAP fetch/move/flags, SMTP |
| `lib/src/keys.dart` | Superhuman map |
| `lib/src/widgets/shell.dart` | Split pane, overlays, command palette |
| `lib/src/seed.dart` | Demo mailbox + local calendar |
| `tool/bootstrap.sh` | `flutter create`, strip GTK header bar |
| `tool/package.sh` | Stage `dist/omadash-<ver>-linux-x64.tar.gz` |
| `packaging/install.sh` | Install a release folder to `~/.local` |
| `packaging/omadash.desktop` | Desktop entry template |
| `test/store_test.dart` | Archive, undo, star, split, compose, seed |

## Mail

First launch is Alex Rivera’s demo mailbox (`alex@omarchy.dev`) so the keys work offline.

Connect a real box from the sidebar (or `G` then `P`). Gmail, Fastmail, iCloud, and generic IMAP. Use an [app password](https://myaccount.google.com/apppasswords). Credentials stay on the machine (`flutter_secure_storage` / libsecret). Sync and send go through `enough_mail`.

## Keys

See [docs/KEYS.md](../docs/KEYS.md). Hit `?` in the app.

## Why Flutter, not the web app

The original Omadash is a TanStack Start client. Browsers cannot speak IMAP (CORS, no raw sockets). On Omarchy the right shape is a native GTK window that reads your theme and talks to the mail server directly.
