import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CarouselItem } from '@/components/ui/carousel';
import { FilmSlate } from 'phosphor-react';

export default function StoryCutCard({ emberId, onClick }) {
    return (
        <CarouselItem className="pl-2 md:pl-4 basis-auto flex-shrink-0">
            <Card
                className="w-32 h-32 bg-blue-600 border-blue-700 cursor-pointer hover:shadow-md transition-shadow"
                onClick={onClick}
            >
                <CardContent className="p-2 h-full flex flex-col justify-center items-center">
                    <div className="flex justify-center items-center mb-1">
                        <FilmSlate size={18} className="text-white" />
                    </div>
                    <h4 className="text-sm font-medium text-white text-center leading-tight">
                        Story Cuts
                    </h4>
                    <p className="text-xs text-blue-100 text-center leading-tight mt-0.5">
                        Creator
                    </p>
                </CardContent>
            </Card>
        </CarouselItem>
    );
} 