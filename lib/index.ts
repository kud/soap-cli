import { $ } from "zx"
$.verbose = false

import { execSync } from "child_process"
import fs from "fs/promises"
import { homedir } from "os"
import { pathLocations, commonSuffix } from "./path-locations"
import { fileRegex } from "./file-regex"

interface CaskData {
  token: string
  artifacts: Array<{
    app?: string[]
    zap?: Array<{ trash?: string[] }>
  }>
}

const scoreThreshold = 0.4

let compNameGlob = ""

const stripString = (file: string): string => {
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

export const normalizeString = (str: string, spacer = ""): string =>
  str.toLowerCase().replace(/ /g, spacer)

const getFilePatternArray = async (
  appName: string,
  bundleId: string,
): Promise<(string | string[])[]> => {
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

  const appWithSuffix = new Set<string>([])
  commonSuffix.forEach((suffix) =>
    nameVariations.forEach((nameVariation) =>
      appWithSuffix.add(`${nameVariation}${suffix}`),
    ),
  )

  patternArray = [...patternArray, ...appWithSuffix]

  return patternArray
}

export const isPatternInFile = (
  patterns: (string | string[])[],
  fileToCheck: string,
): string | undefined => {
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
        if (strippedFile[parseInt(i.toString(), 10)] === ".") score += 0.5
        if (strippedFile[parseInt(i.toString(), 10)] === "_") score += 0.5
      }
      if (score / strippedFile.length > scoreThreshold) {
        return true
      }
      return false
    }
    return false
  }) as string | undefined
}

export const createNameVariations = (
  appName: string,
  bundleId: string,
): string[] => {
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

export const appNameFromPath = (appPath: string): string => {
  const pathArr = appPath.split("/")
  const appNameWithExt = pathArr[pathArr.length - 1]
  return appNameWithExt.replace(".app", "")
}

const fetchCaskData = async (caskName: string): Promise<CaskData> => {
  const { stdout: info } = await $`brew info ${caskName} --json=v2`
  const caskData = JSON.parse(info).casks?.[0]
  if (!caskData) throw new Error(`Cask "${caskName}" not found.`)
  return caskData
}

const resolveZapPaths = async (caskData: CaskData): Promise<string[]> => {
  const zapPaths = caskData.artifacts
    .filter((a) => a.zap)
    .flatMap((a) => a.zap)
    .filter((entry) => entry?.trash)
    .flatMap((entry) => entry?.trash ?? [])
    .map((p) => p.replace(/^~/, homedir()))

  const resolved = await Promise.all(
    zapPaths.map(async (p) => {
      if (p.includes("*")) {
        const matches: string[] = []
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

export const getCaskInfo = async (
  caskName: string,
): Promise<{
  appName: string | null
  zapFiles: string[]
  renamedTo: string | null
}> => {
  try {
    const caskData = await fetchCaskData(caskName)

    const renamedTo = caskData.token !== caskName ? caskData.token : null

    let appName: string | null = null
    for (const artifact of caskData.artifacts) {
      if (artifact.app) {
        const raw = artifact.app[0] || null
        appName = raw ? raw.replace(/\.app$/i, "") : null
        break
      }
    }

    const zapFiles = await resolveZapPaths(caskData)

    return { appName, zapFiles, renamedTo }
  } catch (error: unknown) {
    throw new Error(
      `Failed to get cask info for "${caskName}": ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export const appNameFromCaskName = async (
  caskName: string,
): Promise<string | null> => {
  const { appName } = await getCaskInfo(caskName)
  return appName
}

export const getZapFiles = async (caskName: string): Promise<string[]> => {
  const { zapFiles } = await getCaskInfo(caskName)
  return zapFiles
}

const getComputerName = (): string => {
  return execSync("scutil --get ComputerName").toString().trimEnd()
}

export const getBundleIdentifier = async (appName: string): Promise<string> => {
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

export const findAppFiles = async (
  appName: string,
  bundleId: string,
): Promise<string[]> => {
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

    const filesToRemove = new Set<string>([])

    directoryFiles.forEach((dir, index) => {
      if (dir.status === "fulfilled") {
        dir.value.forEach((dirFile) => {
          const dirFileNorm = dirFile.toLowerCase().replace(/ /g, "")
          if (isPatternInFile(patternArray, dirFileNorm)) {
            filesToRemove.add(
              `${pathsToSearch[parseInt(index.toString(), 10)]}/${dirFile}`,
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
