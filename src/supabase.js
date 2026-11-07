import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gudoqqhkdjzwjdnvhjrq.supabase.co';
const supabaseKey = 'sb_publishable_rGXjz1ih8Ke9qG4kfcuGog_4sGP0NRb';

export const supabase = createClient(supabaseUrl, supabaseKey);