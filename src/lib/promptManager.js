// Prompt Management System
// Handles all OpenAI prompt operations with database-driven prompts

import { supabase } from './supabase.js';
import { emberContextBuilders } from './emberContext.js';

/**
 * Get an active prompt by key
 * @param {string} promptKey - The unique prompt key
 * @returns {Object|null} The active prompt object or null if not found
 */
export async function getActivePrompt(promptKey) {
  try {
    const { data, error } = await supabase.rpc('get_active_prompt', {
      prompt_key_param: promptKey
    });

    if (error) {
      console.error('Error fetching active prompt:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in getActivePrompt:', error);
    return null;
  }
}

/**
 * Get all prompts for a category
 * @param {string} category - The prompt category
 * @param {string} subcategory - Optional subcategory
 * @returns {Array} Array of prompts
 */
export async function getPromptsByCategory(category, subcategory = null) {
  try {
    // Use direct query instead of RPC to avoid function overloading issues
    let query = supabase
      .from('prompts')
      .select(`
        id, prompt_key, title, description, category, subcategory,
        model, max_tokens, temperature, response_format, prompt_type,
        system_prompt, user_prompt_template, is_active, version,
        usage_count, success_count, last_used_at, created_at, updated_at
      `)
      .eq('category', category);
    
    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    }
    
    const { data, error } = await query.order('category, subcategory, title');
    
    if (error) {
      console.error('Error fetching prompts by category:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPromptsByCategory:', error);
    return [];
  }
}

/**
 * Format a prompt with context and variables
 * @param {Object} prompt - The prompt object from database
 * @param {Object} variables - Variables to substitute in the prompt
 * @param {string} emberId - Optional ember ID for context
 * @returns {Object} Formatted prompt with system and user messages
 */
export async function formatPrompt(prompt, variables = {}, emberId = null) {
  try {
    let systemPrompt = prompt.system_prompt || '';
    let userPrompt = prompt.user_prompt_template || '';

    // Add ember context if emberId is provided
    if (emberId && prompt.category !== 'general') {
      const contextBuilder = getContextBuilder(prompt.category, prompt.subcategory);
      const emberContext = await contextBuilder(emberId);
      
      // Add context to variables
      variables.ember_context = emberContext;
      variables.ember_id = emberId;
    }

    // Replace variables in both system and user prompts
    systemPrompt = replaceVariables(systemPrompt, variables);
    userPrompt = replaceVariables(userPrompt, variables);

    // Build messages array based on prompt type
    const messages = [];
    
    if (prompt.prompt_type === 'system_and_user') {
      if (systemPrompt.trim()) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      
      // Handle image analysis with special vision format
      if (prompt.category === 'image_analysis' && variables.image_url) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt
            },
            {
              type: 'image_url',
              image_url: {
                url: variables.image_url,
                detail: variables.image_detail || 'high'
              }
            }
          ]
        });
      } else {
        messages.push({ role: 'user', content: userPrompt });
      }
    } else {
      // user_only type - handle image analysis
      if (prompt.category === 'image_analysis' && variables.image_url) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt
            },
            {
              type: 'image_url',
              image_url: {
                url: variables.image_url,
                detail: variables.image_detail || 'high'
              }
            }
          ]
        });
      } else {
        messages.push({ role: 'user', content: userPrompt });
      }
    }

    return {
      messages,
      model: prompt.model,
      max_tokens: prompt.max_tokens,
      temperature: prompt.temperature,
      response_format: prompt.response_format === 'json_object' ? 
        { type: 'json_object' } : undefined,
      top_p: prompt.top_p,
      frequency_penalty: prompt.frequency_penalty,
      presence_penalty: prompt.presence_penalty,
      stop: prompt.stop_sequences || undefined
    };
  } catch (error) {
    console.error('Error formatting prompt:', error);
    throw error;
  }
}

/**
 * Make OpenAI API call with prompt and track usage
 * @param {string} promptKey - The prompt key to use
 * @param {Object} variables - Variables for the prompt
 * @param {string} emberId - Optional ember ID for context
 * @returns {Object} OpenAI response
 */
