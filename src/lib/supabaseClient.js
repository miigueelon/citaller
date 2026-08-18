import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zrrqqqbgwwovmglhqxwn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lI2UNnTiAxmRVW3GtQehAw_0QDJsvIj';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);