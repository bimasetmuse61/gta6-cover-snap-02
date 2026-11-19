// Neon Coast Cover Studio — the entry program for the make.fun competition gta6-cover-art-01
// ("Make GTA 6 Cover Art"). Node 22, standard library only, no build step.
//
// What this program does when run (`node main.ts`):
//   1. It takes the static web app in ./app (plain HTML/CSS/JS plus bundled OFL fonts and two
//      free sample photos — everything the app needs to run fully offline in a desktop browser)
//      and copies it, unchanged, into the output directory.
//   2. It copies the maker's screenshots from ./screenshots the same way.
//   3. It writes dossier.json into the output directory using buildDossier from the vendored
//      make.fun library (./vendor/makefun-app.ts, the scorer's own copy, byte for byte), so the
//      judge sees exactly the files that were handed in.
//
// The output directory is /output inside the grader; anywhere else, set MAKEFUN_OUTPUT_DIR:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program is deterministic: copying the same tree twice produces byte-identical output.
// To try the app itself, run `node serve.ts` and open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The folder this file lives in, so the program works from any working directory.
const repoDir = fileURLToPath(new URL('.', import.meta.url));

// Where the finished entry goes. The grader mounts /output; MAKEFUN_OUTPUT_DIR overrides it.
const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's published caps for this competition, passed to buildDossier so an entry the
// scorer would refuse is refused here instead: at most 4 screenshots of at most 256 KiB each,
// at most 993 files and 48 MiB under app/, no app/ path longer than 1000 bytes, and the
// dossier's embedded source text capped at 163840 bytes.
const GATE_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
} as const;

/** Copies one directory tree from the repo into the output directory, creating it if needed. */
function handOver(name: string): void {
  const from = join(repoDir, name);
  const into = join(targetDir, name);
  mkdirSync(into, { recursive: true });
  if (existsSync(from)) {
    cpSync(from, into, { recursive: true });
  }
}

mkdirSync(targetDir, { recursive: true });
handOver('app');
handOver('screenshots');

const dossier = buildDossier(targetDir, GATE_LIMITS);
writeFileSync(join(targetDir, 'dossier.json'), dossier);

// A short human-readable summary on stdout; the dossier itself is the deliverable.
const handedIn = readdirSync(join(targetDir, 'app'), { recursive: true }).length;
console.log(`Neon Coast Cover Studio handed in: ${handedIn} app files, dossier.json ${dossier.length} bytes -> ${targetDir}`);
