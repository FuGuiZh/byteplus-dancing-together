import { homedir } from "node:os";
import { join, resolve } from "node:path";

const appDirectoryName = "BytePlus Dancing Together";
const linuxAppDirectoryName = "byteplus-dancing-together";
const dataDirectoryEnvKey = "BYTEPLUS_DANCING_TOGETHER_DATA_DIR";

export function getUserDataDirectory() {
  const configuredDirectory = process.env[dataDirectoryEnvKey]?.trim();

  if (configuredDirectory) {
    return resolve(configuredDirectory);
  }

  if (process.platform === "win32") {
    return join(
      process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
      appDirectoryName
    );
  }

  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", appDirectoryName);
  }

  const xdgDataHome = process.env.XDG_DATA_HOME?.trim();
  return join(
    xdgDataHome || join(homedir(), ".local", "share"),
    linuxAppDirectoryName
  );
}

export function getUserDataFilePath(fileName: string) {
  return join(getUserDataDirectory(), fileName);
}
