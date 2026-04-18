export type DatabaseMode = "local" | "remote";

function getStorageMode() {
  const mode = process.env.STORAGE_MODE?.trim().toLowerCase();
  if (mode === "github" || mode === "local" || mode === "gitee") {
    return mode;
  }
  return "gitee";
}

export function getDatabaseMode(): DatabaseMode {
  const mode = process.env.DATABASE_MODE?.trim().toLowerCase();
  if (mode === "remote" && getStorageMode() === "github") {
    return "remote";
  }
  return "local";
}

export function isRemoteDatabaseMode() {
  return getDatabaseMode() === "remote";
}
