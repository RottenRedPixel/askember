import React from 'react';
import { Carousel, CarouselContent } from '@/components/ui/carousel';

// Import individual card components
import StoryCutCard from './cards/StoryCutCard';
import TitleCard from './cards/TitleCard';
import LocationCard from './cards/LocationCard';
import TimeCard from './cards/TimeCard';
import StoryCard from './cards/StoryCard';
import PeopleCard from './cards/PeopleCard';
import MediaCard from './cards/MediaCard';
import AnalysisCard from './cards/AnalysisCard';
import ContributorsCard from './cards/ContributorsCard';

export default function EmberCarousel({
    ember,
    emberId,
    onCardClick,
    // Pass through all the data and handlers from EmberDetail
    storyMessages = [],
    storyContributorCount = 0,
    taggedPeopleData = [],
    taggedPeopleCount = 0,
    supportingMedia = [],
    imageAnalysisData = null,
    sharedUsers = [],
    isAutoAnalyzing = false,
    isAutoLocationProcessing = false,
    isExifProcessing = false,
    getSectionStatus,
    getStoryProgress,
    formatDisplayLocation,
    formatDisplayDate
}) {
    return (
        <div className="flex-1 flex flex-col justify-start pb-1 md:pb-8">
            <Carousel
                className="w-full"
                opts={{
                    align: "center",
                    loop: false,
                    skipSnaps: false,
                    dragFree: true
                }}
            >
                <CarouselContent className="pl-4 md:pl-6 -ml-2 md:-ml-4">
                    {/* Story Cuts Card - Always first */}
                    <StoryCutCard
                        emberId={emberId}
                        onClick={() => onCardClick('story-cuts')}
                    />

                    {/* Dynamic Cards */}
                    <StoryCard
                        emberId={emberId}
                        storyMessages={storyMessages}
                        storyContributorCount={storyContributorCount}
                        getSectionStatus={getSectionStatus}
                        getStoryProgress={getStoryProgress}
                        onClick={() => onCardClick('story')}
                    />

                    <TitleCard
                        ember={ember}
                        getSectionStatus={getSectionStatus}
                        onClick={() => onCardClick('title')}
                    />

                    <LocationCard
                        ember={ember}
                        isAutoLocationProcessing={isAutoLocationProcessing}
                        getSectionStatus={getSectionStatus}
                        formatDisplayLocation={formatDisplayLocation}
                        onClick={() => onCardClick('location')}
                    />

                    <TimeCard
                        ember={ember}
                        isExifProcessing={isExifProcessing}
                        getSectionStatus={getSectionStatus}
                        formatDisplayDate={formatDisplayDate}
                        onClick={() => onCardClick('time-date')}
                    />

                    <PeopleCard
                        emberId={emberId}
                        taggedPeopleData={taggedPeopleData}
                        taggedPeopleCount={taggedPeopleCount}
                        getSectionStatus={getSectionStatus}
                        onClick={() => onCardClick('people')}
                    />

                    <MediaCard
                        emberId={emberId}
                        supportingMedia={supportingMedia}
                        getSectionStatus={getSectionStatus}
                        onClick={() => onCardClick('supporting-media')}
                    />

                    <AnalysisCard
                        emberId={emberId}
                        imageAnalysisData={imageAnalysisData}
                        isAutoAnalyzing={isAutoAnalyzing}
                        getSectionStatus={getSectionStatus}
                        onClick={() => onCardClick('analysis')}
                    />

                    <ContributorsCard
                        emberId={emberId}
                        sharedUsers={sharedUsers}
                        getSectionStatus={getSectionStatus}
                        onClick={() => onCardClick('contributors')}
                    />
                </CarouselContent>
            </Carousel>
        </div>
    );
} 