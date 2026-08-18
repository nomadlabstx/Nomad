/**
 * Data Report Form Component
 * Allows users to report missing counties, cities, or other location data
 */

import { dataReportsService } from '@/services/data-reports';
import type { ReportType } from '@/types/data-reports';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useThemeColors } from '../hooks/use-theme-colors';

interface DataReportFormProps {
  initialState?: string;
  initialStateCode?: string;
  initialCounty?: string;
  initialCity?: string;
  onSubmitted?: () => void;
}

export default function DataReportForm({
  initialState = '',
  initialStateCode = '',
  initialCounty = '',
  initialCity = '',
  onSubmitted,
}: DataReportFormProps) {
  const theme = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<ReportType>('missing_city');
  const [state, setState] = useState(initialState);
  const [stateCode, setStateCode] = useState(initialStateCode);
  const [county, setCounty] = useState(initialCounty);
  const [city, setCity] = useState(initialCity);
  const [description, setDescription] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [suggestedName, setSuggestedName] = useState('');
  const [suggestedLat, setSuggestedLat] = useState('');
  const [suggestedLng, setSuggestedLng] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!state || !stateCode) {
      Alert.alert('Error', 'Please provide state information');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description of what is missing');
      return;
    }

    setLoading(true);

    try {
      const suggestedData: any = {};
      if (suggestedName) suggestedData.name = suggestedName;
      if (suggestedLat && suggestedLng) {
        const lat = parseFloat(suggestedLat);
        const lng = parseFloat(suggestedLng);
        if (!isNaN(lat) && !isNaN(lng)) {
          suggestedData.latitude = lat;
          suggestedData.longitude = lng;
        }
      }

      await dataReportsService.submitReport({
        type,
        state,
        stateCode,
        county: county || undefined,
        city: city || undefined,
        description,
        suggestedData: Object.keys(suggestedData).length > 0 ? suggestedData : undefined,
        userEmail: userEmail || undefined,
      });

      Alert.alert(
        'Report Submitted',
        'Thank you for your report! Our team will review it and add the missing data if verified.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setDescription('');
              setSuggestedName('');
              setSuggestedLat('');
              setSuggestedLng('');
              setUserEmail('');
              onSubmitted?.();
            },
          },
        ]
      );
    } catch (error) {
      console.error('[DataReportForm] Failed to submit:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [type, state, stateCode, county, city, description, suggestedName, suggestedLat, suggestedLng, userEmail, onSubmitted]);

  const reportTypes: { value: ReportType; label: string; icon: string }[] = [
    { value: 'missing_city', label: 'Missing City', icon: 'location' },
    { value: 'missing_county', label: 'Missing County', icon: 'map' },
    { value: 'incorrect_data', label: 'Incorrect Data', icon: 'alert-circle' },
    { value: 'other', label: 'Other', icon: 'help-circle' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>Report Missing Data</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Help us improve our location database by reporting missing counties, cities, or incorrect information.
      </Text>

      {/* Report Type */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>What's Missing?</Text>
        <View style={styles.typeGrid}>
          {reportTypes.map((rt) => (
            <TouchableOpacity
              key={rt.value}
              style={[
                styles.typeButton,
                type === rt.value && { backgroundColor: theme.tint, borderColor: theme.tint },
                { borderColor: theme.border },
              ]}
              onPress={() => setType(rt.value)}
            >
              <Ionicons
                name={rt.icon as any}
                size={20}
                color={type === rt.value ? '#fff' : theme.textSecondary}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  { color: type === rt.value ? '#fff' : theme.textSecondary },
                ]}
              >
                {rt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Location Information */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>Location Information</Text>
        
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>State</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
          value={state}
          onChangeText={setState}
          placeholder="e.g., Texas"
          placeholderTextColor={theme.textSecondary}
        />

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>State Code</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
          value={stateCode}
          onChangeText={setStateCode}
          placeholder="e.g., TX"
          placeholderTextColor={theme.textSecondary}
          maxLength={2}
          autoCapitalize="characters"
        />

        {type === 'missing_city' && (
          <>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>County (if known)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={county}
              onChangeText={setCounty}
              placeholder="e.g., Harris County"
              placeholderTextColor={theme.textSecondary}
            />
          </>
        )}

        {type === 'missing_city' && (
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>City Name (if known)</Text>
        )}
        {type === 'missing_county' && (
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>County Name (if known)</Text>
        )}
        {(type === 'missing_city' || type === 'missing_county') && (
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            value={type === 'missing_city' ? city : county}
            onChangeText={type === 'missing_city' ? setCity : setCounty}
            placeholder={type === 'missing_city' ? 'e.g., Houston' : 'e.g., Harris County'}
            placeholderTextColor={theme.textSecondary}
          />
        )}
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>Description *</Text>
        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Please describe what is missing or incorrect..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Suggested Data (Optional) */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>Additional Information (Optional)</Text>
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Suggested Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
          value={suggestedName}
          onChangeText={setSuggestedName}
          placeholder="If you know the exact name..."
          placeholderTextColor={theme.textSecondary}
        />

        <View style={styles.coordRow}>
          <View style={styles.coordInput}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Latitude</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={suggestedLat}
              onChangeText={setSuggestedLat}
              placeholder="e.g., 29.7604"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.coordInput}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Longitude</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={suggestedLng}
              onChangeText={setSuggestedLng}
              placeholder="e.g., -95.3698"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Your Email (Optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
          value={userEmail}
          onChangeText={setUserEmail}
          placeholder="For follow-up if needed"
          placeholderTextColor={theme.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: theme.tint }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>Submit Report</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    marginBottom: 8,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    gap: 8,
    minWidth: 120,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  coordRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordInput: {
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 32,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

