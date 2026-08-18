import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { aiPlannerContextService, type PendingAITripPlan } from '../services/ai-planner-context';
import { bookingContextManager } from '../services/booking-context';
import { plannedTripsService } from '../services/planned-trips';
import { navigationService } from '../services/navigation';
import { userPreferencesService } from '../services/user-preferences';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatMessage, useGemini } from '../hooks/use-gemini';
import { useNavigation } from '../hooks/use-navigation';
import { reverseGeocodingService } from '../services/reverse-geocoding';
import { AITripPlanner } from './ai-trip-planner';
import { useAppTint } from './color-context';
import { useThemeColors } from '../hooks/use-theme-colors';
import { BookingOptionsCard } from './booking-options-card';
import { getAccentFill, getOnAccentColor } from '../utils/theme-helpers';
import { parsePlanTextToStops, type ParsedTripPlanResult } from '../utils/parse-trip-plan';

// Quick prompt suggestions
const QUICK_PROMPTS = [
  "Find gas near me",
  "Find food nearby",
  "What's the weather?",
  "Plan a weekend trip",
  "Find rest stops",
  "Best route to...",
  "Things to do here",
];

interface AIChatProps {
  onClose: () => void;
  initialRequest?: {
    type: 'trip-plan' | 'quick-question' | 'chat' | 'planner';
    data?: any;
  };
}

