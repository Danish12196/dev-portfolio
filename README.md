# Dev portfolio

The source for [danishali.dev](https://danishali.dev): my projects presented as a
tiny operating system.

- **Terminal mode.** The site opens on a desktop with a terminal in front. Type
  `help`, `projects`, `open fuloos` or `play jeopardy`. Anything underlined is
  clickable if you'd rather not type.
- **Desktop mode.** Close, minimise or `exit` the terminal to get the desktop,
  with a taskbar along the bottom (start menu, project search, open windows and
  the clock). Every project is a folder, and every file opens in its own window
  that you can drag, resize, minimise and maximise.
- **Phone mode.** On small screens the site becomes a phone-style home screen
  where every app opens full screen.

## Running it

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run lint
```

`npm run dev` and `npm run build` first run `npm run content`, which turns the
`content/` folder into `src/generated/fs.json`.

## Adding a project

Projects are added by hand. Each one is a folder in `content/projects/`:

```
content/projects/fuloos/
  project.json   required: name, tagline, year, stack, status, color, order
  README.md      the write-up shown in the reading window
  Fuloos.app     optional: { "title": "Fuloos", "url": "https://fuloos.danishali.dev" }, runs live in a window
  github.link    optional: a file whose only content is a URL, opens in a new tab
  media/         optional: png/jpg/webp/gif open in an image viewer, mp4/webm in a video player
```

Folders can nest: `content/projects/university/` holds one folder per subject
(`MAAI901`, `MAAI902`), and each subject holds its projects. Any folder with a
`project.json` gets the project header on its README, and `open`/`run` find it by
name (`run ledger`).

### Screenshots and videos from a project's own repo

Add `"repo": "Danish12196/fuloos"` to `project.json` and the build lists that
repo's `portfolio/` folder (or the folder named by `"media"`) and adds it to the
project as `media/`. The files load straight from GitHub, so pushing a new
screenshot to the project's repo and redeploying this site is enough. `demo.mp4`
uses `demo-poster.jpg` as its poster, here and in local `media/` folders. If
GitHub can't be reached the build carries on without those files; set
`GITHUB_TOKEN` in Vercel if the anonymous rate limit ever gets in the way.

University projects keep their media in this repo instead, under each project's
`media/` folder.

`project.json`:

```json
{
  "name": "Fuloos",
  "tagline": "An app for keeping track of money",
  "year": 2026,
  "stack": ["TypeScript", "React"],
  "status": "live",
  "color": "#2f9e6b",
  "order": 1,
  "repo": "Danish12196/fuloos"
}
```

### Games

`content/projects/games/` holds my itch.io jam games, one folder each. A game's
`.app` takes `"width"` and `"height"` so its window opens at the size the build
was made for, and points at the build's `html-classic.itch.zone` URL (copy it
from the iframe on the itch.io page). `project.json` can also have
`"cover": "media/01-cover.jpg"` to put the cover art on top of the README, and
`"jam"` for the game jam it was made for. `itch.link` becomes an itch.io button.

Anything else in the folder shows up too: `.md` files render as documents,
images and video get viewers, PDFs open in a PDF window, and any other file
opens as plain text. `content/about.md` is the About page and the output of
`whoami`.

## Terminal commands

| Command | What it does |
| --- | --- |
| `help` | list every command |
| `ls`, `cd`, `pwd` | browse folders |
| `cat <file>` | print a file |
| `open <name>` | open a project, folder or file in a window |
| `run <project>` | launch a project's live app |
| `play jeopardy` | launch Jeopardy |
| `projects` | table of every project |
| `whoami` | about me |
| `theme light` / `theme dark` | switch theme |
| `clear`, `exit` | clear the screen, close the terminal |

Tab completes commands and paths; the up and down arrows recall history.

## How it's built

React, TypeScript and Vite, with Zustand for window state. The desktop and the
phone UI share the same file tree and the same viewers.

```
content/              projects and about page (edit these)
scripts/              build-content.mjs: content/ -> src/generated/fs.json
src/fs/               file tree helpers (paths, lookups)
src/store/windows.ts  window manager state, saved to localStorage
src/terminal/         terminal commands and tab completion
src/apps/             terminal, folder view and file viewers
src/desktop/          desktop, wallpaper, windows, taskbar and start menu
src/phone/            phone home screen
src/styles/tokens.css every colour, font, radius and shadow
```

The look is "Soft Paper": rounded pastel windows and folders, the Nunito font,
an illustrated hills-and-sun wallpaper, and a terminal that is always green on
black. Every colour, font and shadow comes from `src/styles/tokens.css`.

## Deploying

The site deploys to Vercel (`vercel.json` sends every route to the app so links
like `/projects/jeopardy` open that project's window). The domain's DNS stays on
Cloudflare and points `danishali.dev` at Vercel.

## To do

- Replace the placeholder write-ups in `content/` (marked `TODO(Danish)`).
- Add the other projects (Pan, HomeHub, Actual Budget Import) once they have
  danishali.dev subdomains.
