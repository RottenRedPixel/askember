import React from 'react';
import { MapPin } from 'phosphor-react';
import BaseCard from './BaseCard';

export default function LocationCard({
    ember,
    isAutoLocationProcessing,
    getSectionStatus,
    formatDisplayLocation,
    onClick
}) {
    const isComplete = getSectionStatus('location');

    const getDescription = () => {
        if (isAutoLocationProcessing) {
            return 'Processing location...';
        }
        if (isComplete) {
            const formattedLocation = formatDisplayLocation(ember);
            return formattedLocation || 'Location information available';
        }
        return 'Where this moment happened';
    };

    return (
        <BaseCard
            icon={MapPin}
            title="Location"
            description={getDescription()}
            isComplete={isComplete}
            isLoading={isAutoLocationProcessing}
            onClick={onClick}
        />
    );
} 