import type { MergeDeep } from 'type-fest'
import type { Directions, Ingredients, Nutrition } from '@/lib/recipes/types'
import type { Database as Generated } from './database-generated.types'

export type Database = MergeDeep<
  Generated,
  {
    public: {
      Tables: {
        recipes: {
          Row: { ingredients: Ingredients; directions: Directions; nutrition: Nutrition | null }
          Insert: { ingredients: Ingredients; directions: Directions; nutrition?: Nutrition | null }
          Update: {
            ingredients?: Ingredients
            directions?: Directions
            nutrition?: Nutrition | null
          }
        }
      }
    }
  }
>

export type { Json } from './database-generated.types'
