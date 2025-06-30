import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { getEmber, updateEmberTitle } from '@/lib/database';
import { getEmberWithSharing } from '@/lib/sharing';
import EmberChat from '@/components/EmberChat';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Flower, Microphone, Keyboard, CornersOut, ArrowCircleUp, Aperture, Chats, Smiley, ShareNetwork, PencilSimple, Info, Camera, MapPin, MagnifyingGlass, Campfire, Gear, PenNib, CheckCircle, BookOpen, Users, Lightbulb, Eye, Clock, Question, Heart, Package, UsersThree, PlayCircle, Sliders, CirclesFour, GearSix, FilmSlate, ChatCircle, ImageSquare } from 'phosphor-react';

import FeaturesCard from '@/components/FeaturesCard';
import ShareModal from '@/components/ShareModal';
import StoryModal from '@/components/StoryModal';

import EmberNamesModal from '@/components/EmberNamesModal';
import EmberSettingsPanel from '@/components/EmberSettingsPanel';
import useStore from '@/store';

export default function EmberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ember, setEmber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullImage, setShowFullImage] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showNamesModal, setShowNamesModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [message, setMessage] = useState(null);
  const { user, userProfile } = useStore();
  const [hasVoted, setHasVoted] = useState(false);
  const [votingResults, setVotingResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [userVote, setUserVote] = useState(null);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [showStoryCutCreator, setShowStoryCutCreator] = useState(false);
  const [showStoryCuts, setShowStoryCuts] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [emberLength, setEmberLength] = useState(30);
  const [selectedVoices, setSelectedVoices] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Media query hook for responsive design
  const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);
    
    useEffect(() => {
      const media = window.matchMedia(query);
      if (media.matches !== matches) {
        setMatches(media.matches);
      }
      const listener = () => setMatches(media.matches);
      media.addListener(listener);
      return () => media.removeListener(listener);
    }, [matches, query]);
    
    return matches;
  };

  const isMobile = useMediaQuery('(max-width: 768px)');

  // Handle voice selection
  const toggleVoiceSelection = (userId) => {
    setSelectedVoices(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const StoryModalContent = () => (
    <div className="space-y-6">
      {/* User Editor Info */}
      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={userProfile?.avatar_url} 
            alt={`${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 'User'} 
          />
          <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
            {userProfile?.first_name?.[0] || userProfile?.last_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {`${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 'User'}
          </p>
          <p className="text-xs text-gray-500">
            Editing this ember
          </p>
        </div>
      </div>

      {/* Story Title */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <PenNib size={16} className="text-blue-600" />
          Story Title
        </Label>
        <Input
          type="text"
          defaultValue={ember?.title || 'Untitled Ember'}
          placeholder="Enter story title..."
          className="w-full h-10"
        />
      </div>

      {/* Ember Length Slider */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Sliders size={16} className="text-blue-600" />
          Ember Length
        </Label>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-xs text-gray-600">Duration</Label>
              <span className="text-xs text-blue-600 font-medium">{emberLength} seconds</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="60" 
              step="5" 
              value={emberLength}
              onChange={(e) => setEmberLength(Number(e.target.value))}
              className="w-full mt-1" 
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5s</span>
              <span>20s</span>
              <span>35s</span>
              <span>50s</span>
              <span>60s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voices Section */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Users size={16} className="text-blue-600" />
          Voices
        </Label>
        
        <div className="grid grid-cols-3 gap-3 md:space-y-3 md:grid-cols-1">
          {/* Owner */}
          {ember?.owner && (
            <div 
              onClick={() => toggleVoiceSelection(ember.owner.user_id)}
              className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
              style={{
                borderColor: selectedVoices.includes(ember.owner.user_id) ? '#2563eb' : '#e5e7eb',
                backgroundColor: selectedVoices.includes(ember.owner.user_id) ? '#eff6ff' : 'white'
              }}
            >
              <div className="relative">
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarImage 
                    src={ember.owner.avatar_url} 
                    alt={ember.owner.first_name || 'Owner'} 
                  />
                  <AvatarFallback className="text-xs md:text-sm bg-gray-200 text-gray-700">
                    {ember.owner.first_name?.[0] || ember.owner.last_name?.[0] || 'O'}
                  </AvatarFallback>
                </Avatar>
                {selectedVoices.includes(ember.owner.user_id) && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs md:text-sm font-medium text-gray-900 truncate">
                  {ember.owner.first_name || 'Owner'}
                </div>
                <div className="text-xs text-amber-600 bg-amber-100 px-1 md:px-2 py-0.5 md:py-1 rounded-full inline-block mt-0.5 md:mt-1">
                  Owner
                </div>
              </div>
            </div>
          )}

          {/* Shared Users */}
          {sharedUsers.map((user) => (
            <div 
              key={user.user_id}
              onClick={() => toggleVoiceSelection(user.user_id)}
              className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
              style={{
                borderColor: selectedVoices.includes(user.user_id) ? '#2563eb' : '#e5e7eb',
                backgroundColor: selectedVoices.includes(user.user_id) ? '#eff6ff' : 'white'
              }}
            >
              <div className="relative">
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarImage 
                    src={user.avatar_url} 
                    alt={user.first_name || 'User'} 
                  />
                  <AvatarFallback className="text-xs md:text-sm bg-gray-200 text-gray-700">
                    {user.first_name?.[0] || user.last_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                {selectedVoices.includes(user.user_id) && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs md:text-sm font-medium text-gray-900 truncate">
                  {user.first_name || 'User'}
                </div>
                <div className={`text-xs px-1 md:px-2 py-0.5 md:py-1 rounded-full inline-block mt-0.5 md:mt-1 ${
                  user.permission_level === 'contributor' 
                    ? 'text-blue-600 bg-blue-100' 
                    : 'text-gray-600 bg-gray-100'
                }`}>
                  {user.permission_level === 'contributor' ? 'Contributor' : 'Viewer'}
                </div>
              </div>
            </div>
          ))}

          {/* No users message */}
          {!ember?.owner && sharedUsers.length === 0 && (
            <div className="col-span-3 md:col-span-1 text-center text-gray-500 text-sm py-4">
              No users invited to this ember yet
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Sections */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Package size={16} className="text-blue-600" />
            Story Style
          </Label>
          <select className="w-full p-2 border border-gray-300 rounded-md text-sm h-10">
            <option>Select story style...</option>
            <option>News Hour</option>
            <option>Movie Trailer</option>
            <option>Public Television</option>
            <option>Docu Drama</option>
          </select>
        </div>
      </div>

      {/* Story Focus */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Eye size={16} className="text-blue-600" />
          Story Focus
        </Label>
        <Input
          type="text"
          placeholder="What should this story focus on? (e.g., emotions, setting, characters, action...)"
          className="w-full h-10"
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4">
        <Button size="lg" className="w-full">
          Generate New Story Cut
        </Button>
      </div>
    </div>
  );

  const fetchEmber = async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);
      const data = await getEmber(id);
      console.log('Fetched ember data:', data);
      console.log('Image URL:', data?.image_url);
      setEmber(data);

      // Also fetch sharing information to get invited users
      try {
        const sharingData = await getEmberWithSharing(id);
        console.log('Sharing data:', sharingData);
        if (sharingData.shares && sharingData.shares.length > 0) {
          // Extract shared users with their profile information
          // Only include users who have actually created accounts (have user_id)
          const invitedUsers = sharingData.shares
            .filter(share => share.shared_user && share.shared_user.user_id) // Must have actual user account
            .map(share => ({
              id: share.shared_user.id,
              user_id: share.shared_user.user_id,
              first_name: share.shared_user.first_name,
              last_name: share.shared_user.last_name,
              avatar_url: share.shared_user.avatar_url,
              email: share.shared_with_email,
              permission_level: share.permission_level
            }));
          setSharedUsers(invitedUsers);
          console.log('Invited users:', invitedUsers);
        } else {
          setSharedUsers([]);
        }
      } catch (sharingError) {
        console.error('Error fetching sharing data:', sharingError);
        // Don't fail the whole component if sharing data fails
        setSharedUsers([]);
      }
    } catch (err) {
      console.error('Error fetching ember:', err);
      setError('Ember not found');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
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
      await updateEmberTitle(ember.id, newTitle, user.id);
      // Refetch complete ember data to preserve owner information
      await fetchEmber();
      setIsEditingTitle(false);
      setMessage({ type: 'success', text: 'Title updated successfully!' });
    } catch (error) {
      console.error('Failed to update title', error);
      setMessage({ type: 'error', text: 'Failed to update title.' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleEmberUpdate = async () => {
    // Refetch ember data when title is updated via modal
    await fetchEmber();
  };

  const handleTitleDelete = async () => {
    try {
      await updateEmberTitle(ember.id, '', user.id);
      // Refetch complete ember data to preserve owner information
      await fetchEmber();
      setMessage({ type: 'success', text: 'Title deleted successfully!' });
    } catch (error) {
      console.error('Failed to delete title', error);
      setMessage({ type: 'error', text: 'Failed to delete title.' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Check if current user is the owner of this ember
  const isOwner = user && ember?.user_id === user.id;

  // Calculate wiki progress (12 sections total)
  const calculateWikiProgress = (ember, sharedUsers = []) => {
    const sections = [
      'title',
      'location', 
      'time-date',
      'story',
      'why',
      'feelings',
      'comments-observations',
      'objects',
      'people',
      'contributors',
      'supporting-media',
      'analysis'
    ];

    const getSectionStatus = (sectionType) => {
      switch (sectionType) {
        case 'title':
          return ember?.title && ember.title.trim() !== '' && ember.title !== 'Untitled Ember';
        case 'contributors':
          return ember?.owner || sharedUsers.length > 0;
        case 'location':
        case 'time-date':
        case 'story':
        case 'why':
        case 'feelings':
        case 'analysis':
        case 'objects':
        case 'people':
        case 'comments-observations':
        case 'supporting-media':
        default:
          return false; // Placeholder - will be true when data exists
      }
    };

    const completedSections = sections.filter(section => getSectionStatus(section));
    return {
      completed: completedSections.length,
      total: sections.length,
      percentage: Math.round((completedSections.length / sections.length) * 100)
    };
  };

  const wikiProgress = calculateWikiProgress(ember, sharedUsers);

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

  // Define all cards (keep full definitions for potential future use)
  const allCardsDefinitions = [
    {
      id: 'photo',
      title: 'Photo',
      content: (
        <div className="h-full flex flex-col bg-gray-100 md:rounded-xl overflow-hidden">
          {/* Photo area (with toggle, blurred bg, main image, icon bar) */}
          <div className="relative w-screen left-1/2 right-1/2 -translate-x-1/2 flex-shrink-0 h-[65vh] md:w-full md:left-0 md:right-0 md:translate-x-0 md:h-auto overflow-hidden">
            {/* Top right vertical capsule: Owner Avatar and Invited Users */}
            <div className="absolute top-4 right-4 z-30 flex flex-col items-center bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
              {/* Owner Avatar - clickable to go to My Embers */}
              <button
                className="rounded-full p-1 hover:bg-white/70 transition-colors"
                onClick={() => navigate('/embers')}
                aria-label="Go to My Embers"
                type="button"
              >
                {ember?.owner ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage 
                      src={ember.owner.avatar_url} 
                      alt={`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'} 
                    />
                    <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                      {ember.owner.first_name?.[0] || ember.owner.last_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Smiley size={24} className="text-gray-700" />
                )}
              </button>
              
              {/* Horizontal divider below owner avatar */}
              <div className="h-px w-6 bg-gray-300 my-2"></div>
              
              {/* Invited Users Avatars - Stacked with 16px overlap */}
              {sharedUsers.map((sharedUser, index) => (
                <div 
                  key={sharedUser.id || index}
                  className="p-1 hover:bg-white/70 rounded-full transition-colors"
                  style={{ 
                    marginTop: index === 0 ? '0px' : '-16px',
                    zIndex: 30 - index // Higher z-index for avatars that come first
                  }}
                  title={`${sharedUser.first_name || ''} ${sharedUser.last_name || ''}`.trim() || sharedUser.email}
                >
                  <Avatar className="h-6 w-6 ring-1 ring-white">
                    <AvatarImage 
                      src={sharedUser.avatar_url} 
                      alt={`${sharedUser.first_name || ''} ${sharedUser.last_name || ''}`.trim() || sharedUser.email} 
                    />
                    <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                      {sharedUser.first_name?.[0] || sharedUser.last_name?.[0] || sharedUser.email?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ))}
              
              {/* Share button - Only show for private embers or owned embers */}
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
              
              {/* Settings button - Only show for ember owner */}
              {isOwner && (
                <button
                  className="rounded-full p-1 hover:bg-white/70 transition-colors"
                  onClick={() => setShowSettingsPanel(true)}
                  aria-label="Settings"
                  type="button"
                >
                  <GearSix size={24} className="text-gray-700" />
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

            {/* Bottom right capsule: Action icons above horizontal divider above feature icons */}
            <div className="absolute right-4 bottom-4 z-20">
              <div className="flex flex-col items-center gap-4 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
                {/* Action Icons */}
                <button
                  className="rounded-full p-1 hover:bg-white/50 transition-colors"
                  onClick={() => setShowFullImage((prev) => !prev)}
                  aria-label={showFullImage ? 'Show cropped view' : 'Show full image with blur'}
                  type="button"
                >
                  <CornersOut size={24} className="text-gray-700" />
                </button>
                
                {/* Horizontal divider */}
                <div className="h-px w-6 bg-gray-300"></div>
                
                {/* Feature Icons */}
                <button
                  className="p-1 hover:bg-white/50 rounded-full transition-colors"
                  onClick={() => setShowStoryCuts(true)}
                  aria-label="Story Cuts"
                  type="button"
                >
                  <CirclesFour size={24} className="text-gray-700" />
                </button>
                <div className="p-1 hover:bg-white/50 rounded-full transition-colors">
                  <PlayCircle size={24} className="text-gray-700" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Wiki Progress Bar - Full Width Capsule */}
          <div className="w-full px-4 pt-3 pb-1.5 md:px-6">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-blue-500 h-4 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${wikiProgress.percentage}%` }}
              />
            </div>
          </div>
          
          {/* Progress Message */}
          <div className="w-full px-4 pt-2 pb-2 md:px-6">
            <p className="text-lg font-bold text-gray-800 text-center">
              {userProfile?.first_name || 'User'}, we have to complete all these cards...
            </p>
          </div>
          
          {/* Content area - Card Carousel */}
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
                {/* Story Cuts Square Card - New 1:1 Aspect Ratio Style */}
                <CarouselItem className="pl-2 md:pl-4 basis-auto flex-shrink-0">
                  <Card 
                    className="w-32 h-32 bg-blue-600 border-blue-700 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setShowStoryCutCreator(true)}
                  >
                    <CardContent className="p-2 h-full flex flex-col justify-center items-center">
                      <div className="flex justify-center items-center mb-1">
                        <FilmSlate size={18} className="text-white" />
                      </div>
                      <h4 className="text-xs font-medium text-white text-center leading-tight">
                        Story Cuts
                      </h4>
                      <p className="text-xs text-blue-100 text-center leading-tight mt-0.5">
                        Edit & create
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
                
                                 {/* Title Card - Dynamic States */}
                 <CarouselItem className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-3/5">
                   {(() => {
                     const isComplete = ember?.title && ember.title.trim() !== '' && ember.title !== 'Untitled Ember';
                     const userName = userProfile?.first_name || 'User';
                     
                     return (
                       <Card 
                         className={`h-32 bg-white border-gray-200 transition-shadow ${
                           !isComplete ? 'cursor-pointer hover:shadow-md' : ''
                         }`}
                         onClick={!isComplete ? () => setShowNamesModal(true) : undefined}
                       >
                         <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                           <div>
                             <div className="flex justify-center items-center relative">
                               <PenNib size={22} className="text-blue-600" />
                               {isComplete && (
                                 <CheckCircle size={20} className="text-green-500 absolute right-0" />
                               )}
                             </div>
                             
                             {!isComplete ? (
                               <>
                                 <h3 className="font-semibold text-gray-900 my-1 text-center">
                                   help pick a perfect title for this ember.
                                 </h3>
                               </>
                             ) : (
                               <>
                                 <h3 className="font-semibold text-gray-900 my-1 text-center">
                                   {ember.title}
                                 </h3>
                                 <p className="text-sm text-gray-600 text-center">
                                   This was the title that was chosen.
                                 </p>
                               </>
                             )}
                           </div>
                           

                         </CardContent>
                       </Card>
                     );
                   })()}
                 </CarouselItem>
                 
                 <CarouselItem className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-3/5">
                   <Card className="h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                     <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                       <div>
                         <div className="flex justify-center items-center relative">
                           <MapPin size={22} className="text-blue-600" />
                         </div>
                         <h3 className="font-semibold text-gray-900 my-1 text-center">Location</h3>
                         <p className="text-sm text-gray-600 text-center">Where this moment happened</p>
                       </div>
                     </CardContent>
                   </Card>
                 </CarouselItem>
                 
                 <CarouselItem className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-3/5">
                   <Card className="h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                     <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                       <div>
                         <div className="flex justify-center items-center relative">
                           <Clock size={22} className="text-blue-600" />
                         </div>
                         <h3 className="font-semibold text-gray-900 my-1 text-center">Time & Date</h3>
                         <p className="text-sm text-gray-600 text-center">When this moment occurred</p>
                       </div>
                     </CardContent>
                   </Card>
                 </CarouselItem>
                 
                 <CarouselItem className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-3/5">
                   <Card 
                     className="h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                     onClick={() => setShowStoryModal(true)}
                   >
                     <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                       <div>
                         <div className="flex justify-center items-center relative">
                           <BookOpen size={22} className="text-blue-600" />
                         </div>
                         <h3 className="font-semibold text-gray-900 my-1 text-center">The Story</h3>
                         <p className="text-sm text-gray-600 text-center">The narrative behind this ember</p>
                       </div>
                     </CardContent>
                   </Card>
                 </CarouselItem>
                 
                 <CarouselItem className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-3/5">
                   <Card className="h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                     <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                       <div>
                         <div className="flex justify-center items-center relative">
                           <Question size={22} className="text-blue-600" />
                         </div>
                         <h3 className="font-semibold text-gray-900 my-1 text-center">The Why</h3>
                         <p className="text-sm text-gray-600 text-center">Why this moment was captured</p>
                       </div>
                     </CardContent>
                   </Card>
                 </CarouselItem>
                 
                 <CarouselItem className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-3/5">
                   <Card className="h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                     <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                       <div>
                         <div className="flex justify-center items-center relative">
                           <Heart size={22} className="text-blue-600" />
                         </div>
                         <h3 className="font-semibold text-gray-900 my-1 text-center">The Feelings</h3>
                         <p className="text-sm text-gray-600 text-center">Emotions in this moment</p>
                       </div>
                     </CardContent>
                   </Card>
                 </CarouselItem>
                 
                 <CarouselItem className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-3/5">
                   <Card className="h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                     <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                       <div>
                         <div className="flex justify-center items-center relative">
                           <ChatCircle size={22} className="text-blue-600" />
                         </div>
                         <h3 className="font-semibold text-gray-900 my-1 text-center">Comments & Observations</h3>
                         <p className="text-sm text-gray-600 text-center">Comments about this ember</p>
                       </div>
                     </CardContent>
                   </Card>
                 </CarouselItem>
                 
                 <CarouselItem className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-3/5">
                   <Card className="h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                     <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                       <div>
                         <div className="flex justify-center items-center relative">
                           <Package size={22} className="text-blue-600" />
                         </div>
                         <h3 className="font-semibold text-gray-900 my-1 text-center">Tagged Objects</h3>
                         <p className="text-sm text-gray-600 text-center">Objects identified in this image</p>
                       </div>
                     </CardContent>
                   </Card>
                 </CarouselItem>
                 
                 <CarouselItem className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-3/5">
                   <Card className="h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                     <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                       <div>
                         <div className="flex justify-center items-center relative">
                           <Users size={22} className="text-blue-600" />
                         </div>
                         <h3 className="font-semibold text-gray-900 my-1 text-center">Tagged People</h3>
                         <p className="text-sm text-gray-600 text-center">People identified in this image</p>
                       </div>
                     </CardContent>
                   </Card>
                 </CarouselItem>
                 
                 <CarouselItem className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-3/5">
                   <Card className="h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                     <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                       <div>
                         <div className="flex justify-center items-center relative">
                           <ImageSquare size={22} className="text-blue-600" />
                         </div>
                         <h3 className="font-semibold text-gray-900 my-1 text-center">Supporting Media</h3>
                         <p className="text-sm text-gray-600 text-center">Additional photos and videos</p>
                       </div>
                     </CardContent>
                   </Card>
                 </CarouselItem>
                 
                 <CarouselItem className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-3/5">
                   <Card className="h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                     <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                       <div>
                         <div className="flex justify-center items-center relative">
                           <Eye size={22} className="text-blue-600" />
                         </div>
                         <h3 className="font-semibold text-gray-900 my-1 text-center">Image Analysis</h3>
                         <p className="text-sm text-gray-600 text-center">Deep analysis of this image</p>
                       </div>
                     </CardContent>
                   </Card>
                 </CarouselItem>
                 
                 <CarouselItem className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-3/5">
                   <Card className="h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                     <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                       <div>
                         <div className="flex justify-center items-center relative">
                           <Users size={22} className="text-blue-600" />
                         </div>
                         <h3 className="font-semibold text-gray-900 my-1 text-center">Contributors</h3>
                         <p className="text-sm text-gray-600 text-center">People who contributed to this ember</p>
                       </div>
                     </CardContent>
                   </Card>
                 </CarouselItem>
              </CarouselContent>
            </Carousel>
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
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 text-left">Story Circle</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Discuss and explore the story behind this ember
                  </p>
                </div>
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
                            className="h-10"
                          />
                          <Button size="lg" variant="blue" onClick={handleTitleSave}>Save</Button>
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

                {/* Location Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Location</h3>
                  <div className="text-sm text-gray-600 text-left">
                    Geolocation data will appear here...
                  </div>
                </div>

                {/* The Why Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">The Why</h3>
                  <div className="text-sm text-gray-600 text-left">
                    The story behind why this moment was captured will appear here...
                  </div>
                </div>

                {/* The Feelings Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">The Feelings</h3>
                  <div className="text-sm text-gray-600 text-left">
                    Emotions and feelings associated with this moment will appear here...
                  </div>
                </div>

                {/* People & Analysis Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Analysis & People</h3>
                  <div className="text-sm text-gray-600 text-left">
                    Deep image analysis and people tagging will appear here...
                  </div>
                </div>

                {/* Contributors Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Contributors</h3>
                  <div className="space-y-3">
                    {/* Owner */}
                    {ember?.owner && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={ember.owner.avatar_url} 
                            alt={`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'} 
                          />
                          <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
                            {ember.owner.first_name?.[0] || ember.owner.last_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'}
                            </span>
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Owner</span>
                          </div>
                          <p className="text-sm text-gray-600">Created this ember</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Invited Contributors */}
                    {sharedUsers.length > 0 ? (
                      sharedUsers.map((contributor, index) => (
                        <div key={contributor.id || index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={contributor.avatar_url} 
                              alt={`${contributor.first_name || ''} ${contributor.last_name || ''}`.trim() || contributor.email} 
                            />
                            <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
                              {contributor.first_name?.[0] || contributor.last_name?.[0] || contributor.email?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {`${contributor.first_name || ''} ${contributor.last_name || ''}`.trim() || contributor.email}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                contributor.permission_level === 'contributor' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {contributor.permission_level === 'contributor' ? 'Contributor' : 'Viewer'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {contributor.permission_level === 'contributor' 
                                ? 'Can edit and contribute to this ember' 
                                : 'Can view this ember'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-left p-3 rounded-xl bg-gray-50">
                        No other contributors have been invited to this ember yet.
                      </div>
                    )}
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



  return (
    <div className="md:min-h-screen bg-white">
      {/* Mobile Layout */}
      <div className="md:hidden -m-[0.67rem] -mt-[0.67rem] h-screen overflow-hidden">
        <Card className="py-0 w-full h-full bg-gray-100 rounded-none">
          <CardContent className="p-0 h-full">
            {allCardsDefinitions[0].content}
          </CardContent>
        </Card>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="container mx-auto px-1.5 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-xl bg-white shadow-sm">
              <Card className="py-0 w-full bg-gray-100">
                <CardContent className="p-0 h-full">
                  {allCardsDefinitions[0].content}
                </CardContent>
              </Card>
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

      {/* Ember Names Modal */}
      {ember && (
        <EmberNamesModal 
          ember={ember} 
          isOpen={showNamesModal} 
          onClose={() => setShowNamesModal(false)}
          onEmberUpdate={handleEmberUpdate}
        />
      )}

      {/* Story Modal */}
      {ember && (
        <StoryModal 
          ember={ember} 
          isOpen={showStoryModal} 
          onClose={() => setShowStoryModal(false)}
          question="Tell us about this moment. What was happening when this photo was taken?"
          onSubmit={async (submissionData) => {
            console.log('Story submission:', submissionData);
            // TODO: Handle story submission (save to database, process audio, etc.)
          }}
          onRefresh={fetchEmber}
          isRefreshing={isRefreshing}
        />
      )}

      {/* Settings Panel */}
      {ember && (
        <EmberSettingsPanel
          ember={ember}
          isOpen={showSettingsPanel}
          onClose={() => setShowSettingsPanel(false)}
          isEditingTitle={isEditingTitle}
          setIsEditingTitle={setIsEditingTitle}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          handleTitleSave={handleTitleSave}
          handleTitleCancel={handleTitleCancel}
          handleTitleEdit={handleTitleEdit}
          handleTitleDelete={handleTitleDelete}
          message={message}
          onRefresh={fetchEmber}
        />
      )}

      {/* Story Cuts Panel */}
      {ember && showStoryCuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowStoryCuts(false)}>
          <div 
            className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CirclesFour size={24} className="text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Story Cuts</h2>
                </div>
                <button
                  onClick={() => setShowStoryCuts(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="py-8 text-center text-gray-500">
                This is where all the different cuts are displayed
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Story Cut Creator - Responsive Modal/Drawer */}
      {ember && (
        <>
          {isMobile ? (
            <Drawer open={showStoryCutCreator} onOpenChange={setShowStoryCutCreator}>
              <DrawerContent className="bg-white focus:outline-none">
                <DrawerHeader className="bg-white">
                                  <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <FilmSlate size={20} className="text-blue-600" />
                  Story Cuts Creator
                </DrawerTitle>
                <DrawerDescription className="text-left text-gray-600">
                  Create a custom version of this ember with your chosen style and focus
                </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
                  <StoryModalContent />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={showStoryCutCreator} onOpenChange={setShowStoryCutCreator}>
              <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-md rounded-2xl focus:outline-none">
                <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                      <FilmSlate size={20} className="text-blue-600" />
                      Story Cuts Creator
                    </DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Create a custom version of this ember with your chosen style and focus
                  </DialogDescription>
                </DialogHeader>
                <StoryModalContent />
              </DialogContent>
            </Dialog>
          )}
        </>
      )}


    </div>
  );
}

 