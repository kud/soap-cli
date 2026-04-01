import inquirer from "inquirer"
import signale from "signale"
import trash from "trash"
import chalk from "chalk"
import { $, spinner } from "zx"

import {
  appNameFromPath,
  getCaskInfo,
  getBundleIdentifier,
  findAppFiles,
} from "./lib/index"

$.verbose = process.env.SOAP_DEBUG === "1"

declare const __SOAP_VERSION__: string

const rawArgs = process.argv.slice(2)
const firstArg = rawArgs[0]
const param = rawArgs.find((a) => !a.startsWith("-"))
const yes = rawArgs.includes("--yes") || rawArgs.includes("-y")

if (firstArg === "--version" || firstArg === "-v") {
  console.log(__SOAP_VERSION__)
  process.exit(0)
}

if (!firstArg || firstArg === "--help" || firstArg === "-h") {
  if (firstArg === "--help" || firstArg === "-h") {
    console.log(`
  ${chalk.bold("soap")} 🧼  ${chalk.italic("the app cleaner")}

  ${chalk.bold("Usage:")}
    soap ${chalk.cyan("<cask-name>")} | ${chalk.cyan("<path-to-app>")}

  ${chalk.bold("Examples:")}
    soap ${chalk.green("spotify")}               Uninstall Spotify (cask) + all its leftover files
    soap ${chalk.green("android-studio")}        Uninstall Android Studio (cask)
    soap ${chalk.green("/Applications/Slack.app")}
                               Uninstall Slack by path (no brew step)
    soap ${chalk.green("spotify")} ${chalk.cyan("--yes")}            Non-interactive: move all files + run brew uninstall

  ${chalk.bold("What it removes:")}
    ${chalk.dim("·")} The .app bundle ${chalk.dim("(via brew uninstall --zap or manual selection)")}
    ${chalk.dim("·")} Preferences  ${chalk.dim("~/Library/Preferences/com.<vendor>.<app>.plist")}
    ${chalk.dim("·")} Caches       ${chalk.dim("~/Library/Caches/com.<vendor>.<app>")}
    ${chalk.dim("·")} App support  ${chalk.dim("~/Library/Application Support/<App>")}
    ${chalk.dim("·")} Containers   ${chalk.dim("~/Library/Containers/com.<vendor>.<app>")}
    ${chalk.dim("·")} Launch agents, logs, crash reports, DMG files, and more

  ${chalk.bold("Flags:")}
    ${chalk.cyan("--yes")}, ${chalk.cyan("-y")}                  Skip all prompts (auto-select all files, auto-confirm brew uninstall)

  ${chalk.bold("Environment:")}
    ${chalk.yellow("SOAP_DEBUG=1")}               Enable verbose shell output
    `)
    process.exit(0)
  }
  console.error(
    chalk.red("No parameter specified. Run `soap --help` for usage."),
  )
  process.exit(1)
}

if (!param) {
  console.error(
    chalk.red(`Unknown option: ${firstArg}. Run \`soap --help\` for usage.`),
  )
  process.exit(1)
}

const isCask = !param.includes(".app")

if (!yes)
  console.log(
    `\nWelcome to ${chalk.bold("soap")} 🧼, ${chalk.italic("the app cleaner")}.\n`,
  )

try {
  const { appName, zapFiles } = isCask
    ? await spinner(chalk.dim("Fetching cask info…"), () => getCaskInfo(param))
    : { appName: appNameFromPath(param), zapFiles: [] }

  if (!appName) {
    if (isCask) {
      signale.warn(
        `Could not determine app name for "${param}", falling back to brew uninstall.`,
      )
      await $`brew uninstall --zap ${param}`
      process.exit(0)
    }
    signale.error(`Could not determine app name for "${param}".`)
    process.exit(1)
  }

  const bundleId = await getBundleIdentifier(appName)

  const scannedFiles = await spinner(chalk.dim("Scanning for files…"), () =>
    findAppFiles(appName, bundleId),
  )

  const appFiles = [
    ...new Set([
      ...(isCask ? scannedFiles.slice(1) : scannedFiles),
      ...zapFiles,
    ]),
  ]
  const isAppFilesEmpty = appFiles.length === 0

  signale.info(`Cleaning: ${chalk.bold(appName)}`)
  signale.info(
    isCask
      ? `Mode: ${chalk.bold("cask")} (${param})`
      : `Mode: ${chalk.bold("path")} — no Homebrew uninstall will run`,
  )

  console.log("")

  const { deletedFilesWish, deletedCaskWish } = yes
    ? { deletedFilesWish: appFiles, deletedCaskWish: isCask }
    : await inquirer.prompt<{
        deletedFilesWish?: string[]
        deletedCaskWish?: boolean
      }>([
        {
          type: "checkbox",
          name: "deletedFilesWish",
          when: !isAppFilesEmpty,
          message: `Found ${chalk.bold(appFiles.length)} files. Select what to move to Trash:`,
          choices: appFiles.map((appFile) => ({
            name: appFile,
            value: appFile,
            checked: true,
          })),
        },
        {
          type: "confirm",
          when: isCask,
          name: "deletedCaskWish",
          message: `Run ${chalk.bold(`brew uninstall --zap ${param}`)}?`,
          default: true,
        },
      ])

  if (!isAppFilesEmpty && deletedFilesWish && deletedFilesWish.length > 0) {
    const skipped: string[] = []
    const moved: string[] = []

    for (const file of deletedFilesWish) {
      try {
        await trash(file)
        moved.push(file)
      } catch {
        skipped.push(file)
      }
    }

    console.log("")

    if (moved.length > 0) {
      signale.success(`Moved ${chalk.bold(moved.length)} file(s) to Trash:`)
      moved.forEach((p) => console.log(`  ${chalk.dim("·")} ${chalk.dim(p)}`))
    }

    if (skipped.length > 0) {
      console.log("")
      signale.warn(
        `Skipped ${chalk.bold(skipped.length)} file(s) — no permission (may require sudo):`,
      )
      skipped.forEach((p) => console.log(`  ${chalk.dim("·")} ${chalk.dim(p)}`))
    }
  } else if (!isAppFilesEmpty) {
    signale.info("No files selected — nothing moved to Trash.")
  }

  if (isCask && deletedCaskWish) {
    console.log("")
    signale.pending("Running Homebrew uninstall…")
    await $`brew uninstall --zap ${param}`
  }

  console.log("")
  signale.success("Done.")
} catch (error: unknown) {
  console.log("")
  signale.error(
    error instanceof Error ? error.message : "An unexpected error occurred.",
  )

  if (process.env.SOAP_DEBUG === "1") {
    console.error(error)
  }

  if (isCask) {
    const { forceUninstall } = await inquirer.prompt([
      {
        type: "confirm",
        name: "forceUninstall",
        message: `The app may already be removed but the cask is still registered.\nForce-run ${chalk.bold(`brew uninstall --zap --force ${param}`)}?`,
        default: false,
      },
    ])

    if (forceUninstall) {
      console.log("")
      signale.pending("Force-uninstalling cask…")
      await $`brew uninstall --zap --force ${param}`
      signale.success("Force uninstall complete.")
    }
  }
}
