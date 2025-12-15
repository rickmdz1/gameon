import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fsfkuahgnxmqmrcoaiad.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZmt1YWhnbnhtcW1yY29haWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODM2MDAsImV4cCI6MjA4MDU1OTYwMH0.P9w5xoczvlyK7-JSawtGZIHe-_OZU1J-fOBH-2zcZ8I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);