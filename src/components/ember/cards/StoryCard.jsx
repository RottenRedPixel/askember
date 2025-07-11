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
        if (isComplete) {
            return 'Done';
        }
        const storyProgress = getStoryProgress();
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