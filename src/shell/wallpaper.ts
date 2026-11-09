import { useEffect, useState } from 'react'

export interface Credit {
  /** What the credit is for, e.g. "Photo" or "Art". */
  role: string
  by: string
  href: string
  license: string
  licenseHref: string
}

export interface WallpaperDef {
  id: string
  name: string
  /** Light and dark versions. Missing means it is drawn in CSS (the Soft Paper hills). */
  files?: { light: string; dark: string }
  credits: Credit[]
  /** The source the files came from, with its own copyright notes. */
  via?: { name: string; href: string }
}

const CC_BY_SA_3 = { license: 'CC BY-SA 3.0', licenseHref: 'https://creativecommons.org/licenses/by-sa/3.0/' }
const GNOME = { name: 'GNOME backgrounds', href: 'https://gitlab.gnome.org/GNOME/gnome-backgrounds' }
const ELEMENTARY = { name: 'elementary OS wallpapers', href: 'https://github.com/elementary/wallpapers' }
const UNSPLASH = { license: 'Unsplash License', licenseHref: 'https://unsplash.com/license' }
const CC0 = { license: 'CC0', licenseHref: 'https://creativecommons.org/publicdomain/zero/1.0/' }

const pair = (id: string) => ({ light: `/wallpapers/${id}-light.webp`, dark: `/wallpapers/${id}-dark.webp` })
/** Small previews, made for every wallpaper (the hills too) at /wallpapers/<id>-<variant>-thumb.webp. */
export const thumbFor = (id: string, variant: 'light' | 'dark') => `/wallpapers/${id}-${variant}-thumb.webp`

/** Every wallpaper on offer. Each has a light and a dark version that follow the site theme. */
export const WALLPAPERS: WallpaperDef[] = [
  {
    id: 'hills',
    name: 'Soft hills',
    credits: [{ role: 'Drawn', by: 'Danish Ali', href: 'https://github.com/Danish12196/dev-portfolio', license: 'part of this site', licenseHref: 'https://github.com/Danish12196/dev-portfolio' }],
  },
  {
    id: 'sea-stack',
    name: 'Sea stack',
    files: pair('sea-stack'),
    credits: [
      { role: 'Photo', by: 'Brendon Porter', href: 'https://brendonporter.com', license: 'CC BY-SA 4.0', licenseHref: 'https://creativecommons.org/licenses/by-sa/4.0/' },
      { role: 'Edit', by: 'Ryan Gorley', href: 'https://github.com/elementary/wallpapers', license: 'CC BY-SA 4.0', licenseHref: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    ],
    via: ELEMENTARY,
  },
  {
    id: 'peaks',
    name: 'Peaks',
    files: pair('peaks'),
    credits: [
      { role: 'Day', by: 'Canazei Granite Ridges, Unsplash', href: 'https://unsplash.com/photos/yrwpJwDNSHE', ...CC0 },
      { role: 'Night', by: 'Snow-capped mountain, Pexels', href: 'https://www.pexels.com/photo/photo-of-snow-capped-mountain-during-evening-2440024/', license: 'Pexels License', licenseHref: 'https://www.pexels.com/license/' },
    ],
    via: ELEMENTARY,
  },
  {
    id: 'shore',
    name: 'Shore',
    files: pair('shore'),
    credits: [
      { role: 'Day', by: 'Nattu Adnan, Unsplash', href: 'https://unsplash.com/photos/Ai2TRdvI6gM', ...UNSPLASH },
      { role: 'Night', by: 'Sunset by the Pier, Unsplash', href: 'https://unsplash.com/photos/ces8_Bo7bhQ', ...CC0 },
    ],
    via: ELEMENTARY,
  },
  {
    id: 'transit',
    name: 'Transit map',
    files: pair('transit'),
    credits: [{ role: 'Art', by: 'Dominik Baran', href: 'https://gitlab.gnome.org/GNOME/gnome-backgrounds', ...CC_BY_SA_3 }],
    via: GNOME,
  },
  {
    id: 'drool',
    name: 'Drool',
    files: pair('drool'),
    credits: [{ role: 'Art', by: 'Jakub Steiner', href: 'https://gitlab.gnome.org/GNOME/gnome-backgrounds', ...CC_BY_SA_3 }],
    via: GNOME,
  },
  {
    id: 'tarka',
    name: 'Tarka',
    files: pair('tarka'),
    credits: [{ role: 'Art', by: 'Jakub Steiner', href: 'https://gitlab.gnome.org/GNOME/gnome-backgrounds', ...CC_BY_SA_3 }],
    via: GNOME,
  },
]

const KEY = 'devportfolio.wallpaper'
const listeners = new Set<(w: WallpaperDef) => void>()

export function findWallpaper(id: string) {
  const q = id.trim().toLowerCase()
  return WALLPAPERS.find((w) => w.id === q || w.name.toLowerCase() === q)
}

function initial(): WallpaperDef {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return findWallpaper(saved) ?? WALLPAPERS[0]
  } catch {
    /* storage blocked */
  }
  return WALLPAPERS[0]
}

let current = initial()

export function getWallpaper() {
  return current
}

export function setWallpaper(id: string) {
  const next = findWallpaper(id)
  if (!next || next === current) return
  current = next
  try {
    localStorage.setItem(KEY, next.id)
  } catch {
    /* storage blocked */
  }
  listeners.forEach((l) => l(next))
}

export function useWallpaper(): WallpaperDef {
  const [w, set] = useState(current)
  useEffect(() => {
    listeners.add(set)
    return () => void listeners.delete(set)
  }, [])
  return w
}
