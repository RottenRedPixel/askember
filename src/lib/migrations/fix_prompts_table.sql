-- Fix Prompts Table Migration
-- This handles the existing prompts table and adds missing columns

-- Check if the table exists and add missing columns
-- (This is safer than trying to create a new table)

-- Add missing columns to existing prompts table
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS prompt_key VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS title VARCHAR(200),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(50),
ADD COLUMN IF NOT EXISTS model VARCHAR(50) DEFAULT 'gpt-4o-mini',
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2) DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS response_format VARCHAR(20) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS prompt_type VARCHAR(20) DEFAULT 'user_only',
ADD COLUMN IF NOT EXISTS system_prompt TEXT,
ADD COLUMN IF NOT EXISTS user_prompt_template TEXT,
ADD COLUMN IF NOT EXISTS top_p DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS frequency_penalty DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS presence_penalty DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS stop_sequences TEXT[],
ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT 'v1.0',
ADD COLUMN IF NOT EXISTS parent_prompt_id UUID REFERENCES prompts(id),
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_response_time_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS test_data JSONB,
ADD COLUMN IF NOT EXISTS expected_output_examples TEXT[],
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES user_profiles(user_id),
ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES user_profiles(user_id);

-- Add missing timestamps if they don't exist
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_prompts_prompt_key ON prompts(prompt_key);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_is_active ON prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_prompts_usage_count ON prompts(usage_count);
CREATE INDEX IF NOT EXISTS idx_prompts_last_used ON prompts(last_used_at);

-- Create or replace the trigger for updated_at
CREATE OR REPLACE FUNCTION update_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prompts_updated_at ON prompts;
CREATE TRIGGER trigger_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_prompts_updated_at();

-- Create or replace the get_active_prompt function
CREATE OR REPLACE FUNCTION get_active_prompt(prompt_key_param VARCHAR)
RETURNS TABLE (
  id UUID,
  prompt_key VARCHAR,
  title VARCHAR,
  description TEXT,
  category VARCHAR,
  subcategory VARCHAR,
  model VARCHAR,
  max_tokens INTEGER,
  temperature DECIMAL,
  response_format VARCHAR,
  prompt_type VARCHAR,
  system_prompt TEXT,
  user_prompt_template TEXT,
  top_p DECIMAL,
  frequency_penalty DECIMAL,
  presence_penalty DECIMAL,
  stop_sequences TEXT[],
  version VARCHAR,
  tags TEXT[],
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.prompt_key,
    p.title,
    p.description,
    p.category,
    p.subcategory,
    p.model,
    p.max_tokens,
    p.temperature,
    p.response_format,
    p.prompt_type,
    p.system_prompt,
    p.user_prompt_template,
    p.top_p,
    p.frequency_penalty,
    p.presence_penalty,
    p.stop_sequences,
    p.version,
    p.tags,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM prompts p
  WHERE p.prompt_key = prompt_key_param 
    AND p.is_active = true
  ORDER BY p.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the get_prompts_by_category function
CREATE OR REPLACE FUNCTION get_prompts_by_category(
  category_param VARCHAR,
  subcategory_param VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  prompt_key VARCHAR,
  title VARCHAR,
  description TEXT,
  category VARCHAR,
  subcategory VARCHAR,
  model VARCHAR,
  max_tokens INTEGER,
  temperature DECIMAL,
  response_format VARCHAR,
  prompt_type VARCHAR,
  system_prompt TEXT,
  user_prompt_template TEXT,
  is_active BOOLEAN,
  version VARCHAR,
  usage_count INTEGER,
  success_count INTEGER,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.prompt_key,
    p.title,
    p.description,
    p.category,
    p.subcategory,
    p.model,
    p.max_tokens,
    p.temperature,
    p.response_format,
    p.prompt_type,
    p.system_prompt,
    p.user_prompt_template,
    p.is_active,
    p.version,
    p.usage_count,
    p.success_count,
    p.last_used_at,
    p.created_at,
    p.updated_at
  FROM prompts p
  WHERE p.category = category_param 
    AND (subcategory_param IS NULL OR p.subcategory = subcategory_param)
  ORDER BY p.category, p.subcategory, p.title;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the increment_prompt_usage function
CREATE OR REPLACE FUNCTION increment_prompt_usage(
  prompt_key_param VARCHAR,
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  was_successful BOOLEAN DEFAULT true
)
RETURNS VOID AS $$
BEGIN
  UPDATE prompts 
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    success_count = CASE 
      WHEN was_successful THEN COALESCE(success_count, 0) + 1 
      ELSE COALESCE(success_count, 0) 
    END,
    average_tokens_used = CASE 
      WHEN COALESCE(usage_count, 0) = 0 THEN tokens_used
      ELSE ((COALESCE(average_tokens_used, 0) * COALESCE(usage_count, 0)) + tokens_used) / (COALESCE(usage_count, 0) + 1)
    END,
    average_response_time_ms = CASE 
      WHEN COALESCE(usage_count, 0) = 0 THEN response_time_ms
      ELSE ((COALESCE(average_response_time_ms, 0) * COALESCE(usage_count, 0)) + response_time_ms) / (COALESCE(usage_count, 0) + 1)
    END,
    last_used_at = NOW()
  WHERE prompt_key = prompt_key_param AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to check table structure
CREATE OR REPLACE FUNCTION get_prompts_table_info()
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable BOOLEAN,
  column_default TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::BOOLEAN,
    c.column_default::TEXT
  FROM information_schema.columns c
  WHERE c.table_name = 'prompts'
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql; 