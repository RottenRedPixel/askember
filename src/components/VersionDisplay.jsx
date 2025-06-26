import { useState } from 'react';
import { VERSION_INFO, formatVersionForDisplay } from '@/lib/version';

export default function VersionDisplay({ mobile = false }) {
  const [showDetails, setShowDetails] = useState(false);

  // Different display modes based on context
  const getDisplayMode = () => {
    if (mobile) {
      return {
        primary: formatVersionForDisplay({ compact: true }),
        secondary: VERSION_INFO.isDevelopment ? 'dev' : null,
        showClickable: true
      };
    }
    
    return {
      primary: formatVersionForDisplay({ showEnv: true, showCommit: false }),
      secondary: null,
      showClickable: true // Make desktop version clickable too
    };
  };

  const { primary, secondary, showClickable } = getDisplayMode();

  const handleClick = () => {
    if (showClickable) {
      setShowDetails(!showDetails);
    }
  };

  if (mobile) {
    return (
      <div className="px-4 py-2 border-t border-gray-200">
        <button
          onClick={handleClick}
          className="w-full text-left text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span>
              {primary}
              {secondary && (
                <span className="ml-1 text-gray-300">({secondary})</span>
              )}
            </span>
            <span className="text-gray-300">
              {showDetails ? '−' : '+'}
            </span>
          </div>
        </button>
        
        {showDetails && (
          <div className="mt-2 text-xs text-gray-500 space-y-1 bg-gray-50 rounded px-2 py-2">
            <div className="flex justify-between">
              <span>Version:</span>
              <span className="font-mono">{VERSION_INFO.versionString}</span>
            </div>
            <div className="flex justify-between">
              <span>Environment:</span>
              <span className="font-mono capitalize">{VERSION_INFO.buildEnv}</span>
            </div>
            {VERSION_INFO.gitCommit !== 'dev' && (
              <div className="flex justify-between">
                <span>Commit:</span>
                <span className="font-mono">{VERSION_INFO.shortCommit}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Built:</span>
              <span className="font-mono">
                {new Date(VERSION_INFO.buildDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop version (clickable)
  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        title="Click for build details"
      >
        {primary}
        {secondary && (
          <span className="ml-1 text-gray-300">({secondary})</span>
        )}
      </button>
      
      {showDetails && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-3 text-xs text-gray-600 space-y-2">
            <div className="flex justify-between">
              <span>Version:</span>
              <span className="font-mono">{VERSION_INFO.versionString}</span>
            </div>
            <div className="flex justify-between">
              <span>Environment:</span>
              <span className="font-mono capitalize">{VERSION_INFO.buildEnv}</span>
            </div>
            {VERSION_INFO.gitCommit !== 'dev' && (
              <div className="flex justify-between">
                <span>Commit:</span>
                <span className="font-mono">{VERSION_INFO.shortCommit}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Built:</span>
              <span className="font-mono">
                {new Date(VERSION_INFO.buildDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Version info accessible globally for debugging
if (typeof window !== 'undefined') {
  window.__getVersionInfo = () => VERSION_INFO;
} 