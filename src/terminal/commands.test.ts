import { describe, expect, it, vi } from 'vitest'
import { complete, execute, type Ctx, type Line } from './commands'
import { isFound, resetAchievements } from '../achievements'

function makeCtx(initialCwd = '/') {
  let cwd = initialCwd
  const printed: Line[] = []
  const clear = vi.fn()
  const exit = vi.fn()
  const ctx: Ctx = {
    get cwd() {
      return cwd
    },
    setCwd: (p) => {
      cwd = p
    },
    print: (...lines) => printed.push(...lines),
    clear,
    exit,
  }
  const text = () => printed.map((l) => l.map((s) => s.t).join('')).join('\n')
  return { ctx, printed, text, clear, exit, getCwd: () => cwd }
}

describe('terminal commands', () => {
  it('runs pwd, echo, clear, and exit', () => {
    const { ctx, text, clear, exit } = makeCtx('/projects')
    execute('pwd', ctx)
    expect(text()).toContain('~/projects')

    execute('echo hello world', ctx)
    expect(text()).toContain('hello world')

    execute('clear', ctx)
    expect(clear).toHaveBeenCalledTimes(1)

    execute('exit', ctx)
    expect(exit).toHaveBeenCalledTimes(1)
  })

  it('changes directory and unlocks escape when cd .. at root', () => {
    resetAchievements()
    const { ctx, getCwd, text } = makeCtx('/')
    execute('cd ..', ctx)
    expect(getCwd()).toBe('/')
    expect(isFound('escape')).toBe(true)

    execute('cd projects/fuloos', ctx)
    expect(getCwd()).toBe('/projects/fuloos')

    execute('cd missing-folder', ctx)
    expect(text()).toContain('no such folder')
  })

  it('lists directory contents and prints file text with cat', () => {
    const { ctx, text } = makeCtx('/')
    execute('ls', ctx)
    expect(text()).toContain('projects/')

    execute('cat about.md', ctx)
    expect(text().length).toBeGreaterThan(20)
  })

  it('suggests close commands on typos', () => {
    const { ctx, text } = makeCtx('/')
    execute('hlep', ctx)
    expect(text()).toContain('command not found')
    expect(text()).toContain('Did you mean help?')
  })

  it('completes commands and paths', () => {
    expect(complete('proje', '/')).toBe('projects ')
    expect(complete('cd fulo', '/projects')).toBe('cd fuloos/')
    expect(complete('cat abou', '/')).toBe('cat about.md ')
    expect(complete('zzz', '/')).toBe('zzz')
  })
})
