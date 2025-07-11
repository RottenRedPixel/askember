import React from 'react';
import { UsersThree } from 'phosphor-react';
import BaseCard from './BaseCard';

export default function PeopleCard({
    emberId,
    taggedPeopleData,
    taggedPeopleCount,
    getSectionStatus,
    onClick
}) {
    const isComplete = getSectionStatus('people');

    const getDescription = () => {
        if (isComplete) {
            return `${taggedPeopleCount} ${taggedPeopleCount !== 1 ? 'people' : 'person'} tagged`;
        }
        return 'Identify and tag people in this image';
    };

    return (
        <BaseCard
            icon={UsersThree}
            title="Tagged People"
            description={getDescription()}
            isComplete={isComplete}
            onClick={onClick}
        />
    );
} 