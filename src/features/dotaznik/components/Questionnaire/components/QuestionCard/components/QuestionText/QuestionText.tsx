import { memo, useMemo } from 'react'
import { parseInlineMarkdown } from '@/documents/markdown/parse-markdown'
import styles from './QuestionText.module.css'

interface QuestionTextProps {
  /** Inline Markdown: bold and italic from the cell in `N_Questions` (§8.2). */
  text: string
}

/** The question as the author formatted it; the text never reaches the page as HTML. */
export const QuestionText = memo(function QuestionText({ text }: QuestionTextProps) {
  const parts = useMemo(() => parseInlineMarkdown(text), [text])

  return (
    <>
      {parts.map((part, index) => (
        <span key={index} className={styles.part} data-emphasis={part.emphasis}>
          {part.text}
        </span>
      ))}
    </>
  )
})
