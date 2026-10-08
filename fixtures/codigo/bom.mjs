import fs from "node:fs";
export function ler(p) {
  return fs.readFileSync(p, "utf8");
}
