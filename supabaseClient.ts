import { createClient } from '@supabase/supabase-js';

// REPLACE THESE WITH YOUR ACTUAL SUPABASE PROJECT CREDENTIALS
// The URL must be the API URL (ending in .supabase.co), not the dashboard URL.
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://fsfkuahgnxmqmrcoaiad.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZmt1YWhnbnhtcW1yY29haWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODM2MDAsImV4cCI6MjA4MDU1OTYwMH0.P9w5xoczvlyK7-JSawtGZIHe-_OZU1J-fOBH-2zcZ8I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);