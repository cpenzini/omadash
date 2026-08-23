# Omadash — native Linux

Keyboard-first mail and calendar for [Omarchy](https://omarchy.org). This folder is the Flutter app. It compiles to a GTK binary — no Electron, no browser chrome. Theme follows `~/.local/state/omarchy/current/theme/colors.toml`.

Version **0.2.0**. The inbox in the Grok preview is this same UI; live IMAP only runs here.

## Compile on Omarchy

```bash
# 1. Flutter toolchain
sudo pacman -S --needed clang cmake ninja pkgconf gtk3 xz gcc glu libsecret
mise plugin add flutter   # once
mise use -g flutter@latest

# 2. Create the Linux runner and strip the GTK title bar
git clone https://github.com/cpenzini/omadash.git
cd omadash/native
chmod +x tool/bootstrap.sh
./tool/bootstrap.sh

# 3. Build
flutter build linux --release
```

Binary:

```
build/linux/x64/release/bundle/omadash
```

Copy the whole `bundle/` directory (it has `lib/` next to the binary). Then bind it:

```
bindd = SUPER, M, Omadash, exec, /home/YOU/omadash/native/build/linux/x64/release/bundle/omadash
```

`bootstrap.sh` also writes `~/.local/share/applications/omadash.desktop` if you pass `--install`.

## Mail

The first launch is Alex Rivera’s demo mailbox (`alex@omarchy.dev`) so the keys work offline.

Connect a real box from the sidebar (or `G` then `P`). Gmail, Fastmail, iCloud, and generic IMAP. Use an [app password](https://myaccount.google.com/apppasswords), not your account password. Credentials stay on the machine (`flutter_secure_storage` / libsecret). Sync and send go through `enough_mail`.

## Keys

| Key | Action |
| --- | --- |
| `J` / `K` | Next / previous thread |
| `Enter` / `O` | Open thread |
| `E` | Done (archive) |
| `#` | Trash |
| `C` | Compose |
| `R` / `Shift+R` | Reply / reply all |
| `S` | Star |
| `U` | Undo |
| `Z` | Toggle unread |
| `Ctrl+K` / `/` | Command palette |
| `Ctrl+Enter` | Send |
| `G` then `I` / `S` / `T` / `E` / `#` | Inbox / Starred / Sent / Done / Trash |
| `G` then `C` / `3` | Calendar |
| `G` then `P` | Connect mailbox |
| `?` | Keyboard reference |
| `Esc` | Close overlay / back |

## Layout

`OmarchyScaffold` + `OmarchySplitPanel`. Sidebar hides under 500px (Hyprland scratchpad / phone-width). Status bar shows folder, unread count, and last IMAP error.

## Why Flutter, not the web app

The original Omadash is a TanStack Start client. Browsers cannot speak IMAP (CORS, no raw sockets). On Omarchy the right shape is a native GTK window that reads your theme and talks to the mail server directly.
