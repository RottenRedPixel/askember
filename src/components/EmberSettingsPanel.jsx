import { useState, useEffect } from 'react';
import { X, Info, Chats, ShareNetwork, Gear } from 'phosphor-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import FeaturesCard from '@/components/FeaturesCard';
import EmberWiki from '@/components/ember/EmberWiki';
import EmberStoryCircle from '@/components/ember/EmberStoryCircle';
import EmberSettings from '@/components/ember/EmberSettings';


const tabs = [
  {
    id: "story-circle",
    label: "Circle",
    icon: Chats
  },
  {
    id: "wiki",
    label: "Wiki",
    icon: Info
  },
  {
    id: "sharing",
    label: "Sharing",
    icon: ShareNetwork
  },
  {
    id: "settings",
    label: "Settings",
    icon: Gear
  }
];

export default function EmberSettingsPanel({ 
  isOpen, 
  onClose, 
  ember, 
  isEditingTitle,
  setIsEditingTitle,
  newTitle,
  setNewTitle,
  handleTitleSave,
  handleTitleCancel,
  handleTitleEdit,
  handleTitleDelete,
  message,
  onRefresh
}) {

  
  // Store active tab in localStorage to persist through refreshes
  const getStoredActiveTab = () => {
    if (ember?.id) {
      const stored = localStorage.getItem(`ember-settings-tab-${ember.id}`);
      return stored || "story-circle";
    }
    return "story-circle";
  };
  
  const [activeTab, setActiveTab] = useState(getStoredActiveTab);
  
  // Update stored tab when activeTab changes
  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    if (ember?.id) {
      localStorage.setItem(`ember-settings-tab-${ember.id}`, tab);
    }
  };
  
  // Update activeTab when ember changes to get the stored tab for the new ember
  useEffect(() => {
    if (ember?.id) {
      const storedTab = getStoredActiveTab();
      setActiveTab(storedTab);
    }
  }, [ember?.id]);
  
  // Simplified state - only for refresh functionality
  const [isRefreshing, setIsRefreshing] = useState(false);



  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh ember data from parent component
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };



  const renderSectionContent = () => {
    switch (activeTab) {
      case 'wiki':
        return (
          <div className="h-full overflow-auto">
            <EmberWiki 
              ember={ember}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              isEditingTitle={isEditingTitle}
              setIsEditingTitle={setIsEditingTitle}
              newTitle={newTitle}
              setNewTitle={setNewTitle}
              handleTitleSave={handleTitleSave}
              handleTitleCancel={handleTitleCancel}
              handleTitleEdit={handleTitleEdit}
              handleTitleDelete={handleTitleDelete}
            />
          </div>
        );

      case 'story-circle':
        return (
          <div className="h-full overflow-hidden">
            <EmberStoryCircle 
              ember={ember}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
        );

      case 'sharing':
        return (
          <div className="h-full overflow-auto">
            <FeaturesCard 
              ember={ember} 
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
        );

      case 'settings':
        return (
          <div className="h-full overflow-auto">
            <EmberSettings 
              ember={ember}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              onClose={onClose}
            />
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Info size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Select a section</p>
              <p className="text-sm">Choose from the dropdown above to view ember details</p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Side Panel */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-full md:w-[600px] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
                {/* Panel Header */}
        <div className="border-b border-gray-200">
          {/* Header with title and close button */}
          <div className="flex items-center justify-between p-4 pb-2">
            <h2 className="text-lg font-semibold text-gray-900">Ember Settings</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleSetActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Success/Error Messages */}
        {message && (
          <div className={cn(
            "mx-4 mt-4 p-3 rounded-md text-sm",
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          )}>
            {message.text}
          </div>
        )}

        {/* Panel Content */}
        <div className="h-[calc(100vh-80px)] overflow-hidden">
          {renderSectionContent()}
        </div>
      </div>


    </>
  );
} 