import { UnknownIdError } from '../errors/unknownIdError'

export interface IdPair<K extends string | number = string> {
  /** Database key. */
  id: string
  /** The ID the author writes in the workbook, which is what the engine speaks. */
  externalId: K
}

/** One entity kind, both ways. An unknown ID is an error in either direction. */
export class IdLookup<K extends string | number = string> {
  private readonly dbIds = new Map<K, string>()
  private readonly externalIds = new Map<string, K>()

  constructor(
    readonly kind: string,
    pairs: readonly IdPair<K>[],
  ) {
    for (const pair of pairs) {
      this.dbIds.set(pair.externalId, pair.id)
      this.externalIds.set(pair.id, pair.externalId)
    }
  }

  toDb(externalId: K): string {
    const id = this.dbIds.get(externalId)
    if (id === undefined) throw new UnknownIdError(this.kind, externalId, 'to_database')

    return id
  }

  toExternal(id: string): K {
    const externalId = this.externalIds.get(id)
    if (externalId === undefined) throw new UnknownIdError(this.kind, id, 'to_config')

    return externalId
  }

  has(externalId: K): boolean {
    return this.dbIds.has(externalId)
  }

  allExternal(): K[] {
    return [...this.dbIds.keys()]
  }

  /** A copy that also knows `pairs` — households founded by the computation being saved. */
  with(pairs: readonly IdPair<K>[]): IdLookup<K> {
    const known: IdPair<K>[] = []
    for (const [externalId, id] of this.dbIds) known.push({ id, externalId })

    return new IdLookup(this.kind, [...known, ...pairs])
  }
}
