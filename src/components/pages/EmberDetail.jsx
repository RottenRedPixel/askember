import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { getEmber, updateEmberTitle } from '@/lib/database';
import EmberChat from '@/components/EmberChat';
import { Input } from '@/components/ui/input';
import { Flower, House, Microphone, Keyboard, CornersOut, ArrowCircleUp, Aperture, Chats, Smiley, ShareNetwork, PencilSimple, Info, Camera, MapPin, MagnifyingGlass } from 'phosphor-react';
import FeaturesCard from '@/components/FeaturesCard';
import ShareModal from '@/components/ShareModal';
import useStore from '@/store';

export default function EmberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ember, setEmber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullImage, setShowFullImage] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [message, setMessage] = useState(null);
  const { user } = useStore();

  useEffect(() => {
    const fetchEmber = async () => {
      try {
        setLoading(true);
        const data = await getEmber(id);
        console.log('Fetched ember data:', data);
        console.log('Image URL:', data?.image_url);
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

  const handleTitleEdit = () => {
    setNewTitle(ember.title || '');
    setIsEditingTitle(true);
  };

  const handleTitleCancel = () => {
    setIsEditingTitle(false);
    setNewTitle('');
  };

  const handleTitleSave = async () => {
    if (newTitle.trim() === '' || newTitle.trim() === ember.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      const updatedEmber = await updateEmberTitle(ember.id, newTitle, user.id);
      setEmber(updatedEmber);
      setIsEditingTitle(false);
      setMessage({ type: 'success', text: 'Title updated successfully!' });
    } catch (error) {
      console.error('Failed to update title', error);
      setMessage({ type: 'error', text: 'Failed to update title.' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

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

  // Define all cards
  const allCards = [
    {
      id: 'photo',
      title: 'Photo',
      content: (
        <div className="h-full flex flex-col bg-gray-100 md:rounded-xl overflow-hidden">
          {/* Photo area (with toggle, blurred bg, main image, icon bar) */}
          <div className="relative w-screen left-1/2 right-1/2 -translate-x-1/2 flex-shrink-0 h-[65vh] md:w-full md:left-0 md:right-0 md:translate-x-0 md:h-auto overflow-hidden">
            {/* Top right vertical capsule: Home above blur/crop toggle above share */}
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
              {/* Only show share button for private embers or owned embers */}
              {(!ember?.is_public || user) && (
                <button
                  className="rounded-full p-1 hover:bg-white/70 transition-colors"
                  onClick={() => setShowShareModal(true)}
                  aria-label="Share ember"
                  type="button"
                >
                  <ShareNetwork size={24} className="text-gray-700" />
                </button>
              )}
            </div>
            {/* Blurred background with fade */}
            <img
              src={ember.image_url}
              alt="Ember blurred background"
              className={`absolute inset-0 w-full h-full object-cover blur-lg scale-110 brightness-75 transition-opacity duration-300 ${showFullImage ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              aria-hidden="true"
              style={{ zIndex: 1 }}
              onError={(e) => {
                console.error('Background image failed to load:', ember.image_url);
                e.target.style.display = 'none';
              }}
            />
            {/* Main image with object-fit transition */}
            <img
              src={ember.image_url}
              alt="Ember"
              className={`relative w-full h-full z-10 transition-all duration-300 ${showFullImage ? 'object-contain' : 'object-cover'}`}
              onError={(e) => {
                console.error('Image failed to load:', ember.image_url);
                // Create a simple colored rectangle as fallback
                e.target.style.backgroundColor = '#f3f4f6';
                e.target.style.display = 'flex';
                e.target.style.alignItems = 'center';
                e.target.style.justifyContent = 'center';
                e.target.alt = 'Image unavailable';
                e.target.src = 'data:image/svg+xml;base64,' + btoa(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                    <rect width="200" height="200" fill="#f3f4f6"/>
                    <text x="100" y="100" text-anchor="middle" dy="0.3em" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
                      Image unavailable
                    </text>
                  </svg>
                `);
              }}
            />
            {/* Title Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20">
              <div className="container mx-auto max-w-4xl">
                <h1 className="text-white text-2xl font-bold truncate drop-shadow-md text-left pl-2">
                  {ember.title || 'Untitled Ember'}
                </h1>
              </div>
            </div>
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
      id: 'story-circle',
      title: 'Story Circle',
      content: (
        <div className="h-full w-full bg-white rounded-xl">
          <Card className="h-full">
            <CardContent className="p-6 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 text-left">Story Circle</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Discuss and explore the story behind this ember
                  </p>
                </div>
              </div>
              {/* Chat Content */}
              <div className="flex-1 min-h-0">
                <EmberChat emberId={ember.id} />
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'wiki',
      title: 'Ember Wiki',
      content: (
        <div className="h-full w-full bg-white rounded-xl">
          <Card className="h-full">
            <CardContent className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 text-left">Ember Wiki</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Knowledge and information about this ember
                  </p>
                </div>
              </div>
              
              {/* Content Sections */}
              <div className="space-y-4 text-left">
                {/* Basic Info Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-4 text-sm">
                    <div className="space-y-2 text-left">
                      <span className="text-gray-500 font-medium">Title</span>
                      {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            maxLength="45"
                            className="h-8"
                          />
                          <Button size="sm" variant="blue" onClick={handleTitleSave}>Save</Button>
                          <Button size="sm" variant="outline" onClick={handleTitleCancel}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900">{ember.title || 'N/A'}</span>
                          <button onClick={handleTitleEdit} className="text-gray-400 hover:text-blue-600">
                            <PencilSimple size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 text-left">
                      <span className="text-gray-500 font-medium">Owner</span>
                      <span className="block text-gray-900">Coming soon...</span>
                    </div>
                  </div>
                </div>

                {/* EXIF Data Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">EXIF Data</h3>
                  <div className="text-sm text-gray-600 text-left">
                    Camera settings and metadata will appear here...
                  </div>
                </div>

                {/* Location Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Location</h3>
                  <div className="text-sm text-gray-600 text-left">
                    Geolocation data will appear here...
                  </div>
                </div>

                {/* People & Analysis Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Analysis & People</h3>
                  <div className="text-sm text-gray-600 text-left">
                    Deep image analysis and people tagging will appear here...
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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

  // Filter cards based on ember's public status
  // For public embers, only show the photo card (hide Story Circle, Wiki, and Features)
  // This provides a limited, privacy-focused view for publicly shared embers
  const cards = ember?.is_public 
    ? allCards.filter(card => card.id === 'photo')
    : allCards;

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

      {/* Share Modal */}
      {ember && (
        <ShareModal 
          ember={ember} 
          isOpen={showShareModal} 
          onClose={() => setShowShareModal(false)} 
        />
      )}
    </div>
  );
} 