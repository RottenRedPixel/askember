import React from 'react';
import { Clock } from 'phosphor-react';
import BaseCard from './BaseCard';

export default function TimeCard({
    ember,
    isExifProcessing,
    getSectionStatus,
    formatDisplayDate,
    onClick
}) {
    const isComplete = getSectionStatus('time-date');

    const getDescription = () => {
        if (isExifProcessing) {
            return 'Processing image data...';
        }
        if (isComplete) {
            const dateToShow = ember?.ember_timestamp || ember?.manual_datetime;
            const formattedDate = formatDisplayDate(dateToShow);
            return formattedDate || 'Date information available';
        }
        return 'When this moment occurred';
    };

    return (
        <BaseCard
            icon={Clock}
            title="Time & Date"
            description={getDescription()}
            isComplete={isComplete}
            isLoading={isExifProcessing}
            onClick={onClick}
        />
    );
} 