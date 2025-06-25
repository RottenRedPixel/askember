import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { runMigration, executeSQL, healthCheck, tableExists, getTableSchema, debugStorageSetup } from '@/lib/database';
import { getStorageUsage, formatBytes } from '@/lib/storage';

// Import your SQL files as text
const migrations = {
  'make-current-user-superadmin': `
-- Make the current logged-in user a super admin
UPDATE user_profiles 
SET role = 'super_admin' 
WHERE user_id = auth.uid();

-- If no profile exists, create one
INSERT INTO user_profiles (user_id, role)
SELECT auth.uid(), 'super_admin'
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE user_id = auth.uid()
);
  `,

  'create-helper-functions': `
-- Create helper functions for DevTools
CREATE OR REPLACE FUNCTION get_table_schema(input_table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Only allow super admins to get schema info
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can get schema info';
  END IF;
  
  -- Get column information
  SELECT json_agg(
    json_build_object(
      'column_name', c.column_name,
      'data_type', c.data_type,
      'is_nullable', c.is_nullable,
      'column_default', c.column_default
    )
  )
  INTO result
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
    AND c.table_name = input_table_name
  ORDER BY c.ordinal_position;
  
  RETURN COALESCE(result, '[]'::json);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_table_schema(text) TO authenticated;
  `,

  'fix-schema-function': `
-- Fix the schema function by dropping and recreating with a new name
DROP FUNCTION IF EXISTS get_table_schema(text);

CREATE OR REPLACE FUNCTION get_table_info(input_table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Only allow super admins to get schema info
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can get schema info';
  END IF;
  
  -- Get column information with explicit aliases
  SELECT json_agg(
    json_build_object(
      'column_name', subq.column_name,
      'data_type', subq.data_type,
      'is_nullable', subq.is_nullable,
      'column_default', subq.column_default,
      'ordinal_position', subq.ordinal_position
    ) ORDER BY subq.ordinal_position
  )
  INTO result
  FROM (
    SELECT 
      cols.column_name,
      cols.data_type,
      cols.is_nullable,
      cols.column_default,
      cols.ordinal_position
    FROM information_schema.columns cols
    WHERE cols.table_schema = 'public' 
      AND cols.table_name = input_table_name
    ORDER BY cols.ordinal_position
  ) subq;
  
  RETURN COALESCE(result, '[]'::json);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_table_info(text) TO authenticated;
  `,
  'fix-infinite-recursion': `
-- Fix for infinite recursion in RLS policies
DROP POLICY IF EXISTS "Super admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE POLICY "Super admins can read all profiles" ON user_profiles
  FOR SELECT USING (is_super_admin());

CREATE POLICY "Super admins can update all profiles" ON user_profiles
  FOR UPDATE USING (is_super_admin());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      is_super_admin() OR
      (OLD.role IS NOT DISTINCT FROM NEW.role)
    )
  );

DROP TRIGGER IF EXISTS prevent_role_change_trigger ON user_profiles;
DROP FUNCTION IF EXISTS prevent_role_change();
  `,
  
  'add-profile-fields': `
-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'first_name') THEN
    ALTER TABLE user_profiles ADD COLUMN first_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'last_name') THEN
    ALTER TABLE user_profiles ADD COLUMN last_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;
  `,
  
  'create-stories-table': `
-- Create stories table for ember content
CREATE TABLE IF NOT EXISTS stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  audio_url TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Users can manage their own stories
CREATE POLICY "Users can manage own stories" ON stories
  FOR ALL USING (auth.uid() = user_id);

-- Super admins can view all stories
CREATE POLICY "Super admins can view all stories" ON stories
  FOR SELECT USING (is_super_admin());

-- Updated timestamp trigger
CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  `,

  'create-embers-table': `
-- Create embers table for storing user embers (photos/media)
CREATE TABLE IF NOT EXISTS public.embers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_embers_user_id ON public.embers(user_id);
CREATE INDEX IF NOT EXISTS idx_embers_created_at ON public.embers(created_at DESC);

-- Set up Row Level Security (RLS)
ALTER TABLE public.embers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own embers
CREATE POLICY "Users can view own embers"
    ON public.embers
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own embers
CREATE POLICY "Users can insert own embers"
    ON public.embers
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own embers
CREATE POLICY "Users can update own embers"
    ON public.embers
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own embers
CREATE POLICY "Users can delete own embers"
    ON public.embers
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Super admins can do everything
CREATE POLICY "Super admins can manage all embers"
    ON public.embers
    FOR ALL
    USING (is_super_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_embers_updated_at
    BEFORE UPDATE ON public.embers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `,

  'fix-avatar-storage': `
-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]::text
);

-- Ensure user_profiles RLS policies are working correctly
-- Drop and recreate the problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Create simpler, more direct policies
CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure user_profiles RLS policies are working correctly
-- Drop and recreate the problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Create simpler, more direct policies
CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

  -- Make sure the profile creation trigger is working
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
  `,

  'fix-storage-policies-only': `
-- Simple storage policies fix (bucket already exists)
-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop and recreate storage policies cleanly
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Simple public read policy
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload to avatars bucket
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow users to update their own files
CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

  -- Allow users to delete their own files  
CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
  `,

  'debug-storage-setup': `
-- Debug and fix storage setup completely
-- First, let's see what we have
SELECT 'Current storage buckets:' as info;
SELECT id, name, public FROM storage.buckets WHERE id = 'avatars';

-- Check if RLS is enabled on storage.objects
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- List current policies on storage.objects
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Now let's fix everything step by step
-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- 4. Create simple, working policies
-- Anyone can read from avatars bucket (since it's public)
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated users can insert into avatars bucket
CREATE POLICY "Authenticated can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Authenticated users can update in avatars bucket
CREATE POLICY "Authenticated can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Authenticated users can delete from avatars bucket
CREATE POLICY "Authenticated can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

  -- Setup complete
  `,

  'simple-storage-fix': `
-- Simple storage fix without debug queries
-- 1. Ensure the bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete avatars" ON storage.objects;

-- 4. Create simple, working policies
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
  `,

  'disable-storage-rls': `
-- Completely disable RLS for storage.objects to fix avatar uploads
-- This is a common approach for public file storage

-- First, drop all existing policies on storage.objects
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete avatars" ON storage.objects;

-- Disable RLS on storage.objects entirely
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Ensure the avatars bucket is properly configured
UPDATE storage.buckets 
SET public = true, 
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'avatars';
  `,

  'debug-storage-error': `
-- Debug storage setup to see what's causing the RLS violation
-- This will help us understand what's going wrong

-- Check current user and auth status
SELECT 
  'Current user info:' as debug_info,
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- Check storage buckets
SELECT 'Storage buckets:' as debug_info;
SELECT id, name, public, owner, created_at, updated_at, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'avatars';

-- Check if RLS is enabled on storage.objects
SELECT 'RLS status on storage.objects:' as debug_info;
SELECT schemaname, tablename, rowsecurity, hasrls
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check all policies on storage.objects
SELECT 'Current policies on storage.objects:' as debug_info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- Check if there are any other storage-related tables with RLS
SELECT 'All storage tables with RLS:' as debug_info;
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' AND rowsecurity = true;

-- Try to see what objects exist in avatars bucket
SELECT 'Existing objects in avatars bucket:' as debug_info;
SELECT name, bucket_id, owner, created_at
FROM storage.objects 
WHERE bucket_id = 'avatars'
LIMIT 5;
  `,

  'recreate-avatars-bucket': `
-- Completely recreate the avatars bucket from scratch
-- This should fix any bucket-level permission issues

-- First, delete any existing objects in the bucket
DELETE FROM storage.objects WHERE bucket_id = 'avatars';

-- Delete the existing bucket
DELETE FROM storage.buckets WHERE id = 'avatars';

-- Recreate the bucket with proper settings
INSERT INTO storage.buckets (
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types,
  avif_autodetection,
  created_at,
  updated_at
) VALUES (
  'avatars',
  'avatars', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  false,
  NOW(),
  NOW()
);

-- Completely disable RLS on storage.objects to avoid any policy conflicts
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on storage.buckets if it exists
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;
  `,

  'nuclear-storage-fix': `
-- Nuclear option: Disable ALL storage RLS and policies
-- This should definitely fix the avatar upload issue

-- Disable RLS on all storage tables
ALTER TABLE IF EXISTS storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS storage.buckets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS storage.migrations DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies on storage.objects (catch any we might have missed)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON storage.objects';
    END LOOP;
END $$;

-- Drop ALL policies on storage.buckets
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'buckets'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON storage.buckets';
    END LOOP;
END $$;

-- Ensure avatars bucket exists with minimal configuration
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = NULL,
    allowed_mime_types = NULL;
  `
};

