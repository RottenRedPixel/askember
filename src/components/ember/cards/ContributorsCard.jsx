import React from 'react';
import { UserCirclePlus } from 'phosphor-react';
import BaseCard from './BaseCard';

export default function ContributorsCard({ emberId, sharedUsers, getSectionStatus, onClick }) {
    const isComplete = getSectionStatus('contributors');

    const getDescription = () => {
        if (isComplete) {
            return `${sharedUsers.length} contributor${sharedUsers.length !== 1 ? 's' : ''} invited`;
        }
        return 'Invite people to edit and contribute';
    };

    return (
        <BaseCard
            icon={UserCirclePlus}
            title="Contributors"
            description={getDescription()}
            isComplete={isComplete}
            onClick={onClick}
        />
    );
} 