import { describe, it, expect } from "vitest"
import {
  appNameFromPath,
  createNameVariations,
  normalizeString,
} from "../index"

describe("appNameFromPath", () => {
  it("extracts name from full path", () => {
    expect(appNameFromPath("/Applications/Spotify.app")).toBe("Spotify")
  })

  it("extracts name from filename only", () => {
    expect(appNameFromPath("Spotify.app")).toBe("Spotify")
  })

  it("handles app names with spaces", () => {
    expect(appNameFromPath("/Applications/Affinity Designer 2.app")).toBe(
      "Affinity Designer 2",
    )
  })

  it("handles nested path", () => {
    expect(appNameFromPath("/Users/kud/Downloads/MyApp.app")).toBe("MyApp")
  })
})

describe("normalizeString", () => {
  it("lowercases the string", () => {
    expect(normalizeString("Spotify")).toBe("spotify")
  })

  it("replaces spaces with empty string by default", () => {
    expect(normalizeString("Affinity Designer")).toBe("affinitydesigner")
  })

  it("replaces spaces with custom spacer", () => {
    expect(normalizeString("Affinity Designer", "-")).toBe("affinity-designer")
  })
})

describe("createNameVariations", () => {
  it("returns all expected variation keys for a simple name", () => {
    const variations = createNameVariations("Spotify", "com.spotify.client")
    expect(variations).toContain("spotify")
    expect(variations).toContain("com.spotify.client")
  })

  it("produces dash and underscore variants for multi-word names", () => {
    const variations = createNameVariations(
      "Affinity Designer",
      "com.affinity.designer2",
    )
    expect(variations).toContain("affinity-designer")
    expect(variations).toContain("affinity_designer")
    expect(variations).toContain("affinity.designer")
  })

  it("returns 6 variations", () => {
    const variations = createNameVariations("Spotify", "com.spotify.client")
    expect(variations).toHaveLength(6)
  })
})
