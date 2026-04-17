export const siteConfig = {
  antiScreenshotEnabled:
    process.env.NEXT_PUBLIC_ANTI_SCREENSHOT_ENABLED === "true",
} as const;