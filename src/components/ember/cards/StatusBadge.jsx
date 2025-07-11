import React from 'react';

export default function StatusBadge({ isComplete, text, isLoading = false }) {
    // Determine the display text
    const displayText = isLoading ? 'Loading...' : text || (isComplete ? 'Done' : 'Not Done');

    // Determine the styling classes
    const getStatusClasses = () => {
        if (isLoading) {
            return 'bg-yellow-100 text-yellow-800 animate-pulse';
        }
        if (isComplete) {
            return 'bg-green-100 text-green-800';
        }
        return 'bg-gray-100 text-gray-600';
    };

    return (
        <div className={`absolute right-0 px-2 py-1 text-xs rounded-full font-medium ${getStatusClasses()}`}>
            {displayText}
        </div>
    );
} 