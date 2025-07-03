import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { 
  ArrowLeft, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Users,
  Clock,
  Target,
  BarChart3,
  PieChart,
  MessageSquare,
  Zap
} from 'lucide-react';

const PromptOverview = ({ overview, onBack, onRefresh }) => {
  if (!overview) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading overview...</p>
        </div>
      </div>
    );
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceIcon = (score) => {
    if (score >= 80) return <TrendingUp className="h-4 w-4" />;
    if (score >= 60) return <Activity className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
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
            <h1 className="text-2xl font-bold text-gray-900">Prompt Overview</h1>
            <p className="text-gray-600 mt-1">
              Analytics and insights for your AI prompts
            </p>
          </div>
        </div>
        
        <Button
          onClick={onRefresh}
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Prompts</p>
                <p className="text-3xl font-bold text-gray-900">{overview.total}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {overview.active} active, {overview.total - overview.active} inactive
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Usage</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(overview.totalUsage)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  All-time executions
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Performance</p>
                <p className="text-3xl font-bold text-gray-900">
                  {overview.avgPerformance || 0}%
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Success rate
                </p>
              </div>
              <div className={`p-3 rounded-full ${overview.avgPerformance >= 80 ? 'bg-green-100' : overview.avgPerformance >= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                {getPerformanceIcon(overview.avgPerformance)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-3xl font-bold text-gray-900">
                  {Object.keys(overview.categories || {}).length}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Different types
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <PieChart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Categories Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(overview.categories || {}).map(([category, data]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary" className="text-xs">
                      {category.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {data.count} prompts
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">
                      {formatNumber(data.usage)} uses
                    </span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(data.usage / overview.totalUsage) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Top Performing Prompts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview.topPrompts?.map((prompt, index) => (
                <div key={prompt.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {prompt.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {prompt.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatNumber(prompt.usage_count)} uses
                    </p>
                    <p className={`text-xs ${getPerformanceColor(prompt.performance_score)}`}>
                      {prompt.performance_score}% success
                    </p>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No performance data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overview.recentActivity?.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {activity.type === 'created' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                    {activity.type === 'updated' && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                    {activity.type === 'used' && (
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            )) || (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Target className="h-4 w-4 mr-2" />
              Most Used Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overview.modelUsage?.map((model, index) => (
                <div key={model.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{model.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {model.count} prompts
                  </Badge>
                </div>
              )) || (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No model data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Zap className="h-4 w-4 mr-2" />
              Token Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Tokens</span>
                <span className="text-sm font-medium">
                  {formatNumber(overview.totalTokens || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Avg per Prompt</span>
                <span className="text-sm font-medium">
                  {Math.round((overview.totalTokens || 0) / Math.max(overview.totalUsage, 1))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Efficiency Score</span>
                <span className="text-sm font-medium">
                  {overview.efficiency || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Users className="h-4 w-4 mr-2" />
              Usage Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Peak Usage</span>
                <span className="text-sm font-medium">
                  {overview.peakUsage || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Most Active Day</span>
                <span className="text-sm font-medium">
                  {overview.mostActiveDay || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Response Time</span>
                <span className="text-sm font-medium">
                  {overview.avgResponseTime || 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PromptOverview; 