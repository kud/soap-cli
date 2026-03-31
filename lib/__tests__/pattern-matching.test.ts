import { describe, it, expect } from "vitest"
import { isPatternInFile } from "../index"

describe("isPatternInFile", () => {
  it("matches when pattern is prominent in the filename", () => {
    const result = isPatternInFile(["spotify"], "spotify.plist")
    expect(result).toBeTruthy()
  })

  it("matches bundle-id style filename", () => {
    const result = isPatternInFile(
      ["com.spotify.client"],
      "com.spotify.client.plist",
    )
    expect(result).toBeTruthy()
  })

  it("does not match when pattern is a minor substring of a long unrelated filename", () => {
    const result = isPatternInFile(
      ["it"],
      "com.microsoft.office.reminders.plist",
    )
    expect(result).toBeFalsy()
  })

  it("returns falsy when no patterns match", () => {
    const result = isPatternInFile(["spotify"], "com.apple.finder.plist")
    expect(result).toBeFalsy()
  })

  it("returns falsy for empty patterns array", () => {
    const result = isPatternInFile([], "spotify.plist")
    expect(result).toBeFalsy()
  })
})
