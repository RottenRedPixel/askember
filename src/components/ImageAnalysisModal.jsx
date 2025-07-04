import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getImageAnalysis, triggerImageAnalysis, saveImageAnalysis } from '@/lib/database';
import useStore from '@/store';
import { 
  Eye, 
  Brain, 
  Users, 
  Clock, 
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Save,
  Zap
} from 'lucide-react';

// Custom hook to detect mobile devices
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
}

const ModalContent = ({ 
  loading,
  analysis,
  error,
  onAnalyze,
  onSave,
  saving,
  hasAnalysis,
  analysisMetadata,
  ember,
  debugLogs,
  clearDebugLogs
}) => (
  <div className="space-y-6">
    {/* Header Info */}
    <div className="text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Image Analysis</h3>
      <p className="text-sm text-gray-600">
        Deep analysis of your image using artificial intelligence
      </p>
    </div>

    {loading ? (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Analyzing image with AI...</p>
        <p className="text-xs text-gray-400 mt-1">This may take 10-30 seconds</p>
      </div>
    ) : error ? (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="space-y-2">
            <p className="font-medium">Analysis Failed</p>
            <p className="text-sm">{error}</p>
          </div>
        </AlertDescription>
      </Alert>
    ) : !hasAnalysis ? (
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-6 text-center">
          <Brain size={32} className="text-purple-600 mx-auto mb-3" />
          <h4 className="font-medium text-purple-900 mb-2">Ready for AI Analysis</h4>
          <p className="text-sm text-purple-700 mb-4">
            Get detailed insights about people, objects, emotions, environment, and more in your image.
          </p>
          <Button 
            onClick={onAnalyze}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Analyze Image
          </Button>
          
        </CardContent>
      </Card>
    ) : (
      <div className="space-y-4">
        {/* Analysis Status */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-600" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900">Analysis Complete</h4>
                <div className="flex items-center gap-4 mt-1 text-xs text-green-700">
                  {analysisMetadata?.analysis_timestamp && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(analysisMetadata.analysis_timestamp).toLocaleDateString()}
                    </span>
                  )}
                  {analysisMetadata?.openai_model && (
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                      {analysisMetadata.openai_model}
                    </Badge>
                  )}
                  {analysisMetadata?.tokens_used && (
                    <span className="text-green-600">
                      {analysisMetadata.tokens_used} tokens
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onAnalyze}
                className="text-green-700 hover:bg-green-100"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Re-analyze
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Content */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {analysis}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Analysis Button */}
        <div className="pt-4 border-t border-gray-200">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Saving Analysis...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Analysis Data
              </>
            )}
          </Button>
        </div>
      </div>
    )}
    
    {/* Debug Log Display - Always visible */}
    {debugLogs.length > 0 && (
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              Debug Log
              <Badge variant="outline" className="ml-2">
                {debugLogs.length}
              </Badge>
            </h5>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDebugLogs}
              className="text-gray-600 hover:text-gray-800"
            >
              Clear
            </Button>
          </div>
          <div className="bg-white rounded-lg p-3 max-h-40 overflow-y-auto border">
            <div className="space-y-1 text-xs font-mono">
              {debugLogs.map((log) => (
                <div 
                  key={log.id} 
                  className={`flex items-start gap-2 ${
                    log.type === 'error' ? 'text-red-600' : 
                    log.type === 'success' ? 'text-green-600' : 
                    'text-gray-600'
                  }`}
                >
                  <span className="text-gray-400 shrink-0">{log.timestamp}</span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

export default function ImageAnalysisModal({ isOpen, onClose, ember, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisMetadata, setAnalysisMetadata] = useState(null);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  
  const { user } = useStore();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Debug logging function
  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: Date.now(),
      timestamp,
      message,
      type,
      userAgent: navigator.userAgent,
      isMobile,
      networkStatus: navigator.onLine ? 'online' : 'offline'
    };
    
    setDebugLogs(prev => [logEntry, ...prev.slice(0, 9)]); // Keep last 10 logs
    console.log(`[DEBUG ${type.toUpperCase()}] ${timestamp}: ${message}`);
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
  };

  useEffect(() => {
    if (isOpen && ember?.id) {
      // Clear previous debug logs and add initial device info
      setDebugLogs([]);
      addDebugLog('Modal opened - collecting device info', 'info');
      addDebugLog(`Device: ${isMobile ? 'Mobile' : 'Desktop'}`, 'info');
      addDebugLog(`Screen: ${window.screen.width}x${window.screen.height}`, 'info');
      addDebugLog(`Viewport: ${window.innerWidth}x${window.innerHeight}`, 'info');
      
      loadExistingAnalysis();
    }
  }, [isOpen, ember?.id]);

  const loadExistingAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      addDebugLog('Loading existing analysis...', 'info');
      const existingAnalysis = await getImageAnalysis(ember.id);
      
      if (existingAnalysis) {
        addDebugLog('Existing analysis found', 'success');
        addDebugLog(`Analysis length: ${existingAnalysis.analysis_text?.length || 0} characters`, 'info');
        setAnalysis(existingAnalysis.analysis_text);
        setAnalysisMetadata(existingAnalysis);
        setHasAnalysis(true);
      } else {
        addDebugLog('No existing analysis found', 'info');
        setAnalysis(null);
        setAnalysisMetadata(null);
        setHasAnalysis(false);
      }
    } catch (error) {
      console.error('Error loading existing analysis:', error);
      addDebugLog(`Failed to load existing analysis: ${error.message}`, 'error');
      setError('Failed to load existing analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!ember?.image_url || !user?.id) {
      const errorMsg = 'Missing required data for analysis';
      addDebugLog(errorMsg, 'error');
      setError(errorMsg);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      addDebugLog(`Starting analysis for ember ${ember.id}`, 'info');
      addDebugLog(`Image URL: ${ember.image_url.substring(0, 50)}...`, 'info');
      addDebugLog(`User Agent: ${navigator.userAgent}`, 'info');
      addDebugLog(`Network Status: ${navigator.onLine ? 'online' : 'offline'}`, 'info');
      addDebugLog(`Connection Type: ${navigator.connection?.effectiveType || 'unknown'}`, 'info');
      addDebugLog(`API Endpoint: /api/analyze-image`, 'info');

      // Trigger OpenAI analysis
      addDebugLog('Calling triggerImageAnalysis...', 'info');
      const result = await triggerImageAnalysis(ember.id, ember.image_url);
      addDebugLog(`Analysis result received: ${result.success ? 'SUCCESS' : 'FAILED'}`, result.success ? 'success' : 'error');
      
      if (result.success) {
        addDebugLog(`Analysis length: ${result.analysis?.length || 0} characters`, 'info');
        addDebugLog(`Model used: ${result.model || 'unknown'}`, 'info');
        addDebugLog(`Tokens used: ${result.tokensUsed || 0}`, 'info');
        
        // Save the analysis to database
        addDebugLog('Saving analysis to database...', 'info');
        await saveImageAnalysis(
          ember.id,
          user.id,
          result.analysis,
          ember.image_url,
          result.model,
          result.tokensUsed
        );
        addDebugLog('Analysis saved successfully', 'success');

        // Update local state
        setAnalysis(result.analysis);
        setAnalysisMetadata({
          analysis_timestamp: result.timestamp,
          openai_model: result.model,
          tokens_used: result.tokensUsed
        });
        setHasAnalysis(true);

        // Refresh parent component if needed
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        throw new Error('Analysis was not successful');
      }
    } catch (error) {
      console.error('Error during analysis:', error);
      addDebugLog(`Analysis failed: ${error.message}`, 'error');
      setError(error.message || 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!analysis || !user?.id || !ember?.id) {
      setError('No analysis data to save');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Data is already saved when analysis is performed
      // This button is more of a "confirm save" action
      console.log('Analysis data confirmed saved');

      // Refresh parent component to update completion status
      if (onRefresh) {
        await onRefresh();
      }

      onClose();
    } catch (error) {
      console.error('Error saving analysis:', error);
      setError('Failed to save analysis data');
    } finally {
      setSaving(false);
    }
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="bg-white focus:outline-none">
          <DrawerHeader className="bg-white">
            <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Eye className="w-5 h-5 text-purple-600" />
              AI Image Analysis
            </DrawerTitle>
            <DrawerDescription className="text-left text-gray-600">
              Deep artificial intelligence analysis of your image
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
            <ModalContent 
              loading={loading}
              analysis={analysis}
              error={error}
              onAnalyze={handleAnalyze}
              onSave={handleSave}
              saving={saving}
              hasAnalysis={hasAnalysis}
              analysisMetadata={analysisMetadata}
              ember={ember}
              debugLogs={debugLogs}
              clearDebugLogs={clearDebugLogs}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-2xl rounded-2xl focus:outline-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Eye className="w-5 h-5 text-purple-600" />
            AI Image Analysis
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Deep artificial intelligence analysis of your image
          </DialogDescription>
        </DialogHeader>
        <ModalContent 
          loading={loading}
          analysis={analysis}
          error={error}
          onAnalyze={handleAnalyze}
          onSave={handleSave}
          saving={saving}
          hasAnalysis={hasAnalysis}
          analysisMetadata={analysisMetadata}
          ember={ember}
          debugLogs={debugLogs}
          clearDebugLogs={clearDebugLogs}
        />
      </DialogContent>
    </Dialog>
  );
} 