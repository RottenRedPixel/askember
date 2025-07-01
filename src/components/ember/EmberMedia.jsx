import { Card, CardContent } from '@/components/ui/card';
import { ArrowClockwise, Image as ImageIcon, Plus, Star } from 'phosphor-react';

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

        {/* Media Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Cover Photo - Original Ember Image */}
          {ember?.image_url && (
            <div className="relative group cursor-pointer">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-blue-200">
                <img 
                  src={ember.image_url} 
                  alt={ember.title || "Ember cover photo"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              {/* Cover Photo Badge */}
              <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <Star size={12} weight="fill" />
                Cover
              </div>
            </div>
          )}

          {/* Placeholder for future media uploads */}
          {[...Array(5)].map((_, index) => (
            <div key={index} className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer group">
              <div className="text-center">
                <Plus size={24} className="mx-auto mb-1 group-hover:text-gray-500 transition-colors" />
                <p className="text-xs font-medium group-hover:text-gray-500 transition-colors">Add Media</p>
              </div>
            </div>
          ))}
        </div>

        {/* Info Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Upload additional photos and videos through the <strong>Supporting Media</strong> section in the carousel cards below.</p>
        </div>
      </CardContent>
    </Card>
  );
} 