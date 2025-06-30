import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import useStore from '../../store';
import { supabase } from '../../lib/supabase';
import { 
  getOrCreateStoryConversation, 
  addStoryMessage, 
  getStoryConversationWithMessages 
} from '../../lib/database';

export default function Test() {
  const { user } = useStore();
  const [activeSection, setActiveSection] = useState('threaded');
  const [expandedQuestions, setExpandedQuestions] = useState(new Set([1, 5]));
  const [testResults, setTestResults] = useState([]);

  const toggleQuestion = (id) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedQuestions(newExpanded);
  };

  const testStoryConversations = async () => {
    if (!user) {
      setTestResults(prev => [...prev, 'Error: No user logged in']);
      return;
    }

    try {
      setTestResults(prev => [...prev, 'Testing story conversation database...']);

      // Test if ember_story_conversations table exists
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('ember_story_conversations')
        .select('count', { count: 'exact', head: true });

      if (conversationsError) {
        setTestResults(prev => [...prev, `❌ ember_story_conversations table error: ${conversationsError.message}`]);
        return;
      } else {
        setTestResults(prev => [...prev, '✅ ember_story_conversations table exists']);
      }

      // Test if ember_story_messages table exists
      const { data: messagesData, error: messagesError } = await supabase
        .from('ember_story_messages')
        .select('count', { count: 'exact', head: true });

      if (messagesError) {
        setTestResults(prev => [...prev, `❌ ember_story_messages table error: ${messagesError.message}`]);
        return;
      } else {
        setTestResults(prev => [...prev, '✅ ember_story_messages table exists']);
      }

      // Test creating a conversation
      setTestResults(prev => [...prev, '📝 Testing conversation creation...']);
      
      // First, get a real ember ID from the user's embers
      setTestResults(prev => [...prev, '🔍 Getting real ember for testing...']);
      
      const { data: userEmbers, error: embersError } = await supabase
        .from('embers')
        .select('id, title')
        .eq('user_id', user.id)
        .limit(1);

      if (embersError) {
        setTestResults(prev => [...prev, `❌ Error getting embers: ${embersError.message}`]);
        return;
      }

      if (!userEmbers || userEmbers.length === 0) {
        setTestResults(prev => [...prev, '⚠️ No embers found for testing. Create an ember first, then test again.']);
        return;
      }

      const testEmberId = userEmbers[0].id;
      setTestResults(prev => [...prev, `✅ Using ember: "${userEmbers[0].title}" (${testEmberId})`]);
      
      // Now test with real ember ID
      setTestResults(prev => [...prev, '🔍 Testing conversation creation with real ember...']);
      
      const { data: directInsert, error: directError } = await supabase
        .from('ember_story_conversations')
        .insert([{
          ember_id: testEmberId,
          user_id: user.id,
          conversation_type: 'story',
          title: 'Test Story',
          is_completed: false,
          message_count: 0
        }])
        .select()
        .single();

      if (directError) {
        setTestResults(prev => [...prev, `❌ Conversation creation error: ${directError.message || 'Unknown error'}`]);
        setTestResults(prev => [...prev, `❌ Error details: ${JSON.stringify(directError)}`]);
        return;
      } else {
        setTestResults(prev => [...prev, `✅ Conversation created successfully: ${directInsert.id}`]);
      }

      // Test adding a message to the conversation
      setTestResults(prev => [...prev, '💬 Testing message creation...']);
      
      const { data: testMessage, error: messageError } = await supabase
        .from('ember_story_messages')
        .insert([{
          conversation_id: directInsert.id,
          sender: 'ember',
          message_type: 'question',
          content: 'This is a test question from Ember.',
          has_audio: false
        }])
        .select()
        .single();

      if (messageError) {
        setTestResults(prev => [...prev, `❌ Message creation error: ${messageError.message}`]);
        return;
      } else {
        setTestResults(prev => [...prev, `✅ Message created successfully: ${testMessage.id}`]);
      }

      // Test retrieving conversation with messages
      setTestResults(prev => [...prev, '📖 Testing conversation retrieval...']);
      
      const { data: conversationWithMessages, error: retrievalError } = await supabase
        .from('ember_story_conversations')
        .select(`
          *,
          ember_story_messages (*)
        `)
        .eq('id', directInsert.id)
        .single();

      if (retrievalError) {
        setTestResults(prev => [...prev, `❌ Retrieval error: ${retrievalError.message}`]);
      } else {
        const messageCount = conversationWithMessages.ember_story_messages?.length || 0;
        setTestResults(prev => [...prev, `✅ Retrieved conversation with ${messageCount} messages`]);
      }

      // Test the database functions
      setTestResults(prev => [...prev, '🚀 Testing database functions...']);
      
      try {
        const functionTestConversation = await getOrCreateStoryConversation(testEmberId, user.id, 'story');
        setTestResults(prev => [...prev, `✅ getOrCreateStoryConversation works: ${functionTestConversation.id}`]);
        
        const functionTestMessage = await addStoryMessage({
          conversationId: functionTestConversation.id,
          sender: 'user',
          messageType: 'answer',
          content: 'This is a test answer from the user.',
          hasAudio: false
        });
        setTestResults(prev => [...prev, `✅ addStoryMessage works: ${functionTestMessage.id}`]);
        
        const retrievedConversation = await getStoryConversationWithMessages(functionTestConversation.id);
        setTestResults(prev => [...prev, `✅ getStoryConversationWithMessages works: ${retrievedConversation.messages.length} messages`]);
        
        setTestResults(prev => [...prev, '🎉 All story conversation functions are working perfectly!']);
        setTestResults(prev => [...prev, '📝 Note: Test conversations and messages were created in your database.']);
        
      } catch (functionError) {
        setTestResults(prev => [...prev, `❌ Function test error: ${functionError.message}`]);
      }

    } catch (error) {
      setTestResults(prev => [...prev, `❌ Error: ${error.message}`]);
    }
  };

  // Mock Q&A data
  const mockData = [
    {
      id: 1,
      type: 'question',
      user: 'Sarah Chen',
      time: '2 hours ago',
      message: "What's the story behind this photo? It looks like there's something interesting happening in the background.",
      answers: [
        {
          id: 2,
          type: 'answer',
          user: 'Mike Johnson',
          time: '1 hour ago',
          message: "This was taken during the 2023 street festival downtown. You can see the parade setup in the background - those are actually carnival floats being prepared.",
          comments: [
            {
              id: 3,
              type: 'comment',
              user: 'Lisa Wong',
              time: '45 min ago',
              message: "Great insight! I was wondering about those colorful structures."
            }
          ]
        },
        {
          id: 4,
          type: 'answer',
          user: 'David Kim',
          time: '30 min ago',
          message: "Actually, I think this might be from the art installation event. Those look like temporary art pieces, not carnival floats."
        }
      ]
    },
    {
      id: 5,
      type: 'question',
      user: 'Emma Rodriguez',
      time: '3 hours ago',
      message: "When was this taken? The lighting suggests golden hour but I'm curious about the exact time.",
      answers: [
        {
          id: 6,
          type: 'answer',
          user: 'Photography Pro',
          time: '2 hours ago',
          message: "Based on the shadow angles and warm color temperature, this was definitely taken during the golden hour, probably around 6-7 PM."
        }
      ]
    },
    {
      id: 7,
      type: 'comment',
      user: 'Alex Turner',
      time: '4 hours ago',
      message: "Beautiful composition! The way the light hits the subject is perfect."
    }
  ];

  const renderThreadedView = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Option A: Threaded Conversations</h3>
      <div className="space-y-6">
        {mockData.map((item) => (
          <div key={item.id}>
            {/* Questions */}
            {item.type === 'question' && (
              <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <span className="text-lg">🤔</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-blue-900">{item.user}</span>
                      <span className="text-xs text-blue-600">{item.time}</span>
                    </div>
                    <p className="text-blue-800">{item.message}</p>
                  </div>
                </div>
                
                {/* Answers to this question */}
                {item.answers && (
                  <div className="ml-8 mt-4 space-y-3">
                    {item.answers.map((answer) => (
                      <div key={answer.id} className="border-l-4 border-green-500 bg-green-50 p-3 rounded-r-lg">
                        <div className="flex items-start gap-3">
                          <span className="text-sm">✅</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-green-900">{answer.user}</span>
                              <span className="text-xs text-green-600">{answer.time}</span>
                            </div>
                            <p className="text-green-800 text-sm">{answer.message}</p>
                          </div>
                        </div>
                        
                        {/* Comments on answers */}
                        {answer.comments && (
                          <div className="ml-6 mt-3 space-y-2">
                            {answer.comments.map((comment) => (
                              <div key={comment.id} className="border-l-2 border-gray-300 bg-gray-50 p-2 rounded-r">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs">💬</span>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-gray-700 text-xs">{comment.user}</span>
                                      <span className="text-xs text-gray-500">{comment.time}</span>
                                    </div>
                                    <p className="text-gray-700 text-xs">{comment.message}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Top-level comments */}
            {item.type === 'comment' && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-lg">💬</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900">{item.user}</span>
                      <span className="text-xs text-gray-600">{item.time}</span>
                    </div>
                    <p className="text-gray-800">{item.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderCardBasedView = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Option B: Card-Based Grouping</h3>
      <div className="space-y-6">
        {mockData.map((item) => (
          <div key={item.id}>
            {item.type === 'question' && (
              <Card className="border-blue-200 shadow-sm">
                <CardHeader className="bg-blue-50 pb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🤔</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-blue-900">{item.user}</span>
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Question</span>
                        <span className="text-xs text-blue-600">{item.time}</span>
                      </div>
                      <p className="text-blue-800">{item.message}</p>
                    </div>
                  </div>
                </CardHeader>
                
                {item.answers && (
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {item.answers.map((answer) => (
                        <div key={answer.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            <span className="text-lg">✅</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-green-900">{answer.user}</span>
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Answer</span>
                                <span className="text-xs text-green-600">{answer.time}</span>
                              </div>
                              <p className="text-green-800 text-sm">{answer.message}</p>
                              
                              {answer.comments && (
                                <div className="mt-3 pl-4 border-l-2 border-green-200">
                                  {answer.comments.map((comment) => (
                                    <div key={comment.id} className="bg-white border border-gray-200 rounded p-2 text-xs">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span>💬</span>
                                        <span className="font-medium">{comment.user}</span>
                                        <span className="text-gray-500">{comment.time}</span>
                                      </div>
                                      <p className="text-gray-700">{comment.message}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
            
            {item.type === 'comment' && (
              <Card className="border-gray-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">💬</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">{item.user}</span>
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">Comment</span>
                        <span className="text-xs text-gray-600">{item.time}</span>
                      </div>
                      <p className="text-gray-800">{item.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAccordionView = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Option C: Accordion/Collapsible Style</h3>
        <div className="space-y-4">
          {mockData.map((item) => (
            <div key={item.id}>
              {item.type === 'question' && (
                <Card className="border-blue-200">
                  <CardHeader 
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => toggleQuestion(item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-lg">🤔</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-blue-900">{item.user}</span>
                            <span className="text-xs text-blue-600">{item.time}</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {item.answers?.length || 0} answers
                            </span>
                          </div>
                          <p className="text-blue-800 text-sm">{item.message}</p>
                        </div>
                      </div>
                      <span className="text-blue-600">
                        {expandedQuestions.has(item.id) ? '−' : '+'}
                      </span>
                    </div>
                  </CardHeader>
                  
                  {expandedQuestions.has(item.id) && item.answers && (
                    <CardContent className="border-t border-blue-100">
                      <div className="space-y-3 pt-4">
                        {item.answers.map((answer) => (
                          <div key={answer.id} className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r">
                            <div className="flex items-start gap-3">
                              <span className="text-sm">✅</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium text-green-900">{answer.user}</span>
                                  <span className="text-xs text-green-600">{answer.time}</span>
                                </div>
                                <p className="text-green-800 text-sm">{answer.message}</p>
                                
                                {answer.comments && (
                                  <div className="mt-2 space-y-2">
                                    {answer.comments.map((comment) => (
                                      <div key={comment.id} className="bg-white rounded p-2 text-xs border">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span>💬</span>
                                          <span className="font-medium">{comment.user}</span>
                                          <span className="text-gray-500">{comment.time}</span>
                                        </div>
                                        <p className="text-gray-700">{comment.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
              
              {item.type === 'comment' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">💬</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">{item.user}</span>
                        <span className="text-xs text-gray-600">{item.time}</span>
                      </div>
                      <p className="text-gray-800">{item.message}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-8">
      <div className="text-center mt-2">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 pt-2">Q&A Design Test (Fixed)</h1>
        <p className="text-lg text-gray-600 mb-6">
          Exploring different visual approaches for ember discussions
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-center gap-4 mb-8">
        <Button 
          variant={activeSection === 'threaded' ? 'blue' : 'outline'}
          onClick={() => setActiveSection('threaded')}
        >
          Threaded
        </Button>
        <Button 
          variant={activeSection === 'cards' ? 'blue' : 'outline'}
          onClick={() => setActiveSection('cards')}
        >
          Card-Based
        </Button>
        <Button 
          variant={activeSection === 'accordion' ? 'blue' : 'outline'}
          onClick={() => setActiveSection('accordion')}
        >
          Accordion
        </Button>
      </div>

      {/* Content Area */}
      <div className="max-w-4xl mx-auto">
        {activeSection === 'threaded' && renderThreadedView()}
        {activeSection === 'cards' && renderCardBasedView()}
        {activeSection === 'accordion' && renderAccordionView()}
      </div>

      {/* Summary */}
      <div className="max-w-4xl mx-auto mt-12 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Summary of Approaches:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Threaded</h4>
            <ul className="space-y-1 text-gray-700">
              <li>• Clear visual hierarchy</li>
              <li>• Easy to follow conversations</li>
              <li>• Color-coded by type</li>
              <li>• Indented responses</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-green-900 mb-2">Card-Based</h4>
            <ul className="space-y-1 text-gray-700">
              <li>• Clean, contained sections</li>
              <li>• Modern card design</li>
              <li>• Tagged message types</li>
              <li>• Nested answers in cards</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-purple-900 mb-2">Accordion</h4>
            <ul className="space-y-1 text-gray-700">
              <li>• Space-efficient</li>
              <li>• Collapsible questions</li>
              <li>• Answer count preview</li>
              <li>• Interactive expand/collapse</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Story Conversations Test */}
      <div className="max-w-4xl mx-auto mt-12">
        <h2 className="text-xl font-semibold mb-4">Story Conversations Test</h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={testStoryConversations}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Test Story Conversations
          </button>
          <button
            onClick={() => setTestResults([])}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Clear Results
          </button>
          <button
            onClick={async () => {
              setTestResults(prev => [...prev, '🔄 Attempting to run migration via JavaScript...']);
              try {
                // Try to use the execute_sql function if it exists
                const { data, error } = await supabase.rpc('execute_sql', { 
                  sql_query: 'SELECT 1 as test' 
                });
                
                if (error) {
                  setTestResults(prev => [...prev, '❌ execute_sql function not available. Use Supabase dashboard instead.']);
                } else {
                  setTestResults(prev => [...prev, '✅ execute_sql function is available! But for safety, please use the Supabase dashboard to run the migration.']);
                }
              } catch (error) {
                setTestResults(prev => [...prev, '❌ Migration via JavaScript not available. Use Supabase dashboard.']);
              }
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Check Migration Method
          </button>
        </div>
        
        {testResults.length > 0 && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            {testResults.map((result, index) => (
              <div key={index} className="mb-1 font-mono text-sm">
                {result}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
} 