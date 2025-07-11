import React from 'react';
import { ImageSquare } from 'phosphor-react';
import BaseCard from './BaseCard';

export default function MediaCard({
    emberId,
    supportingMedia,
    getSectionStatus,
    onClick
}) {
    const isComplete = getSectionStatus('supporting-media');

    const getDescription = () => {
        if (isComplete) {
            return `${supportingMedia.length} media file${supportingMedia.length !== 1 ? 's' : ''} added`;
        }
        return 'Additional photos and videos';
    };

    return (
        <BaseCard
            icon={ImageSquare}
            title="Supporting Media"
            description={getDescription()}
            isComplete={isComplete}
            onClick={onClick}
        />
    );
} 