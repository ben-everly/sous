import type { Database } from '@/types/database.types'

export type Kitchen = Pick<
  Database['public']['Tables']['kitchens']['Row'],
  'id' | 'name' | 'created_at'
>
