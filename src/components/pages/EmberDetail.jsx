import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { getEmber } from '@/lib/database';
import EmberChat from '@/components/EmberChat';

export default function EmberDetail() {
  const { id } = useParams();
  const [ember, setEmber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEmber = async () => {
      try {
        setLoading(true);
        const data = await getEmber(id);
        setEmber(data);
      } catch (err) {
        console.error('Error fetching ember:', err);
        setError('Ember not found');
      } finally {
        setLoading(false);
      }
    };

    fetchEmber();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-lg text-gray-500">Loading ember...</div>
      </div>
    );
  }

  if (error || !ember) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ember Not Found</h1>
          <p className="text-gray-600">This ember doesn't exist or may have been deleted.</p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      id: 'photo',
      title: 'Photo',
      content: (
        <img
          src={ember.image_url}
          alt="Ember"
          className="w-full h-auto rounded-xl"
          onError={(e) => {
            e.target.src = '/placeholder-image.png';
          }}
        />
      )
    },
    {
      id: 'wiki',
      title: 'Wiki',
      content: (
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl">
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Wiki</h3>
            <p className="text-sm text-gray-600">
              Knowledge and information about this ember will appear here.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'discovery',
      title: 'Discovery',
      content: (
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl">
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Discovery</h3>
            <p className="text-sm text-gray-600">
              Insights and discoveries related to this ember will be shown here.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'story-circle',
      title: 'Story Circle',
      content: (
        <div className="h-full w-full bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl p-4">
          <div className="h-full flex flex-col">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Story Circle</h3>
              <p className="text-sm text-gray-600">
                Discuss and explore the story behind this ember
              </p>
            </div>
            <div className="flex-1 min-h-0">
              <EmberChat emberId={ember.id} />
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-1.5 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg bg-white shadow-sm">
            <Carousel 
              className="w-full"
              opts={{
                startIndex: 0,
                loop: false
              }}
            >
              <CarouselContent className="flex items-stretch">
                {cards.map((card) => (
                  <CarouselItem key={card.id} className="flex">
                    <Card className="py-0 w-full">
                      <CardContent className="p-0 h-full">
                        {card.content}
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      </div>
    </div>
  );
} 