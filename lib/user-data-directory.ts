import { homedir } from "node:os";
import { join } from "node:path";

const appDirectoryName = "BytePlus Dancing Together";

export function getUserDataDirectory() {
  if (process.platform === "win32") {
    return join(
      process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
      appDirectoryName
    );
  }

  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", appDirectoryName);
  }

  throw new Error("当前本地持久化只支持 Windows 和 macOS。");
}

export function getUserDataFilePath(fileName: string) {
  return join(getUserDataDirectory(), fileName);
}
