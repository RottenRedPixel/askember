import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { 
  Edit, 
  Trash2, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { promptsCRUD } from '../../../lib/promptManager';
import PromptEditor from './PromptEditor';
import PromptDetails from './PromptDetails';

const PromptManagement = () => {
  const [prompts, setPrompts] = useState([]);
  const [filteredPrompts, setFilteredPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState('image');
  const [currentView, setCurrentView] = useState('list'); // 'list', 'overview', 'editor', 'details'
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  // Load prompts and overview
  useEffect(() => {
    loadData();
  }, []);

  // Filter prompts when tab changes
  useEffect(() => {
    filterPromptsByTab();
    
    // Handle IMAGE tab - open directly to edit view
    if (activeTab === 'image' && prompts.length > 0) {
      const imagePrompt = prompts.find(prompt => 
        prompt.title?.toLowerCase().includes('image analysis') ||
        prompt.prompt_key?.includes('image_analysis')
      );
      
      if (imagePrompt) {
        setSelectedPrompt(imagePrompt);
        setCurrentView('editor');
      }
    }
    
    // Handle CUTS tab - open directly to edit view
    if (activeTab === 'cuts' && prompts.length > 0) {
      const cutPrompt = prompts.find(prompt => 
        prompt.title?.toLowerCase().includes('story cut') ||
        prompt.prompt_key?.includes('story_cut_generation')
      );
      
      if (cutPrompt) {
        setSelectedPrompt(cutPrompt);
        setCurrentView('editor');
      }
    }
    
    // Handle CIRCLE tab - open directly to edit view
    if (activeTab === 'circle' && prompts.length > 0) {
      const circlePrompt = prompts.find(prompt => 
        prompt.title?.toLowerCase().includes('ember ai story circle') ||
        prompt.prompt_key?.includes('story_circle_ember_ai')
      );
      
      if (circlePrompt) {
        setSelectedPrompt(circlePrompt);
        setCurrentView('editor');
      }
    }
    
    // Handle TITLE TRY tab - open directly to edit view
    if (activeTab === 'title1x' && prompts.length > 0) {
      const titleTryPrompt = prompts.find(prompt => 
        prompt.prompt_key?.includes('title_generation_single') ||
        prompt.title?.toLowerCase().includes('let ember try') ||
        (prompt.title?.toLowerCase().includes('title') && 
         prompt.description?.toLowerCase().includes('single title'))
      );
      
      if (titleTryPrompt) {
        setSelectedPrompt(titleTryPrompt);
        setCurrentView('editor');
      }
    }
    
    // Handle TITLE 3X tab - open directly to edit view
    if (activeTab === 'title3x' && prompts.length > 0) {
      const title3xPrompt = prompts.find(prompt => 
        prompt.prompt_key?.includes('title_generation_creative') ||
        prompt.title?.toLowerCase().includes('creative title generation') ||
        (prompt.title?.toLowerCase().includes('title') && 
         prompt.description?.toLowerCase().includes('creative'))
      );
      
      if (title3xPrompt) {
        setSelectedPrompt(title3xPrompt);
        setCurrentView('editor');
      }
    }
    
    // Handle STYLES tab - show list view
    if (activeTab === 'styles') {
      setCurrentView('list');
      setSelectedPrompt(null);
    }
  }, [prompts, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all prompts for tab filtering
      const promptsResult = await promptsCRUD.getAll({
        page: 1,
        limit: 1000, // Get all prompts
      });

      setPrompts(promptsResult.prompts || []);

    } catch (error) {
      console.error('Error loading prompt data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterPromptsByTab = () => {
    let filtered = [];

    switch (activeTab) {
      case 'image':
        // IMAGE tab - Ember Image Analysis
        filtered = prompts.filter(prompt => 
          prompt.title?.toLowerCase().includes('image analysis') ||
          prompt.prompt_key?.includes('image_analysis')
        );
        break;
      
      case 'title1x':
        // TITLE TRY tab - Single title generation prompts (Let Ember Try)
        filtered = prompts.filter(prompt => 
          prompt.prompt_key?.includes('title_generation_single') ||
          (prompt.title?.toLowerCase().includes('title') && 
           (prompt.title?.toLowerCase().includes('single') || 
            prompt.title?.toLowerCase().includes('let ember try') ||
            prompt.description?.toLowerCase().includes('single title')))
        );
        break;
      
      case 'title3x':
        // TITLE 3X tab - Multiple title generation prompts (Creative, Poetic, Ember Title Generator)
        filtered = prompts.filter(prompt => 
          prompt.prompt_key?.includes('title_generation_creative') ||
          prompt.prompt_key?.includes('title_generation_poetic') ||
          (prompt.prompt_key?.includes('title_generation') && !prompt.prompt_key?.includes('title_generation_single')) ||
          (prompt.title?.toLowerCase().includes('title') && 
           (prompt.title?.toLowerCase().includes('creative') || 
            prompt.title?.toLowerCase().includes('poetic') ||
            prompt.title?.toLowerCase().includes('ember title generator') ||
            prompt.title?.toLowerCase().includes('title generator') ||
            prompt.description?.toLowerCase().includes('multiple') ||
            prompt.description?.toLowerCase().includes('5 ') ||
            prompt.description?.toLowerCase().includes('3 ')) &&
           !prompt.title?.toLowerCase().includes('single') &&
           !prompt.title?.toLowerCase().includes('let ember try') &&
           !prompt.description?.toLowerCase().includes('single title'))
        );
        break;
      
      case 'circle':
        // CIRCLE tab - Ember AI Story Circle Questions
        filtered = prompts.filter(prompt => 
          prompt.title?.toLowerCase().includes('story circle') ||
          prompt.title?.toLowerCase().includes('story questions') ||
          prompt.prompt_key?.includes('story_circle')
        );
        break;
      
      case 'cuts':
        // CUTS tab - Ember Story Cut Generator
        filtered = prompts.filter(prompt => 
          prompt.title?.toLowerCase().includes('story cut') ||
          prompt.prompt_key?.includes('story_cut_generation')
        );
        break;
      
      case 'styles':
        // STYLES tab - The 5 style prompts
        filtered = prompts.filter(prompt => 
          prompt.title?.toLowerCase().includes('style') ||
          prompt.prompt_key?.includes('story_style') ||
          prompt.category === 'story_styles'
        );
        break;
      
      default:
        filtered = prompts;
    }

    setFilteredPrompts(filtered);
  };

  const handlePromptAction = async (action, prompt) => {
    try {
      switch (action) {
        case 'view':
          setSelectedPrompt(prompt);
          setCurrentView('details');
          break;
        
        case 'edit':
          setSelectedPrompt(prompt);
          setCurrentView('editor');
          break;
        
        case 'clone':
          const cloned = await promptsCRUD.clone(prompt.id, {
            title: `${prompt.title} (Copy)`,
            is_active: false
          });
          await loadData();
          setSelectedPrompt(cloned);
          setCurrentView('editor');
          break;
        
        case 'toggle':
          await promptsCRUD.update(prompt.id, { is_active: !prompt.is_active });
          await loadData();
          break;
        
        case 'delete':
          if (window.confirm('Are you sure you want to delete this prompt?')) {
            await promptsCRUD.delete(prompt.id);
            await loadData();
          }
          break;
        
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error) {
      console.error('Error performing prompt action:', error);
      setError(error.message);
    }
  };

  const handleSavePrompt = async (promptData) => {
    try {
      if (selectedPrompt) {
        // Update existing
        await promptsCRUD.update(selectedPrompt.id, promptData);
      } else {
        // Create new
        await promptsCRUD.create(promptData);
      }
      
      await loadData();
      
      // If we're on IMAGE, CUTS, CIRCLE, TITLE TRY, or TITLE 3X tab, switch to STYLES tab after save since they have no list view
      if (activeTab === 'image' || activeTab === 'cuts' || activeTab === 'circle' || activeTab === 'title1x' || activeTab === 'title3x') {
        setActiveTab('styles');
      }
      
      setCurrentView('list');
      setSelectedPrompt(null);
    } catch (error) {
      console.error('Error saving prompt:', error);
      setError(error.message);
    }
  };

  const getStatusColor = (prompt) => {
    if (!prompt.is_active) return 'bg-gray-500';
    if (prompt.usage_count > 100) return 'bg-green-500';
    if (prompt.usage_count > 10) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  const getStatusText = (prompt) => {
    if (!prompt.is_active) return 'Inactive';
    if (prompt.usage_count > 100) return 'Popular';
    if (prompt.usage_count > 10) return 'Active';
    return 'New';
  };

  if (loading && prompts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading prompts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error loading prompts</span>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
            <Button 
              onClick={loadData} 
              className="mt-4"
              variant="outline"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main view with tabs always visible
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Prompt Management</h1>
        <p className="text-gray-600 mt-1">
          Configure and optimize AI prompts and templates
        </p>
      </div>
        
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger 
            value="image" 
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
          >
            IMAGE
          </TabsTrigger>
          <TabsTrigger 
            value="title1x" 
            className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
          >
            TITLE TRY
          </TabsTrigger>
          <TabsTrigger 
            value="title3x" 
            className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
          >
            TITLE 3X
          </TabsTrigger>
          <TabsTrigger 
            value="circle" 
            className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
          >
            CIRCLE
          </TabsTrigger>
          <TabsTrigger 
            value="cuts" 
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
          >
            CUTS
          </TabsTrigger>
          <TabsTrigger 
            value="styles" 
            className="data-[state=active]:bg-rose-500 data-[state=active]:text-white"
          >
            STYLES
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {/* Render different views */}
          {currentView === 'editor' ? (
            <PromptEditor
              prompt={selectedPrompt}
              activeTab={activeTab}
              onSave={handleSavePrompt}
              onCancel={() => {
                // If we're on IMAGE, CUTS, CIRCLE, TITLE TRY, or TITLE 3X tab, switch to STYLES tab on cancel since they have no list view
                if (activeTab === 'image' || activeTab === 'cuts' || activeTab === 'circle' || activeTab === 'title1x' || activeTab === 'title3x') {
                  setActiveTab('styles');
                }
                
                setCurrentView('list');
                setSelectedPrompt(null);
              }}
            />
          ) : currentView === 'details' ? (
            <PromptDetails
              prompt={selectedPrompt}
              onEdit={() => setCurrentView('editor')}
              onBack={() => setCurrentView('list')}
              onAction={handlePromptAction}
            />
          ) : (
            /* Prompts List */
            <div className="space-y-4">
            {activeTab === 'image' ? (
              // IMAGE tab - show message since it opens directly to edit
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Opening Image Analysis Editor...</h3>
                    <p className="mb-4">
                      The image analysis prompt is opening in edit mode.
                    </p>
              </div>
                </CardContent>
              </Card>
            ) : activeTab === 'cuts' ? (
              // CUTS tab - show message since it opens directly to edit
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Opening Story Cut Generator...</h3>
                    <p className="mb-4">
                      The story cut generator prompt is opening in edit mode.
                    </p>
              </div>
                </CardContent>
              </Card>
            ) : activeTab === 'circle' ? (
              // CIRCLE tab - show message since it opens directly to edit
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Opening Ember AI Story Circle...</h3>
                    <p className="mb-4">
                      The Ember AI story circle prompt is opening in edit mode.
                    </p>
              </div>
                </CardContent>
              </Card>
            ) : activeTab === 'title1x' ? (
              // TITLE TRY tab - show message since it opens directly to edit
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Opening Let Ember Try...</h3>
                    <p className="mb-4">
                      The single title generator prompt is opening in edit mode.
                    </p>
                </div>
                </CardContent>
              </Card>
            ) : activeTab === 'title3x' ? (
              // TITLE 3X tab - show message since it opens directly to edit
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Opening Creative Title Generator...</h3>
                    <p className="mb-4">
                      The creative title generator prompt is opening in edit mode.
                    </p>
            </div>
        </CardContent>
      </Card>
            ) : filteredPrompts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No prompts found</h3>
                <p className="mb-4">
                      No prompts found for this category.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPrompts.map((prompt) => (
            <Card key={prompt.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {prompt.title || prompt.name}
                      </h3>
                      <Badge 
                        className={`${getStatusColor(prompt)} text-white text-xs`}
                      >
                        {getStatusText(prompt)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {prompt.category}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                      {prompt.description || 'No description provided'}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <span className="font-medium">{prompt.model || 'gpt-4o-mini'}</span>
                      </span>
                      <span className="flex items-center">
                        <span>Max: {prompt.max_tokens || 150} tokens</span>
                      </span>
                      <span className="flex items-center">
                        <span>Temp: {prompt.temperature || 0.8}</span>
                      </span>
                      {prompt.usage_count > 0 && (
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Used {prompt.usage_count} times
                        </span>
                      )}
                      {prompt.last_used_at && (
                        <span className="flex items-center">
                          Last used: {new Date(prompt.last_used_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 lg:ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePromptAction('edit', prompt)}
                      className="w-full sm:w-auto"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        </div>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PromptManagement; 