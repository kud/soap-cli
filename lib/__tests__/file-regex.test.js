import { describe, it, expect } from "vitest"
import { fileRegex } from "../file-regex.js"

const strip = (str) => {
  let result = str
  fileRegex.forEach((r) => (result = result.replace(r, "")))
  return result
}

describe("fileRegex", () => {
  it("strips UUID patterns", () => {
    expect(
      strip("app-550e8400-e29b-41d4-a716-446655440000.plist"),
    ).not.toContain("550e8400-e29b-41d4-a716-446655440000")
  })

  it("strips date patterns", () => {
    expect(strip("crash-2024-03-15-142500.log")).not.toContain(
      "2024-03-15-142500",
    )
  })

  it("strips .app extension", () => {
    expect(strip("Spotify.app")).toBe("Spotify")
  })

  it("strips .plist extension", () => {
    expect(strip("com.spotify.client.plist")).toBe("com.spotify.client")
  })

  it("strips .dmg extension", () => {
    expect(strip("Spotify.dmg")).toBe("Spotify")
  })

  it("strips .savedState extension", () => {
    expect(strip("Spotify.savedState")).toBe("Spotify")
  })

  it("strips diag resource pattern", () => {
    expect(strip("Spotify_resource.diag")).not.toContain("_resource.diag")
  })

  it("leaves unrelated strings intact", () => {
    expect(strip("spotify")).toBe("spotify")
  })
})
