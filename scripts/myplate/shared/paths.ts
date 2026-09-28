import { join } from 'node:path'

// Capture writes here and parse reads from here; keeping the layout in one module stops the
// two halves from agreeing only by matching string literals.
export const CORPUS_ROOT = 'data/myplate'

export const pagesDir = (root: string = CORPUS_ROOT) => join(root, 'pages')
