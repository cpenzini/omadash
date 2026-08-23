# Install Omadash

The product is the compiled Linux binary. Source is in the same repository if you want to change it.

## Requirements

- Omarchy, Arch, or another x86_64 Linux with GTK 3
- `libsecret` (GNOME Keyring, or whatever your session already runs)
- Network to your IMAP/SMTP host when you connect a real mailbox

## Download

Get `omadash-0.2.0-linux-x64.tar.gz` (and the `.sha256` next to it) from:

**[https://github.com/cpenzini/omadash/releases/latest](https://github.com/cpenzini/omadash/releases/latest)**

```bash
sha256sum -c omadash-0.2.0-linux-x64.tar.gz.sha256
tar -xzf omadash-0.2.0-linux-x64.tar.gz
cd omadash-0.2.0-linux-x64
./install.sh
```

`install.sh` copies the whole bundle to `~/.local/lib/omadash` (the binary needs `lib/` beside it), symlinks `~/.local/bin/omadash`, and writes `~/.local/share/applications/omadash.desktop`.

Override the prefix with `OMADASH_PREFIX=/opt ./install.sh` if you must.

## Bind Super + M

In Hyprland (`~/.config/hypr/bindings.conf` or wherever Omarchy keeps binds):

```
bindd = SUPER, M, Omadash, exec, omadash
```

`~/.local/bin` is on PATH on Omarchy. If `omadash` is not found, use the absolute path:

```
bindd = SUPER, M, Omadash, exec, /home/YOU/.local/lib/omadash/omadash
```

## First launch

1. A demo mailbox (`alex@omarchy.dev`) loads so `J` / `K` / `E` / `C` work without a network.
2. Hit `?` and learn the map. Ten seconds.
3. `G` then `P` — connect Gmail, Fastmail, iCloud, or generic IMAP.
4. Use an [app password](https://myaccount.google.com/apppasswords), not your real password.
5. Sync replaces the demo threads with yours. Password goes to libsecret; hosts and identity go to shared preferences.

Disconnect from the command palette (“Use local mailbox”) if you want the demo back. That forgets the saved password.

## Theme

Omadash reads `~/.local/state/omarchy/current/theme/colors.toml` through `flutter_omarchy`. Change the Omarchy theme; the client follows. No extra config.

## Uninstall

```bash
rm -rf ~/.local/lib/omadash
rm -f ~/.local/bin/omadash ~/.local/share/applications/omadash.desktop
```

Saved hosts live in the app’s shared preferences; the password is a libsecret item keyed `omadash.imap.pass`. Remove those if you want a clean slate.

## Build from source

You do not need this to use Omadash.

```bash
sudo pacman -S --needed clang cmake ninja pkgconf gtk3 xz gcc glu libsecret
mise plugin add flutter   # once
mise use -g flutter@latest

git clone https://github.com/cpenzini/omadash.git
cd omadash/native
chmod +x tool/bootstrap.sh
./tool/bootstrap.sh
flutter build linux --release
./tool/package.sh
```

Binary: `native/build/linux/x64/release/bundle/omadash`. Copy the whole `bundle/` directory. `./tool/bootstrap.sh --install` builds and writes a desktop entry that points at that bundle.

Architecture of the two runtimes: [ARCHITECTURE.md](ARCHITECTURE.md). Native internals: [../native/README.md](../native/README.md).
