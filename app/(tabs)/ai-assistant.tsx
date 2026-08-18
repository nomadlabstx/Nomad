import { memo, useCallback, useState } from 'react';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AIChat from '../../components/ai-chat';
import { useAppTint } from '../../components/color-context';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { TripPlanRequest } from '../../services/gemini-ai';
import { getOnAccentColor, useSelectedBackgroundColor } from '../../utils/theme-helpers';

const AIAssistantTab = memo(() => {
  const params = useLocalSearchParams<{ mode?: string }>();
  const router = useRouter();
  const { tint } = useAppTint();
  const theme = useThemeColors();
  const selectedBgColor = useSelectedBackgroundColor(tint);
  const [showChat, setShowChat] = useState(false);
  const [initialRequest, setInitialRequest] = useState<any>(null);

  useEffect(() => {
    if (params.mode === 'planner') {
      setInitialRequest({ type: 'planner' });
      setShowChat(true);
      router.replace('/(tabs)/ai-assistant');
    }
  }, [params.mode, router]);

  const handleQuickPlan = useCallback((type: 'weekend' | 'day-trip' | 'scenic' | 'custom') => {
    let request: TripPlanRequest | null = null;
    
    switch (type) {
      case 'weekend':
        // Instead of generating a trip plan, start a conversation
        setInitialRequest({ 
          type: 'chat', 
          data: 'I want to plan a weekend trip! Can you suggest some great destinations within 3-4 hours drive from my current location? I\'m interested in nature, good food, and local culture. What would you recommend?' 
        });
        setShowChat(true);
        return;
      
      case 'day-trip':
        setInitialRequest({ 
          type: 'chat', 
          data: 'I\'m looking for a fun day trip within 2 hours of where I am. What are some interesting places I could visit today? I\'m on a budget and want to make the most of my time.' 
        });
        setShowChat(true);
        return;
      
      case 'scenic':
        setInitialRequest({ 
          type: 'chat', 
          data: 'I want to take a scenic drive this weekend. Can you suggest some beautiful routes or destinations that would be great for photography and enjoying nature? I\'m flexible on distance.' 
        });
        setShowChat(true);
        return;
      
      case 'custom':
        // Just open chat with no initial message
        setInitialRequest(null);
        setShowChat(true);
        return;
    }
    
    if (request) {
      setInitialRequest({ type: 'trip-plan', data: request });
      setShowChat(true);
    } else {
      // For custom, just open chat
      setInitialRequest(null);
      setShowChat(true);
    }
  }, []);

  const handleCloseChat = useCallback(() => {
    setShowChat(false);
    setInitialRequest(null);
  }, []);

  if (showChat) {
    return <AIChat onClose={handleCloseChat} initialRequest={initialRequest} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
         {/* Header */}
         <View style={styles.header}>
           <Text style={[styles.title, { color: theme.text }]}>🧭 Pathfinder</Text>
           <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Your AI-powered travel companion</Text>
         </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Trip Planning</Text>
          
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => handleQuickPlan('weekend')}
          >
            <Text style={styles.actionEmoji}>🏖️</Text>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Plan a Weekend Trip</Text>
              <Text style={[styles.actionDescription, { color: theme.secondaryText }]}>
                Get AI-powered suggestions for a perfect weekend getaway
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => handleQuickPlan('day-trip')}
          >
            <Text style={styles.actionEmoji}>⏱️</Text>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Quick Day Trip</Text>
              <Text style={[styles.actionDescription, { color: theme.secondaryText }]}>
                Find nearby destinations for a fun day adventure
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => handleQuickPlan('scenic')}
          >
            <Text style={styles.actionEmoji}>🌄</Text>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Scenic Route</Text>
              <Text style={[styles.actionDescription, { color: theme.secondaryText }]}>
                Discover beautiful routes and hidden gems
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { borderColor: selectedBgColor, backgroundColor: selectedBgColor }]}
            onPress={() => handleQuickPlan('custom')}
          >
            <Text style={styles.actionEmoji}>💬</Text>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: getOnAccentColor(selectedBgColor) }]}>Custom Request</Text>
              <Text style={[styles.actionDescription, { color: getOnAccentColor(selectedBgColor), opacity: 0.9 }]}>
                Ask me anything! I&apos;m here to help with your travel plans
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Examples */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Example Requests</Text>
          
          <TouchableOpacity 
            style={[styles.exampleCard, { backgroundColor: theme.cardBackground, borderLeftColor: selectedBgColor }]}
            onPress={() => {
              setInitialRequest({ 
                type: 'chat', 
                data: 'I want to go to Dallas. Find me cheap gas along the way - I have 45 miles of range left.' 
              });
              setShowChat(true);
            }}
          >
            <Text style={[styles.exampleText, { color: theme.text }]}>
              &quot;I want to go to Dallas. Find me cheap gas along the way - I have 45 miles of range left.&quot;
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.exampleCard, { backgroundColor: theme.cardBackground, borderLeftColor: selectedBgColor }]}
            onPress={() => {
              setInitialRequest({ 
                type: 'chat', 
                data: 'Plan a weekend trip to Austin with great food and live music.' 
              });
              setShowChat(true);
            }}
          >
            <Text style={[styles.exampleText, { color: theme.text }]}>
              &quot;Plan a weekend trip to Austin with great food and live music.&quot;
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.exampleCard, { backgroundColor: theme.cardBackground, borderLeftColor: selectedBgColor }]}
            onPress={() => {
              setInitialRequest({ 
                type: 'chat', 
                data: 'What are some hidden gems between Houston and San Antonio?' 
              });
              setShowChat(true);
            }}
          >
            <Text style={[styles.exampleText, { color: theme.text }]}>
              &quot;What are some hidden gems between Houston and San Antonio?&quot;
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.exampleCard, { backgroundColor: theme.cardBackground, borderLeftColor: selectedBgColor }]}
            onPress={() => {
              setInitialRequest({ 
                type: 'chat', 
                data: 'Where should I stop for lunch on my way to Fredericksburg?' 
              });
              setShowChat(true);
            }}
          >
            <Text style={[styles.exampleText, { color: theme.text }]}>
              &quot;Where should I stop for lunch on my way to Fredericksburg?&quot;
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>What Pathfinder Can Do</Text>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>🗺️</Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Plan complete trip itineraries</Text>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>⛽</Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Find gas stations and estimate costs</Text>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>🍽️</Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Recommend restaurants and attractions</Text>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>💰</Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Estimate trip budgets</Text>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>🎯</Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Personalize suggestions to your preferences</Text>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>🚗</Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Optimize routes and suggest stops</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

AIAssistantTab.displayName = 'AIAssistantTab';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  actionEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
  },
  exampleCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  exampleText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureEmoji: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
});

export default AIAssistantTab;

