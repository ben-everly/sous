import { defineConfig } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'

const eslintConfig = defineConfig([
  // Nested worktrees are separate checkouts, not part of this one's source.
  { ignores: ['.claude/worktrees/**'] },
  ...nextVitals,
  ...nextTs,
  prettier,
])

export default eslintConfig