export async function executePrompt(promptKey, variables = {}, emberId = null) {
  const startTime = Date.now();
  let tokensUsed = 0;
  let success = false;

  try {
    // Get the active prompt
    const prompt = await getActivePrompt(promptKey);
    if (!prompt) {
      throw new Error(`No active prompt found for key: ${promptKey}`);
    }

    // Format the prompt with context and variables
    const formattedPrompt = await formatPrompt(prompt, variables, emberId);

    // Mobile device detection for better handling
    const isMobile = typeof navigator !== 'undefined' && 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Extended timeout for mobile devices
    const timeoutMs = isMobile ? 120000 : 60000; // 2 minutes for mobile, 1 minute for desktop
    
    console.log(`🚀 [PROMPT] Executing prompt: ${promptKey}`, {
      model: prompt.model,
      isMobile,
      timeoutMs: timeoutMs / 1000 + 's',
      hasImage: variables.image_url ? true : false
    });

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Make the OpenAI API call with timeout
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify(formattedPrompt),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`;
        
        // Handle specific error cases
        if (response.status === 429) {
          errorMessage = 'OpenAI rate limit reached. Please try again in a few moments.';
        } else if (response.status === 401) {
          errorMessage = 'OpenAI authentication failed. Please check API key configuration.';
        } else if (response.status === 400) {
          errorMessage = 'Invalid request to OpenAI API. Please check the prompt configuration.';
        } else if (response.status >= 500) {
          errorMessage = 'OpenAI service is temporarily unavailable. Please try again.';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Extract usage information
      tokensUsed = data.usage?.total_tokens || 0;
      success = true;

      console.log(`✅ [PROMPT] Successfully executed prompt: ${promptKey}`, {
        tokensUsed,
        responseTime: Date.now() - startTime + 'ms',
        contentLength: data.choices?.[0]?.message?.content?.length || 0,
        isMobile
      });

      // Track usage
      await trackPromptUsage(promptKey, tokensUsed, Date.now() - startTime, success);

      return {
        success: true,
        data: data,
        content: data.choices?.[0]?.message?.content || '',
        tokensUsed,
        model: prompt.model,
        promptKey
      };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Handle network errors specifically
      if (fetchError.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs / 1000} seconds. ${isMobile ? 'Mobile networks may be slower - please try again.' : 'Please try again.'}`);
      }
      
      if (fetchError.message.includes('Failed to fetch')) {
        throw new Error(`Network error: ${isMobile ? 'Mobile connection issue. Please check your internet connection and try again.' : 'Please check your internet connection and try again.'}`);
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ [PROMPT] Error executing prompt:', {
      promptKey,
      error: error.message,
      responseTime: Date.now() - startTime + 'ms',
      tokensUsed
    });
    
    // Track failed usage
    await trackPromptUsage(promptKey, tokensUsed, Date.now() - startTime, false);
    
    return {
      success: false,
      error: error.message,
      tokensUsed,
      promptKey
    };
  }
}

/**
 * Track prompt usage statistics
 * @param {string} promptKey - The prompt key
 * @param {number} tokensUsed - Number of tokens used
 * @param {number} responseTime - Response time in milliseconds
 * @param {boolean} success - Whether the call was successful
 */
async function trackPromptUsage(promptKey, tokensUsed, responseTime, success) {
  try {
    await supabase.rpc('increment_prompt_usage', {
      prompt_key_param: promptKey,
      tokens_used: tokensUsed,
      response_time_ms: responseTime,
      was_successful: success
    });
  } catch (error) {
    console.error('Error tracking prompt usage:', error);
  }
}

/**
 * Get the appropriate context builder for a prompt category
 * @param {string} category - The prompt category
 * @param {string} subcategory - The prompt subcategory
 * @returns {Function} Context builder function
 */
function getContextBuilder(category, subcategory) {
  switch (category) {
    case 'image_analysis':
      return emberContextBuilders.forImageAnalysis;
    case 'title_generation':
      return emberContextBuilders.forTitleGeneration;
    case 'story_generation':
      return emberContextBuilders.forStoryGeneration;
    case 'conversation':
      return emberContextBuilders.forConversation;
    default:
      return emberContextBuilders.forStoryGeneration; // Default to comprehensive context
  }
}

/**
 * Replace variables in a text string
 * @param {string} text - The text with variables
 * @param {Object} variables - The variables to replace
 * @returns {string} Text with variables replaced
 */
function replaceVariables(text, variables) {
  if (!text) return '';
  
  let result = text;
  
  // Replace standard variables like {{variable_name}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
}

/**
 * CRUD operations for prompts management
 */
