#!/usr/bin/env node
import { $ } from "zx"
$.verbose = false // enable it to debug

import inquirer from "inquirer"
import signale from "signale"
import { deleteAsync } from "del"

import {
  appNameFromPath,
  getBundleIdentifier,
  findAppFiles,
} from "./lib/index.js"

const [appPath] = process.argv.slice(2)

console.log("Welcome to soap 🧼, the app cleaner.")

console.log("")

const appName = appNameFromPath(appPath)
const bundleId = await getBundleIdentifier(appName)
const appFiles = await findAppFiles(appName, bundleId)

signale.info(
  `You want me to clean the application "${appName}". This is what I've found.`,
)

console.log("")

const { deletedFilesWish, isConfirmed } = await inquirer.prompt([
  {
    type: "checkbox",
    name: "deletedFilesWish",
    message: "Select the files you want to delete",
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

console.log("")

if (!isConfirmed) {
  signale.info(`Okay, mission aborded.`)

  process.exit()
}

const deletedPaths = await deleteAsync(deletedFilesWish, { force: true })

console.log("Files deleted:")
deletedPaths.forEach((deletedPath) => console.log(`· ${deletedPath}`))

console.log("")

signale.success("Operation successful.")
