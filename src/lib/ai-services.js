/**
 * Universal AI Services - Smart Environment Detection
 * 
 * Provides unified interfaces for OpenAI functionality that work in both
 * localhost (direct function calls) and deployed (API routes) environments.
 * 
 * Uses database-driven prompts everywhere for consistency.
 */

/**
 * Generate title suggestions for an ember
 * @param {Object} emberData - The ember data object
 * @param {string} requestType - 'single' or 'multiple'
 * @returns {Promise<Object>} - The title generation result
 */
export async function generateTitle(emberData, requestType = 'single') {
  // Smart environment detection (same pattern as story cuts)
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
  
  if (isDevelopment) {
    // Localhost: Use direct function call with database prompts
    console.log('🔧 [AI-SERVICES] Development mode detected - using direct function for title generation');
    
    try {
      const { executePrompt } = await import('./promptManager.js');
      const { emberContextBuilders } = await import('./emberContext.js');
      
      // Build rich context using the same builder as API
      const context = await emberContextBuilders.buildTitleGenerationContext(emberData);
      
      // Determine how many titles to request
      const titlesRequested = requestType === 'multiple' ? 3 : 1;
      
      // Prepare context variables (same as API route)
      const contextVariables = {
        context,
        titles_requested: titlesRequested,
        format_instruction: requestType === 'multiple' 
          ? 'Return 3 titles, one per line, without numbers or bullets.'
          : 'Return only the title, no additional text or formatting.'
      };

      // Execute the prompt using database-driven system
      const result = await executePrompt('title_generation', contextVariables);

      if (!result.success) {
        throw new Error(result.error);
      }

      const aiResponse = result.content?.trim() || '';
      
      if (requestType === 'multiple') {
        // Split into array of titles
        const titles = aiResponse.split('\n').filter(title => title.trim().length > 0).slice(0, 3);
        return { 
          suggestions: titles,
          context: context,
          tokens_used: result.tokensUsed || 0
        };
      } else {
        return { 
          suggestion: aiResponse,
          context: context,
          tokens_used: result.tokensUsed || 0
        };
      }
      
    } catch (error) {
      console.error('❌ [AI-SERVICES] Direct title generation failed:', error);
      throw error;
    }
    
  } else {
    // Deployed: Use API route with database prompts
    console.log('🌍 [AI-SERVICES] Production mode detected - using API route for title generation');
    
    try {
      const response = await fetch('/api/ai-title-suggestion', {
        method: 'POST',  
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          emberData: emberData,
          requestType: requestType
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI suggestion');
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('❌ [AI-SERVICES] API title generation failed:', error);
      throw error;
    }
  }
}

/**
 * Analyze an image using OpenAI Vision
 * @param {string} emberId - The ember ID
 * @param {string} imageUrl - The image URL to analyze
 * @returns {Promise<Object>} - The analysis result
 */
export async function analyzeImage(emberId, imageUrl) {
  // Smart environment detection (same pattern as story cuts)
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
  
  if (isDevelopment) {
    // Localhost: Use direct function call with database prompts
    console.log('🔧 [AI-SERVICES] Development mode detected - using direct function for image analysis');
    
    try {
      const { executePrompt } = await import('./promptManager.js');
      const { emberContextBuilders } = await import('./emberContext.js');

      console.log('🔍 [AI-SERVICES] Starting database-driven image analysis...');

      // Build comprehensive ember context
      const emberContext = await emberContextBuilders.forImageAnalysis(emberId);
      
      // Execute the image analysis prompt with context and image
      const result = await executePrompt('image_analysis_comprehensive', {
        ember_context: emberContext,
        image_url: imageUrl,
        image_detail: 'high'
      }, emberId);

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log('✅ [AI-SERVICES] Database-driven image analysis completed');
      console.log('📊 [AI-SERVICES] Analysis length:', result.content.length, 'characters');

      return {
        success: true,
        analysis: result.content,
        emberId,
        imageUrl,
        timestamp: new Date().toISOString(),
        model: result.model,
        tokensUsed: result.tokensUsed,
        promptKey: result.promptKey
      };

    } catch (error) {
      console.error('❌ [AI-SERVICES] Direct image analysis failed:', error);
      throw error;
    }
    
  } else {
    // Deployed: Use API route with database prompts
    console.log('🌍 [AI-SERVICES] Production mode detected - using API route for image analysis');
    
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emberId,
          imageUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ [AI-SERVICES] API image analysis completed');
      
      return result;
      
    } catch (error) {
      console.error('❌ [AI-SERVICES] API image analysis failed:', error);
      throw error;
    }
  }
}

/**
 * Generate a story cut with smart environment detection
 * @param {Object} storyCutData - The story cut data object
 * @returns {Promise<Object>} - The story cut result
 */
export async function generateStoryCut(storyCutData) {
  // Smart environment detection (same pattern as other functions)
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
  
  if (isDevelopment) {
    // Localhost: Use direct function call with database prompts
    console.log('🔧 [AI-SERVICES] Development mode detected - using direct function for story cut generation');
    
    try {
      const { generateStoryCutWithOpenAI } = await import('./emberContext.js');
      
      // Use the existing direct function (already uses database prompts)
      const result = await generateStoryCutWithOpenAI(storyCutData);
      
      console.log('✅ [AI-SERVICES] Direct story cut generation completed');
      return result;
      
    } catch (error) {
      console.error('❌ [AI-SERVICES] Direct story cut generation failed:', error);
      throw error;
    }
    
  } else {
    // Deployed: Use API route with database prompts
    console.log('🌍 [AI-SERVICES] Production mode detected - using API route for story cut generation');
    
    try {
      const response = await fetch('/api/generate-story-cut', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyCutData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ [AI-SERVICES] API story cut generation completed');
      
      return result;
      
    } catch (error) {
      console.error('❌ [AI-SERVICES] API story cut generation failed:', error);
      throw error;
    }
  }
} 