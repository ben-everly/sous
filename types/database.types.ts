import type { MergeDeep } from 'type-fest'
import type { Directions, Ingredients } from '@/lib/recipes/types'
import type { Database as Generated } from './database-generated.types'

export type Database = MergeDeep<
  Generated,
  {
    public: {
      Tables: {
        recipes: {
          Row: { ingredients: Ingredients; directions: Directions }
          Insert: { ingredients: Ingredients; directions: Directions }
          Update: { ingredients?: Ingredients; directions?: Directions }
        }
      }
    }
  }
>

export type { Json } from './database-generated.types'
