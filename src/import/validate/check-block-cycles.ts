import type { IssueCollector } from '../issue-collector'
import type { ParsedBlock } from '../types/parsed-block'

/**
 * A block must not refer to itself, directly or through others (§8.4, §11 6g).
 *
 * Substitution runs in a loop until no marker is left, so `A → B → A` would
 * never terminate. The engine keeps a pass limit as a backstop, but the author
 * should hear about it here, with the chain spelled out.
 */
export const checkBlockCycles = (blocks: ParsedBlock[], issues: IssueCollector): void => {
  const byId = new Map(blocks.map((block) => [block.externalId, block]))
  /** Blocks whose subtree is already known to be acyclic. */
  const settled = new Set<string>()
  const reported = new Set<string>()

  const walk = (id: string, path: string[]): void => {
    if (settled.has(id)) return

    const cycleAt = path.indexOf(id)
    if (cycleAt !== -1) {
      const chain = [...path.slice(cycleAt), id]
      const start = chain[0] ?? id
      if (!reported.has(start)) {
        reported.add(start)
        issues.error(
          'block_cycle',
          byId.get(start)?.location ?? { sheet: '' },
          `Bloky se odkazují dokola: ${chain.map((step) => `\`${step}\``).join(' → ')}. Náhrada by se nikdy neukončila.`,
          { value: start },
        )
      }

      return
    }

    const block = byId.get(id)
    // A marker pointing at a block that does not exist is reported elsewhere;
    // here it simply ends the walk.
    if (!block) return

    path.push(id)
    for (const variation of block.variations) {
      for (const nested of variation.nestedBlocks) walk(nested, path)
    }
    path.pop()
    settled.add(id)
  }

  for (const block of blocks) walk(block.externalId, [])
}
