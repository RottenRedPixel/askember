import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { 
  ArrowLeft, 
  Edit, 
  Copy, 
  Play, 
  Pause, 
  Trash2, 
  Eye, 
  EyeOff, 
  Clock, 
  Activity, 
  Settings, 
  MessageSquare, 
  Code, 
  BarChart3, 
  Zap, 
  Target,
  AlertCircle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

const PromptDetails = ({ prompt, onEdit, onBack, onAction }) => {
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showUserPrompt, setShowUserPrompt] = useState(true);

  if (!prompt) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No prompt selected</p>
          <Button onClick={onBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-green-500' : 'bg-gray-500';
  };

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUsageLevel = (count) => {
    if (count === 0) return { level: 'Unused', color: 'text-gray-500' };
    if (count < 10) return { level: 'Low', color: 'text-yellow-600' };
    if (count < 100) return { level: 'Medium', color: 'text-blue-600' };
    return { level: 'High', color: 'text-green-600' };
  };

  const usageLevel = getUsageLevel(prompt.usage_count || 0);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{prompt.title}</h1>
            <p className="text-gray-600 mt-1">{prompt.description || 'No description'}</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={onEdit}
            className="w-full sm:w-auto"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => onAction('clone', prompt)}
            className="w-full sm:w-auto"
          >
            <Copy className="h-4 w-4 mr-2" />
            Clone
          </Button>
          <Button
            variant="outline"
            onClick={() => onAction('toggle', prompt)}
            className={`w-full sm:w-auto ${prompt.is_active ? 'text-orange-600' : 'text-green-600'}`}
          >
            {prompt.is_active ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Deactivate
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Prompt Key</label>
                  <p className="text-gray-900 font-mono text-sm">{prompt.prompt_key}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Category</label>
                  <Badge variant="secondary" className="mt-1">
                    {prompt.category?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(prompt.is_active)}`}></div>
                    <span className="text-sm">
                      {prompt.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Version</label>
                  <p className="text-gray-900">{prompt.version || 1}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Model Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                AI Model Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Model</label>
                  <p className="text-gray-900 font-mono text-sm">{prompt.model}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Max Tokens</label>
                  <p className="text-gray-900">{prompt.max_tokens}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Temperature</label>
                  <p className="text-gray-900">{prompt.temperature}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Response Format</label>
                  <p className="text-gray-900">{prompt.response_format}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Prompt Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Prompt Type</label>
                <Badge variant="outline" className="mt-1">
                  {prompt.prompt_type === 'system_user' ? 'System + User' : 'User Only'}
                </Badge>
              </div>

              {prompt.prompt_type === 'system_user' && prompt.system_prompt && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-600">System Prompt</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                    >
                      {showSystemPrompt ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {showSystemPrompt && (
                    <div className="p-3 bg-gray-50 rounded-md border">
                      <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                        {prompt.system_prompt}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-600">User Prompt Template</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUserPrompt(!showUserPrompt)}
                  >
                    {showUserPrompt ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {showUserPrompt && (
                  <div className="p-3 bg-blue-50 rounded-md border">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                      {prompt.user_prompt_template}
                    </pre>
                  </div>
                )}
              </div>

              {/* Variables */}
              {prompt.variables && prompt.variables.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Variables</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                                         {prompt.variables.map(variable => (
                       <Badge key={variable} variant="secondary" className="text-xs font-mono">
                         {`{{${variable}}}`}
                       </Badge>
                     ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {prompt.usage_count || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Usage</div>
                  <div className={`text-xs ${usageLevel.color} mt-1`}>
                    {usageLevel.level}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {prompt.success_count || 0}
                  </div>
                  <div className="text-sm text-gray-600">Successful Runs</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {prompt.usage_count ? Math.round((prompt.success_count / prompt.usage_count) * 100) : 0}% success rate
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {prompt.avg_response_time || 0}ms
                  </div>
                  <div className="text-sm text-gray-600">Avg Response Time</div>
                  <div className={`text-xs mt-1 ${prompt.avg_response_time < 2000 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {prompt.avg_response_time < 2000 ? 'Fast' : 'Slow'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {prompt.avg_tokens_used || 0}
                  </div>
                  <div className="text-sm text-gray-600">Avg Tokens Used</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {prompt.max_tokens ? Math.round((prompt.avg_tokens_used / prompt.max_tokens) * 100) : 0}% of max
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                onClick={() => onAction('clone', prompt)}
                className="w-full justify-start"
              >
                <Copy className="h-4 w-4 mr-2" />
                Clone Prompt
              </Button>
              <Button
                variant="outline"
                onClick={() => onAction('toggle', prompt)}
                className="w-full justify-start"
              >
                {prompt.is_active ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => onAction('delete', prompt)}
                className="w-full justify-start text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Created</label>
                <p className="text-sm text-gray-900">{formatDate(prompt.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Last Modified</label>
                <p className="text-sm text-gray-900">{formatDate(prompt.updated_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Last Used</label>
                <p className="text-sm text-gray-900">{formatDate(prompt.last_used_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Usage Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Runs</span>
                <span className="text-sm font-medium">{prompt.usage_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className={`text-sm font-medium ${getPerformanceColor(prompt.success_count / Math.max(prompt.usage_count, 1) * 100)}`}>
                  {prompt.usage_count ? Math.round((prompt.success_count / prompt.usage_count) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Error Rate</span>
                <span className="text-sm font-medium text-red-600">
                  {prompt.usage_count ? Math.round(((prompt.usage_count - prompt.success_count) / prompt.usage_count) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Cost</span>
                <span className="text-sm font-medium">
                  ${(prompt.total_cost / Math.max(prompt.usage_count, 1)).toFixed(4) || '0.0000'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {prompt.usage_count === 0 && (
                  <div className="flex items-center text-gray-500">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span className="text-sm">No usage data yet</span>
                  </div>
                )}
                
                {prompt.usage_count > 0 && (
                  <>
                    {prompt.avg_response_time < 2000 && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        <span className="text-sm">Fast response time</span>
                      </div>
                    )}
                    
                    {prompt.success_count / prompt.usage_count > 0.9 && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        <span className="text-sm">High success rate</span>
                      </div>
                    )}
                    
                    {prompt.usage_count > 100 && (
                      <div className="flex items-center text-blue-600">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        <span className="text-sm">Popular prompt</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PromptDetails; 