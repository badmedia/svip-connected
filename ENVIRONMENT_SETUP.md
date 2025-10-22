# Environment Setup Guide

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## How to get these values:

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the following values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_PUBLISHABLE_KEY`

## Example:

```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5ODc2ODAwMCwiZXhwIjoyMDE0MzQ0MDAwfQ.example_key_here
```

## Database Setup

Make sure your Supabase database has the following tables with proper RLS policies:
- `profiles`
- `tasks` 
- `chats`
- `messages`
- `endorsements`

The migrations in the `supabase/migrations/` folder should be applied to your database.

## Troubleshooting

If you're still getting "Failed to initialize chat" errors:

1. Check browser console for detailed error messages
2. Verify your environment variables are loaded correctly
3. Ensure your Supabase project is running and accessible
4. Check that RLS policies allow the current user to access the required tables
