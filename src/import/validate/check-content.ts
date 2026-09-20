import { DEFAULT_CONDITION } from '../expression'
import type { IssueCollector } from '../issue-collector'
import type { ParsedBlock } from '../types/parsed-block'
import type { ParsedConfig } from '../types/parsed-config'
import { suggestClosest } from '../utils/suggest-closest'
import { checkBlockCycles } from './check-block-cycles'
import { answersUpTo, checkConditionReferences, type ReferenceScope } from './check-references'
import { householdResourceIds, knownResourceIds, knownScaleIds } from './known-scale-ids'
import { usesPriorities, variationOrder } from './variation-order'

export const checkContent = (
  config: ParsedConfig,
  characterIds: Set<string>,
  groupIds: Set<string>,
  issues: IssueCollector,
): void => {
  const knownOwners = [...characterIds, ...groupIds]
  const scaleIds = knownScaleIds(config)
  const resourceIds = new Set([...knownResourceIds(config), ...householdResourceIds(config)])

  for (const [chapter, blocks] of config.blocks) {
    const scope: ReferenceScope = {
      chapter,
      // A character's state carries forward, so a chapter-2 condition may read a
      // chapter-1 answer — the spec's own example mixes chapters (§4.5).
      answerIds: answersUpTo(config.questions, chapter),
      scaleIds,
      resourceIds,
    }

    for (const block of blocks) {
      if (block.characterId === undefined && block.groupId === undefined) {
        issues.error(
          'neznama_postava',
          block.location,
          `Blok \`${block.externalId}\` je vedený na \`${block.ownerRef}\`, což není postava z listu \`Characters\` ani skupina z listu \`Groups\`.`,
          { value: block.ownerRef, suggestion: suggestClosest(block.ownerRef, knownOwners) },
        )
      }

      for (const variation of block.variations) {
        checkConditionReferences(
          variation.condition,
          `Podmínka varianty \`${variation.externalId}\``,
          variation.location,
          scope,
          issues,
        )
      }
      checkOrdering(block, issues)
    }

    checkBlockCycles(blocks, issues)
  }
}

/**
 * §8.2: variants are walked in order and the first match wins. Three things can
 * go wrong, and all three make the result depend on something the author did
 * not intend.
 */
const checkOrdering = (block: ParsedBlock, issues: IssueCollector): void => {
  if (usesPriorities(block)) {
    const missing = block.variations.filter((variation) => variation.priority === undefined)
    if (missing.length > 0) {
      issues.error(
        'chybejici_priorita',
        block.location,
        `Blok \`${block.externalId}\` má prioritu jen u části variant (chybí u ${missing.map((v) => `\`${v.externalId}\``).join(', ')}) — pořadí by nebylo jednoznačné. Vyplňte ji u všech, nebo u žádné.`,
        { value: block.externalId },
      )
    }

    const byPriority = new Map<number, string[]>()
    for (const variation of block.variations) {
      if (variation.priority === undefined) continue
      const sharing = byPriority.get(variation.priority) ?? []
      sharing.push(variation.externalId)
      byPriority.set(variation.priority, sharing)
    }

    for (const [priority, sharing] of byPriority) {
      if (sharing.length < 2) continue
      issues.error(
        'stejna_priorita',
        block.location,
        `Varianty ${sharing.map((v) => `\`${v}\``).join(', ')} bloku \`${block.externalId}\` mají stejnou prioritu ${priority} — výsledek by závisel na pořadí řádků.`,
        { value: String(priority) },
      )
    }
  }

  const ordered = variationOrder(block)
  const fallbackAt = ordered.findIndex((variation) => variation.isFallback)

  if (fallbackAt === -1) {
    issues.error(
      'blok_bez_default',
      block.location,
      `Blok \`${block.externalId}\` nemá záložní variantu (prázdná podmínka nebo \`${DEFAULT_CONDITION}\`) — když neprojde žádná podmínka, značka v dokumentu nevrátí nic.`,
      { value: block.externalId },
    )

    return
  }

  // The fallback is always true, so anything after it can never be reached.
  for (const variation of ordered.slice(fallbackAt + 1)) {
    issues.error(
      'nedosazitelna_varianta',
      variation.location,
      `Varianta \`${variation.externalId}\` stojí až za záložní variantou \`${ordered[fallbackAt]?.externalId}\`, která platí vždy — nikdy se nepoužije.`,
      { value: variation.externalId },
    )
  }
}
