import { getStorageMode } from "@/lib/storage";

export type DatabaseMode = "local" | "remote";

let hasWarnedInvalidDatabaseMode = false;
let hasWarnedIncompatibleRemoteMode = false;

export function getDatabaseMode(): DatabaseMode {
  const mode = process.env.DATABASE_MODE?.trim().toLowerCase();

  if (!mode || mode === "local") {
    return "local";
  }

  if (mode !== "remote") {
    if (!hasWarnedInvalidDatabaseMode && process.env.NODE_ENV !== "production") {
      console.warn(
        `[photo-share] Unsupported DATABASE_MODE=\"${mode}\". Falling back to local database mode.`
      );
      hasWarnedInvalidDatabaseMode = true;
    }
    return "local";
  }

  if (getStorageMode() !== "github") {
    if (!hasWarnedIncompatibleRemoteMode && process.env.NODE_ENV !== "production") {
      console.warn(
        '[photo-share] DATABASE_MODE="remote" currently requires STORAGE_MODE="github". Falling back to local database mode.'
      );
      hasWarnedIncompatibleRemoteMode = true;
    }
    return "local";
  }

  return "remote";
}

export function isRemoteDatabaseMode() {
  return getDatabaseMode() === "remote";
}
