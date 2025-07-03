import { useState, useEffect } from 'react';
import { Info, Image } from 'phosphor-react';
import { cn } from '@/lib/utils';
import EmberWiki from '@/components/ember/EmberWiki';
import EmberMedia from '@/components/ember/EmberMedia';


const tabs = [
  {
    id: "wiki",
    label: "Wiki",
    icon: Info
  },
  {
    id: "media",
    label: "Media",
    icon: Image
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
  onRefresh,
  onOpenSupportingMedia
}) {

  
  // Store active tab in localStorage to persist through refreshes
  const getStoredActiveTab = () => {
    if (ember?.id) {
      const stored = localStorage.getItem(`ember-settings-tab-${ember.id}`);
      return stored || "wiki";
    }
    return "wiki";
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

  // Always show wiki tab when panel is opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab("wiki");
    }
  }, [isOpen]);
  
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

      case 'media':
        return (
          <div className="h-full overflow-auto">
            <EmberMedia 
              ember={ember}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              onOpenSupportingMedia={onOpenSupportingMedia}
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
        "fixed top-0 right-0 h-full w-[calc(100%-2rem)] max-w-2xl bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
                {/* Panel Header */}
        <div className="p-6 border-b">
          {/* Header with title and close button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info size={24} className="text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Ember Wiki</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
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
        <div className="h-[calc(100vh-140px)] overflow-hidden">
          {renderSectionContent()}
        </div>
      </div>


    </>
  );
} 