import { describe, expect, it } from 'vitest'
import { allProjects, displayPath, findApp, findProject, findReadme, getNode, projectAt, projects, resolvePath, root } from './index'

describe('fs', () => {
  it('resolves absolute, relative, home, dot, and parent paths', () => {
    expect(resolvePath('', '/projects')).toBe('/')
    expect(resolvePath('~', '/projects')).toBe('/')
    expect(resolvePath('~/projects/fuloos', '/other')).toBe('/projects/fuloos')
    expect(resolvePath('fuloos/./README.md', '/projects')).toBe('/projects/fuloos/README.md')
    expect(resolvePath('../about.md', '/projects')).toBe('/about.md')
    expect(resolvePath('../../..', '/projects')).toBe('/')
  })

  it('formats display paths with ~ for root', () => {
    expect(displayPath('/')).toBe('~')
    expect(displayPath('/projects/fuloos')).toBe('~/projects/fuloos')
  })

  it('looks up nodes case-insensitively and returns undefined for missing paths', () => {
    expect(getNode('/')).toBe(root)
    expect(getNode('')).toBe(root)
    expect(getNode('/PROJECTS/FULOOS')?.path).toBe('/projects/fuloos')
    expect(getNode('/does/not/exist')).toBeUndefined()
  })

  it('lists sorted top-level projects and nested projects', () => {
    const top = projects()
    expect(top.length).toBeGreaterThan(0)
    expect(top.some((p) => p.name === 'fuloos')).toBe(true)
    const all = allProjects()
    expect(all.length).toBeGreaterThanOrEqual(top.length)
  })

  it('finds projects by name, display name, or alias and locates enclosing project', () => {
    const fuloos = findProject('FULOOS')
    expect(fuloos?.path).toBe('/projects/fuloos')
    const readme = fuloos && findReadme(fuloos)
    expect(readme?.type).toBe('file')
    expect(readme && projectAt(readme.path)?.path).toBe('/projects/fuloos')
    expect(projectAt('/about.md')).toBeUndefined()
    if (fuloos) {
      const app = findApp(fuloos)
      if (app) expect(app.type).toBe('file')
    }
  })
})
