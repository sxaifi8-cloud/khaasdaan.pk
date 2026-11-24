import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tmjddxcgfqvuzjhzvaes.supabase.co';

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_publishable_key ||
  'sb_publishable_45wVvWeisFaoFdaZPTHx_g_iV-pO8st';

export const supabase = createClient(supabaseUrl, supabaseKey);