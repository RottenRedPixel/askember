import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { getUserEmbers } from '@/lib/database';
import { getSharedEmbers } from '@/lib/sharing';
import useStore from '@/store';

// Icons for the toolbar (using simple SVG icons)
const GridIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const ScrollIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18v4H3V6zM3 14h18v4H3v-4z" />
  </svg>
);

const SortIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
  </svg>
);

// My Embers Toolbar component
const MyEmbersToolbar = ({
  sectionName,
  totalEmbers,
  viewMode,
  setViewMode,
  sortBy,
  setSortBy
}) => {
  const sortOptions = [
    { value: 'newest', label: 'New' },
    { value: 'oldest', label: 'Old' },
    { value: 'alphabetical', label: 'A-Z' },
    { value: 'reverse-alphabetical', label: 'Z-A' }
  ];

  return (
    <div className="bg-white rounded-none py-2 -mt-6 sticky top-0 z-10 md:static md:z-auto">
      <div className="flex items-center justify-between">
        {/* Left side: Badge and Create new ember */}
        <div className="flex items-center gap-0">
          <div className="bg-white text-gray-700 text-sm px-3 py-1 rounded-full font-medium h-8 flex items-center border border-gray-300">
            My Embers
          </div>
          <Link to="/create">
            <button
              className="p-1 text-blue-600 hover:text-blue-700 transition-colors rounded-md"
              title="Create New Ember"
            >
              <PlusIcon />
            </button>
          </Link>
        </div>

        {/* Right side: Controls */}
        <div className="flex items-center space-x-4">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-300 rounded-full pl-3 pr-10 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ChevronDownIcon />
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('scroll')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'scroll'
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              title="Scroll View"
            >
              <ScrollIcon />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid'
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              title="Grid View"
            >
              <GridIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Shared Embers Toolbar component
const SharedEmbersToolbar = ({
  sectionName,
  totalEmbers,
  viewMode,
  setViewMode,
  sortBy,
  setSortBy
}) => {
  const sortOptions = [
    { value: 'newest', label: 'New' },
    { value: 'oldest', label: 'Old' },
    { value: 'alphabetical', label: 'A-Z' },
    { value: 'reverse-alphabetical', label: 'Z-A' }
  ];

  return (
    <div className="bg-white rounded-none py-2 -mt-6 sticky top-0 z-10 md:static md:z-auto">
      <div className="flex items-center justify-between">
        {/* Left side: Badge */}
        <div className="flex items-center gap-0">
          <div className="bg-white text-gray-700 text-sm px-3 py-1 rounded-full font-medium h-8 flex items-center border border-gray-300">
            Shared with Me
          </div>
        </div>

        {/* Right side: Controls */}
        <div className="flex items-center space-x-4">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-300 rounded-full pl-3 pr-10 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ChevronDownIcon />
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('scroll')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'scroll'
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              title="Scroll View"
            >
              <ScrollIcon />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid'
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              title="Grid View"
            >
              <GridIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual ember carousel component
const EmberCarousel = ({ ember }) => {
  const navigate = useNavigate();

  const handleEmberClick = () => {
    navigate(`/embers/${ember.id}/manage`);
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

// Grid view component for embers
const EmberGrid = ({ ember }) => {
  const navigate = useNavigate();

  const handleEmberClick = () => {
    navigate(`/embers/${ember.id}/manage`);
  };

  return (
    <div
      className="rounded-xl bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
      onClick={handleEmberClick}
    >
      <div className="aspect-square">
        <img
          src={ember.image_url}
          alt="Ember"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = '/placeholder-image.png';
          }}
        />
      </div>
      <div className="p-3 bg-gray-100">
        <h3 className="font-medium text-gray-900 truncate">
          {ember.title || 'Untitled Ember'}
        </h3>
      </div>
    </div>
  );
};

export default function MyEmbers() {
  const { user, isLoading } = useStore();
  const [embers, setEmbers] = useState([]);
  const [sharedEmbers, setSharedEmbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharedLoading, setSharedLoading] = useState(true);
  const [error, setError] = useState('');
  const [sharedError, setSharedError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'scroll' or 'grid'
  const [sortBy, setSortBy] = useState('newest');
  const [initialViewModeSet, setInitialViewModeSet] = useState(false);
  const [sharedViewMode, setSharedViewMode] = useState('grid'); // 'scroll' or 'grid'
  const [sharedSortBy, setSharedSortBy] = useState('newest');

  // Debug logging
  console.log('MyEmbers render - isLoading:', isLoading, 'user:', user ? 'exists' : 'null', 'loading:', loading);

  useEffect(() => {
    console.log('MyEmbers useEffect triggered - user:', user ? user.id : 'null');

    const fetchEmbers = async () => {
      if (!user) {
        console.log('No user, setting loading to false');
        setLoading(false);
        setSharedLoading(false);
        return;
      }

      try {
        console.log('Starting to fetch embers for user:', user.id);
        setLoading(true);
        setSharedLoading(true);

        // Fetch user's own embers
        const userEmbers = await getUserEmbers(user.id);
        console.log('Embers fetched successfully:', userEmbers.length, 'embers');
        setEmbers(userEmbers);
        setLoading(false);

        // Fetch shared embers
        try {
          const shared = await getSharedEmbers();
          console.log('Shared embers fetched successfully:', shared.length, 'embers');
          setSharedEmbers(shared);
        } catch (sharedErr) {
          console.error('Error fetching shared embers:', sharedErr);
          setSharedError('Failed to load shared embers');
        } finally {
          setSharedLoading(false);
        }

      } catch (err) {
        console.error('Error fetching embers:', err);
        setError('Failed to load embers');
        setLoading(false);
        setSharedLoading(false);
      }
    };

    fetchEmbers();
  }, [user]);

  // Set initial view mode based on ember count (only once when embers first load)
  useEffect(() => {
    if (!loading && !initialViewModeSet && embers.length > 0) {
      if (embers.length === 1) {
        setViewMode('scroll'); // Use stacked view for single ember
      } else {
        setViewMode('grid'); // Use grid view for multiple embers
      }
      setInitialViewModeSet(true);
    }
  }, [embers.length, loading, initialViewModeSet]);

  // Sort embers based on selected sort option
  const sortedEmbers = [...embers].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'oldest':
        return new Date(a.created_at) - new Date(b.created_at);
      case 'alphabetical':
        return (a.message || '').localeCompare(b.message || '');
      case 'reverse-alphabetical':
        return (b.message || '').localeCompare(a.message || '');
      default:
        return 0;
    }
  });

  // Sort shared embers based on selected sort option
  const sortedSharedEmbers = [...sharedEmbers].sort((a, b) => {
    switch (sharedSortBy) {
      case 'newest':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'oldest':
        return new Date(a.created_at) - new Date(b.created_at);
      case 'alphabetical':
        return (a.message || '').localeCompare(b.message || '');
      case 'reverse-alphabetical':
        return (b.message || '').localeCompare(a.message || '');
      default:
        return 0;
    }
  });

  console.log('MyEmbers about to render - isLoading:', isLoading, 'loading:', loading);

  if (isLoading) {
    console.log('Rendering auth loading state');
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
            <Button size="lg" variant="blue">Sign In</Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-8">

      {loading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-lg text-gray-500">Loading your embers...</div>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button size="lg" variant="blue" onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      )}

      {!loading && !error && embers.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No embers yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first ember to get started.
          </p>
          <Link to="/create">
            <Button size="lg" variant="blue">Create Ember</Button>
          </Link>
        </div>
      )}

      {!loading && !error && embers.length > 0 && (
        <div className="max-w-6xl mx-auto">
          {/* Toolbar */}
          <MyEmbersToolbar
            sectionName="my embers"
            totalEmbers={embers.length}
            viewMode={viewMode}
            setViewMode={setViewMode}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />

          {/* Embers Display */}
          {viewMode === 'scroll' ? (
            <div className="space-y-6">
              {sortedEmbers.map((ember) => (
                <EmberCarousel key={ember.id} ember={ember} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              {sortedEmbers.map((ember) => (
                <EmberGrid key={ember.id} ember={ember} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shared Embers Section */}
      {!loading && !error && user && (
        <div className="max-w-6xl mx-auto">
          <Separator className="my-8" />

          {sharedLoading && (
            <div className="flex items-center justify-center min-h-[100px]">
              <div className="text-lg text-gray-500">Loading shared embers...</div>
            </div>
          )}

          {sharedError && (
            <div className="text-center py-4">
              <p className="text-red-600">{sharedError}</p>
            </div>
          )}

          {!sharedLoading && !sharedError && sharedEmbers.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shared embers</h3>
              <p className="text-gray-600">
                When others share embers with you, they'll appear here.
              </p>
            </div>
          )}

          {!sharedLoading && !sharedError && sharedEmbers.length > 0 && (
            <>
              {/* Shared Embers Toolbar */}
              <SharedEmbersToolbar
                sectionName="shared with me"
                totalEmbers={sharedEmbers.length}
                viewMode={sharedViewMode}
                setViewMode={setSharedViewMode}
                sortBy={sharedSortBy}
                setSortBy={setSharedSortBy}
              />

              {/* Shared Embers Display */}
              {sharedViewMode === 'scroll' ? (
                <div className="space-y-6">
                  {sortedSharedEmbers.map((ember) => (
                    <EmberCarousel key={ember.id} ember={ember} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
                  {sortedSharedEmbers.map((ember) => (
                    <EmberGrid key={ember.id} ember={ember} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
} 