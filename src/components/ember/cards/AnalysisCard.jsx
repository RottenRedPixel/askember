import React from 'react';
import { Sparkles } from 'lucide-react';
import BaseCard from './BaseCard';

export default function AnalysisCard({
    emberId,
    imageAnalysisData,
    isAutoAnalyzing,
    getSectionStatus,
    onClick
}) {
    const isComplete = getSectionStatus('analysis');

    const getDescription = () => {
        if (isAutoAnalyzing) {
            return 'Auto-analyzing image...';
        }
        if (isComplete && imageAnalysisData?.tokens_used) {
            return `${imageAnalysisData.tokens_used} tokens used to complete`;
        }
        return 'Deep analysis of this image';
    };

    return (
        <BaseCard
            icon={Sparkles}
            title="Image Analysis"
            description={getDescription()}
            isComplete={isComplete}
            isLoading={isAutoAnalyzing}
            onClick={onClick}
        />
    );
} 