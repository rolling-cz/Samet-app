/**
 * An ID one side knows and the other does not. Never skipped: a dropped row
 * would be a wrong number in a document, with nothing pointing at it.
 */
export class UnknownIdError extends Error {
  constructor(
    readonly kind: string,
    readonly id: string | number,
    readonly direction: 'to_database' | 'to_config',
  ) {
    super(
      direction === 'to_database'
        ? `${kind} ${id} from the config has no row in the database`
        : `${kind} row ${id} has no ID the config knows`,
    )
    this.name = 'UnknownIdError'
  }
}
