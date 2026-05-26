export { updateSession as proxy } from '@/lib/supabase/proxy'

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp|avif|woff2|woff|ttf|otf)$).*)',
  ],
}
