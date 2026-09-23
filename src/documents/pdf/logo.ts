/**
 * The emblem, kept as vector.
 *
 * react-pdf's `<Image>` takes raster data only, but its `<Svg>` primitives draw
 * paths directly — so the logo prints crisp at any size and the repository
 * carries no generated PNG next to the source.
 *
 * Only the subset the emblem actually uses is understood: `<path>` with `d` and
 * `fill`. Anything else (groups, transforms, gradients, clip paths) would change
 * how the drawing looks, so a replacement logo using them **fails loudly** here
 * rather than printing a mangled emblem on 23 documents.
 */
import { readFileSync } from 'node:fs'
import { assetPath } from './fonts'

export interface LogoPath {
  d: string
  fill: string
}

export interface LogoArtwork {
  viewBox: string
  paths: LogoPath[]
}

const LOGO_FILE = 'logo.svg'

/** Elements beyond a plain `<path>` that would need real SVG semantics. */
const UNSUPPORTED = /<(g|use|image|text|style|defs|mask|clipPath|linearGradient|radialGradient|pattern|filter)[\s>]/

const attribute = (tag: string, name: string): string | undefined =>
  new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]

const parseLogo = (svg: string): LogoArtwork => {
  const unsupported = UNSUPPORTED.exec(svg)
  if (unsupported) {
    throw new Error(
      `${LOGO_FILE} obsahuje <${unsupported[1]}>, který se do PDF nevykreslí. ` +
        'Ulož logo jako plochý obrys (jen <path> s atributy d a fill).',
    )
  }

  const root = /<svg[^>]*>/.exec(svg)?.[0] ?? ''
  const viewBox =
    attribute(root, 'viewBox') ??
    `0 0 ${attribute(root, 'width') ?? '0'} ${attribute(root, 'height') ?? '0'}`

  const paths: LogoPath[] = []
  for (const [tag] of svg.matchAll(/<path[^>]*>/g)) {
    const d = attribute(tag, 'd')
    if (d === undefined) continue
    const fill = attribute(tag, 'fill') ?? 'black'
    // `fill="none"` on a path with no stroke draws nothing.
    if (fill === 'none') continue
    paths.push({ d, fill })
  }

  if (paths.length === 0) throw new Error(`${LOGO_FILE} neobsahuje žádný vykreslitelný <path>.`)

  return { viewBox, paths }
}

let artwork: LogoArtwork | undefined

/** Read once per process; the file ships with the bundle and never changes at runtime. */
export const documentLogo = (): LogoArtwork => {
  artwork ??= parseLogo(readFileSync(assetPath(LOGO_FILE), 'utf8'))

  return artwork
}
