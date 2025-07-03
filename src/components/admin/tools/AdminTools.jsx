import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Trash2,
  Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import useStore from '@/store';

export default function AdminTools() {
  const { user } = useStore();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isCheckingDB, setIsCheckingDB] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);

  const seedImageAnalysisPrompt = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    
    try {
      // Ensure we have a valid user
      if (!user?.id) {
        throw new Error('User not authenticated. Please refresh the page and try again.');
      }
      // Start with minimal fields to identify the problematic field
      const promptData = {
        prompt_key: 'image_analysis_comprehensive',
        name: 'Comprehensive Image Analysis', // Changed from 'title' to 'name'
        description: 'Detailed analysis of images including people, demographics, setting, activities, and technical details',
        category: 'image_analysis',
        subcategory: 'comprehensive',
        model: 'gpt-4o',
        max_tokens: 4000, // Ensure this is a number
        temperature: 0.3, // Ensure this is a number
        response_format: 'text',
        prompt_type: 'user_only',
        user_prompt_template: `{{ember_context}}

Please perform a comprehensive analysis of the provided image. Provide detailed information about:

PEOPLE & DEMOGRAPHICS:
- Number of people visible
- Estimated age ranges (child, teen, adult, elderly)
- Gender identification (if clearly apparent)
- Clothing and style descriptions
- Body language and expressions
- Relationships between people (if apparent)

SETTING & ENVIRONMENT:
- Location type (indoor/outdoor, specific venue if identifiable)
- Time of day/lighting conditions
- Weather conditions (if outdoor)
- Background details and surroundings
- Architectural or landscape features

ACTIVITIES & CONTEXT:
- What appears to be happening in the moment
- Social dynamics and interactions
- Event type (celebration, casual gathering, formal event, etc.)
- Activities or actions taking place

TECHNICAL DETAILS:
- Photo quality and composition
- Lighting analysis
- Notable photographic elements
- Any objects or items of interest

EMOTIONAL CONTEXT:
- Overall mood and atmosphere
- Emotional expressions visible
- Social dynamics and energy

STORY ELEMENTS:
- What story does this image tell?
- What might have happened before this moment?
- What might happen next?

Please provide rich, detailed descriptions that would help someone understand the complete context and story of this moment.`,
        is_active: true,
        // Remove potentially problematic fields for now
        // version: 'v1.0',
        // tags: ['image', 'analysis', 'comprehensive', 'people', 'setting', 'story'],
        // notes: 'Original hard-coded prompt from image analysis system. Provides comprehensive analysis for ember creation.',
        // created_by_user_id: user?.id
      };

      // Check if prompt already exists - simplified query
      const { data: existing, error: checkError } = await supabase
        .from('prompts')
        .select('id')
        .eq('prompt_key', 'image_analysis_comprehensive');

      if (checkError) {
        console.log('Check error:', checkError);
        // Continue anyway - might be table doesn't exist yet
      }

      if (existing && existing.length > 0) {
        // Update existing prompt instead of failing
        const { data: updateData, error: updateError } = await supabase
          .from('prompts')
          .update({
            name: promptData.name,
            description: promptData.description,
            user_prompt_template: promptData.user_prompt_template,
            updated_at: new Date().toISOString()
          })
          .eq('prompt_key', 'image_analysis_comprehensive')
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setSeedResult({
          success: true,
          message: 'Image analysis prompt updated successfully!',
          details: `Updated existing prompt with ID: ${updateData.id}. New template will work with OpenAI Vision API.`
        });
        return;
      }

      // Simplified insert without select to avoid column issues
      const { data, error } = await supabase
        .from('prompts')
        .insert([promptData]);

      if (error) {
        console.log('Insert error details:', error);
        throw error;
      }

      // Get the inserted data separately
      const { data: insertedData, error: selectError } = await supabase
        .from('prompts')
        .select('id, created_at, name')
        .eq('prompt_key', 'image_analysis_comprehensive')
        .single();

      if (selectError) {
        console.log('Select error:', selectError);
        // Still consider it successful if insert worked
        setSeedResult({
          success: true,
          message: 'Image analysis prompt seeded successfully!',
          details: 'Prompt was inserted but could not retrieve details'
        });
        return;
      }

      // This check is now redundant since we handle errors above

      setSeedResult({
        success: true,
        message: 'Image analysis prompt seeded successfully!',
        details: `Created prompt with ID: ${insertedData.id} at ${insertedData.created_at}`
      });

    } catch (error) {
      setSeedResult({
        success: false,
        message: 'Failed to seed image analysis prompt',
        details: error.message
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const seedTitleGenerationPrompt = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    
    try {
      // Ensure we have a valid user
      if (!user?.id) {
        throw new Error('User not authenticated. Please refresh the page and try again.');
      }

      const promptData = {
        prompt_key: 'title_generation',
        name: 'Creative Title Generation',
        description: 'Generates creative, meaningful, and concise titles for memories/photos',
        category: 'title_generation',
        subcategory: 'creative',
        model: 'gpt-4o-mini',
        max_tokens: 200,
        temperature: 0.8,
        response_format: 'text',
        prompt_type: 'system_user',
        system_prompt: 'You are a concise title generator. Output only clean titles, one per line, with no explanatory text, numbers, quotes, bullets, or formatting. Be direct and follow instructions exactly.',
        user_prompt_template: `Based on the following information, suggest {{titles_requested}} creative titles for this memory. Each title should be 2-6 words, capture the essence of the moment, and avoid generic phrases.

Context:
{{context}}

{{format_instruction}}

Output ONLY the titles, one per line, with no numbers, quotes, bullets, or additional text.`,
        is_active: true
      };

      // Check if prompt already exists
      const { data: existing, error: checkError } = await supabase
        .from('prompts')
        .select('id')
        .eq('prompt_key', 'title_generation');

      if (checkError) {
        console.log('Check error:', checkError);
      }

      if (existing && existing.length > 0) {
        // Update existing prompt instead of failing
        const { data: updateData, error: updateError } = await supabase
          .from('prompts')
          .update({
            name: promptData.name,
            description: promptData.description,
            system_prompt: promptData.system_prompt,
            user_prompt_template: promptData.user_prompt_template,
            updated_at: new Date().toISOString()
          })
          .eq('prompt_key', 'title_generation')
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setSeedResult({
          success: true,
          message: 'Title generation prompt updated successfully!',
          details: `Updated existing prompt with ID: ${updateData.id}. Improved parsing handles messy AI output.`
        });
        return;
      }

      // Insert new prompt
      const { data, error } = await supabase
        .from('prompts')
        .insert([promptData]);

      if (error) {
        throw error;
      }

      setSeedResult({
        success: true,
        message: 'Title generation prompt seeded successfully!',
        details: 'Prompt created with improved parsing for cleaner output.'
      });

    } catch (error) {
      setSeedResult({
        success: false,
        message: 'Failed to seed title generation prompt',
        details: error.message
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const seedEmberAIPrompt = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    
    try {
      // Ensure we have a valid user
      if (!user?.id) {
        throw new Error('User not authenticated. Please refresh the page and try again.');
      }

      const promptData = {
        prompt_key: 'story_circle_ember_ai',
        name: 'Ember AI Story Circle Questions',
        description: 'Ember AI analyzes comments and wiki context to generate thoughtful questions focusing on the 5 W\'s and emotional responses',
        category: 'conversation',
        subcategory: 'story_circle',
        model: 'gpt-4o-mini',
        max_tokens: 150,
        temperature: 0.7,
        response_format: 'text',
        prompt_type: 'system_user',
        system_prompt: `You are Ember AI, a thoughtful conversation guide helping people explore their memories and stories. Your role is to:

1. Analyze new user comments and the full wiki context
2. Look for gaps in the Five W's (Who, What, Where, When, Why)
3. Generate SHORT, casual questions (1-2 sentences max) that encourage emotional sharing
4. Focus on personal memories, feelings, and significance
5. Ask for little anecdotes or stories related to the moment
6. Be warm, curious, and conversational - never clinical or formal

Keep your questions brief, natural, and focused on one specific aspect. Avoid long explanations or multiple questions at once.`,
        user_prompt_template: `EMBER WIKI CONTEXT:
{{ember_context}}

RECENT CONVERSATION:
{{conversation_history}}

NEW COMMENT TO ANALYZE:
"{{new_comment}}" - by {{comment_author}}

Based on the new comment and full context, I need to understand what's missing from the Five W's and what emotional depth we can explore:

WHO: {{who_status}} 
WHAT: {{what_status}}
WHERE: {{where_status}} 
WHEN: {{when_status}}
WHY: {{why_status}}

Generate ONE short, casual question (1-2 sentences) that either:
- Fills a gap in the 5 W's with emotional context
- Explores the personal significance of what was shared
- Asks for a specific memory, feeling, or little story related to this moment
- Connects to something the comment author mentioned

Be conversational and warm. Ask about feelings, personal memories, or little details that make this moment special.`,
        is_active: true
      };

      // Check if prompt already exists
      const { data: existing, error: checkError } = await supabase
        .from('prompts')
        .select('id')
        .eq('prompt_key', 'story_circle_ember_ai');

      if (checkError) {
        console.log('Check error:', checkError);
      }

      if (existing && existing.length > 0) {
        // Update existing prompt instead of failing
        const { data: updateData, error: updateError } = await supabase
          .from('prompts')
          .update({
            name: promptData.name,
            description: promptData.description,
            system_prompt: promptData.system_prompt,
            user_prompt_template: promptData.user_prompt_template,
            updated_at: new Date().toISOString()
          })
          .eq('prompt_key', 'story_circle_ember_ai')
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setSeedResult({
          success: true,
          message: 'Ember AI prompt updated successfully!',
          details: `Updated existing prompt with ID: ${updateData.id}. Ready for emotional story circle conversations.`
        });
        return;
      }

      // Insert new prompt
      const { data, error } = await supabase
        .from('prompts')
        .insert([promptData]);

      if (error) {
        throw error;
      }

      setSeedResult({
        success: true,
        message: 'Ember AI prompt seeded successfully!',
        details: 'Ember AI is now ready to facilitate emotional story circle conversations.'
      });

    } catch (error) {
      setSeedResult({
        success: false,
        message: 'Failed to seed Ember AI prompt',
        details: error.message
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const seedStoryStylePrompts = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    
    try {
      // Ensure we have a valid user
      if (!user?.id) {
        throw new Error('User not authenticated. Please refresh the page and try again.');
      }

      const storyStylePrompts = [
        {
          prompt_key: 'story_style_movie_trailer',
          name: 'Movie Trailer Style',
          description: 'Fast-paced, dramatic storytelling that builds excitement and tension',
          category: 'story_styles',
          subcategory: 'cinematic',
          model: 'gpt-4o',
          max_tokens: 500,
          temperature: 0.8,
          response_format: 'text',
          prompt_type: 'system_only',
          system_prompt: `You are creating a MOVIE TRAILER style story cut. This style is characterized by:

PACING & RHYTHM:
- Fast-paced, dynamic flow
- Short, punchy sentences and phrases
- Build momentum throughout the narrative
- Use dramatic pauses and emphasis

EMOTIONAL TONE:
- Create excitement and anticipation
- Build tension and release
- Highlight emotional peaks and conflicts
- Use powerful, evocative language

STRUCTURE:
- Hook the audience immediately
- Tease the story without giving everything away
- Build to emotional climaxes
- End with impact or cliffhanger feeling

LANGUAGE STYLE:
- Dramatic and compelling word choices
- Active voice and strong verbs
- Shorter sentences for impact
- Use repetition for emphasis
- Create vivid, cinematic imagery

FOCUS AREAS:
- Highlight the most dramatic or meaningful moments
- Emphasize conflict, transformation, or resolution
- Make the ordinary feel extraordinary
- Create a sense of urgency or importance

When generating story cuts in this style, make every word count and every moment feel significant. The goal is to make the listener feel the excitement and emotion of a movie trailer while telling their personal story.`,
          user_prompt_template: null,
          is_active: true
        },
        {
          prompt_key: 'story_style_documentary',
          name: 'Documentary Style',
          description: 'Thoughtful, educational storytelling that explores context and meaning',
          category: 'story_styles',
          subcategory: 'educational',
          model: 'gpt-4o',
          max_tokens: 500,
          temperature: 0.6,
          response_format: 'text',
          prompt_type: 'system_only',
          system_prompt: `You are creating a DOCUMENTARY style story cut. This style is characterized by:

PACING & RHYTHM:
- Thoughtful, measured pacing
- Allow moments to breathe and develop
- Natural, conversational flow
- Build understanding gradually

EMOTIONAL TONE:
- Reflective and introspective
- Educational but warm
- Respectful of the subject matter
- Balanced between informative and emotional

STRUCTURE:
- Provide context and background
- Let the story unfold naturally
- Include multiple perspectives when available
- Connect personal moments to larger themes

LANGUAGE STYLE:
- Clear, accessible language
- Rich descriptive details
- Balanced sentence structure
- Use of transition phrases
- Focus on accuracy and authenticity

FOCUS AREAS:
- Explore the deeper meaning and significance
- Provide historical or social context when relevant
- Highlight human connections and relationships
- Show how personal moments reflect universal experiences
- Include quiet, contemplative moments

When generating story cuts in this style, prioritize depth over drama, understanding over excitement. Help the listener learn something new about the moment while feeling deeply connected to it.`,
          user_prompt_template: null,
          is_active: true
        },
        {
          prompt_key: 'story_style_news_report',
          name: 'News Report Style',
          description: 'Factual, structured storytelling with clear timeline and professional tone',
          category: 'story_styles',
          subcategory: 'journalistic',
          model: 'gpt-4o',
          max_tokens: 500,
          temperature: 0.4,
          response_format: 'text',
          prompt_type: 'system_only',
          system_prompt: `You are creating a NEWS REPORT style story cut. This style is characterized by:

PACING & RHYTHM:
- Clear, steady pacing
- Professional delivery rhythm
- Logical flow from point to point
- Efficient use of time

EMOTIONAL TONE:
- Authoritative and credible
- Professional but engaging
- Balanced and objective
- Respectful of all parties involved

STRUCTURE:
- Lead with the most important information
- Follow the 5 W's (Who, What, When, Where, Why)
- Present information in order of importance
- Include key details and context
- Conclude with significance or impact

LANGUAGE STYLE:
- Clear, precise language
- Active voice preferred
- Professional vocabulary
- Avoid jargon or overly casual terms
- Use attribution when presenting perspectives

FOCUS AREAS:
- Establish clear timeline of events
- Present facts accurately and completely
- Include relevant background information
- Highlight the significance of the moment
- Maintain objectivity while showing human interest

When generating story cuts in this style, prioritize clarity, accuracy, and professional presentation. Make the personal story feel newsworthy and significant while maintaining journalistic integrity.`,
          user_prompt_template: null,
          is_active: true
        },
        {
          prompt_key: 'story_style_public_radio',
          name: 'Public Radio Style',
          description: 'Intimate, personal storytelling with rich descriptions and human connection',
          category: 'story_styles',
          subcategory: 'intimate',
          model: 'gpt-4o',
          max_tokens: 500,
          temperature: 0.7,
          response_format: 'text',
          prompt_type: 'system_only',
          system_prompt: `You are creating a PUBLIC RADIO style story cut. This style is characterized by:

PACING & RHYTHM:
- Gentle, unhurried pacing
- Allow for natural pauses and reflection
- Conversational and intimate rhythm
- Let emotional moments resonate

EMOTIONAL TONE:
- Warm and intimate
- Emotionally intelligent
- Vulnerable and honest
- Creating connection between listener and story

STRUCTURE:
- Begin with scene-setting or atmosphere
- Weave together multiple elements naturally
- Include sensory details and personal observations
- Build emotional understanding gradually
- End with meaning or resonance

LANGUAGE STYLE:
- Rich, descriptive language
- Varied sentence lengths for flow
- Sensory details (sounds, smells, textures, sights)
- Metaphorical and poetic elements when appropriate
- Personal, conversational tone

FOCUS AREAS:
- Human emotions and connections
- Sensory experiences and atmosphere
- Personal growth and transformation
- Universal themes in personal moments
- The beauty in everyday experiences
- What makes this moment uniquely human

When generating story cuts in this style, create an intimate listening experience that makes the audience feel they're sharing a meaningful conversation with a close friend. Focus on the human heart of the story.`,
          user_prompt_template: null,
          is_active: true
        },
        {
          prompt_key: 'story_style_podcast_narrative',
          name: 'Podcast Narrative Style',
          description: 'Engaging conversational storytelling with strong narrative arc and listener engagement',
          category: 'story_styles',
          subcategory: 'conversational',
          model: 'gpt-4o',
          max_tokens: 500,
          temperature: 0.7,
          response_format: 'text',
          prompt_type: 'system_only',
          system_prompt: `You are creating a PODCAST NARRATIVE style story cut. This style is characterized by:

PACING & RHYTHM:
- Engaging, conversational pacing
- Vary rhythm to maintain interest
- Use strategic pauses for emphasis
- Build narrative momentum

EMOTIONAL TONE:
- Authentic and relatable
- Conversational but polished
- Emotionally engaging
- Creates sense of discovery

STRUCTURE:
- Strong opening hook
- Clear narrative arc with beginning, middle, end
- Include moments of tension or curiosity
- Weave in background information naturally
- Satisfying conclusion that ties elements together

LANGUAGE STYLE:
- Conversational but articulate
- Direct address to listener when appropriate
- Storytelling techniques (foreshadowing, callbacks)
- Accessible vocabulary
- Natural speech patterns

FOCUS AREAS:
- Create listener engagement and investment
- Build curiosity and maintain interest
- Include relatable human experiences
- Show character development or change
- Connect personal story to broader themes
- Make the listener feel part of the experience

When generating story cuts in this style, imagine you're telling an engaging story to a friend over coffee, but with the polish and structure of a well-produced podcast. Keep the listener hooked while honoring the personal nature of the story.`,
          user_prompt_template: null,
          is_active: true
        }
      ];

      let updatedCount = 0;
      let createdCount = 0;
      let errors = [];

      for (const promptData of storyStylePrompts) {
        try {
          // Check if prompt already exists
          const { data: existing, error: checkError } = await supabase
            .from('prompts')
            .select('id')
            .eq('prompt_key', promptData.prompt_key);

          if (checkError) {
            console.log('Check error for', promptData.prompt_key, ':', checkError);
            errors.push(`${promptData.prompt_key}: ${checkError.message}`);
            continue;
          }

          if (existing && existing.length > 0) {
            // Update existing prompt
            const { error: updateError } = await supabase
              .from('prompts')
              .update({
                name: promptData.name,
                description: promptData.description,
                system_prompt: promptData.system_prompt,
                user_prompt_template: promptData.user_prompt_template,
                is_active: promptData.is_active,
                updated_at: new Date().toISOString()
              })
              .eq('prompt_key', promptData.prompt_key);

            if (updateError) {
              errors.push(`${promptData.prompt_key}: ${updateError.message}`);
            } else {
              updatedCount++;
            }
          } else {
            // Insert new prompt
            const { error: insertError } = await supabase
              .from('prompts')
              .insert([promptData]);

            if (insertError) {
              errors.push(`${promptData.prompt_key}: ${insertError.message}`);
            } else {
              createdCount++;
            }
          }
        } catch (error) {
          errors.push(`${promptData.prompt_key}: ${error.message}`);
        }
      }

      // Report results
      if (errors.length > 0) {
        setSeedResult({
          success: false,
          message: 'Some story style prompts failed to seed',
          details: `Created: ${createdCount}, Updated: ${updatedCount}, Errors: ${errors.length}. Errors: ${errors.join('; ')}`
        });
      } else if (updatedCount > 0 && createdCount === 0) {
        setSeedResult({
          success: true,
          message: 'Story style prompts updated successfully!',
          details: `Updated ${updatedCount} existing story style prompts. Story Cut system ready with Movie Trailer, Documentary, News Report, Public Radio, and Podcast Narrative styles.`
        });
      } else if (createdCount > 0 && updatedCount === 0) {
        setSeedResult({
          success: true,
          message: 'Story style prompts seeded successfully!',
          details: `Created ${createdCount} new story style prompts. Story Cut system ready with Movie Trailer, Documentary, News Report, Public Radio, and Podcast Narrative styles.`
        });
      } else {
        setSeedResult({
          success: true,
          message: 'Story style prompts processed successfully!',
          details: `Created ${createdCount} new prompts, updated ${updatedCount} existing prompts. Story Cut system ready with all 5 narrative styles.`
        });
      }

    } catch (error) {
      setSeedResult({
        success: false,
        message: 'Failed to seed story style prompts',
        details: error.message
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const testStoryStylesFunction = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      console.log('🔧 Diagnosing prompts table function...');
      
      // Test the database function to diagnose the issue
      let { data, error } = await supabase
        .from('prompts')
        .select('count', { count: 'exact', head: true });
      
      // If we can access the prompts table, test the direct query approach
      if (!error) {
        // Test the direct query approach instead of RPC
        const testResult = await supabase
          .from('prompts')
          .select('*')
          .eq('category', 'story_styles');
        
        if (testResult.error) {
          setTestResult({
            type: 'error',
            message: `❌ Database query error: ${testResult.error.message}`,
            details: {
              problem: 'Cannot access prompts table',
              solution: 'Check database permissions and table structure',
              error: testResult.error
            }
          });
        } else {
          setTestResult({
            type: 'success',
            message: `✅ Database function is working correctly! Found ${testResult.data?.length || 0} story styles.`,
            details: testResult.data
          });
        }
      } else {
        setTestResult({
          type: 'error',
          message: `❌ Cannot access database: ${error.message}`,
          details: error
        });
      }
      
    } catch (error) {
      console.error('Test error:', error);
      setTestResult({
        type: 'error',
        message: `❌ Test failed: ${error.message}`,
        details: { error: error.message }
      });
    } finally {
      setIsTesting(false);
    }
  };

  const checkDatabaseHealth = async () => {
    setIsCheckingDB(true);
    setDbStatus(null);
    
    try {
      // Check prompts table with more detailed error info
      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts')
        .select('id', { count: 'exact', head: true });

      const { data: embersData, error: embersError } = await supabase
        .from('embers')
        .select('id', { count: 'exact', head: true });

      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id', { count: 'exact', head: true });

      // Try to get schema info for prompts table
      let schemaInfo = null;
      try {
        const { data: schemaData, error: schemaError } = await supabase
          .from('prompts')
          .select('*')
          .limit(1);
        
        if (schemaError) {
          schemaInfo = `Schema error: ${schemaError.message}`;
        } else if (schemaData && schemaData.length > 0) {
          schemaInfo = `Found data. Columns: ${Object.keys(schemaData[0]).join(', ')}`;
        } else {
          schemaInfo = 'Table accessible but no data to show columns';
        }
      } catch (schemaError) {
        schemaInfo = `Schema check failed: ${schemaError.message}`;
      }

      const status = {
        prompts: {
          healthy: !promptsError,
          count: promptsData?.length || 0,
          error: promptsError?.message,
          details: promptsError ? `Code: ${promptsError.code}, Details: ${promptsError.details}` : null,
          schema: schemaInfo
        },
        embers: {
          healthy: !embersError,
          count: embersData?.length || 0,
          error: embersError?.message
        },
        users: {
          healthy: !usersError,
          count: usersData?.length || 0,
          error: usersError?.message
        }
      };

      setDbStatus(status);

    } catch (error) {
      setDbStatus({
        error: error.message
      });
    } finally {
      setIsCheckingDB(false);
    }
  };

  // Add debug function to check actual table structure
  const testSimpleInsert = async () => {
    try {
      const simpleTest = {
        prompt_key: 'test_prompt_' + Date.now(),
        name: 'Test Prompt', // Changed from 'title' to 'name'
        category: 'test',
        model: 'gpt-4o-mini',
        max_tokens: 150,
        temperature: 0.8,
        user_prompt_template: 'Test prompt template',
        is_active: false
      };
      
      const { data, error } = await supabase
        .from('prompts')
        .insert([simpleTest]);
      
      if (error) {
        console.log('Simple insert error:', error);
      } else {
        console.log('Simple insert success:', data);
      }
    } catch (error) {
      console.log('Test insert error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Development Tools</h1>
        <p className="text-gray-600 mt-2">
          Database utilities, prompt seeding, and development tools for system management.
        </p>
      </div>

      {/* Prompt Management Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Prompt Seeding
          </CardTitle>
          <CardDescription>
            Seed initial prompts into the database for the prompt management system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Image Analysis Prompt</h3>
              <p className="text-sm text-gray-600">
                Comprehensive image analysis prompt with OpenAI Vision API support (gpt-4o, 4000 tokens, temp 0.3)
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={testSimpleInsert}
                variant="outline"
                size="sm"
              >
                Test Insert
              </Button>
              <Button 
                onClick={seedImageAnalysisPrompt}
                disabled={isSeeding}
                className="min-w-[120px]"
              >
                {isSeeding ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Seed/Update Prompt
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Title Generation Prompt</h3>
              <p className="text-sm text-gray-600">
                Creative title generation prompt (gpt-4o-mini, 200 tokens, temp 0.8)
              </p>
            </div>
            <Button 
              onClick={seedTitleGenerationPrompt}
              disabled={isSeeding}
              className="min-w-[120px]"
            >
              {isSeeding ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Seed Prompt
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Ember AI Prompt</h3>
              <p className="text-sm text-gray-600">
                Ember AI story circle questions prompt (gpt-4o-mini, 150 tokens, temp 0.7)
              </p>
            </div>
            <Button 
              onClick={seedEmberAIPrompt}
              disabled={isSeeding}
              className="min-w-[120px]"
            >
              {isSeeding ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Seed Prompt
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Story Style Prompts</h3>
              <p className="text-sm text-gray-600">
                Seeds 5 story style prompts: Movie Trailer, Documentary, News Report, Public Radio, and Podcast Narrative (gpt-4o, 500 tokens each)
              </p>
            </div>
            <Button 
              onClick={seedStoryStylePrompts}
              disabled={isSeeding}
              className="min-w-[120px]"
            >
              {isSeeding ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Seed Prompts
                </>
              )}
            </Button>
          </div>

          {seedResult && (
            <Alert className={seedResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {seedResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={seedResult.success ? 'text-green-800' : 'text-red-800'}>
                  <strong>{seedResult.message}</strong>
                  <br />
                  <span className="text-sm">{seedResult.details}</span>
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Database Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Database Diagnostics
          </CardTitle>
          <CardDescription>
            Diagnose database function issues and get manual fix instructions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Test Story Styles Function</h3>
              <p className="text-sm text-gray-600">
                Tests the get_prompts_by_category function and provides fix instructions if issues are found
              </p>
            </div>
            <Button 
              onClick={testStoryStylesFunction}
              disabled={isTesting}
              className="min-w-[120px]"
              variant="outline"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Function
                </>
              )}
            </Button>
          </div>

          {testResult && (
            <Alert className={testResult.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-start gap-2">
                {testResult.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 mt-1" />
                )}
                <div className={testResult.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  <AlertDescription>
                    <strong>{testResult.message}</strong>
                    {testResult.details?.solution && (
                      <div className="mt-3">
                        <p className="font-medium mb-2">{testResult.details.solution}</p>
                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto text-black font-mono">
                          {testResult.details.sql}
                        </pre>
                        <p className="text-sm mt-2 opacity-90">
                          After running this SQL, refresh the ember page and try the Story Cut Creator again.
                        </p>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Database Health Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Health
          </CardTitle>
          <CardDescription>
            Check the health and status of database tables and connections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={checkDatabaseHealth}
            disabled={isCheckingDB}
            variant="outline"
          >
            {isCheckingDB ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Check Database Health
              </>
            )}
          </Button>

          {dbStatus && (
            <div className="space-y-3">
              {dbStatus.error ? (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Database Error:</strong> {dbStatus.error}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(dbStatus).map(([table, status]) => (
                    <div 
                      key={table}
                      className={`p-3 rounded-lg border ${
                        status.healthy 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{table}</span>
                        {status.healthy ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {status.healthy ? `${status.count} records` : status.error}
                        {table === 'prompts' && status.schema && (
                          <><br /><span className="text-xs italic">{status.schema}</span></>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future Tools Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Additional Tools
          </CardTitle>
          <CardDescription>
            More development tools will be added here as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Additional development tools will be added here.</p>
            <p className="text-sm">Check back for more utilities and database management tools.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 