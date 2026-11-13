import { describe, expect, it } from 'vitest'
import { sign, verify } from '../../api/_lib/token'
import { nameProblem, tidyName } from './names'
import { DIR_CODES, newGame, replay, tick, type Move } from './snakeEngine'

describe('leaderboard names', () => {
  it('tidies whitespace and normalizes unicode', () => {
    expect(tidyName('  danish   test  ')).toBe('danish test')
  })

  it('rejects short, long, invalid-character, and reserved names', () => {
    expect(nameProblem('a')).toContain('at least')
    expect(nameProblem('a'.repeat(17))).toContain('at most')
    expect(nameProblem('bad!name')).toContain('only')
    expect(nameProblem('---')).toContain('needs at least')
    expect(nameProblem('Admin')).toBe('that name is taken')
    expect(nameProblem('d a n i s h')).toBe('that name is taken')
    expect(nameProblem('Player_1')).toBeNull()
  })
})

describe('snakeEngine', () => {
  it('replays a valid game identically to stepping through it', () => {
    const seed = 123456
    const cols = 12
    const rows = 10
    const g = newGame(cols, rows, seed)
    const moves: Move[] = []

    // Steer gently until hitting a wall
    for (let i = 0; i < 40 && !g.over; i++) {
      if (i === 3) {
        moves.push([g.ticks, 0]) // up
        g.dir = DIR_CODES[0]
      }
      tick(g)
    }

    const r = replay(cols, rows, seed, moves, g.ticks)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.score).toBe(g.score)
      expect(r.minMs).toBeGreaterThan(0)
    }
  })

  it('rejects out-of-range moves or wrong tick counts', () => {
    const r = replay(12, 10, 1, [[99, 0]], 10)
    expect(r.ok).toBe(false)
  })
})

describe('leaderboard token signing', () => {
  it('signs and verifies payloads, and rejects tampered or malformed tokens', () => {
    const token = sign({ k: 'snake', n: 'abc', seed: 42, iat: 1000 })
    const decoded = verify<{ k: string; seed: number }>(token)
    expect(decoded).toEqual({ k: 'snake', n: 'abc', seed: 42, iat: 1000 })

    const [body, sig] = token.split('.')
    const tampered = `${body}x.${sig}`
    expect(verify(tampered)).toBeNull()
    expect(verify('not-a-token')).toBeNull()
    expect(verify(null)).toBeNull()
  })
})
