import type { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import { recipeJsonLd, serializeJsonLd } from '@/lib/recipes/json-ld'
import { nutritionFacts } from '@/lib/recipes/nutrition'
import { recipeUrl } from '@/lib/recipes/urls'
import { getRecipe } from './get-recipe'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params
  const recipe = await getRecipe(slug)
  if (!recipe) notFound()
  const title = recipe.name
  const description = recipe.description ?? `${recipe.name}, a recipe on Sous.`
  const canonical = recipeUrl(slug)
  // A child openGraph/twitter object replaces the parent's wholesale, dropping
  // the root file-based default images unless carried over.
  const { openGraph, twitter } = await parent
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: 'article', title, description, url: canonical, images: openGraph?.images },
    twitter: { card: 'summary_large_image', title, description, images: twitter?.images },
  }
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params
  const recipe = await getRecipe(slug)
  if (!recipe) notFound()
  const nutrition = nutritionFacts(recipe.nutrition)

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(recipeJsonLd(recipe, recipeUrl(slug))),
        }}
      />
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{recipe.name}</h1>
        {recipe.description && <p className="text-muted-foreground">{recipe.description}</p>}
        {recipe.yield && (
          <p className="text-sm">
            <span className="font-medium">Yield:</span> {recipe.yield}
          </p>
        )}
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Ingredients</h2>
        {recipe.ingredients.map((section, i) => (
          <div key={i} className="space-y-2">
            {section.name && <h3 className="font-medium">{section.name}</h3>}
            <ul className="list-disc space-y-1 pl-6">
              {section.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Directions</h2>
        {recipe.directions.map((section, i) => (
          <div key={i} className="space-y-2">
            {section.name && <h3 className="font-medium">{section.name}</h3>}
            <ol className="list-decimal space-y-2 pl-6">
              {section.steps.map((step, j) => (
                <li key={j}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      {nutrition.rows.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Nutrition facts</h2>
          {nutrition.servingSize && (
            <p className="text-muted-foreground text-sm">Per serving: {nutrition.servingSize}</p>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
            {nutrition.rows.map(({ label, value }) => (
              <div key={label} className="contents">
                <dt className="font-medium">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {recipe.notes && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Notes</h2>
          <p className="whitespace-pre-line">{recipe.notes}</p>
        </section>
      )}

      {recipe.contributor && (
        <footer className="text-muted-foreground border-t pt-4 text-sm whitespace-pre-line">
          {recipe.contributor}
        </footer>
      )}
    </main>
  )
}
