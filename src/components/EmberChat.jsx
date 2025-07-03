import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEmberChatMessages, addChatMessage } from '@/lib/database';
import { analyzeCommentAndRespond, shouldEmberAIBeActive } from '@/lib/emberAI';
import useStore from '@/store';
import { Question, ChatCircle, CheckCircle, Plus, Minus } from 'phosphor-react';

export default function EmberChat({ emberId }) {
  const { user } = useStore();
  const [questions, setQuestions] = useState([]);
  const [comments, setComments] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState('question');
  const [answeringQuestion, setAnsweringQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const messagesEndRef = useRef(null);

  const toggleQuestion = (id) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedQuestions(newExpanded);
  };

  // Scroll to bottom when new messages arrive (commented out to prevent auto-scroll)
  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // };

  // useEffect(() => {
  //   scrollToBottom();
  // }, [questions, comments]);

  // Load chat messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        const { questions: loadedQuestions, comments: loadedComments } = await getEmberChatMessages(emberId);
        setQuestions(loadedQuestions);
        setComments(loadedComments);
        
        // Auto-expand questions that have answers
        const questionsWithAnswers = new Set(
          loadedQuestions.filter(q => q.answers && q.answers.length > 0).map(q => q.id)
        );
        setExpandedQuestions(questionsWithAnswers);
      } catch (error) {
        console.error('Error loading chat messages:', error);
      } finally {
        setLoading(false);
      }
    };

    if (emberId) {
      loadMessages();
    }
  }, [emberId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    try {
      setSending(true);

      // Prepare chat data
      const chatData = {
        ember_id: emberId,
        message: newMessage.trim(),
        message_type: messageType,
        parent_id: answeringQuestion,
      };

      // If user is authenticated, use their info
      if (user) {
        chatData.user_id = user.id;
        chatData.user_name = user.user_metadata?.name || user.email.split('@')[0];
        chatData.user_email = user.email;
      } else {
        // For anonymous users, use the form data
        if (!userName.trim()) {
          alert('Please enter your name to chat');
          return;
        }
        chatData.user_id = null;
        chatData.user_name = userName.trim();
        chatData.user_email = userEmail.trim() || null;
      }

      // Add message to database
      const newChatMessage = await addChatMessage(chatData);
      
      // Add to local state based on message type
      if (newChatMessage.message_type === 'question') {
        setQuestions(prev => [...prev, { ...newChatMessage, answers: [] }]);
      } else if (newChatMessage.message_type === 'comment' && !newChatMessage.parent_id) {
        setComments(prev => [...prev, newChatMessage]);
      }
      // For answers, we'd need to update the specific question - for now just reload
      
      // Clear input
      setNewMessage('');

      // 🤖 EMBER AI INTEGRATION: Analyze the comment and potentially respond
      try {
        const shouldAIRespond = await shouldEmberAIBeActive(emberId);
        
        if (shouldAIRespond && (messageType === 'comment' || messageType === 'answer')) {
          console.log('🤖 [EMBER AI] Analyzing new message for potential response...');
          
          // Build conversation history from current questions and comments
          const conversationHistory = [
            ...questions.map(q => ({
              sender: q.user_name || 'Anonymous',
              content: q.message,
              created_at: q.created_at,
              messageType: 'question'
            })),
            ...comments.map(c => ({
              sender: c.user_name || 'Anonymous', 
              content: c.message,
              created_at: c.created_at,
              messageType: 'comment'
            }))
          ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

          // Trigger AI analysis (this is async and doesn't block the UI)
          analyzeCommentAndRespond({
            emberId,
            conversationId: null, // EmberChat doesn't use conversation IDs
            newComment: chatData.message,
            commentAuthor: chatData.user_name,
            conversationHistory,
            options: {
              shouldRespond: true,
              minCommentLength: 15, // Require slightly longer comments for AI response
              maxAIQuestionsPerConvo: 2, // Limit AI in this casual chat context
              cooldownMinutes: 10 // Longer cooldown for casual chat
            }
          }).then(result => {
            if (result.responded) {
              console.log('🎉 [EMBER AI] Posted question:', result.question);
              // Optionally reload messages to show the AI question
              // For now, we'll let users refresh manually to see AI responses
            } else {
              console.log('⏭️ [EMBER AI] No response:', result.reason);
            }
          }).catch(error => {
            console.error('❌ [EMBER AI] Error analyzing comment:', error);
            // Fail silently - don't interrupt user experience
          });
        }
      } catch (error) {
        console.error('❌ [EMBER AI] Error in AI integration:', error);
        // Fail silently - don't interrupt user experience
      }

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="mt-6">
      <CardContent className="space-y-4">
        {/* Q&A Area */}
        <div className="h-64 overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading discussion...</div>
            </div>
          ) : questions.length === 0 && comments.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <p>No discussion yet.</p>
                <p className="text-sm">Ask a question or start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Questions with Accordion Style */}
              {questions.map((question) => (
                <Card key={question.id} className="border-blue-200">
                  <CardHeader 
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => toggleQuestion(question.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <Question size={20} className="text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-blue-900">{question.user_name || 'Anonymous'}</span>
                            <span className="text-xs text-blue-600">{formatTime(question.created_at)}</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {question.answers?.length || 0} answers
                            </span>
                          </div>
                          <p className="text-blue-800 text-sm">{question.message}</p>
                        </div>
                      </div>
                      {expandedQuestions.has(question.id) ? 
                        <Minus size={16} className="text-blue-600" /> : 
                        <Plus size={16} className="text-blue-600" />
                      }
                    </div>
                  </CardHeader>
                  
                  {expandedQuestions.has(question.id) && question.answers && question.answers.length > 0 && (
                    <CardContent className="border-t border-blue-100">
                      <div className="space-y-3 pt-4">
                        {question.answers.map((answer) => (
                          <div key={answer.id} className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r">
                            <div className="flex items-start gap-3">
                              <CheckCircle size={16} className="text-green-600 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium text-green-900">{answer.user_name || 'Anonymous'}</span>
                                  <span className="text-xs text-green-600">{formatTime(answer.created_at)}</span>
                                </div>
                                <p className="text-green-800 text-sm">{answer.message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
              
              {/* Top-level Comments */}
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <ChatCircle size={20} className="text-gray-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">{comment.user_name || 'Anonymous'}</span>
                        <span className="text-xs text-gray-600">{formatTime(comment.created_at)}</span>
                      </div>
                      <p className="text-gray-800">{comment.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="space-y-3">
          {/* Anonymous user fields */}
          {!user && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                type="text"
                placeholder="Your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
              <Input
                type="email"
                placeholder="Email (optional)"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </div>
          )}

          {/* Message Type Selection */}
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant={messageType === 'question' ? 'blue' : 'outline'}
              onClick={() => {
                setMessageType('question');
                setAnsweringQuestion(null);
              }}
              size="sm"
              className="flex items-center gap-2"
            >
              <Question size={16} />
              Ask Question
            </Button>
            <Button
              type="button"
              variant={messageType === 'comment' ? 'blue' : 'outline'}
              onClick={() => {
                setMessageType('comment');
                setAnsweringQuestion(null);
              }}
              size="sm"
              className="flex items-center gap-2"
            >
              <ChatCircle size={16} />
              Add Comment
            </Button>
          </div>

          {/* Message input */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={
                messageType === 'question' ? 'Ask a question...' :
                messageType === 'answer' ? 'Provide an answer...' :
                'Add a comment...'
              }
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" size="lg" disabled={sending || !newMessage.trim()} variant="blue">
              {sending ? 'Sending...' : 
               messageType === 'question' ? 'Ask' :
               messageType === 'answer' ? 'Answer' : 'Comment'}
            </Button>
          </div>

          {/* Current mode indicator */}
          <div className="text-xs text-gray-500">
            {answeringQuestion ? 
              `Answering question...` :
              `Mode: ${messageType === 'question' ? 'Asking a question' : 'Adding a comment'}`
            }
          </div>
        </form>

        {/* User status indicator */}
        {user ? (
          <div className="text-xs text-gray-500">
            Chatting as: {user.user_metadata?.name || user.email.split('@')[0]}
          </div>
        ) : (
          <div className="text-xs text-gray-500">
            Chatting anonymously
          </div>
        )}
      </CardContent>
    </Card>
  );
} 