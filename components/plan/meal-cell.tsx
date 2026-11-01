'use client'

import Link from 'next/link'
import { Plus, Utensils, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecipePicker } from './recipe-picker'
import type { Slot } from '@/lib/plan/queries'
import { cn } from '@/lib/utils'
import { MAX_RECIPES_PER_MEAL, weekdayName, type MealType } from '@/lib/plan/week'

export const CARD = 'aspect-4/3 w-21 rounded-lg md:w-32'

type Props = {
  date: string
  mealType: MealType
  slots: Slot[]
  onAdd: (recipeId: string) => void
  onRemove: (slot: Slot) => void
}

export function MealCell({ date, mealType, slots, onAdd, onRemove }: Props) {
  const meal = `${weekdayName(date)} ${mealType}`
  const full = slots.length >= MAX_RECIPES_PER_MEAL

  const title = (
    <span className="text-muted-foreground flex h-6 items-center gap-1 text-xs font-normal capitalize">
      {mealType}
      {!full && <Plus className="size-3.5" />}
    </span>
  )
  const picker = {
    disabled: full,
    planned: slots.map((slot) => slot.recipe_id),
    label: `Add recipe to ${meal}`,
    onPick: onAdd,
  }
  const pickerClass = 'group/add h-auto p-0 hover:bg-transparent dark:hover:bg-transparent'

  if (!slots.length)
    return (
      <div className="flex shrink-0 snap-start">
        <RecipePicker {...picker} className={cn(pickerClass, 'flex-col items-start gap-1')}>
          {title}
          <span
            className={cn(
              CARD,
              'bg-foreground/3 group-hover/add:bg-foreground/6 text-muted-foreground/60 grid place-items-center',
            )}
          >
            <Plus />
          </span>
        </RecipePicker>
      </div>
    )

  return (
    <div className="shrink-0">
      <div className="mb-1 flex items-center gap-2">
        {/* The extended hit area keeps the small label an easy tap target. */}
        <RecipePicker
          {...picker}
          className={cn(
            pickerClass,
            'hover:[&>span]:text-foreground relative after:absolute after:-inset-2',
          )}
        >
          {title}
        </RecipePicker>
        {full && (
          <span className="text-muted-foreground text-xs">Full ({MAX_RECIPES_PER_MEAL} max)</span>
        )}
      </div>
      <ul className="flex gap-2">
        {slots.map((slot) => (
          <li key={slot.id} className={cn(CARD, 'group/slot relative snap-start overflow-hidden')}>
            <Link
              href={`/recipes/${slot.recipes.slug}`}
              title={slot.recipes.name}
              className="bg-foreground/8 relative grid size-full place-items-center hover:[&_p]:underline max-md:content-start max-md:pt-2"
            >
              <Utensils aria-hidden className="text-muted-foreground/60 size-4 md:mb-6 md:size-5" />
              <div className="absolute inset-x-0 bottom-0 px-2 pb-1.5">
                <p className="line-clamp-2 text-xs leading-snug font-medium">{slot.recipes.name}</p>
              </div>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-1 right-1 size-6 rounded-full px-0 opacity-0 shadow-xs group-hover/slot:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
              aria-label={`Remove ${slot.recipes.name} from ${meal}`}
              onClick={() => onRemove(slot)}
            >
              <X />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
