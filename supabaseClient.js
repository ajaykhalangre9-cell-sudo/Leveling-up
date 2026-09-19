const SUPABASE_URL = window.SUPABASE_URL || 'https://flrpshjlfbenfqnajzyg.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_fGWNgI04rJhQUi2EgbZQ4Q_VU9-eA_t';

const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.includes('supabase.co'));
};

let supabaseClient = null;

if (window.supabase && isSupabaseConfigured()) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
} else {
  console.warn('Supabase SDK is not loaded or the project credentials are missing.');
}

window.supabaseClient = supabaseClient;
window.supabaseConfig = {
  url: SUPABASE_URL,
  isConfigured: isSupabaseConfigured()
};
