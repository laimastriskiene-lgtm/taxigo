import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Trūksta VITE_SUPABASE_URL arba VITE_SUPABASE_PUBLISHABLE_KEY aplinkos kintamojo.',
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
