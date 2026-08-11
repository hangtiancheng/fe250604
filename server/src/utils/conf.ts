import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const confPath = join(process.cwd(), "./conf.json");

let raw: Record<string, string | number> = {};
if (existsSync(confPath)) {
  raw = JSON.parse(readFileSync(confPath, { encoding: "utf-8" }));
} else {
  console.warn(`[server] ${confPath} not found`);
}

export default raw;
