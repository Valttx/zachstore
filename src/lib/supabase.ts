import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://djpqitneazbejzibzmgp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcHFpdG5lYXpiZWp6aWJ6bWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDU0NTAsImV4cCI6MjA5MjIyMTQ1MH0.O0QObBkse9PRlXH4QaiSof6BBbPoapRk3qtJlC3CSfQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);