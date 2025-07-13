import React from 'react';
import { BookOpen } from 'phosphor-react';
import BaseCard from './BaseCard';

export default function StoryCard({
    emberId,
    storyMessages,
    storyContributorCount,
    getSectionStatus,
    getStoryProgress,
    onClick
}) {
    const isComplete = getSectionStatus('story');

    const getDescription = () => {
        if (isComplete) {
            return `${storyMessages.length} comments from ${storyContributorCount} contributor${storyContributorCount !== 1 ? 's' : ''}`;
        }
        return 'The narrative behind this ember';
    };

    const getStatusText = () => {
        const storyProgress = getStoryProgress();
        if (isComplete) {
            return `Done ${storyProgress.current}/${storyProgress.required}`;
        }
        return `${storyProgress.current} of ${storyProgress.required}`;
    };

    return (
        <BaseCard
            icon={BookOpen}
            title="Story Circle"
            description={getDescription()}
            isComplete={isComplete}
            statusText={getStatusText()}
            onClick={onClick}
        />
    );
} 