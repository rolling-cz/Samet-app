import Typography from '@mui/material/Typography'
import Link from 'next/link'
import type { CharacterStateView, PersonView, ResourceView } from '@/computation'
import { chapterRoute, DEFAULT_CHAPTER_SECTION } from '@/core'
import { common } from '@/locales/cs/common'
import { dotaznik } from '@/locales/cs/dotaznik'
import styles from './CharacterStatePanel.module.css'

interface CharacterStatePanelProps {
  runId: string
  chapter: number
  state: CharacterStateView
  partners: readonly PersonView[]
}

interface AccountProps {
  testId: string
  resources: readonly ResourceView[]
}

const Account = ({ testId, resources }: AccountProps) => (
  <dl className={styles.values} data-testid={testId}>
    {resources.map((resource) => (
      <div key={resource.key} className={styles.value}>
        <dt>{resource.label}</dt>
        <dd>{resource.value}</dd>
      </div>
    ))}
  </dl>
)

/**
 * The character's state before the chapter (§6.4) — a snapshot, never an
 * estimate from the answers above it; that would be the engine in the browser.
 * The personal account shows next to the joint one: a marriage does not end it (§4.4).
 */
export const CharacterStatePanel = ({ runId, chapter, state, partners }: CharacterStatePanelProps) => (
  <section className={styles.panel} data-testid={`character-state--${state.characterId}`}>
    <header className={styles.head}>
      <Typography variant="subtitle2" component="h2">
        {dotaznik.stateTitle(chapter)}
      </Typography>
      <Typography variant="caption" className={styles.muted}>
        {dotaznik.stateNote}
      </Typography>
    </header>

    <div className={styles.columns}>
      <div>
        <Typography variant="caption" component="h3" className={styles.muted}>
          {dotaznik.scales}
        </Typography>
        {state.scales.length === 0 ? (
          <Typography variant="body2" className={styles.muted}>
            {dotaznik.noScales}
          </Typography>
        ) : (
          <dl className={styles.values}>
            {state.scales.map((scale) => (
              <div key={scale.externalId} className={styles.value} data-testid={`scale--${scale.externalId}`}>
                <dt>{scale.label}</dt>
                <dd>{dotaznik.scaleValue(scale.value, scale.min, scale.max)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div>
        <Typography variant="caption" component="h3" className={styles.muted}>
          {dotaznik.resources} — {dotaznik.personalAccountLabel}
        </Typography>
        {state.resources.length === 0 ? (
          <Typography variant="body2" className={styles.muted}>
            {dotaznik.noResources}
          </Typography>
        ) : (
          <Account testId="account--personal" resources={state.resources} />
        )}
      </div>

      {state.household && (
        <div className={styles.joint} data-testid={`account--${state.household.householdId}`}>
          <Typography variant="caption" component="h3" className={styles.badge}>
            {dotaznik.jointAccountWith}{' '}
            {partners.map((partner) => (
              <Link
                key={partner.id}
                href={chapterRoute(runId, chapter, DEFAULT_CHAPTER_SECTION, partner.id)}
                className={styles.partner}
                data-testid={`joint-account-partner--${partner.id}`}
              >
                {common.fullName(partner.firstName, partner.lastName)}
              </Link>
            ))}
          </Typography>
          <Account testId="account--joint" resources={state.household.resources} />
        </div>
      )}
    </div>
  </section>
)
