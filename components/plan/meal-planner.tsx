'use client'

import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { CARD, MealCell } from './meal-cell'
import { useMealPlan } from './use-meal-plan'
import { useKitchens } from '@/components/kitchens/use-kitchens'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription } from '@/components/ui/empty'
import { LoadError } from '@/components/load-error'
import { currentKitchen } from '@/lib/kitchens/current-kitchen'
import { useToday } from '@/lib/hooks/use-today'
import { parseISO } from 'date-fns'
import { MEAL_TYPES, dayLabel, weekOf, weekRange, weekdayName } from '@/lib/plan/week'
import { cn } from '@/lib/utils'

const DAY = 'bg-card ring-foreground/8 flex min-w-0 rounded-xl p-2.5 ring-1'
// Opaque, so the pinned date (which inherits it) hides cards scrolling beneath; light enough
// to keep muted text above 4.5:1.
const PAST = 'bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))]'
// Shared by both fold states, so folding a past day never moves its chevron.
const TOGGLE = 'absolute top-3.5 right-1.5 grid size-6 place-items-center'

function Skeleton() {
  return (
    <div role="status" className="mt-6 grid gap-2">
      <span className="sr-only">Loading plan</span>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} aria-hidden className={cn(DAY, 'animate-pulse gap-3 md:gap-5')}>
          <div className="flex w-7 shrink-0 flex-col justify-center gap-2.5 md:w-14 md:pl-0.5">
            <div className="bg-muted h-5 w-6 rounded md:h-7 md:w-8" />
            <div className="bg-muted h-3 w-7 rounded" />
          </div>
          {MEAL_TYPES.map((meal) => (
            <div key={meal} className="flex flex-col gap-2 pt-1.5 pb-2.5">
              <div className="bg-muted h-3 w-14 rounded" />
              <div className={cn(CARD, 'bg-muted')} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

const noop = () => () => {}

function Header({
  dates,
  note,
  children,
}: {
  dates: string[]
  note?: ReactNode
  children: ReactNode
}) {
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-3xl font-bold tracking-tight">This week</h1>
        {/* Browser-only: the server's locale and clock can format a different range. */}
        {mounted && <span className="text-muted-foreground text-lg">{weekRange(dates)}</span>}
        {note && (
          <p className="text-muted-foreground basis-full text-sm sm:ml-auto sm:basis-auto">
            {note}
          </p>
        )}
      </div>
      {children}
    </>
  )
}

function NotReady({
  status,
  message,
  onRetry,
}: {
  status: 'loading' | 'error'
  message: string
  onRetry: () => void
}) {
  return status === 'loading' ? <Skeleton /> : <LoadError message={message} onRetry={onRetry} />
}

function DateLabel({ date, isToday, row }: { date: string; isToday?: boolean; row?: boolean }) {
  const { weekday, day, full } = dayLabel(date)
  return (
    <h2 aria-current={isToday ? 'date' : undefined} className="shrink-0">
      <span className="sr-only">{full}</span>
      <span
        aria-hidden
        className={cn('flex items-center gap-2', !row && 'flex-col items-start gap-2.5 md:gap-4')}
      >
        <span
          className={cn(
            'grid place-items-center text-xl leading-none font-semibold tabular-nums',
            !row && 'md:text-3xl',
            row && 'h-8 min-w-8',
            // Drawn behind the digits so today lays out exactly like the other days.
            isToday &&
              'text-background relative isolate before:absolute before:top-1/2 before:left-1/2 before:-z-10 before:size-7 before:-translate-1/2 before:rounded-full before:bg-foreground/70 md:before:size-11',
          )}
        >
          {/* Trims to the digits, so they line up with the cards and centre in the circle. */}
          <span className="[text-box:trim-both_cap_alphabetic]">{day}</span>
        </span>
        <span className={cn('text-muted-foreground text-sm', !row && 'max-md:text-xs')}>
          {weekday}
        </span>
      </span>
    </h2>
  )
}

function Strip({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: -1 | 1) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' })

  return (
    <div className="group/strip relative -mx-2.5 flex min-w-0 flex-1 bg-inherit [timeline-scope:--strip] md:mr-0">
      <div
        ref={ref}
        className="scroll-fade-x flex min-w-0 flex-1 snap-x scroll-px-2.5 gap-3 overflow-x-auto bg-inherit px-2.5 pb-2.5 [scroll-timeline:--strip_x] [scrollbar-width:none] max-md:snap-mandatory md:scroll-pl-21.5 md:gap-5 md:px-0 md:[--scroll-fade-inset:calc(var(--spacing)*16.5)]"
      >
        {children}
      </div>
      <ScrollArrow
        side="left"
        onClick={() => scroll(-1)}
        className="scroll-arrow-left left-1 md:left-17.5"
      />
      <ScrollArrow side="right" onClick={() => scroll(1)} className="scroll-arrow-right right-1" />
    </div>
  )
}

// Mouse-only: keyboard users reach every card by Tab, which scrolls it into view.
function ScrollArrow({
  side,
  onClick,
  className,
}: {
  side: 'left' | 'right'
  onClick: () => void
  className: string
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <Button
      variant="outline"
      size="sm"
      aria-hidden
      tabIndex={-1}
      aria-label={`Scroll ${side}`}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 z-20 hidden size-8 -translate-y-1/2 rounded-full p-0 opacity-0 shadow-sm transition-opacity group-hover/strip:opacity-100 mouse:flex',
        className,
      )}
    >
      <Icon />
    </Button>
  )
}

export function MealPlanner({ kitchenId }: { kitchenId: string }) {
  const today = useToday()
  const [dates] = useState(() => weekOf(parseISO(today)))
  const plan = useMealPlan(kitchenId, dates[0], dates[6])
  const [opened, setOpened] = useState<string[]>([])

  if (plan.status !== 'ready')
    return (
      <Header dates={dates}>
        <NotReady status={plan.status} message="Could not load your plan." onRetry={plan.retry} />
      </Header>
    )

  const planned = dates.flatMap((date) =>
    MEAL_TYPES.filter((meal) => plan.slotsFor(date, meal).length),
  ).length
  const toggle = (date: string) =>
    setOpened((o) => (o.includes(date) ? o.filter((d) => d !== date) : [...o, date]))

  return (
    <Header dates={dates} note={`${planned} of ${dates.length * MEAL_TYPES.length} meals planned`}>
      <div className="mt-6 grid gap-2">
        {dates.map((date) => {
          const past = date < today
          if (past && !opened.includes(date)) {
            const names = MEAL_TYPES.flatMap((meal) =>
              plan.slotsFor(date, meal).map((slot) => slot.recipes.name),
            )
            return (
              <section
                key={date}
                className={cn(DAY, PAST, 'hover:ring-foreground/20 relative items-center gap-4')}
              >
                <DateLabel date={date} row />
                {/* Its ::after stretches over the row, so the date expands it too. */}
                <button
                  type="button"
                  aria-expanded={false}
                  aria-label={`Show ${weekdayName(date)}`}
                  onClick={() => toggle(date)}
                  className="text-muted-foreground min-w-0 flex-1 truncate pr-6 text-left text-sm after:absolute after:inset-0 after:rounded-xl"
                >
                  {names.length ? names.join(', ') : 'Nothing planned'}
                  <ChevronDown className={cn(TOGGLE, 'p-1')} />
                </button>
              </section>
            )
          }
          return (
            <section key={date} className={cn(DAY, 'relative pb-0', past && PAST)}>
              {past && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded
                  aria-label={`Hide ${weekdayName(date)}`}
                  onClick={() => toggle(date)}
                  className={cn(
                    TOGGLE,
                    'text-muted-foreground z-20 bg-inherit px-0 after:absolute after:-inset-x-1 after:-top-1 after:bottom-0',
                  )}
                >
                  <ChevronUp />
                </Button>
              )}
              <Strip>
                <div className="z-10 flex w-7 shrink-0 snap-start flex-col items-start justify-center bg-inherit md:sticky md:left-0 md:w-16.5 md:pl-2.5">
                  <DateLabel date={date} isToday={date === today} />
                </div>
                {MEAL_TYPES.map((meal) => (
                  <MealCell
                    key={meal}
                    date={date}
                    mealType={meal}
                    slots={plan.slotsFor(date, meal)}
                    onAdd={(recipeId) => void plan.add(date, meal, recipeId)}
                    onRemove={(slot) => void plan.remove(slot)}
                  />
                ))}
              </Strip>
            </section>
          )
        })}
      </div>
    </Header>
  )
}

// Stands in for kitchen routing until there's a kitchen switcher.
export function CurrentKitchenPlanner() {
  const { kitchens, status, retry } = useKitchens()
  // Only labels the header until MealPlanner pins its own week.
  const dates = weekOf(parseISO(useToday()))

  if (status !== 'ready')
    return (
      <Header dates={dates}>
        <NotReady status={status} message="Could not load your kitchens." onRetry={retry} />
      </Header>
    )

  const kitchen = currentKitchen(kitchens)
  if (!kitchen)
    return (
      <Header dates={dates}>
        <Empty className="mt-6 border">
          <EmptyDescription>Create a kitchen to start planning.</EmptyDescription>
          <EmptyContent>
            <Button asChild>
              <Link href="/settings/kitchens">Go to kitchens</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </Header>
    )

  return <MealPlanner kitchenId={kitchen.id} />
}
