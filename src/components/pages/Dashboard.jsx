import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { getUserEmbers } from '@/lib/database';
import useStore from '@/store';

// Individual ember carousel component
const EmberCarousel = ({ ember }) => {
  const navigate = useNavigate();

  const handleEmberClick = () => {
    navigate(`/embers/${ember.id}`);
  };
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
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl">
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Story Circle</h3>
            <p className="text-sm text-gray-600">
              The narrative and story elements of this ember will be displayed here.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div 
      className="rounded-xl bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleEmberClick}
    >
      <Carousel className="w-full">
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
  );
};

export default function Dashboard() {
  const { user, isLoading } = useStore();
  const [embers, setEmbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEmbers = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userEmbers = await getUserEmbers(user.id);
        setEmbers(userEmbers);
      } catch (err) {
        console.error('Error fetching embers:', err);
        setError('Failed to load embers');
      } finally {
        setLoading(false);
      }
    };

    fetchEmbers();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-8">
        <div className="text-center mt-2">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 pt-2">my embers</h1>
          <p className="text-lg text-gray-600 mb-6">Sign in to view your embers</p>
          <Link to="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-8">
      <div className="text-center mt-2">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 pt-2">my embers</h1>
        <p className="text-lg text-gray-600 mb-6">
          {embers.length > 0 
            ? `You have ${embers.length} ember${embers.length === 1 ? '' : 's'}`
            : 'Create your first ember'
          }
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-lg text-gray-500">Loading your embers...</div>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      )}

      {!loading && !error && embers.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No embers yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first ember to get started.
          </p>
          <Link to="/create">
            <Button>Create Ember</Button>
          </Link>
        </div>
      )}

      {!loading && !error && embers.length > 0 && (
        <div className="max-w-4xl mx-auto space-y-6">
          {embers.map((ember) => (
            <EmberCarousel key={ember.id} ember={ember} />
          ))}
          
          <div className="text-center mt-8">
            <Link to="/create">
              <Button>Create Another Ember</Button>
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
} 