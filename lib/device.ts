import type { DeviceInfo } from "@/types/session";

export function parseDeviceInfo(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();

  let deviceType: DeviceInfo["deviceType"] = "desktop";
  if (/mobile|iphone|android.+mobile/.test(ua)) deviceType = "mobile";
  else if (/ipad|tablet|android(?!.*mobile)/.test(ua)) deviceType = "tablet";

  let browser = "Other";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/") && !ua.includes("edg/")) browser = "Chrome";
  else if (ua.includes("safari/") && !ua.includes("chrome/")) browser = "Safari";
  else if (ua.includes("firefox/")) browser = "Firefox";

  let os = "Other";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os")) os = "macOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  else if (ua.includes("linux")) os = "Linux";

  return { deviceType, browser, os };
}
