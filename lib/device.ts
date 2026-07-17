import type { DeviceInfo } from "@/types/session";

export function parseDeviceInfo(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();

  // iPad (and Android tablets) must be checked before the generic "mobile"
  // pattern: modern iPadOS Safari UAs still contain the literal substring
  // "Mobile/15E148", which would otherwise misclassify tablets as phones.
  let deviceType: DeviceInfo["deviceType"] = "desktop";
  if (/ipad|tablet|android(?!.*mobile)/.test(ua)) deviceType = "tablet";
  else if (/mobile|iphone|android.+mobile/.test(ua)) deviceType = "mobile";

  let browser = "Other";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/") && !ua.includes("edg/")) browser = "Chrome";
  else if (ua.includes("safari/") && !ua.includes("chrome/")) browser = "Safari";
  else if (ua.includes("firefox/")) browser = "Firefox";

  // iPhone/iPad UAs always contain "like Mac OS X", so the iOS check must
  // run before the generic "mac os" check or every iOS device is misread
  // as a Mac.
  let os = "Other";
  if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os")) os = "macOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("linux")) os = "Linux";

  return { deviceType, browser, os };
}
