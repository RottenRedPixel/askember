import { Card, CardContent } from '@/components/ui/card';
import { ArrowClockwise } from 'phosphor-react';
import { Image, Video, Camera } from 'lucide-react';

export default function EmberMedia({ 
  ember, 
  onRefresh, 
  isRefreshing
}) {

  return (
    <Card className="h-full rounded-none">
      <CardContent className="px-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 text-left flex items-center gap-2">
              Ember Media
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  title="Refresh media data"
                >
                  <ArrowClockwise 
                    size={16} 
                    className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                  />
                </button>
              )}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Photos, videos, and media associated with this ember
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Image size={32} className="text-gray-300" />
              <Video size={32} className="text-gray-300" />
              <Camera size={32} className="text-gray-300" />
            </div>
            <p className="text-lg font-medium">Media Gallery Coming Soon</p>
            <p className="text-sm">Additional photos, videos, and media files will be displayed here</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 