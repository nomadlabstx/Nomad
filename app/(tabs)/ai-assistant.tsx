import { memo, useCallback, useState } from 'react';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AIChat from '../../components/ai-chat';
import { useAppTint } from '../../components/color-context';
import { useThemeColors } from '../../hooks/use-theme-colors';
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

  const handleQuickPlan = useCallback((type: 'destination' | 'stay-on' | 'challenge' | 'custom') => {
    switch (type) {
      case 'destination':
        setInitialRequest({
          type: 'chat',
          data: 'I want suggestions for places to go. Plan a weekend in Austin with specific restaurants, attractions, and things to do — not just stops along a highway. Ask if I have a different city in mind.',
        });
        setShowChat(true);
        return;
      case 'stay-on':
        setInitialRequest({
          type: 'chat',
          data: 'I want to stay on a specific highway for this drive. Help me keep the route on that road even if a shortcut is faster. Ask which highway if I have not named one yet.',
        });
        setShowChat(true);
        return;
      case 'challenge':
        setInitialRequest({
          type: 'chat',
          data: 'Challenge me to finish unfinished highway miles. Suggest a stretch, exits, or a county dip that would be new for a roadtripper who collects highways.',
        });
        setShowChat(true);
        return;
      case 'custom':
        setInitialRequest(null);
        setShowChat(true);
        return;
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
           <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
             Plan a destination, then keep the drive on the road you want
           </Text>
         </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>What do you need?</Text>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => handleQuickPlan('destination')}
          >
            <Text style={styles.actionEmoji}>📍</Text>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Plan a destination</Text>
              <Text style={[styles.actionDescription, { color: theme.secondaryText }]}>
                City weekends, day trips, food, and places to go — not just stops along a highway
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => handleQuickPlan('stay-on')}
          >
            <Text style={styles.actionEmoji}>🛣️</Text>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Stay on this highway</Text>
              <Text style={[styles.actionDescription, { color: theme.secondaryText }]}>
                Keep the route on I-95, US-281, or whatever road you are completing
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => handleQuickPlan('challenge')}
          >
            <Text style={styles.actionEmoji}>🏁</Text>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Challenge new miles</Text>
              <Text style={[styles.actionDescription, { color: theme.secondaryText }]}>
                Unfinished highway, exit, or county dips instead of the shortest path
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
                Ask for a city plan, a place to go, or a highway to stay on
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
                data: 'Plan a weekend trip to Austin with great food and live music. Give me specific restaurants and places to go, not just things along the drive.' 
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
                data: 'What should I do in Austin today? Suggest named restaurants, attractions, and neighborhoods.' 
              });
              setShowChat(true);
            }}
          >
            <Text style={[styles.exampleText, { color: theme.text }]}>
              &quot;What should I do in Austin today? Suggest named restaurants and places.&quot;
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.exampleCard, { backgroundColor: theme.cardBackground, borderLeftColor: selectedBgColor }]}
            onPress={() => {
              setInitialRequest({ 
                type: 'chat', 
                data: 'Stay on I-95 from Washington, DC to Boston. Do not dump me onto I-495 even if it is faster.' 
              });
              setShowChat(true);
            }}
          >
            <Text style={[styles.exampleText, { color: theme.text }]}>
              &quot;Stay on I-95 from Washington, DC to Boston. Do not dump me onto I-495 even if it is faster.&quot;
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.exampleCard, { backgroundColor: theme.cardBackground, borderLeftColor: selectedBgColor }]}
            onPress={() => {
              setInitialRequest({ 
                type: 'chat', 
                data: 'Challenge me to finish a stretch of highway I have not completed. I am driving in Texas.' 
              });
              setShowChat(true);
            }}
          >
            <Text style={[styles.exampleText, { color: theme.text }]}>
              &quot;Challenge me to finish a stretch of highway I have not completed. I am driving in Texas.&quot;
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>What Pathfinder Can Do</Text>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>🗺️</Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Plan city itineraries and weekends</Text>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>🍽️</Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Suggest named restaurants and places to go</Text>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>🛣️</Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Keep you on a named highway when you ask</Text>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>🏁</Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Challenge unfinished exits and counties</Text>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>📍</Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Find new things on or just off the road</Text>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>🚗</Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Hand the plan and route to GPS</Text>
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