export const promptsCRUD = {
  
  /**
   * Create a new prompt
   * @param {Object} promptData - The prompt data
   * @returns {Object} The created prompt
   */
  async create(promptData) {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .insert([promptData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating prompt:', error);
      throw error;
    }
  },

  /**
   * Update an existing prompt
   * @param {string} promptId - The prompt ID
   * @param {Object} updates - The updates to apply
   * @returns {Object} The updated prompt
   */
  async update(promptId, updates) {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .update(updates)
        .eq('id', promptId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating prompt:', error);
      throw error;
    }
  },

  /**
   * Get all prompts with pagination
   * @param {Object} options - Query options
   * @returns {Object} Prompts and pagination info
   */
  async getAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        category = null,
        search = null,
        sortBy = 'updated_at',
        sortOrder = 'desc'
      } = options;

      let query = supabase
        .from('prompts')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (category) {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,prompt_key.ilike.%${search}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        prompts: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching all prompts:', error);
      throw error;
    }
  },

  /**
   * Delete a prompt
   * @param {string} promptId - The prompt ID
   * @returns {boolean} Success status
   */
  async delete(promptId) {
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting prompt:', error);
      throw error;
    }
  },

  /**
   * Set active prompt for a key (deactivate others)
   * @param {string} promptKey - The prompt key
   * @param {string} promptId - The prompt ID to activate
   * @returns {boolean} Success status
   */
  async setActive(promptKey, promptId) {
    try {
      // First deactivate all prompts with this key
      await supabase
        .from('prompts')
        .update({ is_active: false })
        .eq('prompt_key', promptKey);

      // Then activate the specific prompt
      const { error } = await supabase
        .from('prompts')
        .update({ is_active: true })
        .eq('id', promptId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error setting active prompt:', error);
      throw error;
    }
  },

  /**
   * Clone a prompt with a new version
   * @param {string} promptId - The prompt ID to clone
   * @param {Object} changes - Changes to apply to the clone
   * @returns {Object} The cloned prompt
   */
  async clone(promptId, changes = {}) {
    try {
      // Get the original prompt
      const { data: original, error: fetchError } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', promptId)
        .single();

      if (fetchError) throw fetchError;

      // Create clone data
      const cloneData = {
        ...original,
        id: undefined, // Let database generate new ID
        parent_prompt_id: promptId,
        is_active: false, // New clones start inactive
        version: changes.version || `v${Date.now()}`,
        created_at: undefined,
        updated_at: undefined,
        usage_count: 0,
        success_count: 0,
        average_tokens_used: 0,
        average_response_time_ms: 0,
        last_used_at: null,
        ...changes
      };

      return await this.create(cloneData);
    } catch (error) {
      console.error('Error cloning prompt:', error);
      throw error;
    }
  }
};

/**
 * Prompt execution utilities for testing and direct calls
 */
export const promptExecution = {
  
  /**
   * Execute a prompt directly with raw parameters
   * @param {Object} params - Direct OpenAI parameters
   * @returns {Object} Response object
   */
  async execute(params) {
    try {
      const {
        system_prompt,
        user_prompt,
        model = 'gpt-4o-mini',
        max_tokens = 150,
        temperature = 0.8,
        response_format = 'text'
      } = params;

      const messages = [];
      
      if (system_prompt) {
        messages.push({ role: 'system', content: system_prompt });
      }
      
      messages.push({ role: 'user', content: user_prompt });

      const requestBody = {
        model,
        messages,
        max_tokens,
        temperature
      };

      if (response_format === 'json_object') {
        requestBody.response_format = { type: 'json_object' };
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        response: data.choices?.[0]?.message?.content || '',
        usage: data.usage,
        model: model
      };

    } catch (error) {
      console.error('Error executing prompt:', error);
      throw error;
    }
  }
};

/**
 * Convenience functions for common operations
 */
export const promptUtils = {
  
  /**
   * Get prompts overview/statistics
   * @returns {Object} Overview statistics
   */
  async getOverview() {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('category, is_active, usage_count, success_count, last_used_at');

      if (error) throw error;

      const stats = {
        total: data.length,
        active: data.filter(p => p.is_active).length,
        inactive: data.filter(p => !p.is_active).length,
        categories: {},
        totalUsage: 0,
        totalSuccess: 0,
        lastUsed: null
      };

      data.forEach(prompt => {
        if (!stats.categories[prompt.category]) {
          stats.categories[prompt.category] = { total: 0, active: 0 };
        }
        stats.categories[prompt.category].total++;
        if (prompt.is_active) {
          stats.categories[prompt.category].active++;
        }
        
        stats.totalUsage += prompt.usage_count || 0;
        stats.totalSuccess += prompt.success_count || 0;
        
        if (prompt.last_used_at) {
          const usedAt = new Date(prompt.last_used_at);
          if (!stats.lastUsed || usedAt > stats.lastUsed) {
            stats.lastUsed = usedAt;
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting prompts overview:', error);
      throw error;
    }
  },

  /**
   * Validate prompt template
   * @param {string} template - The prompt template
   * @returns {Object} Validation result
   */
  validateTemplate(template) {
    const variables = [];
    const regex = /{{([^}]+)}}/g;
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      variables.push(match[1]);
    }

    return {
      valid: true,
      variables,
      requiredVariables: variables,
      warnings: []
    };
  }
}; 