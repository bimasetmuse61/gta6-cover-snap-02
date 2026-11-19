# Neon Coast Cover Studio

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/bimasetmuse61/gta6-cover-snap-02/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/bimasetmuse61/gta6-cover-snap-02/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline browser app that turns **your own photo + a caption** into GTA-style multi-panel
cover art with a Vice City neon-sunset grade, exported as a PNG in the sizes people actually
post. Built for the make.fun bounty
[gta6-cover-art-01 — "Make GTA 6 Cover Art"](https://make.fun/bounty/gta6-cover-art-01).

Open it, drop in a photo, pick a layout and a grade, type your caption, export. Four steps,
no account, no upload, no network: your photos are read on your own machine and never leave it.

## What it does

- **Any photo, several at once** — file picker or drag & drop onto the page. Photos land in a
  thumbnail library; two bundled sample photos (a pier, a boulevard) are one click away so the
  studio works out of the box.
- **Six multi-panel layouts** — Single Hero, Vertical Duo, Trio Strip, Classic Four,
  Hero + Side Strip, Six Collage. One photo can span every panel (each panel crops it
  differently) or each panel can hold a different photo.
- **Per-panel framing** — drag directly on the cover to pan a panel's photo, use the zoom
  slider to crop tighter, reset a panel with one click. Empty panels are painted with an
  original neon-coast backdrop (striped sun, skyline, sea) instead of a grey box.
- **Six colour grades** — Vice Sunset, Neon Night, Golden Hour, Teal & Orange, Noir and
  Pastel Dawn, each a canvas filter plus a sunset/neon colour wash and a unifying glow.
- **Genre caption lettering** — a big condensed headline (Anton) with a heavy ink outline,
  auto-shrunk to fit, under a tilted script accent (Pacifico) in hot pink. Both fonts are
  SIL Open Font License faces bundled under `app/fonts/` with their license texts, loaded
  locally — no webfonts, no downloads.
- **PNG export at post sizes** — 1080 × 1080, 1080 × 1350 and 1920 × 1080. The preview and
  the export run the exact same renderer, so the PNG is the cover you see.
- **Undo / redo** — every edit (layout, grade, caption, panel assignment, pan, zoom) is on a
  history stack; toolbar buttons or Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z.

All artwork is original. No Rockstar Games logo, artwork, character or font is used anywhere;
the lettering, layout system, grades and painted backdrops are this app's own.

## Run the app

The app is plain static files under `app/` — no build step. Either:

- serve the folder with the included tiny server and open it in desktop Chrome:

  ```sh
  node serve.ts            # serves app/ on http://localhost:8080
  ```

- or serve `app/` with any static file server you like (`python3 -m http.server -d app`, …).

Everything the app loads — scripts, styles, fonts, samples — is a file under `app/`, and it
makes zero network requests.

## How the entry program works

`main.ts` (Node 22, standard library only) is the hand-in program for the competition:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

It copies `app/` and `screenshots/` into the output directory (`/output` in the grader,
`MAKEFUN_OUTPUT_DIR` elsewhere) and writes `dossier.json` there using `buildDossier` from
`vendor/makefun-app.ts` — the kit's library, vendored byte for byte — with the scorer's
published caps (at most 4 screenshots of at most 256 KiB, app size/file limits). The program
is deterministic: running it twice over the same tree produces byte-identical output.

`screenshots/` holds the maker's four screenshots listed in `shots.json`: the exported square
cover first, then the editor with a sample photo loaded, a portrait cover and a landscape
cover. Each one is the app itself, driven through its `?shot=` scenes
(`app/src/main.js` documents the parameters).

## Layout of this repository

| Path | What it is |
| --- | --- |
| `main.ts` | The entry program described above. |
| `serve.ts` | A tiny static server for trying the app locally. |
| `app/index.html`, `app/style.css` | The app's page and styles. |
| `app/src/render.js` | The cover renderer (panels, grades, lettering) shared by preview and export. |
| `app/src/layouts.js`, `app/src/grades.js` | The six layouts and six colour grades, as data. |
| `app/src/state.js` | Editor state and the undo/redo history. |
| `app/src/main.js` | Page wiring: photo loading, controls, export, screenshot scenes. |
| `app/fonts/` | Anton and Pacifico (SIL OFL 1.1) with their license texts. |
| `app/samples/` | Two free sample photos made for make.fun with an image model. |
| `screenshots/`, `shots.json` | The four entry screenshots and how they were taken. |
| `vendor/makefun-app.ts` | The make.fun dossier library, unchanged from the kit. |

## License

MIT — see `LICENSE` at the root. The bundled fonts are under the SIL Open Font License 1.1
(see `app/fonts/Anton-OFL.txt` and `app/fonts/Pacifico-OFL.txt`); the sample photos were made
for make.fun with an image model and are free to use.
