import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { 
  ArrowLeft, 
  Save, 
  Play, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  Zap, 
  Settings, 
  MessageSquare, 
  Code, 
  FileText,
  TestTube,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { promptExecution } from '../../../lib/promptManager';
import { buildEmberContext } from '../../../lib/emberContext';

const PromptEditor = ({ prompt, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    prompt_key: '',
    title: '',
    description: '',
    category: 'general',
    model: 'gpt-4o-mini',
    max_tokens: 150,
    temperature: 0.8,
    response_format: 'text',
    prompt_type: 'user_only',
    system_prompt: '',
    user_prompt_template: '',
    is_active: true,
    variables: []
  });

  const [showPreview, setShowPreview] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [testVariables, setTestVariables] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Initialize form data when prompt prop changes
  useEffect(() => {
    if (prompt) {
      setFormData({
        prompt_key: prompt.prompt_key || '',
        title: prompt.title || '',
        description: prompt.description || '',
        category: prompt.category || 'general',
        model: prompt.model || 'gpt-4o-mini',
        max_tokens: prompt.max_tokens || 150,
        temperature: prompt.temperature || 0.8,
        response_format: prompt.response_format || 'text',
        prompt_type: prompt.prompt_type || 'user_only',
        system_prompt: prompt.system_prompt || '',
        user_prompt_template: prompt.user_prompt_template || '',
        is_active: prompt.is_active !== undefined ? prompt.is_active : true,
        variables: prompt.variables || []
      });
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

  const handleTest = async () => {
    if (!validateForm()) return;

    try {
      setTestLoading(true);
      setTestResult(null);

      // Build context for testing
      const context = await buildEmberContext.general();
      
      // Replace variables in prompt
      let processedPrompt = formData.user_prompt_template;
      formData.variables.forEach(variable => {
        const value = testVariables[variable] || `[${variable}]`;
        processedPrompt = processedPrompt.replace(
          new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), 
          value
        );
      });

      const result = await promptExecution.execute({
        system_prompt: formData.prompt_type === 'system_user' ? formData.system_prompt : null,
        user_prompt: processedPrompt,
        model: formData.model,
        max_tokens: formData.max_tokens,
        temperature: formData.temperature,
        response_format: formData.response_format
      });

      setTestResult({
        success: true,
        response: result.response,
        usage: result.usage,
        prompt_used: processedPrompt
      });

    } catch (error) {
      console.error('Error testing prompt:', error);
      setTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setTestLoading(false);
    }
  };

  const getPreviewText = () => {
    if (!formData.user_prompt_template) return '';
    
    let preview = formData.user_prompt_template;
    formData.variables.forEach(variable => {
      const value = testVariables[variable] || `[${variable}]`;
      preview = preview.replace(
        new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), 
        value
      );
    });
    
    return preview;
  };

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'image_analysis', label: 'Image Analysis' },
    { value: 'title_generation', label: 'Title Generation' },
    { value: 'story_generation', label: 'Story Generation' },
    { value: 'conversation', label: 'Conversation' },
    { value: 'classification', label: 'Classification' },
    { value: 'extraction', label: 'Extraction' }
  ];

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
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {prompt ? 'Edit Prompt' : 'Create New Prompt'}
            </h1>
            <p className="text-gray-600 mt-1">
              {prompt ? 'Modify the prompt configuration' : 'Configure your new AI prompt'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setTestMode(!testMode)}
            className="w-full sm:w-auto"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {testMode ? 'Hide Test' : 'Test'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
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
                  className={errors.title ? 'border-red-500' : ''}
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
                  className={errors.prompt_key ? 'border-red-500' : ''}
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
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_active">Active (available for use)</Label>
              </div>
            </CardContent>
          </Card>

          {/* AI Model Settings */}
          <Card>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                    className={errors.max_tokens ? 'border-red-500' : ''}
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
                    className={errors.temperature ? 'border-red-500' : ''}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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

          {/* Prompt Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Prompt Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="prompt_type">Prompt Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {promptTypes.map(type => (
                    <div
                      key={type.value}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        formData.prompt_type === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => handleInputChange('prompt_type', type.value)}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={formData.prompt_type === type.value}
                          readOnly
                          className="text-blue-600"
                        />
                        <div>
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-xs text-gray-500">{type.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {formData.prompt_type === 'system_user' && (
                <div>
                  <Label htmlFor="system_prompt">System Prompt *</Label>
                  <Textarea
                    id="system_prompt"
                    value={formData.system_prompt}
                    onChange={(e) => handleInputChange('system_prompt', e.target.value)}
                    placeholder="System instructions for the AI..."
                    rows={4}
                    className={errors.system_prompt ? 'border-red-500' : ''}
                  />
                  {errors.system_prompt && (
                    <p className="text-sm text-red-600 mt-1">{errors.system_prompt}</p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="user_prompt_template">User Prompt Template *</Label>
                <Textarea
                  id="user_prompt_template"
                  value={formData.user_prompt_template}
                  onChange={(e) => handleInputChange('user_prompt_template', e.target.value)}
                  placeholder="User prompt with variables like {{ember_context}} or {{user_input}}..."
                  rows={6}
                  className={errors.user_prompt_template ? 'border-red-500' : ''}
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
        </div>

        {/* Right Column - Preview & Test */}
        <div className="space-y-6">
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Preview
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </CardTitle>
            </CardHeader>
            {showPreview && (
              <CardContent>
                <div className="space-y-4">
                  {formData.prompt_type === 'system_user' && formData.system_prompt && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">System Prompt</Label>
                      <div className="p-3 bg-gray-50 rounded-md text-sm border">
                        <pre className="whitespace-pre-wrap font-mono text-xs">
                          {formData.system_prompt}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700">User Prompt</Label>
                    <div className="p-3 bg-blue-50 rounded-md text-sm border">
                      <pre className="whitespace-pre-wrap font-mono text-xs">
                        {getPreviewText() || 'No user prompt template...'}
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Test Section */}
          {testMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TestTube className="h-5 w-5 mr-2" />
                  Test Prompt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Test Variables */}
                {formData.variables.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Test Variables</Label>
                    <div className="space-y-2 mt-2">
                      {formData.variables.map(variable => (
                        <div key={variable}>
                          <Label className="text-xs text-gray-600">{variable}</Label>
                          <Input
                            type="text"
                            value={testVariables[variable] || ''}
                            onChange={(e) => setTestVariables(prev => ({
                              ...prev,
                              [variable]: e.target.value
                            }))}
                            placeholder={`Enter value for ${variable}`}
                            className="text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleTest}
                  disabled={testLoading}
                  className="w-full"
                >
                  {testLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Test Prompt
                    </>
                  )}
                </Button>

                {/* Test Results */}
                {testResult && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium">Test Result</Label>
                    <div className={`p-3 rounded-md text-sm border mt-2 ${
                      testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      {testResult.success ? (
                        <div className="space-y-2">
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            <span className="font-medium">Success</span>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Response</Label>
                            <pre className="whitespace-pre-wrap font-mono text-xs mt-1">
                              {testResult.response}
                            </pre>
                          </div>
                          {testResult.usage && (
                            <div className="text-xs text-gray-500">
                              Tokens used: {testResult.usage.total_tokens}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center text-red-600">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            <span className="font-medium">Error</span>
                          </div>
                          <div className="text-red-700">
                            {testResult.error}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HelpCircle className="h-5 w-5 mr-2" />
                Help
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Variables</p>
                  <p className="text-gray-600">Use {`{{variable}}`} syntax to create dynamic prompts</p>
                </div>
                <div>
                  <p className="font-medium">Temperature</p>
                  <p className="text-gray-600">0 = deterministic, 1 = creative, 2 = very creative</p>
                </div>
                <div>
                  <p className="font-medium">Common Variables</p>
                  <ul className="text-gray-600 list-disc list-inside ml-2">
                    <li>ember_context - Full ember information</li>
                    <li>user_input - User's input or question</li>
                    <li>image_data - Image analysis data</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PromptEditor; 