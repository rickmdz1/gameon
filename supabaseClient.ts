import { createClient } from '@supabase/supabase-js';

// In Vite, environment variables are accessed via import.meta.env
// We cast to any here to satisfy TypeScript if the Vite client types are not implicitly loaded.
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'https://fsfkuahgnxmqmrcoaiad.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZmt1YWhnbnhtcW1yY29haWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODM2MDAsImV4cCI6MjA4MDU1OTYwMH0.P9w5xoczvlyK7-JSawtGZIHe-_OZU1J-fOBH-2zcZ8I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);