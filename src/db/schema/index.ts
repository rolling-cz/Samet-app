/**
 * The single source of truth about database structure — migrations are
 * generated from it (`npm run db:generate`), never written by hand.
 *
 * Architecture rules the schema enforces:
 *  1. `run_id` in every game-data table; every in-run reference is a composite
 *     foreign key `(run_id, id)`, so two runs' data cannot meet.
 *  2. Nothing is deleted: every foreign key is `on delete restrict`.
 *  3. State is versioned, not overwritten: snapshots carry `computation_id`.
 *  4. `audit_log` is append-only, enforced by a trigger in `db/sql/`.
 */
export * from './enums'
export * from './runs'
export * from './uploads'
export * from './characters'
export * from './households'
export * from './scales'
export * from './resources'
export * from './questions'
export * from './effects'
export * from './computations'
export * from './character-state'
export * from './household-state'
export * from './dice-rolls'
export * from './content'
export * from './templates'
export * from './audit'
