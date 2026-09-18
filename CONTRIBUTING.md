# Contributing to Omadash

Welcome! Omadash is a native C++20 / Qt6 Gmail and Google Calendar client for Omarchy. This is an early contributor preview. Start with fictional sample mail; a Google account is not required to build, explore, or run tests.

## Choose a contribution

- **Testers:** follow the [testing guide](docs/community/TESTING.md) and report reproducible problems.
- **Developers:** browse [good first issues](https://github.com/cpenzini/omadash/labels/good%20first%20issue) or [help wanted](https://github.com/cpenzini/omadash/labels/help%20wanted). Comment on an issue before substantial work so efforts do not overlap.
- **Design and documentation:** describe a concrete workflow improvement, attach fictional examples, or improve setup instructions.
- **Ideas and questions:** use [Discussions](https://github.com/cpenzini/omadash/discussions). Use Issues for actionable bugs or agreed work.

The [roadmap](docs/ROADMAP.md) is the short version; the [PRD](docs/PRD-v0.1.md) defines the target experience. Community feedback guides development; final product acceptance remains with the product owner.

## Build and run

Install a C++20 compiler, CMake 3.21+, and Qt 6.6+ with Widgets, Network, SQL/SQLite, Test, WebEngineWidgets, and PdfWidgets. Remembering Google accounts also requires `secret-tool` and a Secret Service keyring. See the [README](README.md) for supported build assumptions.

```sh
git clone https://github.com/cpenzini/omadash.git
cd omadash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j 4
bash "Open Omadash Native.sh"
```

For your own pull request, fork the repository and create a descriptive branch. Run tests without real accounts:

```sh
GSETTINGS_BACKEND=memory QTWEBENGINE_CHROMIUM_FLAGS=--disable-gpu \
  ctest --test-dir build --output-on-failure
```

Tests set `OMADASH_TEST_MODE=1` and use offscreen Qt fixtures. Do not disable the Chromium sandbox. These tests do not prove live sending works. Google connection is optional and requires [your own Desktop OAuth client](GOOGLE-SETUP.md).

## Code map

| Area | Files |
| --- | --- |
| Inbox, navigation, shortcuts, compose UI | `src/window.cpp`, `src/window.h` |
| Account restoration, live drafts, Gmail actions | `src/window_daily.cpp` |
| OAuth, Google transport, mail normalization | `src/google.cpp` |
| HTML rendering and remote resource policy | `src/emailview.cpp` |
| MIME generation and attachments | `src/mime.cpp`, `src/attachments.cpp` |
| SQLite cache and background sync | `src/localcache.cpp`, `src/mailsync.cpp` |
| Triage and undo | `src/gmailactions.cpp` |
| Sample data and core mail rules | `src/mailstore.cpp`, `src/sample.json` |
| Regression tests | `tests/test_native.cpp`, `tests/test_daily.cpp` |

Some existing implementation is densely formatted. Keep new code readable, and keep unrelated formatting changes out of functional patches.

## Pull requests

Explain the problem, expected behavior, and verification. Include before/after screenshots for visible changes, using fictional data. Add focused regressions for behavioral bugs; documentation-only changes need link checks, not an app rebuild. Keep changes scoped to one problem. Mention any limits or untested live behavior.

AI-assisted contributions are welcome. Contributors must understand the submitted change, review generated code, and verify it. Do not include transcripts containing private data.

## Data and safety

Never upload OAuth JSON, access/refresh tokens, `.state/`, cached mail, real attachments, or unredacted personal messages. Use synthetic HTML reproductions for rendering bugs. Do not send real mail in automated tests. Changes to OAuth, HTML resource access, credential storage, synchronization, or sending require careful review. Sending must never silently retry after an uncertain result.

Be constructive and respectful. Credit others' work. Source contributions are under the repository's MIT license; third-party reference material retains its original ownership.
