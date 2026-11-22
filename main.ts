// Harbourlight: The Low-Tide Job — the hand-in program (Node 22, standard
// library only). The game itself is the static bundle in game/ beside this
// file: index.html plus its ES modules, no build step and no network. This
// program copies game/ and screenshots/ into the output directory and asks
// the vendored make.fun library to write the dossier the judge reads.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play it locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const root = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(outputDir, { recursive: true });
cpSync(join(root, "game"), join(outputDir, "game"), { recursive: true });

const shotsDir = join(root, "screenshots");
if (existsSync(shotsDir)) {
  mkdirSync(join(outputDir, "screenshots"), { recursive: true });
  cpSync(shotsDir, join(outputDir, "screenshots"), { recursive: true });
}

// The grader's caps, mirrored so an entry the grader would refuse is refused
// here first: at most 4 screenshots of 256 KiB, at most 993 game files and
// 48 MiB of game in all, and no game path longer than 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, "dossier.json"), dossier);
