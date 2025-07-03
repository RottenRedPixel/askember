-- Create comprehensive prompts management table
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50),
  
  -- OpenAI Configuration
  model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o-mini',
  max_tokens INTEGER NOT NULL DEFAULT 150,
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.8,
  response_format VARCHAR(20) NOT NULL DEFAULT 'text', -- 'text' or 'json_object'
  
  -- Prompt Structure
  prompt_type VARCHAR(20) NOT NULL DEFAULT 'user_only', -- 'user_only' or 'system_and_user'
  system_prompt TEXT,
  user_prompt_template TEXT NOT NULL,
  
  -- Advanced OpenAI Settings (optional)
  top_p DECIMAL(3,2),
  frequency_penalty DECIMAL(3,2),
  presence_penalty DECIMAL(3,2),
  stop_sequences TEXT[], -- Array of stop sequences
  
  -- Management & Versioning
  is_active BOOLEAN DEFAULT false,
  version VARCHAR(20) DEFAULT 'v1.0',
  parent_prompt_id UUID REFERENCES prompts(id), -- For versioning
  
  -- Performance Tracking
  usage_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  average_tokens_used INTEGER DEFAULT 0,
  average_response_time_ms INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  test_data JSONB, -- Sample test cases
  expected_output_examples TEXT[],
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID REFERENCES user_profiles(user_id),
  updated_by_user_id UUID REFERENCES user_profiles(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompts_prompt_key ON prompts(prompt_key);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_is_active ON prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_prompts_usage_count ON prompts(usage_count);
CREATE INDEX IF NOT EXISTS idx_prompts_last_used ON prompts(last_used_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_prompts_updated_at();

-- Create function to get active prompt by key
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
    p.created_at,
    p.updated_at
  FROM prompts p
  WHERE p.prompt_key = prompt_key_param 
    AND p.is_active = true
  ORDER BY p.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to get prompts by category
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

-- Create function to increment prompt usage
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
    usage_count = usage_count + 1,
    success_count = CASE WHEN was_successful THEN success_count + 1 ELSE success_count END,
    average_tokens_used = CASE 
      WHEN usage_count = 0 THEN tokens_used
      ELSE ((average_tokens_used * usage_count) + tokens_used) / (usage_count + 1)
    END,
    average_response_time_ms = CASE 
      WHEN usage_count = 0 THEN response_time_ms
      ELSE ((average_response_time_ms * usage_count) + response_time_ms) / (usage_count + 1)
    END,
    last_used_at = NOW()
  WHERE prompt_key = prompt_key_param AND is_active = true;
END;
$$ LANGUAGE plpgsql; 