const AIChat = memo<AIChatProps>(({ onClose, initialRequest }) => {
  const router = useRouter();
  const { tint } = useAppTint();
  const theme = useThemeColors();
  const accentFill = useMemo(() => getAccentFill(tint, theme.isDarkMode), [tint, theme.isDarkMode]);
  const onAccent = useMemo(() => getOnAccentColor(accentFill), [accentFill]);
  const navigation = useNavigation();
  const { 
    messages, 
    isLoading, 
    isStreaming, 
    error, 
    memorizationEnabled,
    sendMessage, 
    requestTripPlan, 
    clearChat,
    toggleMemorization,
    clearAIMemory
  } = useGemini();
  const [inputText, setInputText] = useState('');
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showTripPlanner, setShowTripPlanner] = useState(false);
  const [currentCity, setCurrentCity] = useState<string>('');
  const [currentState, setCurrentState] = useState<string>('');
  const [bookingContext, setBookingContext] = useState<any>(null);
  const [mappedPlan, setMappedPlan] = useState<ParsedTripPlanResult | null>(null);
  const [isMappingPlan, setIsMappingPlan] = useState(false);
  const [planActionError, setPlanActionError] = useState<string | null>(null);
  const [planSaved, setPlanSaved] = useState(false);
  const [foodAndInterests, setFoodAndInterests] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);
  const handledInitialRequestRef = useRef(false);

  // Detect current location on mount
  useEffect(() => {
    const detectLocation = async () => {
      if (navigation.currentLocation) {
        try {
          const locationInfo = await reverseGeocodingService.getLocationInfo(navigation.currentLocation);
          setCurrentCity(locationInfo.city);
          setCurrentState(locationInfo.stateCode);
        } catch (error) {
          console.error('[AIChat] Error detecting location:', error);
        }
      }
    };
    detectLocation();
  }, [navigation.currentLocation]);

  useEffect(() => {
    let cancelled = false;
    userPreferencesService.getPreferences().then((prefs) => {
      if (cancelled) return;
      const bits = [
        ...prefs.food.cuisines,
        ...prefs.food.dietaryRestrictions,
        ...prefs.activities.interests,
      ].filter(Boolean);
      setFoodAndInterests(bits.slice(0, 8).join(', '));
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const context = bookingContextManager.getContext();
      if (context && context.options && context.options.length > 0) {
        setBookingContext(context);
      } else {
        setBookingContext(null);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [messages, isLoading]);

  const locationContext = useCallback(() => {
    const ctx: { currentLocation?: string; foodAndInterests?: string } = {};
    if (currentCity && currentState) {
      ctx.currentLocation = `${currentCity}, ${currentState}`;
    } else if (currentCity) {
      ctx.currentLocation = currentCity;
    }
    if (foodAndInterests) {
      ctx.foodAndInterests = foodAndInterests;
    }
    return Object.keys(ctx).length ? ctx : undefined;
  }, [currentCity, currentState, foodAndInterests]);

  // Handle initial request (e.g., from quick action button)
  useEffect(() => {
    if (!initialRequest || handledInitialRequestRef.current) return;

    handledInitialRequestRef.current = true;

    if (initialRequest.type === 'planner') {
      setShowTripPlanner(true);
      return;
    }

    if (messages.length > 0) return;

    if (initialRequest.type === 'chat' && initialRequest.data) {
      sendMessage(initialRequest.data, locationContext());
    } else if (initialRequest.type === 'trip-plan' && initialRequest.data) {
      requestTripPlan(initialRequest.data);
    }
  }, [initialRequest, messages.length, requestTripPlan, sendMessage, locationContext]);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || isLoading || isStreaming) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(inputText, locationContext());
    setInputText('');
  }, [inputText, isLoading, isStreaming, sendMessage, locationContext]);

  const lastAssistantMessage = useMemo(
    () => [...messages].reverse().find((msg) => msg.role === 'assistant' && msg.content.trim().length > 0) ?? null,
    [messages]
  );

  const showPlanActions = Boolean(lastAssistantMessage) && !isStreaming;

  const handleGeneratePlan = useCallback(async () => {
    if (!lastAssistantMessage || isMappingPlan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsMappingPlan(true);
    setPlanActionError(null);
    setPlanSaved(false);
    try {
      const plan = await parsePlanTextToStops(
        lastAssistantMessage.content,
        currentCity || undefined,
        currentState || undefined
      );
      setMappedPlan(plan);
    } catch (err) {
      setMappedPlan(null);
      setPlanActionError(err instanceof Error ? err.message : 'Could not map that plan.');
    } finally {
      setIsMappingPlan(false);
    }
  }, [lastAssistantMessage, isMappingPlan, currentCity, currentState]);

  const handleNavigatePlan = useCallback(() => {
    if (!mappedPlan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pendingPlan: PendingAITripPlan = {
      stops: mappedPlan.stops,
      finalDestination: mappedPlan.finalDestination,
      routeOptions: mappedPlan.routeOptions,
      summary: mappedPlan.summary,
    };
    aiPlannerContextService.setPendingPlan(pendingPlan);
    onClose();
    router.push('/(tabs)/recorder?applyAIPlan=true');
  }, [mappedPlan, onClose, router]);

  const handleSavePlan = useCallback(async () => {
    if (!mappedPlan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const originLocation = navigation.currentLocation;
      if (!originLocation) {
        setPlanActionError('Current location is needed to save this trip.');
        return;
      }
      let estimatedDistance = 0;
      let estimatedDuration = 'TBD';
      try {
        const waypoints = mappedPlan.stops.map((stop) => stop.location);
        const routes = await navigationService.calculateRoute(
          originLocation,
          mappedPlan.finalDestination.location,
          {
            ...mappedPlan.routeOptions,
            waypoints: waypoints.length > 0 ? waypoints : undefined,
          }
        );
        if (routes?.[0]) {
          estimatedDistance = routes[0].totalDistance || 0;
          const totalSeconds = routes[0].totalDuration || 0;
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          estimatedDuration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
      } catch {
        // Keep TBD estimates if routing fails
      }

      const destinationName = mappedPlan.finalDestination.name || 'Trip';
      const now = new Date();
      const title = `${/weekend/i.test(mappedPlan.summary) ? 'Weekend Trip to' : 'Trip to'} ${destinationName}, ${now.getMonth() + 1}/${now.getDate()}`;

      await plannedTripsService.addTrip({
        title,
        origin: {
          name: currentCity ? `${currentCity}, ${currentState}` : 'Current Location',
          location: originLocation,
        },
        destination: {
          name: mappedPlan.finalDestination.name,
          location: mappedPlan.finalDestination.location,
        },
        stops: mappedPlan.stops,
        aiSummary: mappedPlan.summary,
        estimatedDuration,
        estimatedDistance,
        routeOptions: mappedPlan.routeOptions,
      });
      setPlanSaved(true);
      Alert.alert('Trip saved', 'Your plan is in Planned Trips.');
    } catch (err) {
      setPlanActionError(err instanceof Error ? err.message : 'Could not save that trip.');
    }
  }, [mappedPlan, navigation.currentLocation, currentCity, currentState]);

  const handleQuickPrompt = useCallback((prompt: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText(prompt);
  }, []);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    
    // Parse and format the message content
    const formatMessage = (text: string) => {
      // Split by double newlines first, then process each section
      const sections = text.split('\n\n');
      const formattedElements: React.ReactElement[] = [];
      let keyIndex = 0;

      sections.forEach((section) => {
        const lines = section.split('\n');
        
        lines.forEach((line) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;

          // Main headers (## Header) - but not numbered lists
          if (trimmedLine.startsWith('## ') && !/^### \d+\./.test(trimmedLine)) {
            formattedElements.push(
              <Text key={keyIndex++} style={[styles.mainHeader, { color: theme.text }]}>
                {trimmedLine.replace(/^## /, '')}
              </Text>
            );
          }
          // Sub headers (**Header**) - but only if they don't contain other content
          else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && !trimmedLine.includes('**', 2)) {
            formattedElements.push(
              <Text key={keyIndex++} style={[styles.subHeader, { color: theme.text }]}>
                {trimmedLine.replace(/\*\*/g, '')}
              </Text>
            );
          }
          // Bullet points (• or - or * followed by space and content)
          else if ((trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) || 
                   (trimmedLine.startsWith('*') && trimmedLine[1] === ' ' && !trimmedLine.endsWith('*'))) {
            // Handle nested bold text within bullets
            const bulletText = trimmedLine.substring(1).trim();
            const boldParts = bulletText.split('**');
            
            formattedElements.push(
              <View key={keyIndex++} style={styles.bulletContainer}>
                <Text style={[styles.bulletPoint, { color: theme.secondaryText }]}>•</Text>
                <Text style={[styles.bulletText, { color: theme.text }]}>
                  {boldParts.map((part, partIndex) => {
                    if (partIndex % 2 === 1) {
                      // Odd indices are bold text
                      return <Text key={partIndex} style={[styles.boldText, { color: theme.text }]}>{part}</Text>;
                    } else {
                      // Even indices are regular text
                      return part;
                    }
                  })}
                </Text>
              </View>
            );
          }
          // Numbered headers (### 1. Header)
          else if (/^### \d+\./.test(trimmedLine)) {
            const match = trimmedLine.match(/^### (\d+)\.\s*(.*)/);
            if (match) {
              formattedElements.push(
                <View key={keyIndex++} style={styles.numberedHeaderContainer}>
                  <Text style={[styles.numberedHeaderPoint, { color: theme.text }]}>{match[1]}.</Text>
                  <Text style={[styles.numberedHeaderText, { color: theme.text }]}>{match[2]}</Text>
                </View>
              );
            }
          }
          // Numbered lists (1. 2. etc.)
          else if (/^\d+\./.test(trimmedLine)) {
            const parts = trimmedLine.match(/^(\d+)\.\s*(.*)/);
            if (parts) {
              const numberedText = parts[2];
              const boldParts = numberedText.split('**');
              
              formattedElements.push(
                <View key={keyIndex++} style={styles.numberedContainer}>
                  <Text style={[styles.numberedPoint, { color: theme.text }]}>{parts[1]}.</Text>
                  <Text style={[styles.numberedText, { color: theme.text }]}>
                    {boldParts.map((part, partIndex) => {
                      if (partIndex % 2 === 1) {
                        // Odd indices are bold text
                        return <Text key={partIndex} style={[styles.boldText, { color: theme.text }]}>{part}</Text>;
                      } else {
                        // Even indices are regular text
                        return part;
                      }
                    })}
                  </Text>
                </View>
              );
            }
          }
          // Italic text (*text*) - but not if it contains **bold** text or is a bullet point
          else if (trimmedLine.startsWith('*') && trimmedLine.endsWith('*') && trimmedLine.length > 2 && 
                   !trimmedLine.includes('**') && trimmedLine[1] !== ' ') {
            formattedElements.push(
              <Text key={keyIndex++} style={[styles.italicText, { color: theme.secondaryText }]}>
                {trimmedLine.replace(/\*/g, '')}
              </Text>
            );
          }
          // Regular paragraphs
          else {
            // Handle mixed formatting (bold and italic)
            let processedText = trimmedLine;
            
            // Check if this line has any markdown formatting
            const hasBold = processedText.includes('**');
            const hasItalic = processedText.includes('*') && !hasBold;
            
            formattedElements.push(
              <Text key={keyIndex++} style={[styles.paragraphText, { color: theme.text }]}>
                {hasBold ? (
                  // Handle bold text
                  processedText.split('**').map((part, partIndex) => {
                    if (partIndex % 2 === 1) {
                      return <Text key={partIndex} style={[styles.boldText, { color: theme.text }]}>{part}</Text>;
                    } else {
                      return part;
                    }
                  })
                ) : hasItalic ? (
                  // Handle italic text (only if no bold and not a simple bullet)
                  processedText.split('*').map((part, partIndex) => {
                    if (partIndex % 2 === 1) {
                      return <Text key={partIndex} style={[styles.italicText, { color: theme.secondaryText }]}>{part}</Text>;
                    } else {
                      return part;
                    }
                  })
                ) : (
                  // Plain text
                  processedText
                )}
              </Text>
            );
          }
        });
        
        // Add spacing between sections
        if (sections.indexOf(section) < sections.length - 1) {
          formattedElements.push(<View key={keyIndex++} style={styles.sectionSpacing} />);
        }
      });

      return formattedElements;
    };
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.assistantMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? { backgroundColor: accentFill } : [styles.assistantBubble, { backgroundColor: theme.cardBackground, borderColor: theme.border }]
        ]}>
          {isUser ? (
            <Text style={[styles.messageText, { color: onAccent }]}>
              {item.content}
            </Text>
          ) : (
            <View style={styles.assistantContent}>
              {formatMessage(item.content)}
              {/* Show booking options if this is the last message and we have booking context */}
              {item.id === messages[messages.length - 1]?.id && bookingContext && bookingContext.options && bookingContext.options.length > 0 && (
                <BookingOptionsCard 
                  options={bookingContext.options}
                  onOptionSelect={(option) => {
                    // Option selected - could track this or update context
                    if (__DEV__) {
                      console.debug('[AIChat] Booking option selected:', option);
                    }
                  }}
                />
              )}
            </View>
          )}
        </View>
        <Text style={[styles.timestamp, { color: theme.secondaryText }]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }, [accentFill, onAccent, theme, bookingContext, messages]);

   const renderEmptyState = useCallback(() => (
     <View style={styles.emptyState}>
       <Text style={[styles.emptyTitle, { color: theme.text }]}>🧭 Pathfinder</Text>
       <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
         Your AI travel companion
       </Text>
       <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
         Try: &quot;Plan a weekend trip to Dallas&quot;
       </Text>
       <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
         Or: &quot;Find cheap gas near me&quot;
       </Text>
     </View>
   ), [theme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.keyboardView, { backgroundColor: theme.background }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
         {/* Header */}
         <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.cardBackground }]}>
           <Text style={[styles.headerTitle, { color: theme.text }]}>Pathfinder</Text>
           <TouchableOpacity 
             onPress={() => setShowPrivacySettings(!showPrivacySettings)} 
             style={styles.headerButton}
           >
             <Text style={[styles.headerButtonText, { color: accentFill }]}>🔒</Text>
           </TouchableOpacity>
           <TouchableOpacity onPress={() => {
             clearChat();
             setMappedPlan(null);
             setPlanActionError(null);
             setPlanSaved(false);
           }} style={styles.headerButton}>
             <Text style={[styles.headerButtonText, { color: accentFill }]}>Clear</Text>
           </TouchableOpacity>
           <TouchableOpacity onPress={onClose} style={styles.headerButton}>
             <Text style={[styles.headerButtonText, { color: accentFill }]}>Done</Text>
           </TouchableOpacity>
         </View>

         {/* Privacy Settings Panel */}
         {showPrivacySettings && (
           <View style={[styles.privacyPanel, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
             <Text style={[styles.privacyTitle, { color: theme.text }]}>🔒 Privacy Settings</Text>
             
             <View style={styles.privacyOption}>
               <Text style={[styles.privacyLabel, { color: theme.text }]}>
                 AI Memory & Learning
               </Text>
               <Text style={[styles.privacyDescription, { color: theme.secondaryText }]}>
                 Allow Pathfinder to remember your preferences and learn from conversations for better recommendations
               </Text>
               <TouchableOpacity
                 onPress={() => toggleMemorization(!memorizationEnabled)}
                 style={[styles.toggleButton, { 
                   backgroundColor: memorizationEnabled ? accentFill : theme.border 
                 }]}
               >
                 <Text style={[styles.toggleText, { 
                   color: memorizationEnabled ? onAccent : theme.secondaryText 
                 }]}>
                   {memorizationEnabled ? 'ON' : 'OFF'}
                 </Text>
               </TouchableOpacity>
             </View>

             {memorizationEnabled && (
               <TouchableOpacity
                 onPress={() => {
                   clearAIMemory();
                   setShowPrivacySettings(false);
                 }}
                 style={[styles.clearMemoryButton, { borderColor: accentFill }]}
               >
                 <Text style={[styles.clearMemoryText, { color: theme.text }]}>
                   Clear AI Memory
                 </Text>
               </TouchableOpacity>
             )}

             <Text style={[styles.privacyNote, { color: theme.secondaryText }]}>
               💡 Your conversations are processed locally and never shared. Memory is stored only on your device.
             </Text>
           </View>
         )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={isStreaming ? () => (
            <View style={styles.typingIndicator}>
              <View style={[styles.typingDot, { backgroundColor: accentFill }]} />
              <View style={[styles.typingDot, { backgroundColor: accentFill }]} />
              <View style={[styles.typingDot, { backgroundColor: accentFill }]} />
            </View>
          ) : null}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          getItemLayout={undefined}
        />

        {/* Loading indicator */}
        {(isLoading || isStreaming) && (
          <View style={[styles.loadingContainer, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
            <ActivityIndicator color={accentFill} />
            <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
              {isStreaming ? 'Generating response...' : 'Thinking...'}
            </Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
            <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          </View>
        )}

        {/* Plan actions — live in chat, not a hidden form */}
        {showPlanActions && (
          <View style={[styles.planActions, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
            <TouchableOpacity
              onPress={handleGeneratePlan}
              disabled={isMappingPlan}
              style={[styles.planActionButton, { backgroundColor: accentFill }]}
              accessibilityRole="button"
              accessibilityLabel="Generate plan from this conversation"
            >
              {isMappingPlan ? (
                <ActivityIndicator color={onAccent} size="small" />
              ) : (
                <Ionicons name="map" size={16} color={onAccent} />
              )}
              <Text style={[styles.planActionText, { color: onAccent }]}>
                {mappedPlan ? 'Remap plan' : 'Generate plan'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNavigatePlan}
              disabled={!mappedPlan}
              style={[
                styles.planActionButton,
                { backgroundColor: mappedPlan ? accentFill : theme.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Navigate this plan"
            >
              <Ionicons name="navigate" size={16} color={mappedPlan ? onAccent : theme.secondaryText} />
              <Text style={[styles.planActionText, { color: mappedPlan ? onAccent : theme.secondaryText }]}>
                Navigate
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSavePlan}
              disabled={!mappedPlan}
              style={[
                styles.planActionButton,
                { backgroundColor: mappedPlan ? accentFill : theme.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save this plan"
            >
              <Ionicons name="save" size={16} color={mappedPlan ? onAccent : theme.secondaryText} />
              <Text style={[styles.planActionText, { color: mappedPlan ? onAccent : theme.secondaryText }]}>
                {planSaved ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {planActionError ? (
          <Text style={[styles.planActionError, { color: theme.error }]}>{planActionError}</Text>
        ) : mappedPlan ? (
          <Text style={[styles.planActionHint, { color: theme.secondaryText }]}>
            Mapped {mappedPlan.stops.length + 1} stop{mappedPlan.stops.length === 0 ? '' : 's'} to {mappedPlan.finalDestination.name}
          </Text>
        ) : null}

        {/* Quick Prompts Bar */}
        <ScrollView 
          horizontal
          style={[styles.quickPromptsContainer, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPromptsContent}
        >
          {QUICK_PROMPTS.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.promptChip, { backgroundColor: accentFill, borderColor: accentFill }]}
              onPress={() => handleQuickPrompt(prompt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.promptChipText, { color: onAccent }]}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything..."
            placeholderTextColor={theme.secondaryText}
            multiline
            maxLength={500}
            editable={!isLoading && !isStreaming}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity 
            onPress={handleSend}
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() && !isLoading && !isStreaming ? accentFill : theme.border }
            ]}
            disabled={!inputText.trim() || isLoading || isStreaming}
          >
            <Text style={[styles.sendButtonText, { color: inputText.trim() && !isLoading && !isStreaming ? onAccent : theme.secondaryText }]}>Send</Text>
          </TouchableOpacity>
        </View>

        {/* AI Trip Planner Modal */}
        <AITripPlanner
          visible={showTripPlanner}
          onClose={() => setShowTripPlanner(false)}
          currentLocation={navigation.currentLocation}
          currentCity={currentCity || 'Unknown'}
          currentState={currentState || 'Unknown'}
          onPlanGenerated={(plan) => {
            const pendingPlan: PendingAITripPlan = {
              stops: plan.stops,
              finalDestination: plan.finalDestination,
              routeOptions: plan.routeOptions,
              summary: plan.summary,
            };
            aiPlannerContextService.setPendingPlan(pendingPlan);
            setShowTripPlanner(false);
            onClose();
            router.push('/(tabs)/recorder?applyAIPlan=true');
          }}
          onTripSaved={(trip) => {
            // Handle trip saved
            if (__DEV__) {
              console.debug('Trip saved:', trip);
            }
            setShowTripPlanner(false);
          }}
          tintColor={tint}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

AIChat.displayName = 'AIChat';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 32,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginVertical: 4,
  },
  messageContainer: {
    marginVertical: 8,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#000',
  },
  assistantContent: {
    gap: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  paragraphText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000',
    marginBottom: 4,
  },
  listItemText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#000',
    marginLeft: 8,
    marginBottom: 2,
  },
  privacyPanel: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginBottom: 8,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  privacyOption: {
    marginBottom: 16,
  },
  privacyLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  privacyDescription: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    lineHeight: 16,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearMemoryButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  clearMemoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  privacyNote: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    lineHeight: 14,
  },
  mainHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  subHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 3,
  },
  bulletContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 16,
    marginRight: 8,
    color: '#888',
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: '#000',
  },
  boldText: {
    fontWeight: '600',
    color: '#000',
  },
  numberedContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
  },
  numberedPoint: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
    lineHeight: 20,
    minWidth: 20,
  },
  numberedText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: '#000',
  },
  italicText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#888',
    marginBottom: 4,
    lineHeight: 18,
  },
  sectionSpacing: {
    height: 8,
  },
  numberedHeaderContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    marginTop: 4,
    paddingLeft: 4,
  },
  numberedHeaderPoint: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
    lineHeight: 24,
  },
  numberedHeaderText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#888',
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffe0e0',
    borderTopWidth: 1,
    borderTopColor: '#ff6b6b',
  },
  errorText: {
    fontSize: 14,
    color: '#d63031',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  quickPromptsContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 56,
    maxHeight: 56,
  },
  quickPromptsContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  promptChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  promptChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  planActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  planActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  planActionText: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
  },
  planActionError: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  planActionHint: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
});

export default AIChat;

