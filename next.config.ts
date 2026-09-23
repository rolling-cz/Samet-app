import type { NextConfig } from 'next'

/** Everything the PDF renderer reads from disk: fonts and the emblem. */
const PDF_ASSETS = './src/documents/pdf/assets/**'

/**
 * `pdfkit` is on Next's default list of server-external packages, so it runs
 * from `node_modules` — and loads its standard fonts through a subpath import
 * (`#standard-fonts/Helvetica`), which file tracing does not follow. Untraced,
 * the deployed function fails with `Cannot find module
 * …/pdfkit/js/standard-fonts/Helvetica.cjs` while a local run works.
 */
const PDFKIT_RUNTIME_FILES = ['./node_modules/pdfkit/js/standard-fonts/**', './node_modules/pdfkit/js/data/**']

const nextConfig: NextConfig = {
  typedRoutes: true,
  // react-pdf and `marked` ship as ESM only — their `exports` declare no
  // `require` condition — so they must NOT go into `serverExternalPackages`:
  // the server bundle is CommonJS and would fail to require them. Letting the
  // bundler resolve them applies the `import` condition instead.
  //
  // The assets are read by path at runtime, which the bundler cannot see. Left
  // untraced they would be missing from the deployed function — and a missing
  // font falls back to a face with no Czech diacritics.
  outputFileTracingIncludes: {
    '/beh/[runId]/kapitola/[chapter]/vystupy/**': [PDF_ASSETS, ...PDFKIT_RUNTIME_FILES],
  },
  experimental: {
    // Config import posts the .xlsx plus a batch of .md templates through a
    // server action; the 1 MB default is not enough. Vercel caps requests at
    // 4.5 MB, so raising it further would not help.
    serverActions: { bodySizeLimit: '4mb' },
  },
}

export default nextConfig
