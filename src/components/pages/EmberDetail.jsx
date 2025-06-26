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
import { Flower, House, Microphone, Keyboard, CornersOut, ArrowCircleUp, Aperture, Chats, Smiley } from 'phosphor-react';
import FeaturesCard from '@/components/FeaturesCard';

export default function EmberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ember, setEmber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullImage, setShowFullImage] = useState(false);

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
          {/* Photo area (with toggle, blurred bg, main image, icon bar) */}
          <div className="relative w-screen left-1/2 right-1/2 -translate-x-1/2 flex-shrink-0 h-[65vh] md:w-full md:left-0 md:right-0 md:translate-x-0 md:h-auto overflow-hidden">
            {/* Top right vertical capsule: Home above blur/crop toggle */}
            <div className="absolute top-4 right-4 z-30 flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-4 rounded-full shadow-lg">
              <button
                className="rounded-full p-1 hover:bg-white/70 transition-colors"
                onClick={() => navigate('/embers')}
                aria-label="Go to My Embers"
                type="button"
              >
                <House size={24} className="text-gray-700" />
              </button>
              <button
                className="rounded-full p-1 hover:bg-white/70 transition-colors"
                onClick={() => setShowFullImage((prev) => !prev)}
                aria-label={showFullImage ? 'Show cropped view' : 'Show full image with blur'}
                type="button"
              >
                <CornersOut size={24} className="text-gray-700" />
              </button>
            </div>
            {/* Blurred background with fade */}
            <img
              src={ember.image_url}
              alt="Ember blurred background"
              className={`absolute inset-0 w-full h-full object-cover blur-lg scale-110 brightness-75 transition-opacity duration-300 ${showFullImage ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              aria-hidden="true"
              style={{ zIndex: 1 }}
            />
            {/* Main image with object-fit transition */}
            <img
              src={ember.image_url}
              alt="Ember"
              className={`relative w-full h-full z-10 transition-all duration-300 ${showFullImage ? 'object-contain' : 'object-cover'}`}
              onError={(e) => {
                e.target.src = '/placeholder-image.png';
              }}
            />
            {/* Bottom right capsule: Smile, divider, Aperture, Flower, Chats */}
            <div className="absolute right-4 bottom-4 z-20">
              <div className="flex flex-col items-center gap-4 bg-white/50 backdrop-blur-sm px-2 py-4 rounded-full shadow-lg">
                <div className="p-1 hover:bg-white/50 rounded-full transition-colors">
                  <Smiley size={24} className="text-gray-700" />
                </div>
                <div className="h-px w-6 bg-gray-300"></div>
                <div className="p-1 hover:bg-white/50 rounded-full transition-colors">
                  <Aperture size={24} className="text-gray-700" />
                </div>
                <div className="p-1 hover:bg-white/50 rounded-full transition-colors">
                  <Flower size={24} className="text-gray-700" />
                </div>
                <div className="p-1 hover:bg-white/50 rounded-full transition-colors">
                  <Chats size={24} className="text-gray-700" />
                </div>
              </div>
            </div>
          </div>
          {/* Divider - only on mobile */}
          <div className="h-px bg-gray-300 w-full md:hidden" />
          {/* Content area (message + input box) */}
          <div className="flex-1 p-6 text-center space-y-4 flex flex-col min-h-0">
            <p className="text-gray-700 text-lg font-bold">
              Hello there, I will be asking you questions here...
            </p>
            <div className="w-full relative">
              <textarea 
                rows="3"
                placeholder="Type your message here..."
                className="w-full bg-white border border-gray-200 rounded-md p-3 pr-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center w-10 h-10">
                  <Microphone size={20} className="text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center w-10 h-10">
                  <Keyboard size={20} className="text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center w-10 h-10" aria-label="Submit">
                  <ArrowCircleUp size={20} weight="fill" className="text-gray-500" />
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
        <div className="h-full w-full bg-white rounded-xl">
          <FeaturesCard ember={ember} />
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