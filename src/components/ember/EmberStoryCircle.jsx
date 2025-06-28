import { Card, CardContent } from '@/components/ui/card';
import { ArrowClockwise } from 'phosphor-react';
import EmberChat from '@/components/EmberChat';

export default function EmberStoryCircle({ 
  ember, 
  onRefresh, 
  isRefreshing 
}) {
  return (
    <Card className="h-full rounded-none">
      <CardContent className="px-6 pb-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 text-left flex items-center gap-2">
              Story Circle
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  title="Refresh story circle data"
                >
                  <ArrowClockwise 
                    size={16} 
                    className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                  />
                </button>
              )}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Discuss and explore the story behind this ember
            </p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
} 