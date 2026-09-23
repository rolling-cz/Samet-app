/**
 * Registering the document fonts with react-pdf.
 *
 * Three things this file exists to get right:
 *
 *  - **Local files, never a URL.** A registered URL is fetched when the font is
 *    first needed, so a render would depend on the network — and on Vercel, on
 *    a cold start finishing it in time. `fontkit` opens a path straight from
 *    disk instead.
 *  - **The load is awaited.** `Font.register` only records the source; it is
 *    `Font.load` that reads it, and `renderToBuffer` does not wait on its own.
 *    Render before that and react-pdf dies on a null font rather than falling
 *    back — loud, but only at the moment the org wants to print. `render-pdf.ts`
 *    awaits this first, and a test holds the embedded font names.
 *  - **Hyphenation is switched off.** react-pdf hyphenates with English rules
 *    and would break Czech words in the wrong places.
 *
 * Urbanist ships from Google Fonts only as a variable font, which react-pdf
 * renders in its default instance whatever `fontWeight` says; these are the
 * static cuts from the upstream repository instead.
 */
import path from 'node:path'
import { Font } from '@react-pdf/renderer'
import { DOCUMENT_THEME } from './document-theme'

/**
 * Resolved against the working directory, which is the repository root both
 * locally and in a Vercel function. `next.config.ts` traces this folder into
 * the bundle — `public/` would not do, it is served from the CDN and never
 * reaches the function's file system.
 */
const ASSETS = path.join(process.cwd(), 'src', 'documents', 'pdf', 'assets')

export const assetPath = (name: string): string => path.join(ASSETS, name)

/**
 * One registration per process; awaited before every render. A failed one is
 * forgotten, so the next render tries again instead of failing for the rest of
 * the instance's life.
 */
let registration: Promise<void> | undefined

export const registerDocumentFonts = (): Promise<void> => {
  registration ??= (async () => {
    Font.register({
      family: DOCUMENT_THEME.font.body,
      fonts: [
        { src: assetPath('Urbanist-Regular.ttf') },
        { src: assetPath('Urbanist-Medium.ttf'), fontWeight: 500 },
        { src: assetPath('Urbanist-Bold.ttf'), fontWeight: 700 },
        { src: assetPath('Urbanist-Italic.ttf'), fontStyle: 'italic' },
      ],
    })
    Font.register({ family: DOCUMENT_THEME.font.display, src: assetPath('RubikMonoOne-Regular.ttf') })
    Font.registerHyphenationCallback((word) => [word])

    await Promise.all([
      Font.load({ fontFamily: DOCUMENT_THEME.font.body }),
      Font.load({ fontFamily: DOCUMENT_THEME.font.display }),
    ])
  })().catch((cause: unknown) => {
    registration = undefined
    throw cause
  })

  return registration
}
