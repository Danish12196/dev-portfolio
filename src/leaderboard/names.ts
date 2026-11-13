// Name rules for the leaderboards. The browser checks format/length/reserved
// names first so people get a quick answer, and the server also runs the word filter.

export const NAME_MIN = 2
export const NAME_MAX = 16

/** Names that would pass the filter but read as the site speaking. */
const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'root', 'system', 'danish', 'danishali', 'owner', 'staff', 'official']

/** Trims and squashes spaces. */
export function tidyName(raw: string) {
  return raw.normalize('NFKC').replace(/\s+/g, ' ').trim()
}

/** Returns why a name can't be used, or null when it's fine. Pass it through `tidyName` first. */
export function nameProblem(name: string): string | null {
  if (name.length < NAME_MIN) return `at least ${NAME_MIN} characters, please`
  if (name.length > NAME_MAX) return `${NAME_MAX} characters at most`
  if (!/^[A-Za-z0-9 _.-]+$/.test(name)) return 'letters, numbers, spaces, _ . and - only'
  if (!/[A-Za-z0-9]/.test(name)) return 'needs at least one letter or number'
  const squashed = name.replace(/[\s_.-]+/g, '')
  if (RESERVED.includes(squashed.toLowerCase())) return 'that name is taken'
  return null
}
