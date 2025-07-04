import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { 
  Search, 
  Plus, 
  Filter, 
  Eye, 
  Edit, 
  Copy, 
  Trash2, 
  Play, 
  Pause,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { promptsCRUD, promptUtils } from '../../../lib/promptManager';
import PromptOverview from './PromptOverview';
import PromptEditor from './PromptEditor';
import PromptDetails from './PromptDetails';

const PromptManagement = () => {
  const [prompts, setPrompts] = useState([]);
  const [filteredPrompts, setFilteredPrompts] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentView, setCurrentView] = useState('list'); // 'list', 'overview', 'editor', 'details'
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Load prompts and overview
  useEffect(() => {
    loadData();
  }, [currentPage]);

  // Filter prompts when search/filters change
  useEffect(() => {
    filterPrompts();
  }, [prompts, searchTerm, selectedCategory, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load prompts with pagination
      const promptsResult = await promptsCRUD.getAll({
        page: currentPage,
        limit: itemsPerPage,
        category: selectedCategory !== 'all' ? selectedCategory : null,
        search: searchTerm || null
      });

      // Load overview statistics
      const overviewResult = await promptUtils.getOverview();

      setPrompts(promptsResult.prompts || []);
      setTotalPages(promptsResult.pagination?.pages || 1);
      setOverview(overviewResult);

    } catch (error) {
      console.error('Error loading prompt data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterPrompts = () => {
    let filtered = [...prompts];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(prompt => 
        prompt.title?.toLowerCase().includes(term) ||
        prompt.description?.toLowerCase().includes(term) ||
        prompt.prompt_key?.toLowerCase().includes(term) ||
        prompt.category?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(prompt => prompt.category === selectedCategory);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(prompt => {
        if (selectedStatus === 'active') return prompt.is_active;
        if (selectedStatus === 'inactive') return !prompt.is_active;
        return true;
      });
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

  const handleCreateNew = () => {
    setSelectedPrompt(null);
    setCurrentView('editor');
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

  const categories = [
    'all',
    'image_analysis',
    'title_generation', 
    'story_generation',
    'story_styles',
    'conversation',
    'general'
  ];

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

  // Render different views
  if (currentView === 'overview') {
    return (
      <PromptOverview 
        overview={overview}
        onBack={() => setCurrentView('list')}
        onRefresh={loadData}
      />
    );
  }

  if (currentView === 'editor') {
    return (
      <PromptEditor
        prompt={selectedPrompt}
        onSave={handleSavePrompt}
        onCancel={() => {
          setCurrentView('list');
          setSelectedPrompt(null);
        }}
      />
    );
  }

  if (currentView === 'details') {
    return (
      <PromptDetails
        prompt={selectedPrompt}
        onEdit={() => setCurrentView('editor')}
        onBack={() => setCurrentView('list')}
        onAction={handlePromptAction}
      />
    );
  }

  // Main list view
  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prompt Management</h1>
          <p className="text-gray-600 mt-1">
            Manage and optimize your AI prompts
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Button
            onClick={() => setCurrentView('overview')}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </Button>
          <Button
            onClick={handleCreateNew}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Prompt
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search prompts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Quick filters */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Overview Stats */}
          {overview && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{overview.total}</div>
                <div className="text-sm text-gray-600">Total Prompts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{overview.active}</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{overview.totalUsage}</div>
                <div className="text-sm text-gray-600">Total Usage</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(overview.categories || {}).length}
                </div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prompts List */}
      <div className="space-y-4">
        {filteredPrompts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No prompts found</h3>
                <p className="mb-4">
                  {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                    ? 'Try adjusting your filters or search terms.'
                    : 'Get started by creating your first prompt.'}
                </p>
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Prompt
                </Button>
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
                      onClick={() => handlePromptAction('view', prompt)}
                      className="w-full sm:w-auto"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePromptAction('edit', prompt)}
                      className="w-full sm:w-auto"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePromptAction('clone', prompt)}
                      className="w-full sm:w-auto"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Clone
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePromptAction('toggle', prompt)}
                      className={`w-full sm:w-auto ${prompt.is_active ? 'text-orange-600' : 'text-green-600'}`}
                    >
                      {prompt.is_active ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <span className="flex items-center px-4 py-2 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default PromptManagement; 