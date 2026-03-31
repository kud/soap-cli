# soap 🧼

> _"I was so lazy to use any GUI to clean my macOS."_ — @kud

A macOS CLI that removes an app **and all its leftover files** — preferences, caches, containers, launch agents, and more.

Inspired by [AppCleaner](https://freemacsoft.net/appcleaner/) and [App Eraser](https://github.com/davunt/app-eraser), but open-source and terminal-native.

---

## Install

```sh
npm install -g @kud/soap-cli
```

Or via Homebrew:

```sh
brew install kud/tap/soap-cli
```

---

## Usage

```
soap <cask-name>        Clean an app installed via Homebrew cask
soap <path-to-app>      Clean a manually installed app
soap --help             Show this help
```

**Examples:**

```sh
soap spotify
soap android-studio
soap '/Applications/Android Studio.app'
```

---

## What it does

### Cask mode — `soap spotify`

1. Resolves the `.app` name from `brew info`
2. Scans ~40 macOS directories for files matching the app name or bundle identifier
3. Fetches the cask's [zap stanza](https://docs.brew.sh/Cask-Cookbook#stanza-zap) — the maintainer-curated list of known leftover files
4. Presents a checkbox list of everything found (all pre-selected)
5. Moves selected files to **Trash** (recoverable from `~/.Trash`)
6. Optionally runs `brew uninstall --zap` to unregister the cask from Homebrew

### Path mode — `soap '/Applications/Spotify.app'`

Same as above, but skips the Homebrew step. Use this for apps installed manually from a DMG.

---

## Example output

```
Welcome to soap 🧼, the app cleaner.

⠋ Fetching cask info…
⠋ Scanning for files…

ℹ Cleaning: Spotify
ℹ Mode: cask (spotify)

? Found 11 files. Select what to move to Trash:
 ◉ /Users/kud/Library/Application Support/Spotify
 ◉ /Users/kud/Library/Caches/com.spotify.client
 ◉ /Users/kud/Library/Preferences/com.spotify.client.plist
 ◉ /Users/kud/Library/Saved Application State/com.spotify.client.savedState
 ◉ /Users/kud/Library/Logs/Spotify
 ◉ ...

? Run `brew uninstall --zap spotify`? Yes

✔ Moved 11 file(s) to Trash.

◼ Running Homebrew uninstall…
✔ Done.
```

---

## Locations scanned

`soap` scans these directories, plus `<vendor>/` subdirectories derived from the bundle ID:

| Location                            | What's typically there          |
| ----------------------------------- | ------------------------------- |
| `/Applications`                     | The app bundle                  |
| `~/Library/Application Support`     | App data                        |
| `~/Library/Caches`                  | Cached data                     |
| `~/Library/Containers`              | Sandboxed app data              |
| `~/Library/Preferences`             | `.plist` config files           |
| `~/Library/Logs`                    | App logs                        |
| `~/Library/LaunchAgents`            | Per-user background services    |
| `/Library/LaunchDaemons`            | System-wide background services |
| `~/Library/HTTPStorages`            | HTTP caches                     |
| `~/Library/Group Containers`        | Shared app-group data           |
| `~/Library/Saved Application State` | Window state (`.savedState`)    |
| `~/Library/WebKit`                  | WebKit storage                  |
| `/private/var/db/receipts`          | Package receipts                |
| `/Library/Logs/DiagnosticReports`   | Crash reports                   |
| `/Library/Audio/Plug-Ins/HAL`       | Audio drivers                   |
| `~/Downloads`                       | Leftover `.dmg` files           |

---

## Debug mode

```sh
SOAP_DEBUG=1 soap spotify
```

Enables verbose shell output — shows every subprocess command that runs.

---

## Safety

- Files are **moved to Trash**, not permanently deleted.
- You get a full checkbox list before anything is removed — deselect anything you want to keep.
- The Homebrew uninstall is a separate confirmation step.
- The force-uninstall fallback (for already-removed apps still registered in Homebrew) defaults to **No**.

---

## Credits

Inspired by [App Eraser](https://github.com/davunt/app-eraser) and [AppCleaner](https://freemacsoft.net/appcleaner/).
