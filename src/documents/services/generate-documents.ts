/**
 * A chapter's documents, filled and ready to be read, printed or packed (§8.3).
 *
 *   šablona z archivu + varianty z přepočtu + proměnné ze stavu → `.md`
 *
 * The documents of chapter N are filled from the **baseline computation of
 * chapter N−1**: `2_Content` describes what chapter 1 did, and its blocks were
 * decided when chapter 1 was computed (§8.2). Chapter 1 needs no computation at
 * all — the run has no `1_Content` and those templates are fixed text.
 *
 * Nothing that cannot be produced is thrown: like `ComputationOutcome`, the
 * reasons come back as data, so the screen can say which one it is.
 */
import { forRun } from '@/db'
import { isChapterNumber, type ChapterNumber, type EngineConfig, type RunState } from '@/engine'
import { loadChapterContext } from '@/computation/read/load-chapter-context'
import { loadStateBefore } from '@/computation/read/load-state-before'
import { loadEngineConfig } from '@/computation/services/load-engine-config'
import { documentFileName } from '../constants/output-names'
import { blockTextsFor } from '../fill/block-texts'
import { fillTemplate } from '../fill/fill-template'
import { variablesFor } from '../fill/variables'
import type { DocumentOwner, GeneratedDocument } from '../types/document'
import type { OutputOverview } from '../types/overview'
import { personLabel } from '@/utils/person-label'
import { outputOverview } from '../convert/output-overview'
import { templateKey, type ArchivedTemplate } from '../convert/pick-newest-templates'
import { planDownloads } from '@/import/google/download-plan'
import { loadTemplates } from './load-templates'

/** An owner the config expects a document from, with no template uploaded (§10.2). */
export interface MissingTemplate {
  owner: DocumentOwner
  ownerLabel: string
}

export type DocumentSet =
  | {
      _type: 'ready'
      chapter: ChapterNumber
      /** The computation the variants came from; absent for chapter 1. */
      computationId?: string
      computationVersion?: number
      documents: GeneratedDocument[]
      missingTemplates: MissingTemplate[]
      /** The Přehled tab, from the very state and config the documents were filled from. */
      overview: OutputOverview
    }
  /** Chapter N≥2 with no confirmed computation of N−1 to fill from. */
  | { _type: 'blocked'; missingChapter: number }
  | { _type: 'no_config' }
  | { _type: 'config_unusable'; filename: string; errors: string[] }
  | { _type: 'unknown_chapter'; chapter: number }

export const generateDocuments = async (runId: string, chapter: number): Promise<DocumentSet> => {
  if (!isChapterNumber(chapter)) return { _type: 'unknown_chapter', chapter }

  const scope = forRun(runId)
  const [context, loaded, templates] = await Promise.all([
    loadChapterContext(scope, chapter),
    loadEngineConfig(scope),
    loadTemplates(scope),
  ])
  if (context._type === 'blocked') return { _type: 'blocked', missingChapter: context.missingChapter }
  if (loaded._type === 'no_config') return { _type: 'no_config' }
  if (loaded._type === 'unusable') {
    return { _type: 'config_unusable', filename: loaded.filename, errors: loaded.errors }
  }

  const state = await loadStateBefore(scope, context, chapter)

  const documents: GeneratedDocument[] = []
  const missingTemplates: MissingTemplate[] = []
  // The same plan „Obnovit z Google" downloads from, so the link and the refresh agree.
  const googleUrls = new Map(
    planDownloads(loaded.parsed)
      .jobs.filter((job) => job.chapter === chapter)
      .map((job) => [templateKey(job.ownerId, chapter), job.editUrl]),
  )

  for (const entry of ownersOf(loaded.config)) {
    const key = templateKey(entry.owner.id, chapter)
    const found = templates.byOwner.get(key)
    if (found === undefined) {
      missingTemplates.push({ owner: entry.owner, ownerLabel: entry.label })
      continue
    }

    documents.push(fillOne(loaded.config, state, chapter, entry, found, googleUrls.get(key)))
  }

  return {
    _type: 'ready',
    chapter,
    computationId: context.baselineId,
    computationVersion: context.baselineVersion,
    documents,
    missingTemplates,
    overview: outputOverview(loaded.config, state, chapter),
  }
}

interface OwnerEntry {
  owner: DocumentOwner
  /** `Marie Balážová` / `Funkcionáři` — what the org reads in the list. */
  label: string
  /** Surname, or a group's name: the readable half of the file name (§10.4). */
  namePart: string
}

const ownersOf = (config: EngineConfig): OwnerEntry[] => [
  ...config.characters.map((character) => ({
    owner: { kind: 'character', id: character.id } as const,
    label: personLabel(character.firstName, character.lastName, character.id),
    namePart: character.lastName,
  })),
  ...config.groups.map((group) => ({
    owner: { kind: 'group', id: group.id } as const,
    label: group.name,
    namePart: group.name,
  })),
]

const fillOne = (
  config: EngineConfig,
  state: RunState,
  chapter: ChapterNumber,
  { owner, label, namePart }: OwnerEntry,
  archived: ArchivedTemplate,
  googleUrl: string | undefined,
): GeneratedDocument => {
  const { markdown } = archived.template
  const { texts } = blockTextsFor(config, state.selectedVariants, owner, chapter)
  const filled = fillTemplate({ markdown, blockTexts: texts, variables: variablesFor(config, state, owner) })

  return {
    owner,
    ownerLabel: label,
    chapter,
    fileName: documentFileName(owner, namePart, 'md'),
    markdown: filled.markdown,
    problems: filled.problems,
    template: {
      uploadFilename: archived.uploadFilename,
      uploadedAt: archived.uploadedAt,
      fromGoogle: archived.template.fromGoogle === true,
      ...(googleUrl === undefined ? {} : { googleUrl }),
    },
  }
}
