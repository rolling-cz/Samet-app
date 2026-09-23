import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from './map-with-concurrency'

const tick = () => new Promise((resolve) => setTimeout(resolve, 1))

describe('mapWithConcurrency', () => {
  it('výsledky v pořadí vstupu', async () => {
    const result = await mapWithConcurrency(
      [30, 10, 20],
      async (ms) => {
        await new Promise((resolve) => setTimeout(resolve, ms))
        return ms * 2
      },
      { limit: 3 },
    )

    expect(result).toEqual([60, 20, 40])
  })

  it('nikdy neběží víc úloh, než je limit', async () => {
    let running = 0
    let peak = 0

    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, index) => index),
      async () => {
        running++
        peak = Math.max(peak, running)
        await tick()
        running--
      },
      { limit: 6 },
    )

    expect(peak).toBe(6)
  })

  it('po termínu se další položky nezačnou a vrátí se jako přeskočené', async () => {
    let clock = 0
    const result = await mapWithConcurrency(
      ['a', 'b', 'c', 'd'],
      async (item) => {
        clock += 10
        return `hotovo ${item}`
      },
      { limit: 1, deadline: 20, now: () => clock, onSkip: (item) => `přeskočeno ${item}` },
    )

    expect(result).toEqual(['hotovo a', 'hotovo b', 'přeskočeno c', 'přeskočeno d'])
  })

  it('prázdný vstup', async () => {
    expect(await mapWithConcurrency([], async () => 1, { limit: 6 })).toEqual([])
  })

  it('termín bez onSkip odmítne', async () => {
    await expect(mapWithConcurrency([1], async () => 1, { limit: 1, deadline: 0 })).rejects.toThrow()
  })
})