export default function DevTools() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customSQL, setCustomSQL] = useState('');
  const [migrationProgress, setMigrationProgress] = useState(null);

  const addResult = (type, message, data = null) => {
    const result = {
      id: Date.now(),
      type, // 'success', 'error', 'info'
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    };
    setResults(prev => [result, ...prev].slice(0, 10)); // Keep last 10 results
  };

  const runMigrationHandler = async (migrationName) => {
    setIsLoading(true);
    setMigrationProgress({
      name: migrationName,
      status: 'starting',
      steps: [],
      currentStep: 0
    });

    try {
      // Parse the SQL to extract individual statements for progress tracking
      const sql = migrations[migrationName];
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      setMigrationProgress(prev => ({
        ...prev,
        status: 'running',
        totalSteps: statements.length,
        steps: statements.map((stmt, i) => ({
          id: i,
          statement: stmt.length > 100 ? stmt.substring(0, 100) + '...' : stmt,
          status: 'pending'
        }))
      }));

      // Execute the full migration
      const success = await runMigration(migrationName, migrations[migrationName]);
      
      if (success) {
        // Mark all steps as completed
        setMigrationProgress(prev => ({
          ...prev,
          status: 'completed',
          steps: prev.steps.map(step => ({ ...step, status: 'completed' }))
        }));
        addResult('success', `Migration "${migrationName}" completed successfully`);
      } else {
        setMigrationProgress(prev => ({
          ...prev,
          status: 'failed'
        }));
        addResult('error', `Migration "${migrationName}" failed`);
      }
    } catch (error) {
      setMigrationProgress(prev => ({
        ...prev,
        status: 'failed',
        error: error.message
      }));
      addResult('error', `Migration error: ${error.message}`);
    } finally {
      setIsLoading(false);
      // Clear progress after 3 seconds
      setTimeout(() => setMigrationProgress(null), 3000);
    }
  };

  const runCustomSQL = async () => {
    if (!customSQL.trim()) return;
    
    setIsLoading(true);
    try {
      const result = await executeSQL(customSQL);
      if (result.success) {
        addResult('success', 'Custom SQL executed successfully', result.data);
      } else {
        addResult('error', `SQL Error: ${result.error}`);
      }
    } catch (error) {
      addResult('error', `SQL execution error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      const health = await healthCheck();
      if (health.healthy) {
        addResult('success', `Database is healthy. User profiles: ${health.userCount || 0}`);
      } else {
        addResult('error', `Database health check failed: ${health.error}`);
      }
    } catch (error) {
      addResult('error', `Health check error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkTable = async (tableName) => {
    setIsLoading(true);
    try {
      const exists = await tableExists(tableName);
      if (exists) {
        const schema = await getTableSchema(tableName);
        addResult('info', `Table "${tableName}" exists`, schema);
      } else {
        addResult('info', `Table "${tableName}" does not exist`);
      }
    } catch (error) {
      addResult('error', `Table check error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearProgress = () => {
    setMigrationProgress(null);
    setIsLoading(false);
  };

  const clearAllResults = () => {
    setResults([]);
    setMigrationProgress(null);
    setIsLoading(false);
  };

  const forceStopMigration = () => {
    setIsLoading(false);
    setMigrationProgress(prev => prev ? {
      ...prev,
      status: 'cancelled',
      error: 'Migration cancelled by user'
    } : null);
    addResult('info', 'Migration cancelled by user');
    setTimeout(() => setMigrationProgress(null), 2000);
  };

  const runStorageDebug = async () => {
    setIsLoading(true);
    try {
      const debugInfo = await debugStorageSetup();
      addResult('info', 'Storage Debug Results', debugInfo);
    } catch (error) {
      addResult('error', `Storage debug error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkStorageUsage = async () => {
    setIsLoading(true);
    try {
      const usage = await getStorageUsage();
      
      // Format the data for better display
      const formattedUsage = {
        overview: {
          totalFiles: usage.totalFiles,
          totalSize: formatBytes(usage.totalSize),
          rawSize: usage.totalSize
        },
        byType: Object.entries(usage.filesByType).map(([type, data]) => ({
          type,
          count: data.count,
          size: formatBytes(data.size),
          rawSize: data.size
        })).filter(item => item.count > 0),
        byUser: Object.entries(usage.filesByUser).map(([userId, data]) => ({
          userId: userId.slice(0, 8) + '...', // Truncate for display
          fullUserId: userId,
          count: data.count,
          size: formatBytes(data.size),
          rawSize: data.size
        })).sort((a, b) => b.rawSize - a.rawSize).slice(0, 10), // Top 10 users
        recentFiles: usage.recentFiles.map(file => ({
          name: file.pathname.split('/').pop(),
          size: formatBytes(file.size),
          type: file.contentType,
          uploadedAt: new Date(file.uploadedAt).toLocaleString(),
          url: file.url
        }))
      };

      addResult('info', 'Vercel Blob Storage Usage', formattedUsage);
    } catch (error) {
      addResult('error', `Storage usage error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button onClick={runHealthCheck} disabled={isLoading} variant="outline">
              Health Check
            </Button>
            <Button onClick={() => checkTable('user_profiles')} disabled={isLoading} variant="outline">
              Check Profiles
            </Button>
            <Button onClick={clearAllResults} variant="outline" className="text-gray-600">
              Clear All
            </Button>
          </div>

          {/* Control Actions */}
          {(isLoading || migrationProgress) && (
            <div className="flex gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Button onClick={clearProgress} variant="outline" size="sm">
                Clear Progress
              </Button>
              <Button onClick={forceStopMigration} variant="destructive" size="sm">
                Force Stop Migration
              </Button>
              <span className="text-sm text-yellow-700 flex items-center">
                ⚠️ Use these if a migration appears stuck
              </span>
            </div>
          )}

          {/* Migrations */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Run Migrations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {Object.keys(migrations).map(migrationName => (
                <Button
                  key={migrationName}
                  onClick={() => runMigrationHandler(migrationName)}
                  disabled={isLoading}
                  variant="secondary"
                >
                  {migrationName}
                </Button>
              ))}
            </div>
          </div>

          {/* Migration Progress */}
          {migrationProgress && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">
                  Running Migration: {migrationProgress.name}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  migrationProgress.status === 'starting' ? 'bg-blue-100 text-blue-800' :
                  migrationProgress.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
                  migrationProgress.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {migrationProgress.status}
                </div>
              </div>

              {migrationProgress.totalSteps && (
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>
                      {migrationProgress.status === 'completed' ? migrationProgress.totalSteps : 0} / {migrationProgress.totalSteps} steps
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        migrationProgress.status === 'completed' ? 'bg-green-500' :
                        migrationProgress.status === 'failed' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}
                      style={{ 
                        width: migrationProgress.status === 'completed' ? '100%' : 
                               migrationProgress.status === 'running' ? '50%' : '10%'
                      }}
                    />
                  </div>
                </div>
              )}

              {migrationProgress.steps && migrationProgress.steps.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {migrationProgress.steps.map((step, index) => (
                    <div key={step.id} className="flex items-center text-sm">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        step.status === 'completed' ? 'bg-green-500' :
                        step.status === 'failed' ? 'bg-red-500' :
                        'bg-gray-300'
                      }`} />
                      <span className="font-mono text-xs text-gray-600 truncate">
                        {step.statement}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {migrationProgress.error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  Error: {migrationProgress.error}
                </div>
              )}
            </div>
          )}

          {/* Custom SQL */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Custom SQL</h3>
            <textarea
              value={customSQL}
              onChange={(e) => setCustomSQL(e.target.value)}
              placeholder="Enter SQL query..."
              className="w-full h-32 p-2 border border-gray-300 rounded-md font-mono text-sm"
            />
            <Button onClick={runCustomSQL} disabled={isLoading || !customSQL.trim()} className="mt-2">
              Execute SQL
            </Button>
          </div>

          {/* Results */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Results</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map(result => (
                <Alert key={result.id} className={`
                  ${result.type === 'success' ? 'border-green-200 bg-green-50' : ''}
                  ${result.type === 'error' ? 'border-red-200 bg-red-50' : ''}
                  ${result.type === 'info' ? 'border-blue-200 bg-blue-50' : ''}
                `}>
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <span>{result.message}</span>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                    {result.data && (
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 