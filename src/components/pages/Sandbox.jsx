import React, { useState } from 'react';
import { Button } from '../ui/button';
import SlideToVoteModal from '../SlideToVoteModal';

export default function Sandbox() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock ember data for testing
  const mockEmber = {
    id: 'test-ember-123',
    title: 'Summer Beach Sunset',
    suggested_names: [
      'Golden Hour Magic',
      'Ocean Dreams',
      'Paradise Found'
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Sandbox - Testing Components</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Slide to Vote Interface</h2>
          <p className="text-gray-600 mb-6">
            Test the slide-to-unlock voting interface for ember name selection.
          </p>
          
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Open Slide to Vote Modal
          </Button>
        </div>

        <SlideToVoteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          ember={mockEmber}
          onVoteSubmit={(selectedName) => {
            console.log('Vote submitted for:', selectedName);
            alert(`Vote submitted for: ${selectedName}`);
            setIsModalOpen(false);
          }}
        />
      </div>
    </div>
  );
} 