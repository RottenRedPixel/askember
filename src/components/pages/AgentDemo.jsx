import React from 'react';
import { EmberAgent } from '@/components/agent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AgentDemo = () => {
  const mockEmber = {
    id: 'demo-ember-123',
    title: 'Demo Ember for Agent Testing',
    image_url: '/placeholder-image.jpg'
  };

  const mockParticipants = [
    {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      permission_level: 'contributor'
    },
    {
      id: 2,
      first_name: 'Jane',
      last_name: 'Smith', 
      email: 'jane@example.com',
      permission_level: 'viewer'
    }
  ];

  const handleWikiUpdate = (suggestion) => {
    console.log('Demo: Wiki update suggested:', suggestion);
    // In a real app, this would update the wiki
    alert(`Wiki suggestion: ${suggestion.value} for ${suggestion.section}`);
  };

  const handleStoryUpdate = (storyData) => {
    console.log('Demo: Story update:', storyData);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            EmberAgent Demo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            This is a demonstration of the new EmberAgent system. The agent will 
            ask questions, provide contextual responses, and suggest wiki updates 
            based on your conversation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Agent Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>Agent Interface</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[calc(600px-80px)]">
                <EmberAgent
                  emberId={mockEmber.id}
                  participants={mockParticipants}
                  permissions={{
                    isOwner: true,
                    canEdit: true
                  }}
                  onWikiUpdate={handleWikiUpdate}
                  onStoryUpdate={handleStoryUpdate}
                />
              </CardContent>
            </Card>
          </div>

          {/* Demo Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Try These Messages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Location Context:</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    "This was taken at the beach where we went last summer"
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Time Context:</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    "This happened during my graduation ceremony"
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">People Context:</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    "My friends Sarah and Mike are in this photo"
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Contextual responses</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Wiki suggestions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Typing indicators</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Voice input (UI ready)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Real AI integration (pending)</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mock Data</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <span className="font-medium">Ember ID:</span>
                  <span className="ml-2 text-gray-600">{mockEmber.id}</span>
                </div>
                <div>
                  <span className="font-medium">Participants:</span>
                  <span className="ml-2 text-gray-600">{mockParticipants.length}</span>
                </div>
                <div>
                  <span className="font-medium">Permissions:</span>
                  <span className="ml-2 text-gray-600">Owner</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDemo; 