import { $ } from "zx"
$.verbose = false

import { execSync } from "child_process"
import fs from "fs/promises"
import { pathLocations, commonSuffix } from "./path-locations.js"
import { fileRegex } from "./file-regex.js"

const scoreThreshold = 0.4

let compNameGlob

function stripString(file) {
  let transformedString = file
  fileRegex.forEach((regex1) => {
    transformedString = transformedString.replace(regex1, "")
  })

  const normCompName = normalizeString(compNameGlob, "-")
    .replace(/\u2019/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "")

  transformedString = transformedString.replace(normCompName, "")

  return transformedString
}

const normalizeString = (str, spacer = "") =>
  str.toLowerCase().replace(/ /g, spacer)

async function getFilePatternArray(appName, bundleId) {
  const nameVariations = createNameVariations(appName, bundleId)
  const appNameNorm = normalizeString(appName)
  const bundleIdNorm = normalizeString(bundleId)

  let patternArray = [...nameVariations]

  const appNameComponents = appNameNorm.split(".")
  if (appNameComponents) patternArray.push(appNameComponents[0])

  const bundleIdComponents = bundleIdNorm.split(".")
  if (
    bundleIdComponents.length > 2 &&
    bundleIdComponents[bundleIdComponents.length - 1].toLowerCase() === "app"
  ) {
    patternArray.push(
      `${bundleIdComponents.slice(0, bundleIdComponents.length - 1).join(".")}`,
    )
  }

  const appWithSuffix = new Set([])
  commonSuffix.forEach((suffix) =>
    nameVariations.forEach((nameVariation) =>
      appWithSuffix.add(`${nameVariation}${suffix}`),
    ),
  )

  patternArray = [...patternArray, [...appWithSuffix]]

  return patternArray
}

function isPatternInFile(patterns, fileToCheck) {
  return patterns.find((filePatten) => {
    if (fileToCheck.includes(filePatten)) {
      const strippedFile = stripString(fileToCheck)

      let score = 0
      const indexOfString = strippedFile.indexOf(filePatten)
      for (let i = 0; i < strippedFile.length; i += 1) {
        if (i === indexOfString) {
          i += indexOfString + filePatten.length
          score += filePatten.length
        }
        if (strippedFile[parseInt(i, 10)] === ".") score += 0.5
        if (strippedFile[parseInt(i, 10)] === "_") score += 0.5
      }
      if (score / strippedFile.length > scoreThreshold) {
        return true
      }
      return false
    }
    return false
  })
}

function createNameVariations(appName, bundleId) {
  const appNameNorm = appName.toLowerCase().replace(" ", "")
  const appNameWithoutDot = appNameNorm.toLowerCase().replace(".", "")
  const appNameUnderscore = appName.toLowerCase().replace(" ", "_")
  const appNameDash = appName.toLowerCase().replace(" ", "-")
  const appNameDot = appName.toLowerCase().replace(" ", ".")

  const bundleIdNorm = bundleId.toLowerCase().replace(" ", "")

  return [
    appNameNorm,
    appNameWithoutDot,
    appNameUnderscore,
    appNameDash,
    appNameDot,
    bundleIdNorm,
  ]
}

function appNameFromPath(appPath) {
  const pathArr = appPath.split("/")
  const appNameWithExt = pathArr[pathArr.length - 1]
  // remove .app extension
  return appNameWithExt.replace(".app", "")
}

export const appNameFromCaskName = async (caskName) => {
  try {
    const { stdout: info } = await $`brew info ${caskName} --json=v2`
    const caskData = JSON.parse(info).casks?.[0]

    if (!caskData) {
      throw new Error("Cask data not available.")
    }

    for (const artifact of caskData.artifacts) {
      if (artifact.app) {
        return artifact.app[0]
      }
    }

    return null
  } catch (error) {
    console.error(`Error fetching app name for cask ${caskName}:`, error)
    return null
  }
}

async function getComputerName() {
  const compName = await execSync("scutil --get ComputerName").toString()

  // remove empty space at end of string
  return compName.substring(0, compName.length - 1)
}

async function getBundleIdentifier(appName) {
  const bundleId = await execSync(
    `osascript -e 'id of app "${appName}"'`,
  ).toString()

  // remove empty space at end of string
  return bundleId.substring(0, bundleId.length - 1)
}

async function findAppFiles(appName, bundleId) {
  try {
    compNameGlob = await getComputerName()
    const bundleIdComponents = bundleId.split(".")

    const companyDirs = pathLocations.map(
      (pathLocation) => `${pathLocation}/${bundleIdComponents[1]}`,
    )
    const pathsToSearch = [...pathLocations, ...companyDirs]
    const directoryFilesPromiseArr = pathsToSearch.map((pathLocation) =>
      fs.readdir(pathLocation),
    )
    const directoryFiles = await Promise.allSettled(directoryFilesPromiseArr)

    const patternArray = await getFilePatternArray(appName, bundleId)

    const filesToRemove = new Set([])

    directoryFiles.forEach((dir, index) => {
      if (dir.status === "fulfilled") {
        dir.value.forEach((dirFile) => {
          const dirFileNorm = dirFile.toLowerCase().replace(" ", "")
          if (isPatternInFile(patternArray, dirFileNorm)) {
            filesToRemove.add(
              `${pathsToSearch[parseInt(index, 10)]}/${dirFile}`,
            )
          }
        })
      }
    })

    // convert set to array
    return [...filesToRemove]
  } catch (err) {
    console.error(err)
    throw err
  }
}

export { appNameFromPath, getBundleIdentifier, findAppFiles }
