import { describe, expect, it } from "vitest";
import { parseDeviceInfo } from "./device";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const WINDOWS_CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MAC_SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const WINDOWS_EDGE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0";
const LINUX_FIREFOX_UA = "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0";

describe("parseDeviceInfo", () => {
  it("detects an iPhone as mobile/iOS/Safari", () => {
    expect(parseDeviceInfo(IPHONE_UA)).toEqual({ deviceType: "mobile", browser: "Safari", os: "iOS" });
  });

  it("detects an Android phone as mobile/Android/Chrome", () => {
    expect(parseDeviceInfo(ANDROID_UA)).toEqual({ deviceType: "mobile", browser: "Chrome", os: "Android" });
  });

  it("detects an iPad as tablet/iOS", () => {
    const result = parseDeviceInfo(IPAD_UA);
    expect(result.deviceType).toBe("tablet");
    expect(result.os).toBe("iOS");
  });

  it("detects Windows + Chrome as desktop", () => {
    expect(parseDeviceInfo(WINDOWS_CHROME_UA)).toEqual({
      deviceType: "desktop",
      browser: "Chrome",
      os: "Windows",
    });
  });

  it("detects macOS + Safari as desktop", () => {
    expect(parseDeviceInfo(MAC_SAFARI_UA)).toEqual({ deviceType: "desktop", browser: "Safari", os: "macOS" });
  });

  it("detects Edge distinctly from Chrome despite sharing the Chrome token", () => {
    expect(parseDeviceInfo(WINDOWS_EDGE_UA).browser).toBe("Edge");
  });

  it("detects Linux + Firefox as desktop", () => {
    expect(parseDeviceInfo(LINUX_FIREFOX_UA)).toEqual({ deviceType: "desktop", browser: "Firefox", os: "Linux" });
  });

  it("falls back to safe defaults for an empty/unknown user agent", () => {
    expect(parseDeviceInfo("")).toEqual({ deviceType: "desktop", browser: "Other", os: "Other" });
  });
});
