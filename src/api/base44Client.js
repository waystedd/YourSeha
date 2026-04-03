// This file replaces the old localStorage mock.
// All imports of base44Client.js now use Supabase as the backend.
export { base44, supabase } from './supabaseClient.js'
