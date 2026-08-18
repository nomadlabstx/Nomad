import { useCallback, useRef, useState } from 'react';
import { geminiService, TripPlanRequest } from '../services/gemini-ai';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function useGemini() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memorizationEnabled, setMemorizationEnabled] = useState(false); // Default: OFF
  const streamingMessageRef = useRef<string>('');
  const sendBusyRef = useRef(false);

  /**
   * Determine current season for travel context
   */
  const getSeason = (month: number): string => {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  };

  /**
   * Analyze conversation depth and complexity
   */
  const analyzeConversationDepth = useCallback((): string => {
    if (messages.length === 0) return 'initial';
    
    const recentMessages = messages.slice(-3);
    const avgLength = recentMessages.reduce((sum, msg) => sum + msg.content.length, 0) / recentMessages.length;
    
    if (avgLength > 100) return 'detailed';
    if (avgLength > 50) return 'moderate';
    return 'brief';
  }, [messages]);

  /**
   * Analyze urgency level from conversation
   */
  const analyzeUrgency = useCallback((): string => {
    if (messages.length === 0) return 'normal';
    
    const recentContent = messages.slice(-3).map(m => m.content.toLowerCase()).join(' ');
    const urgencyWords = ['urgent', 'asap', 'immediately', 'quick', 'emergency', 'today', 'now'];
    
    if (urgencyWords.some(word => recentContent.includes(word))) return 'high';
    return 'normal';
  }, [messages]);

  /**
   * Analyze user's complexity preference
   */
  const analyzeComplexityPreference = useCallback((): string => {
    if (messages.length === 0) return 'balanced';
    
    const recentContent = messages.slice(-5).map(m => m.content.toLowerCase()).join(' ');
    const detailedWords = ['detailed', 'specific', 'comprehensive', 'thorough', 'analysis'];
    const simpleWords = ['simple', 'basic', 'quick', 'easy', 'straightforward'];
    
    const detailedCount = detailedWords.filter(word => recentContent.includes(word)).length;
    const simpleCount = simpleWords.filter(word => recentContent.includes(word)).length;
    
    if (detailedCount > simpleCount) return 'detailed';
    if (simpleCount > detailedCount) return 'simple';
    return 'balanced';
  }, [messages]);

  /**
   * Analyze user's decision-making style
   */
  const analyzeDecisionStyle = useCallback((): string => {
    if (messages.length === 0) return 'collaborative';
    
    const recentContent = messages.slice(-5).map(m => m.content.toLowerCase()).join(' ');
    const analyticalWords = ['compare', 'options', 'pros', 'cons', 'analysis', 'consider'];
    const decisiveWords = ['decide', 'choose', 'pick', 'go with', 'recommend'];
    
    const analyticalCount = analyticalWords.filter(word => recentContent.includes(word)).length;
    const decisiveCount = decisiveWords.filter(word => recentContent.includes(word)).length;
    
    if (analyticalCount > decisiveCount) return 'analytical';
    if (decisiveCount > analyticalCount) return 'decisive';
    return 'collaborative';
  }, [messages]);

  /**
   * Analyze conversation theme for better context
   */
  const getConversationTheme = useCallback(() => {
    if (messages.length === 0) return 'general';
    
    const recentMessages = messages.slice(-5).map(m => m.content.toLowerCase()).join(' ');
    
    if (recentMessages.includes('gas') || recentMessages.includes('fuel')) return 'fuel_planning';
    if (recentMessages.includes('restaurant') || recentMessages.includes('food')) return 'dining';
    if (recentMessages.includes('hotel') || recentMessages.includes('stay')) return 'accommodation';
    if (recentMessages.includes('attraction') || recentMessages.includes('museum')) return 'sightseeing';
    if (recentMessages.includes('budget') || recentMessages.includes('cost')) return 'budget_planning';
    
    return 'general';
  }, [messages]);

  /**
   * Build advanced intelligent context for AI
   */
  const buildIntelligentContext = useCallback(() => {
    const now = new Date();
    const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const season = getSeason(now.getMonth());
    
    return {
      // Temporal Context
      timeOfDay,
      currentDate: now.toLocaleDateString(),
      currentTime: now.toLocaleTimeString(),
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
      isWeekend,
      season,
      
      // User Engagement Context
      messageCount: messages.length,
      userExperience: messages.length > 10 ? 'experienced' : messages.length > 5 ? 'intermediate' : 'new',
      conversationTheme: getConversationTheme(),
      conversationDepth: analyzeConversationDepth(),
      
      // Advanced Context
      urgencyLevel: analyzeUrgency(),
      complexityPreference: analyzeComplexityPreference(),
      decisionStyle: analyzeDecisionStyle(),
    };
  }, [messages, getConversationTheme, analyzeConversationDepth, analyzeUrgency, analyzeComplexityPreference, analyzeDecisionStyle]);

  /**
   * Send a simple chat message with streaming
   */
  const sendMessage = useCallback(async (message: string, context?: any) => {
    if (!message.trim() || sendBusyRef.current) return;
    sendBusyRef.current = true;

    // Build intelligent context
    const intelligentContext = {
      ...buildIntelligentContext(),
      ...context,
      conversationHistory: messages.slice(-8).map(m => ({
        role: m.role,
        content: m.content,
      })),
    };

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setIsLoading(true);
    setError(null);
    streamingMessageRef.current = '';

    // Create placeholder for assistant message
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Get AI response using intelligent chat with memory and context
      const response = await geminiService.intelligentChat(message, intelligentContext);
      const responseText = typeof response === 'string' ? response : String(response ?? '');
      const finalText = responseText.trim() || "I couldn't generate a response right now. Please try again.";
      
      // Simulate streaming by breaking response into words
      const words = finalText.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        const partialContent = words.slice(0, i + 1).join(' ');
        streamingMessageRef.current = partialContent;
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantId 
              ? { ...msg, content: partialContent }
              : msg
          )
        );
        
        // Small delay to simulate streaming (adjust for speed)
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to get response from AI${detail ? `: ${detail}` : ''}`);
      console.error('Chat error:', err);
      // Remove the empty assistant message on error
      setMessages(prev => prev.filter(msg => msg.id !== assistantId));
    } finally {
      sendBusyRef.current = false;
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, [buildIntelligentContext]);

  /**
   * Request a trip plan with streaming response
   */
  const requestTripPlan = useCallback(async (request: TripPlanRequest) => {
    if (sendBusyRef.current) return;
    sendBusyRef.current = true;
    // Add user request as message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: formatTripPlanRequest(request),
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setIsLoading(true);
    setError(null);
    streamingMessageRef.current = '';

    try {
      // Create assistant message placeholder
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Stream the response
      for await (const chunk of geminiService.streamTripPlan(request)) {
        streamingMessageRef.current = chunk;
        
        // Update the last message with accumulated content
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.id === assistantMessageId) {
            lastMessage.content = streamingMessageRef.current;
          }
          return newMessages;
        });
      }
    } catch (err) {
      setError('Failed to generate trip plan');
      console.error('Trip plan error:', err);
    } finally {
      sendBusyRef.current = false;
      setIsStreaming(false);
      setIsLoading(false);
      streamingMessageRef.current = '';
    }
  }, []);

  /**
   * Request a trip plan without streaming (faster for simple requests)
   */
  const requestTripPlanQuick = useCallback(async (request: TripPlanRequest) => {
    // Add user request as message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: formatTripPlanRequest(request),
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Get full response at once
      const response = await geminiService.generateTripPlan(request);
      
      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError('Failed to generate trip plan');
      console.error('Trip plan error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear chat history
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * Enable or disable AI memorization
   */
  const toggleMemorization = useCallback((enabled: boolean) => {
    setMemorizationEnabled(enabled);
    geminiService.setMemorizationEnabled(enabled);
  }, []);

  /**
   * Clear AI memory and preferences
   */
  const clearAIMemory = useCallback(() => {
    geminiService.clearMemory();
  }, []);

  /**
   * Test API connection
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      return await geminiService.testConnection();
    } catch (err) {
      console.error('Connection test failed:', err);
      return false;
    }
  }, []);

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    memorizationEnabled,
    sendMessage,
    requestTripPlan,
    requestTripPlanQuick,
    clearChat,
    toggleMemorization,
    clearAIMemory,
    testConnection,
  };
}

/**
 * Format trip plan request as user-friendly message
 */
function formatTripPlanRequest(request: TripPlanRequest): string {
  const { currentLocation, destination, constraints } = request;
  
  let message = `Plan a trip from ${currentLocation.city} to ${destination.city}`;
  
  if (constraints) {
    const details: string[] = [];
    
    if (constraints.fuelRange !== undefined) {
      details.push(`${constraints.fuelRange} miles of fuel left`);
    }
    
    if (constraints.budget) {
      details.push(`${constraints.budget} budget`);
    }
    
    if (constraints.travelStyle) {
      details.push(`${constraints.travelStyle} route`);
    }
    
    if (constraints.interests && constraints.interests.length > 0) {
      details.push(`interested in: ${constraints.interests.join(', ')}`);
    }
    
    if (details.length > 0) {
      message += ` (${details.join(', ')})`;
    }
  }
  
  return message;
}

export default useGemini;