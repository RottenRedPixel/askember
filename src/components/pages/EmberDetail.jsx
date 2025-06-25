import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { getEmber } from '@/lib/database';
import EmberChat from '@/components/EmberChat';
import { Input } from '@/components/ui/input';
import { Flower, House, Microphone, Keyboard } from 'phosphor-react';

export default function EmberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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
        <div className="h-full flex flex-col bg-gray-100 md:rounded-xl overflow-hidden">
          <div className="relative flex-shrink-0">
            <img
              src={ember.image_url}
              alt="Ember"
              className="w-full h-auto md:rounded-t-xl block"
              onError={(e) => {
                e.target.src = '/placeholder-image.png';
              }}
            />
            <div className="absolute right-4 bottom-4">
              <div className="flex flex-col items-center gap-4 bg-white/50 backdrop-blur-sm px-2 py-4 rounded-full shadow-lg">
                <button 
                  onClick={() => navigate('/embers')}
                  className="p-1 hover:bg-white/50 rounded-full transition-colors"
                  aria-label="Go to My Embers"
                >
                  <House size={24} className="text-gray-700" />
                </button>
                <div className="h-px w-6 bg-gray-300"></div>
                <div className="p-1 hover:bg-white/50 rounded-full transition-colors">
                  <Flower size={24} className="text-pink-500" />
                </div>
                <div className="p-1 hover:bg-white/50 rounded-full transition-colors">
                  <Flower size={24} className="text-pink-500" />
                </div>
                <div className="p-1 hover:bg-white/50 rounded-full transition-colors">
                  <Flower size={24} className="text-pink-500" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 p-6 text-center space-y-4 flex flex-col min-h-0">
            <p className="text-gray-700 text-lg font-bold">
              Hello there, I will be asking you questions here...
            </p>
            <div className="w-full relative">
              <Input 
                type="text" 
                className="w-full bg-white h-20 pr-16"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <Microphone size={24} className="text-gray-500" />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <Keyboard size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'discovery',
      title: 'Discovery',
      content: (
        <div className="h-full w-full bg-gray-100 rounded-xl p-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Discovery</h1>
            <p className="text-lg text-gray-600">
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
        <div className="h-full w-full bg-gray-100 rounded-xl p-6">
          <div className="h-full flex flex-col">
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Story Circle</h1>
              <p className="text-lg text-gray-600">
                Discuss and explore the story behind this ember
              </p>
            </div>
            <div className="flex-1 min-h-0">
              <EmberChat emberId={ember.id} />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'wiki',
      title: 'Wiki',
      content: (
        <div className="h-full w-full bg-gray-100 rounded-xl p-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Wiki</h1>
            <p className="text-lg text-gray-600">
              Knowledge and information about this ember will appear here.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'features',
      title: 'Features',
      content: (
        <div className="h-full w-full bg-gray-100 rounded-xl p-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Features</h1>
            <p className="text-lg text-gray-600">
              Control the sharing and editing here.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="md:min-h-screen bg-white">
      {/* Mobile Layout */}
      <div className="md:hidden -m-[0.67rem] -mt-[0.67rem] h-screen overflow-hidden">
        <Carousel 
          className="w-full h-full [&>div]:h-full"
          opts={{
            startIndex: 0,
            loop: false
          }}
        >
          <CarouselContent className="flex items-stretch h-full [&>div]:h-full">
            {cards.map((card) => (
              <CarouselItem key={card.id} className="flex h-full w-full">
                <Card className={`py-0 w-full h-full ${card.id === 'photo' ? 'bg-gray-100' : ''} ${card.id === 'photo' ? 'rounded-none' : 'rounded-xl'}`}>
                  <CardContent className="p-0 h-full">
                    {card.content}
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
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
                      <Card className={`py-0 w-full ${card.id === 'photo' ? 'bg-gray-100' : ''}`}>
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
    </div>
  );
} 