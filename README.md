<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![npm](https://img.shields.io/npm/v/%40kud%2Fsoap-cli?style=flat-square&color=CB3837)
![MIT](https://img.shields.io/badge/licence-MIT-22C55E?style=flat-square)

**An app cleaner CLI for macOS**

<a href="https://kud.io/projects/soap-cli">Website</a> · <a href="https://kud.io/projects/soap-cli/docs">Documentation</a>

</div>

## Features

- **Homebrew-aware uninstall** — pass a cask name and soap runs `brew uninstall --zap` for a clean removal
- **Deep file scan** — discovers leftover preferences, caches, app support folders, containers, launch agents, logs, crash reports, and DMG files by bundle identifier
- **Interactive selection** — presents a checkbox list of found files so you pick exactly what goes to Trash
- **Non-interactive mode** — `--yes` flag skips all prompts for scripting and automation; `--yes-dangerously` also auto-confirms `sudo rm` for root-owned files
- **Path mode** — pass `/Applications/Slack.app` directly to clean by path without a Homebrew step
- **Zap strategy** — merges Homebrew's own zap file list with the bundle-id scan for thorough coverage

## Install

```sh
npm install -g @kud/soap-cli
```

## Usage

```console
$ soap --help

  soap 🧼  the app cleaner

  Usage:
    soap <cask-name> | <path-to-app>

  Examples:
    soap spotify               Uninstall Spotify (cask) + all its leftover files
    soap android-studio        Uninstall Android Studio (cask)
    soap /Applications/Slack.app
                               Uninstall Slack by path (no brew step)
    soap spotify --yes         Non-interactive: move all files + run brew uninstall

  What it removes:
    · The .app bundle (via brew uninstall --zap or manual selection)
    · Preferences  ~/Library/Preferences/com.<vendor>.<app>.plist
    · Caches       ~/Library/Caches/com.<vendor>.<app>
    · App support  ~/Library/Application Support/<App>
    · Containers   ~/Library/Containers/com.<vendor>.<app>
    · Launch agents, logs, crash reports, DMG files, and more

  Flags:
    --yes, -y                  Skip all prompts (auto-select all files, auto-confirm brew uninstall)
    --yes-dangerously           Like --yes, but also auto-confirms sudo rm for root-owned files

  Environment:
    SOAP_DEBUG=1               Enable verbose shell output
```

## Development

```sh
git clone https://github.com/kud/soap-cli.git
cd soap-cli
npm install
npm run dev        # run from source via tsx
npm run build      # compile to dist/
npm run typecheck  # type-check without emitting
npm test           # vitest unit tests
```

📚 **Full documentation → [soap-cli/docs](https://kud.io/projects/soap-cli/docs)**
