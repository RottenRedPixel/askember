import React from 'react';
import { PenNib } from 'phosphor-react';
import BaseCard from './BaseCard';

export default function TitleCard({ ember, getSectionStatus, onClick }) {
    const isComplete = getSectionStatus('title');

    const getDescription = () => {
        if (isComplete) {
            return ember.title;
        }
        return 'pick the perfect title';
    };

    return (
        <BaseCard
            icon={PenNib}
            title="Title"
            description={getDescription()}
            isComplete={isComplete}
            onClick={onClick}
        />
    );
} 