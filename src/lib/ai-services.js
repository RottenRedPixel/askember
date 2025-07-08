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
  // Use unified API route for both localhost and deployed
  console.log('🌍 [AI-SERVICES] Using API route for title generation');
  
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
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('❌ [AI-SERVICES] Title API error:', response.status, errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('❌ [AI-SERVICES] API title generation failed:', error);
    throw error;
  }
}

/**
 * Analyze an image using OpenAI Vision
 * @param {string} emberId - The ember ID
 * @param {string} imageUrl - The image URL to analyze
 * @returns {Promise<Object>} - The analysis result
 */
export async function analyzeImage(emberId, imageUrl) {
  // Use unified API route for both localhost and deployed
  console.log('🌍 [AI-SERVICES] Using API route for image analysis');
  
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

/**
 * Generate a story cut with unified API routing
 * @param {Object} storyCutData - The story cut data object
 * @returns {Promise<Object>} - The story cut result
 */
export async function generateStoryCut(storyCutData) {
  // Use unified API route for both localhost and deployed
  console.log('🌍 [AI-SERVICES] Using API route for story cut generation');
  
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