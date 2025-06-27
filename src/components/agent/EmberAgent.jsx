import React from 'react';
import { AgentProvider } from './AgentContext';
import AgentMessages from './components/AgentMessages';
import AgentInput from './components/AgentInput';
import { cn } from '@/lib/utils';
import useStore from '@/store';

const EmberAgent = ({ 
  emberId, 
  className,
  onWikiUpdate,
  onStoryUpdate,
  participants = [],
  permissions = {}
}) => {
  const { user } = useStore();

  if (!emberId || !user) {
    return null;
  }

  return (
    <AgentProvider emberId={emberId} userId={user.id}>
      <div className={cn(
        "flex flex-col h-full bg-white",
        className
      )}>
        {/* Agent Messages Area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AgentMessages 
            onWikiUpdate={onWikiUpdate}
            onStoryUpdate={onStoryUpdate}
            participants={participants}
            permissions={permissions}
          />
        </div>
        
        {/* Agent Input Area */}
        <div className="flex-shrink-0 border-t border-gray-200">
          <AgentInput />
        </div>
      </div>
    </AgentProvider>
  );
};

export default EmberAgent; 