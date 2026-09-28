// U+200B survives in 5 pages; U+00A0 arrives from &nbsp; inside section labels, where it
// would otherwise defeat an exact match against the label text.
const INVISIBLE = /[​]/g
const SPACE = /[\s ]+/g

export const clean = (value: string) => value.replace(INVISIBLE, '').replace(SPACE, ' ').trim()

export const text = (node: Node | null | undefined) => clean(node?.textContent ?? '')

// Block children become separate lines; <br> and </p> are the only structure worth keeping.
export const lines = (element: Element | null | undefined) => {
  if (!element) return ''
  const html = element.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div)>/gi, '\n$&')
  const clone = element.ownerDocument.createElement('div')
  clone.innerHTML = html
  return (clone.textContent ?? '')
    .split('\n')
    .map(clean)
    .filter((line) => line !== '')
    .join('\n')
}
