import { $ } from "zx"
$.verbose = false

import { execSync } from "child_process"
import fs from "fs/promises"
import { homedir } from "os"
import { pathLocations, commonSuffix } from "./path-locations.js"
import { fileRegex } from "./file-regex.js"

const scoreThreshold = 0.4

let compNameGlob = ""

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

export const normalizeString = (str, spacer = "") =>
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

  patternArray = [...patternArray, ...appWithSuffix]

  return patternArray
}

export function isPatternInFile(patterns, fileToCheck) {
  return patterns.find((filePatten) => {
    if (typeof filePatten !== "string") return false
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

export function createNameVariations(appName, bundleId) {
  const appNameNorm = appName.toLowerCase().replace(/ /g, "")
  const appNameWithoutDot = appNameNorm.replace(/\./g, "")
  const appNameUnderscore = appName.toLowerCase().replace(/ /g, "_")
  const appNameDash = appName.toLowerCase().replace(/ /g, "-")
  const appNameDot = appName.toLowerCase().replace(/ /g, ".")
  const bundleIdNorm = bundleId.toLowerCase().replace(/ /g, "")

  return [
    appNameNorm,
    appNameWithoutDot,
    appNameUnderscore,
    appNameDash,
    appNameDot,
    bundleIdNorm,
  ]
}

export function appNameFromPath(appPath) {
  const pathArr = appPath.split("/")
  const appNameWithExt = pathArr[pathArr.length - 1]
  return appNameWithExt.replace(".app", "")
}

async function fetchCaskData(caskName) {
  const { stdout: info } = await $`brew info ${caskName} --json=v2`
  const caskData = JSON.parse(info).casks?.[0]
  if (!caskData) throw new Error(`Cask "${caskName}" not found.`)
  return caskData
}

async function resolveZapPaths(caskData) {
  const zapPaths = caskData.artifacts
    .filter((a) => a.zap)
    .flatMap((a) => a.zap)
    .filter((entry) => entry.trash)
    .flatMap((entry) => entry.trash)
    .map((p) => p.replace(/^~/, homedir()))

  const resolved = await Promise.all(
    zapPaths.map(async (p) => {
      if (p.includes("*")) {
        const matches = []
        for await (const f of fs.glob(p)) matches.push(f)
        return matches
      }
      try {
        await fs.access(p)
        return [p]
      } catch {
        return []
      }
    }),
  )

  return resolved.flat()
}

export const getCaskInfo = async (caskName) => {
  try {
    const caskData = await fetchCaskData(caskName)

    let appName = null
    for (const artifact of caskData.artifacts) {
      if (artifact.app) {
        appName = artifact.app[0]
        break
      }
    }

    const zapFiles = await resolveZapPaths(caskData)

    return { appName, zapFiles }
  } catch (error) {
    throw new Error(
      `Failed to get cask info for "${caskName}": ${error.message}`,
    )
  }
}

export const appNameFromCaskName = async (caskName) => {
  const { appName } = await getCaskInfo(caskName)
  return appName
}

export const getZapFiles = async (caskName) => {
  const { zapFiles } = await getCaskInfo(caskName)
  return zapFiles
}

function getComputerName() {
  return execSync("scutil --get ComputerName").toString().trimEnd()
}

export async function getBundleIdentifier(appName) {
  try {
    const bundleId = execSync(
      `osascript -e 'id of app "${appName}"'`,
    ).toString()
    return bundleId.trimEnd()
  } catch {
    throw new Error(
      `Could not find bundle identifier for "${appName}". Is the app installed?`,
    )
  }
}

export async function findAppFiles(appName, bundleId) {
  try {
    compNameGlob = getComputerName()
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
          const dirFileNorm = dirFile.toLowerCase().replace(/ /g, "")
          if (isPatternInFile(patternArray, dirFileNorm)) {
            filesToRemove.add(
              `${pathsToSearch[parseInt(index, 10)]}/${dirFile}`,
            )
          }
        })
      }
    })

    return [...filesToRemove]
  } catch (err) {
    console.error(err)
    throw err
  }
}
