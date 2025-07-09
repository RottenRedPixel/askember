import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { 
  Save, 
  Zap, 
  Settings, 
  MessageSquare, 
  Code, 
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';


const PromptEditor = ({ prompt, activeTab, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    prompt_key: '',
    title: '',
    description: '',
    category: 'general', // Hidden but kept for compatibility
    model: 'gpt-4o-mini',
    max_tokens: 150,
    temperature: 0.8,
    response_format: 'text',
    prompt_type: 'user_only',
    system_prompt: '',
    user_prompt_template: '',
    is_active: true, // Hidden but kept for compatibility - all prompts are active by default
    variables: []
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Refs for auto-resizing textareas
  const userPromptRef = useRef(null);
  const systemPromptRef = useRef(null);

  // Auto-resize textarea function
  const autoResizeTextarea = (textarea) => {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  // Initialize form data when prompt prop changes
  useEffect(() => {
    if (prompt) {
      setFormData({
        prompt_key: prompt.prompt_key || '',
        title: prompt.title || '',
        description: prompt.description || '',
        category: prompt.category || 'general', // Hidden field
        model: prompt.model || 'gpt-4o-mini',
        max_tokens: prompt.max_tokens || 150,
        temperature: prompt.temperature || 0.8,
        response_format: prompt.response_format || 'text',
        prompt_type: prompt.prompt_type || 'user_only',
        system_prompt: prompt.system_prompt || '',
        user_prompt_template: prompt.user_prompt_template || '',
        is_active: prompt.is_active !== undefined ? prompt.is_active : true, // Hidden field
        variables: prompt.variables || []
      });
      
      // Auto-resize textareas after a brief delay to ensure DOM is updated
      setTimeout(() => {
        autoResizeTextarea(userPromptRef.current);
        autoResizeTextarea(systemPromptRef.current);
      }, 100);
    }
  }, [prompt]);

  // Extract variables from prompt templates
  useEffect(() => {
    const extractVariables = (text) => {
      const matches = text.match(/\{\{([^}]+)\}\}/g);
      return matches ? matches.map(match => match.replace(/[{}]/g, '')) : [];
    };

    const systemVars = extractVariables(formData.system_prompt);
    const userVars = extractVariables(formData.user_prompt_template);
    const allVars = [...new Set([...systemVars, ...userVars])];

    if (allVars.length !== formData.variables.length || 
        !allVars.every(v => formData.variables.includes(v))) {
      setFormData(prev => ({
        ...prev,
        variables: allVars
      }));
    }
  }, [formData.system_prompt, formData.user_prompt_template]);

  // Auto-resize textareas when content changes
  useEffect(() => {
    autoResizeTextarea(userPromptRef.current);
  }, [formData.user_prompt_template]);

  useEffect(() => {
    autoResizeTextarea(systemPromptRef.current);
  }, [formData.system_prompt]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.prompt_key?.trim()) {
      newErrors.prompt_key = 'Prompt key is required';
    } else if (!/^[a-z0-9_]+$/.test(formData.prompt_key)) {
      newErrors.prompt_key = 'Prompt key must contain only lowercase letters, numbers, and underscores';
    }

    if (!formData.user_prompt_template?.trim()) {
      newErrors.user_prompt_template = 'User prompt template is required';
    }

    if (formData.prompt_type === 'system_user' && !formData.system_prompt?.trim()) {
      newErrors.system_prompt = 'System prompt is required for system+user type';
    }

    if (formData.max_tokens < 1 || formData.max_tokens > 4096) {
      newErrors.max_tokens = 'Max tokens must be between 1 and 4096';
    }

    if (formData.temperature < 0 || formData.temperature > 2) {
      newErrors.temperature = 'Temperature must be between 0 and 2';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      await onSave(formData);
    } catch (error) {
      console.error('Error saving prompt:', error);
      setErrors({ general: error.message });
    } finally {
      setSaving(false);
    }
  };

  const getTabColor = (tab) => {
    switch (tab) {
      case 'image':
        return 'bg-blue-50 border-blue-200';
      case 'title1x':
      case 'title3x':
        return 'bg-purple-50 border-purple-200';
      case 'circle':
        return 'bg-green-50 border-green-200';
      case 'cuts':
        return 'bg-amber-50 border-amber-200';
      case 'styles':
        return 'bg-rose-50 border-rose-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getButtonColor = (tab) => {
    switch (tab) {
      case 'image':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'title1x':
      case 'title3x':
        return 'bg-purple-500 hover:bg-purple-600';
      case 'circle':
        return 'bg-green-500 hover:bg-green-600';
      case 'cuts':
        return 'bg-amber-500 hover:bg-amber-600';
      case 'styles':
        return 'bg-rose-500 hover:bg-rose-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };







  const models = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, Cheap)' },
    { value: 'gpt-4o', label: 'GPT-4o (Balanced)' },
    { value: 'gpt-4', label: 'GPT-4 (Most Capable)' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Legacy)' }
  ];

  const responseFormats = [
    { value: 'text', label: 'Text' },
    { value: 'json_object', label: 'JSON Object' }
  ];

  const promptTypes = [
    { value: 'user_only', label: 'User Only', desc: 'Single user prompt' },
    { value: 'system_user', label: 'System + User', desc: 'System instructions + user prompt' }
  ];

  return (
    <div className="max-w-6xl mx-auto">

      {/* Error Display */}
      {errors.general && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-2">{errors.general}</p>
          </CardContent>
        </Card>
      )}

      <div className="max-w-4xl">
        {/* Form */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card className={getTabColor(activeTab)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Image Analysis for Ember Photos"
                  className={`bg-white ${errors.title ? 'border-red-500' : ''}`}
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <Label htmlFor="prompt_key">Prompt Key *</Label>
                <Input
                  id="prompt_key"
                  type="text"
                  value={formData.prompt_key}
                  onChange={(e) => handleInputChange('prompt_key', e.target.value.toLowerCase())}
                  placeholder="e.g., image_analysis_main"
                  className={`bg-white ${errors.prompt_key ? 'border-red-500' : ''}`}
                />
                {errors.prompt_key && (
                  <p className="text-sm text-red-600 mt-1">{errors.prompt_key}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Unique identifier using lowercase letters, numbers, and underscores
                </p>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what this prompt does..."
                  rows={3}
                  className="bg-white"
                />
              </div>


            </CardContent>
          </Card>

          {/* Prompt Configuration */}
          <Card className={getTabColor(activeTab)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Prompt Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.prompt_type === 'system_user' && (
                <div>
                  <Label htmlFor="system_prompt">System Prompt *</Label>
                  <Textarea
                    ref={systemPromptRef}
                    id="system_prompt"
                    value={formData.system_prompt}
                    onChange={(e) => {
                      handleInputChange('system_prompt', e.target.value);
                      autoResizeTextarea(e.target);
                    }}
                    placeholder="System instructions for the AI..."
                    className={`bg-white resize-none overflow-hidden min-h-[4rem] text-blue-600 ${errors.system_prompt ? 'border-red-500' : ''}`}
                    style={{ height: 'auto' }}
                  />
                  {errors.system_prompt && (
                    <p className="text-sm text-red-600 mt-1">{errors.system_prompt}</p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="user_prompt_template">User Prompt Template *</Label>
                <Textarea
                  ref={userPromptRef}
                  id="user_prompt_template"
                  value={formData.user_prompt_template}
                  onChange={(e) => {
                    handleInputChange('user_prompt_template', e.target.value);
                    autoResizeTextarea(e.target);
                  }}
                  placeholder="User prompt with variables like {{ember_context}} or {{user_input}}..."
                  className={`bg-white resize-none overflow-hidden min-h-[6rem] text-blue-600 ${errors.user_prompt_template ? 'border-red-500' : ''}`}
                  style={{ height: 'auto' }}
                />
                {errors.user_prompt_template && (
                  <p className="text-sm text-red-600 mt-1">{errors.user_prompt_template}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Use {`{{variable}}`} for variables. They will be automatically detected.
                </p>
              </div>

              {/* Variables */}
              {formData.variables.length > 0 && (
                <div>
                  <Label>Detected Variables</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.variables.map(variable => (
                      <Badge key={variable} variant="secondary" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Model Settings */}
          <Card className={getTabColor(activeTab)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                AI Model Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="model">Model</Label>
                <select
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  className="bg-white w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {models.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_tokens">Max Tokens</Label>
                  <Input
                    id="max_tokens"
                    type="number"
                    min="1"
                    max="4096"
                    value={formData.max_tokens}
                    onChange={(e) => handleInputChange('max_tokens', parseInt(e.target.value))}
                    className={`bg-white ${errors.max_tokens ? 'border-red-500' : ''}`}
                  />
                  {errors.max_tokens && (
                    <p className="text-sm text-red-600 mt-1">{errors.max_tokens}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                    className={`bg-white ${errors.temperature ? 'border-red-500' : ''}`}
                  />
                  {errors.temperature && (
                    <p className="text-sm text-red-600 mt-1">{errors.temperature}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="response_format">Response Format</Label>
                <select
                  id="response_format"
                  value={formData.response_format}
                  onChange={(e) => handleInputChange('response_format', e.target.value)}
                  className="bg-white w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {responseFormats.map(format => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end mt-8">
            <Button
              onClick={handleSave}
              disabled={saving}
              className={`${getButtonColor(activeTab)} text-white px-6 py-3 text-lg font-medium`}
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Saving Prompt...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Prompt
                </>
              )}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PromptEditor; 