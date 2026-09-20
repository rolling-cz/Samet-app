import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppHeader, RunThemeRoot } from '@/components'
import { defaultChapterNumber } from '@/core'
import { CompletionProvider } from '@/core/providers/CompletionProvider'
import { loadRunCompletion } from '@/core/services/load-run-completion'
import { loadRunShell } from '@/core/services/load-run-shell'
import { readAuthor } from '@/core/services/auth-cookies'
import { CharacterPanel, loadCharacterList } from '@/features/postavy'
import { runThemeKey } from '@/theme/run-theme'
import styles from './layout.module.css'

export const dynamic = 'force-dynamic'

interface RunLayoutProps {
  children: ReactNode
  params: Promise<{ runId: string }>
}

/** Every run screen: coloured top bar, character panel, section content (§6.4). */
const RunLayout = async ({ children, params }: RunLayoutProps) => {
  const { runId } = await params
  const shell = await loadRunShell(runId)
  if (!shell) notFound()

  const [characters, author, completion] = await Promise.all([
    loadCharacterList(shell.run.id),
    readAuthor(),
    loadRunCompletion(
      shell.run.id,
      shell.chapters.map((chapter) => chapter.number),
    ),
  ])

  return (
    <RunThemeRoot themeKey={runThemeKey(shell.run.letter)}>
      <AppHeader run={shell.run} runs={shell.runs} chapters={shell.chapters} author={author} />
      <CompletionProvider initial={completion}>
        <div className={styles.body}>
          <CharacterPanel
            runId={shell.run.id}
            characters={characters}
            defaultChapter={defaultChapterNumber(shell.chapters)}
          />
          <main className={styles.main} data-testid="run-main">
            {children}
          </main>
        </div>
      </CompletionProvider>
    </RunThemeRoot>
  )
}

export default RunLayout
