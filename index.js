#!/usr/bin/env node
import inquirer from "inquirer"
import signale from "signale"
import trash from "trash"
import chalk from "chalk"
import { $ } from "zx/core"

import {
  appNameFromPath,
  appNameFromCaskName,
  getBundleIdentifier,
  findAppFiles,
} from "./lib/index.js"

$.verbose = false // true for debugging

const [param] = process.argv.slice(2)

if (!param) {
  console.error(`No parameter specified.`)

  process.exit(0)
}

const isCask = !param.includes(".app")

console.log(
  `Welcome to ${chalk.bold("soap")} 🧼, ${chalk.italic("the app cleaner")}.\n`,
)

try {
  const appName = isCask
    ? await appNameFromCaskName(param)
    : appNameFromPath(param)

  const bundleId = await getBundleIdentifier(appName)
  const _appFiles = await findAppFiles(appName, bundleId)
  const appFiles = isCask ? _appFiles.slice(1) : _appFiles
  const isAppFilesEmpty = appFiles.length === 0

  signale.info(
    `You want me to clean this application: ${chalk.bold(appName)} 📦.`,
  )

  signale.info(
    isCask
      ? `I also assume ${chalk.bold("you gave me a cask name")}.`
      : `I also assume you gave me an application path. ${chalk.bold(
          "No homebrew cask will be deleted then",
        )}.`,
  )

  console.log("")

  const { deletedFilesWish } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "deletedFilesWish",
      when: !isAppFilesEmpty,
      message:
        "This is what I've found about it. Please select the files you want to delete.",
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
      message: `Do you want to uninstall "${param}" via homebrew?`,
    },
  ])

  if (!isAppFilesEmpty) {
    await trash(deletedFilesWish, { force: true })

    console.log("")

    console.log("Files deleted:")
    deletedFilesWish.forEach((deletedPath) => console.log(`· ${deletedPath}`))
  }

  if (isCask) {
    console.log("")

    signale.pending(`Starting cask uninstallation.`)

    await $`brew uninstall ${param}`
  }

  console.log("")

  signale.success("Operation successful.")
} catch (error) {
  signale.error(`Something wrong appeared. Check the log below.\n`)
  console.error(error)
  console.error("")

  if (isCask) {
    inquirer
      .prompt([
        {
          type: "confirm",
          name: "forceUninstall",
          message:
            "An error occurred. It could happen when the app file no longer exists, but the cask is still present in Homebrew.\nWould you like to forcefully uninstall the cask by running `brew uninstall`?",
        },
      ])
      .then(async (answers) => {
        if (answers.forceUninstall) {
          console.error("")
          signale.pending(`Forcefully uninstalling cask.`)
          await $`brew uninstall --force ${param}`
          signale.success("Force uninstallation successful.")
        }
      })
  }
}
