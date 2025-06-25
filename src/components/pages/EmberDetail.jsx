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
        <div className="h-full flex flex-col bg-gray-100 rounded-xl">
          <div className="relative flex-1">
            <img
              src={ember.image_url}
              alt="Ember"
              className="w-full h-auto"
              onError={(e) => {
                e.target.src = '/placeholder-image.png';
              }}
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                <button 
                  onClick={() => navigate('/embers')}
                  className="p-1 hover:bg-white/50 rounded-full transition-colors"
                  aria-label="Go to My Embers"
                >
                  <House size={24} className="text-gray-700" />
                </button>
                <div className="w-px h-6 bg-gray-300"></div>
                <Flower size={24} className="text-pink-500" />
                <Flower size={24} className="text-pink-500" />
                <Flower size={24} className="text-pink-500" />
              </div>
            </div>
          </div>
          <div className="p-6 text-center space-y-4">
            <p className="text-gray-700 text-lg font-bold">
              Hello there, I will be asking you questions here...
            </p>
            <div className="max-w-md mx-auto relative">
              <Input 
                type="text" 
                placeholder="Ask a question or make a comment..."
                className="w-full bg-white h-20 pr-16"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <Microphone size={18} className="text-gray-500" />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <Keyboard size={18} className="text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
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
  );
} 