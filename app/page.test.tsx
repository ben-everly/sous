import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import Page from './page'

test('Page renders correctly', () => {
  render(<Page />)
  expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
})
