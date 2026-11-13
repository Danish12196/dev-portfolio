import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACHIEVEMENTS, formatDuration, getProgress, isFound, markRead, onAchievement, resetAchievements, runSeed, unlock } from './index'

describe('achievements', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAchievements()
  })

  it('unlocks achievements once, notifies listeners, and ignores unknown ids', () => {
    const listener = vi.fn()
    const unsub = onAchievement(listener)

    unlock('sudo')
    expect(isFound('sudo')).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)

    unlock('sudo')
    expect(listener).toHaveBeenCalledTimes(1)

    unlock('non-existent-id')
    expect(isFound('non-existent-id')).toBe(false)
    unsub()
  })

  it('marks finishedAt when all achievements are unlocked and resets cleanly', () => {
    for (const a of ACHIEVEMENTS) unlock(a.id)
    expect(getProgress().finishedAt).not.toBeNull()

    const beforeResets = getProgress().resets
    const beforeRunId = getProgress().runId
    resetAchievements()
    const after = getProgress()
    expect(Object.keys(after.found)).toHaveLength(0)
    expect(after.finishedAt).toBeNull()
    expect(after.resets).toBe(beforeResets + 1)
    expect(after.runId).not.toBe(beforeRunId)
  })

  it('unlocks reader after reading three distinct READMEs or about.md', () => {
    markRead('/projects/fuloos/notes.md')
    expect(isFound('reader')).toBe(false)

    markRead('/about.md')
    markRead('/projects/fuloos/README.md')
    markRead('/projects/fuloos/README.md')
    expect(isFound('reader')).toBe(false)

    markRead('/projects/lockout/README.md')
    expect(isFound('reader')).toBe(true)
  })

  it('produces deterministic runSeed in [0, 1) and formats durations', () => {
    const a = runSeed('sky')
    const b = runSeed('sky')
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)

    expect(formatDuration(5_000)).toBe('0:05')
    expect(formatDuration(125_000)).toBe('2:05')
    expect(formatDuration(3_660_000)).toBe('1h 01m')
  })
})
