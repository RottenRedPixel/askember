import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useStore from '../../store';
import { supabase } from '../../lib/supabase';
import { 
  getOrCreateStoryConversation, 
  addStoryMessage, 
  getStoryConversationWithMessages,
  getEmberTaggedPeople,
  addTaggedPerson,
  updateTaggedPerson,
  deleteTaggedPerson,
  getPotentialContributorMatches
} from '../../lib/database';
import { speechToText } from '../../lib/elevenlabs';

export default function Test() {
  const { user } = useStore();
  const [activeSection, setActiveSection] = useState('threaded');
  const [expandedQuestions, setExpandedQuestions] = useState(new Set([1, 5]));
  const [testResults, setTestResults] = useState([]);
  const [availableMicrophones, setAvailableMicrophones] = useState([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState(null);

  // Helper function to detect mobile devices
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const toggleQuestion = (id) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedQuestions(newExpanded);
  };

  const getAvailableMicrophones = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const microphones = devices.filter(device => device.kind === 'audioinput');
      setAvailableMicrophones(microphones);
      
      // Set first microphone as default if none selected
      if (microphones.length > 0 && !selectedMicrophone) {
        setSelectedMicrophone(microphones[0].deviceId);
      }
      
      return microphones;
    } catch (error) {
      console.error('Error getting microphones:', error);
      return [];
    }
  };

  // Load microphones on component mount
  useEffect(() => {
    getAvailableMicrophones();
  }, []);

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

  const testTaggedPeople = async () => {
    if (!user) {
      setTestResults(prev => [...prev, 'Error: No user logged in']);
      return;
    }

    try {
      setTestResults(prev => [...prev, '🏷️ Testing Tagged People database functions...']);

      // Test if ember_tagged_people table exists
      const { data: tableData, error: tableError } = await supabase
        .from('ember_tagged_people')
        .select('count', { count: 'exact', head: true });

      if (tableError) {
        setTestResults(prev => [...prev, `❌ ember_tagged_people table error: ${tableError.message}`]);
        return;
      } else {
        setTestResults(prev => [...prev, '✅ ember_tagged_people table exists']);
      }

      // Get a real ember ID from the user's embers
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

      // Test 1: Get tagged people for ember (should be empty initially)
      setTestResults(prev => [...prev, '1️⃣ Testing getEmberTaggedPeople...']);
      const initialTaggedPeople = await getEmberTaggedPeople(testEmberId);
      setTestResults(prev => [...prev, `✅ getEmberTaggedPeople works: ${initialTaggedPeople.length} tagged people found`]);

      // Test 2: Add a tagged person
      setTestResults(prev => [...prev, '2️⃣ Testing addTaggedPerson...']);
      const testFaceCoordinates = { x: 100, y: 150, width: 80, height: 120 };
      const newTaggedPersonId = await addTaggedPerson(
        testEmberId, 
        'Test Person', 
        testFaceCoordinates,
        'test@example.com'
      );
      setTestResults(prev => [...prev, `✅ addTaggedPerson works: Created person with ID ${newTaggedPersonId}`]);

      // Test 3: Get tagged people again (should now have 1)
      setTestResults(prev => [...prev, '3️⃣ Testing getEmberTaggedPeople after adding...']);
      const updatedTaggedPeople = await getEmberTaggedPeople(testEmberId);
      setTestResults(prev => [...prev, `✅ Found ${updatedTaggedPeople.length} tagged people after adding`]);

      if (updatedTaggedPeople.length > 0) {
        const person = updatedTaggedPeople[0];
        setTestResults(prev => [...prev, `📋 Person details: ${person.person_name} at coordinates ${JSON.stringify(person.face_coordinates)}`]);
      }

      // Test 4: Update the tagged person
      if (newTaggedPersonId) {
        setTestResults(prev => [...prev, '4️⃣ Testing updateTaggedPerson...']);
        await updateTaggedPerson(newTaggedPersonId, 'Updated Test Person', 'updated@example.com');
        setTestResults(prev => [...prev, '✅ updateTaggedPerson works: Person updated']);
      }

      // Test 5: Test potential contributor matches
      setTestResults(prev => [...prev, '5️⃣ Testing getPotentialContributorMatches...']);
      const matches = await getPotentialContributorMatches(testEmberId, 'Test');
      setTestResults(prev => [...prev, `✅ getPotentialContributorMatches works: ${matches.length} potential matches found`]);

      // Test 6: Get tagged people one more time to verify update
      setTestResults(prev => [...prev, '6️⃣ Testing final getEmberTaggedPeople...']);
      const finalTaggedPeople = await getEmberTaggedPeople(testEmberId);
      if (finalTaggedPeople.length > 0) {
        const updatedPerson = finalTaggedPeople[0];
        setTestResults(prev => [...prev, `✅ Updated person: ${updatedPerson.person_name} (${updatedPerson.contributor_email})`]);
      }

      // Test 7: Clean up - delete the test tagged person
      if (newTaggedPersonId) {
        setTestResults(prev => [...prev, '7️⃣ Testing deleteTaggedPerson (cleanup)...']);
        await deleteTaggedPerson(newTaggedPersonId);
        setTestResults(prev => [...prev, '✅ deleteTaggedPerson works: Test person deleted']);
      }

      // Test 8: Verify cleanup
      setTestResults(prev => [...prev, '8️⃣ Verifying cleanup...']);
      const cleanupTaggedPeople = await getEmberTaggedPeople(testEmberId);
      setTestResults(prev => [...prev, `✅ Cleanup verified: ${cleanupTaggedPeople.length} tagged people remaining`]);

      setTestResults(prev => [...prev, '🎉 All Tagged People functions are working perfectly!']);
      setTestResults(prev => [...prev, '📝 Note: Test data was created and cleaned up automatically.']);

    } catch (error) {
      setTestResults(prev => [...prev, `❌ Tagged People test error: ${error.message}`]);
      console.error('Tagged people test error:', error);
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
        
        {/* Microphone Selection */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-semibold mb-2 text-gray-700">🎤 Microphone Selection</h3>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-600">Select Microphone:</label>
            <Select 
              value={selectedMicrophone || ''} 
              onValueChange={(value) => setSelectedMicrophone(value)}
            >
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Choose microphone..." />
              </SelectTrigger>
              <SelectContent>
                {availableMicrophones.map((mic) => (
                  <SelectItem key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}...`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={getAvailableMicrophones}
              className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {availableMicrophones.length} microphone(s) detected. 
            {!selectedMicrophone && availableMicrophones.length > 0 && " Please select one for testing."}
          </p>
        </div>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={testStoryConversations}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Test Story Conversations
          </button>
          <button
            onClick={testTaggedPeople}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Test Tagged People
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
          <button
            onClick={async () => {
              setTestResults(prev => [...prev, '🎤 Testing ElevenLabs integration...']);
              
              // Check if API key is configured
              const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
              if (!apiKey) {
                setTestResults(prev => [...prev, '❌ VITE_ELEVENLABS_API_KEY environment variable not set']);
                setTestResults(prev => [...prev, '💡 Add VITE_ELEVENLABS_API_KEY=your_api_key to your .env file']);
                setTestResults(prev => [...prev, '💡 Create a .env file in your project root with:']);
                setTestResults(prev => [...prev, '   VITE_ELEVENLABS_API_KEY=sk_your_actual_api_key_here']);
                return;
              }
              
              setTestResults(prev => [...prev, '✅ ElevenLabs API key is configured']);
              setTestResults(prev => [...prev, `🔑 API key preview: ${apiKey.substring(0, 10)}...`]);
              
              // Test basic API connectivity
              try {
                setTestResults(prev => [...prev, '🌐 Testing ElevenLabs API connectivity...']);
                
                const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                  headers: {
                    'xi-api-key': apiKey,
                  },
                });
                
                if (response.ok) {
                  setTestResults(prev => [...prev, '✅ ElevenLabs API is accessible']);
                  setTestResults(prev => [...prev, '💡 To test speech-to-text, record audio in the Story Modal']);
                } else {
                  const errorText = await response.text();
                  setTestResults(prev => [...prev, `❌ API error: ${response.status} ${response.statusText}`]);
                  setTestResults(prev => [...prev, `❌ Error details: ${errorText}`]);
                }
              } catch (error) {
                setTestResults(prev => [...prev, `❌ Network error: ${error.message}`]);
                setTestResults(prev => [...prev, '💡 Check your internet connection and API key']);
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test ElevenLabs Setup
          </button>
          <button
            onClick={async () => {
              setTestResults(prev => [...prev, '🎙️ Testing microphone recording...']);
              
              // Check if microphone is selected
              if (!selectedMicrophone) {
                setTestResults(prev => [...prev, '❌ Please select a microphone first']);
                return;
              }
              
              // Check if API key is configured
              const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
              if (!apiKey) {
                setTestResults(prev => [...prev, '❌ VITE_ELEVENLABS_API_KEY not configured']);
                return;
              }

              try {
                // Test microphone access
                setTestResults(prev => [...prev, '🎤 Requesting microphone access...']);
                setTestResults(prev => [...prev, `🎛️ Using microphone: ${selectedMicrophone ? availableMicrophones.find(m => m.deviceId === selectedMicrophone)?.label || 'Selected mic' : 'Default'}`]);
                
                const audioConstraints = {
                  echoCancellation: true,
                  noiseSuppression: true,
                  sampleRate: 44100,
                };
                
                if (selectedMicrophone) {
                  audioConstraints.deviceId = { exact: selectedMicrophone };
                }
                
                const stream = await navigator.mediaDevices.getUserMedia({ 
                  audio: audioConstraints
                });
                
                setTestResults(prev => [...prev, '✅ Microphone access granted']);
                setTestResults(prev => [...prev, `📊 Stream track settings: ${JSON.stringify(stream.getAudioTracks()[0]?.getSettings())}`]);
                
                // Test MediaRecorder
                const mediaRecorder = new MediaRecorder(stream, {
                  mimeType: 'audio/webm;codecs=opus'
                });
                
                setTestResults(prev => [...prev, `✅ MediaRecorder created with mimeType: ${mediaRecorder.mimeType}`]);
                
                const audioChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                  if (event.data.size > 0) {
                    audioChunks.push(event.data);
                  }
                };
                
                mediaRecorder.onstop = async () => {
                  try {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    setTestResults(prev => [...prev, `✅ Recording completed: ${audioBlob.size} bytes`]);
                    
                    // Test the speech-to-text function with real audio
                    setTestResults(prev => [...prev, '🌐 Testing speech-to-text with recorded audio...']);
                    
                    const result = await speechToText(audioBlob);
                    
                    if (result && result.trim()) {
                      setTestResults(prev => [...prev, `✅ Speech-to-text successful!`]);
                      setTestResults(prev => [...prev, `📝 Transcribed: "${result}"`]);
                    } else {
                      setTestResults(prev => [...prev, `⚠️ Speech-to-text returned empty (no speech detected or very quiet)`]);
                    }
                    
                  } catch (error) {
                    setTestResults(prev => [...prev, `❌ Speech-to-text error: ${error.message}`]);
                  } finally {
                    // Clean up
                    stream.getTracks().forEach(track => track.stop());
                  }
                };
                
                // Record for 3 seconds
                mediaRecorder.start();
                setTestResults(prev => [...prev, '🔴 Recording for 3 seconds... Please say something!']);
                
                setTimeout(() => {
                  mediaRecorder.stop();
                  setTestResults(prev => [...prev, '⏹️ Recording stopped, processing...']);
                }, 3000);
                
              } catch (error) {
                setTestResults(prev => [...prev, `❌ Recording test failed: ${error.message}`]);
                if (error.name === 'NotAllowedError') {
                  setTestResults(prev => [...prev, '💡 Please allow microphone access and try again']);
                }
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Recording + STT
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

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold mb-2 text-blue-900">📝 Setup Notes:</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>Environment Variables Needed:</strong></p>
            <ul className="list-disc ml-4 space-y-1">
              <li><code>VITE_SUPABASE_URL</code> - Your Supabase project URL</li>
              <li><code>VITE_SUPABASE_ANON_KEY</code> - Your Supabase anonymous key</li>
              <li><code>BLOB_READ_WRITE_TOKEN</code> - Vercel Blob storage token</li>
              <li><code>VITE_ELEVENLABS_API_KEY</code> - ElevenLabs API key for speech-to-text</li>
            </ul>
            <p className="mt-3"><strong>Story Q&A Feature Testing:</strong></p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Select your preferred microphone from the dropdown above</li>
              <li>Use "Test Recording + STT" to verify your microphone and transcription</li>
              <li>When you record audio, it's automatically transcribed via ElevenLabs</li>
              <li>Original audio files are preserved for future voice cloning</li>
              <li>Both text and audio are saved to the database</li>
              <li>Conversations are persistent and can be resumed</li>
            </ul>
            
            {isMobileDevice() ? (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">📱 Mobile Device Detected:</p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc ml-4">
                  <li>Using optimized settings for mobile recording</li>
                  <li>Audio format: {navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') ? 'MP4 (iOS Safari)' : 'WebM or MP4'}</li>
                  <li>Quality: 16kHz mono for better network performance</li>
                  <li>Make sure to allow microphone access when prompted</li>
                </ul>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-2">💻 Desktop Device Detected:</p>
                <ul className="text-sm text-green-700 space-y-1 list-disc ml-4">
                  <li>Using high-quality settings for desktop recording</li>
                  <li>Audio format: WebM with Opus codec (preferred)</li>
                  <li>Quality: 44.1kHz stereo for best quality</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
} 