import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CarouselItem } from '@/components/ui/carousel';
import StatusBadge from './StatusBadge';

export default function BaseCard({
    icon: Icon,
    title,
    description,
    isComplete = false,
    isLoading = false,
    statusText,
    onClick,
    className = '',
    basis = 'basis-3/5 md:basis-1/3 lg:basis-2/5'
}) {
    return (
        <CarouselItem className={`pl-2 md:pl-4 ${basis}`}>
            <Card
                className={`h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-all duration-200 ${className}`}
                onClick={onClick}
            >
                <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                    <div>
                        {/* Header with icon and status badge */}
                        <div className="flex justify-center items-center relative mb-2">
                            <Icon size={22} className="text-blue-600" />
                            <StatusBadge
                                isComplete={isComplete}
                                text={statusText}
                                isLoading={isLoading}
                            />
                        </div>

                        {/* Title */}
                        <h3 className="font-semibold text-gray-900 text-center mb-1">
                            {title}
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-gray-600 text-center">
                            {isLoading ? 'Loading...' : description}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </CarouselItem>
    );
} 