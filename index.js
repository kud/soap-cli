#!/usr/bin/env node
import inquirer from "inquirer"
import signale from "signale"
import { deleteAsync } from "del"
import chalk from "chalk"

import {
  appNameFromPath,
  getBundleIdentifier,
  findAppFiles,
} from "./lib/index.js"

const [appPath] = process.argv.slice(2)

console.log(
  `Welcome to ${chalk.bold("soap")} 🧼, ${chalk.italic("the app cleaner")}.\n`,
)

try {
  const appName = appNameFromPath(appPath)
  const bundleId = await getBundleIdentifier(appName)
  const appFiles = await findAppFiles(appName, bundleId)

  signale.info(
    `You want me to clean this application: ${chalk.bold(appName)} 📦.`,
  )

  signale.info(
    `I also assume you gave me an application path. ${chalk.bold(
      "No homebrew cask will be deleted then",
    )}.`,
  )

  console.log("")

  const { deletedFilesWish, isConfirmed } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "deletedFilesWish",
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
      name: "isConfirmed",
      message: "Are you sure?",
      default: false,
    },
  ])

  if (!isConfirmed) {
    console.log("")

    signale.info(`Okay, mission aborded.`)

    process.exit()
  }

  const deletedPaths = await deleteAsync(deletedFilesWish, { force: true })

  console.log("")

  console.log("Files deleted:")
  deletedPaths.forEach((deletedPath) => console.log(`· ${deletedPath}`))

  console.log("")

  signale.success("Operation successful.")
} catch (error) {
  signale.error(`Something wrong appeared. Check the log below.\n`)
  console.error(error)
}
