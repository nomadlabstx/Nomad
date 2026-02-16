/**
 * Explorer Tab - Hierarchical Location Tracking
 * Country > State > County > City > Street + Highways + Landmarks
 * Auto-detects visited locations, no manual check-offs
 */

import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTint } from '../../components/color-context';
import { useExplorer } from '../../hooks/use-explorer';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { useSelectedBackgroundColor } from '../../utils/theme-helpers';
import type {
    ExplorerCity,
    ExplorerCountry,
    ExplorerCounty,
    ExplorerHighway,
    ExplorerLandmark,
    ExplorerState
} from '../../types/explorer';

type ExpandedSections = string[];

const Explorer = React.memo(() => {
  const { explorerData, isTracking, stats, startTracking, stopTracking, clearAll, setVisibilityMode } = useExplorer();
  const { tint } = useAppTint();
  const theme = useThemeColors();
  const selectedBgColor = useSelectedBackgroundColor(tint);
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get current visibility mode from filters
  const visibilityMode = explorerData?.filters?.display?.visibilityMode || 'all';

  /**
   * Auto-start tracking when component mounts
   */
  useEffect(() => {
    startTracking();

    return () => {
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  /**
   * Toggle section expansion
   */
  const toggleSection = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSections((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  }, []);

  /**
   * Get status icon based on visited and completion state
   * ☐ = Not visited
   * ✅ = Complete (green checkmark)
   */
  const getStatusIcon = useCallback((visited: boolean, completionPercent?: number): string => {
    if (!visited) return '☐';
    if (completionPercent !== undefined && completionPercent >= 100) return '✅';
    return '☐'; // Will show progress bar instead
  }, []);

  /**
   * Handle clear all
   */
  const handleClearAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Clear Explorer Data',
      'This will delete all your tracked locations. Are you sure?',
      [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await clearAll();
            setExpandedSections([]);
          },
        },
      ]
    );
  }, [clearAll]);


  /**
   * Format last visited date
   */
  const formatLastVisited = useCallback((timestamp?: number) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }, []);

  /**
   * Get direction icon for highway
   */
  const getDirectionIcon = (direction?: string): string => {
    switch (direction) {
      case 'north': return '⬆️';
      case 'south': return '⬇️';
      case 'east': return '➡️';
      case 'west': return '⬅️';
      default: return '🛣️';
    }
  };

  /**
   * Group directional highways together (e.g., I-35 North + I-35 South)
   */
  const groupDirectionalHighways = (highways: ExplorerHighway[]): {
    baseId: string;
    baseName: string;
    baseNumber: string;
    highways: ExplorerHighway[];
    hasDirections: boolean;
    overallProgress: number;
  }[] => {
    const grouped = new Map<string, ExplorerHighway[]>();
    
    highways.forEach(hw => {
      const baseId = hw.parentHighwayId || hw.id;
      if (!grouped.has(baseId)) {
        grouped.set(baseId, []);
      }
      grouped.get(baseId)!.push(hw);
    });
    
    return Array.from(grouped.entries())
      .map(([baseId, hws]) => {
        if (!hws || hws.length === 0) return null;
        const hasDirections = hws.length > 1 && hws.some(h => h.direction);
        const first = hws[0];
        if (!first) return null;
        const baseName = hasDirections 
          ? first.fullName.replace(/ (North|South|East|West)$/, '')
          : first.fullName;
        
        // Calculate overall progress across all directions
        const totalExits = hws.reduce((sum, h) => sum + h.totalExits, 0);
        const visitedExits = hws.reduce((sum, h) => sum + (h.visitedExits || 0), 0);
        const overallProgress = totalExits > 0 ? (visitedExits / totalExits) * 100 : 0;
        
        return {
          baseId,
          baseName,
          baseNumber: first.number,
          highways: hws.sort((a, b) => {
            // Sort: North/East before South/West
            const order = { north: 0, east: 0, south: 1, west: 1 };
            return (order[a.direction as keyof typeof order] || 0) - (order[b.direction as keyof typeof order] || 0);
          }),
          hasDirections,
          overallProgress,
        };
      })
      .filter((group): group is NonNullable<typeof group> => group !== null);
  };

  /**
   * Render highway item (for non-directional highways)
   */
  const renderHighway = useCallback((highway: ExplorerHighway) => {
    const isExpanded = expandedSections.includes(highway.id);
    const progressPercent = highway.completionPercent || 0;

  return (
      <View key={highway.id} style={styles.itemContainer}>
        <TouchableOpacity
          style={styles.itemHeader}
          onPress={() => toggleSection(highway.id)}
        >
          <View style={styles.itemInfo}>
            <View style={styles.itemTitle}>
              <Text style={styles.checkbox}>
                {getStatusIcon(highway.visited, highway.completionPercent)}
              </Text>
              <Text style={styles.itemName}>{highway.fullName}</Text>
            </View>
            <Text style={styles.itemMeta}>
              Visited {highway.visitCount || 0} times
            </Text>
            {highway.totalExits > 0 && (
              <Text style={styles.progressText}>
                Progress: {highway.visitedExits || 0}/{highway.totalExits} exits ({progressPercent.toFixed(0)}%)
              </Text>
            )}
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.itemDetails}>
            <Text style={styles.detailText}>
              🛣️ Type: {highway.highwayType.replace('-', ' ').toUpperCase()}
            </Text>
            <Text style={styles.detailText}>
              📍 States: {highway.states.join(', ')}
            </Text>
            {highway.firstVisited && (
              <Text style={styles.detailText}>
                🎯 First visited: {new Date(highway.firstVisited).toLocaleDateString()}
              </Text>
            )}
            
            {/* Exits Section */}
            {highway.exits && highway.exits.length > 0 && (
              <View style={styles.exitsSection}>
                <Text style={styles.exitsSectionHeader}>
                  🚦 Exits ({highway.exits.length} discovered)
                </Text>
                {highway.exits.map((exit) => (
                  <View key={exit.id} style={styles.exitItem}>
                    <Text style={styles.checkbox}>
                      {exit.visited ? '✅' : '☐'}
                    </Text>
                    <View style={styles.exitInfo}>
                      <Text style={styles.exitNumber}>
                        Exit {exit.exitNumber} - {exit.description}
                      </Text>
                      {exit.visited && exit.lastVisited && (
                        <Text style={styles.exitMeta}>
                          Last visited: {formatLastVisited(exit.lastVisited)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* No Exits Discovered Yet */}
            {(!highway.exits || highway.exits.length === 0) && highway.totalExits > 0 && (
              <View style={styles.exitsSection}>
                <Text style={styles.exitsSectionHeader}>
                  🚦 Exits (0 / {highway.totalExits})
                </Text>
                <Text style={styles.noExitsText}>
                  No exits discovered yet. Drive this highway to discover exits!
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }, [expandedSections, toggleSection, formatLastVisited, getStatusIcon]);

  /**
   * Render directional highway group (e.g., I-35 with North/South sub-sections)
   */
  const renderDirectionalHighwayGroup = useCallback((group: ReturnType<typeof groupDirectionalHighways>[0]) => {
    const isGroupExpanded = expandedSections.includes(group.baseId);
    const anyVisited = group.highways.some(h => h.visited);
    
    if (!group.hasDirections) {
      // Single highway without directions - render normally
      if (!group.highways || group.highways.length === 0) return null;
      return renderHighway(group.highways[0]);
    }
    
    // Group with directions - render as parent with children
    return (
      <View key={group.baseId} style={styles.itemContainer}>
        <TouchableOpacity
          style={styles.itemHeader}
          onPress={() => toggleSection(group.baseId)}
        >
          <View style={styles.itemInfo}>
            <View style={styles.itemTitle}>
              <Text style={[styles.checkbox, anyVisited && styles.checkboxChecked]}>
                {anyVisited ? '✅' : '☐'}
              </Text>
              <Text style={styles.itemName}>{group.baseName}</Text>
            </View>
            <Text style={styles.itemMeta}>
              {group.overallProgress.toFixed(0)}% overall progress
            </Text>
          </View>
          <Text style={styles.expandIcon}>{isGroupExpanded ? '▼' : '▶'}</Text>
          </TouchableOpacity>

        {isGroupExpanded && (
          <View style={styles.nestedContainer}>
            {group.highways.map(hw => (
              <View key={hw.id} style={styles.directionalHighwayItem}>
                {renderDirectionalHighway(hw)}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }, [expandedSections, toggleSection, renderHighway]); // eslint-disable-line react-hooks/exhaustive-deps


  /**
   * Render individual directional highway (North/South/East/West variant)
   */
  const renderDirectionalHighway = useCallback((highway: ExplorerHighway) => {
    const isExpanded = expandedSections.includes(highway.id);
    const progressPercent = highway.completionPercent || 0;
    const directionIcon = getDirectionIcon(highway.direction);
    const directionLabel = highway.direction ? highway.direction.charAt(0).toUpperCase() + highway.direction.slice(1) : '';
    
    return (
      <View style={styles.directionalHighwayContainer}>
        <TouchableOpacity
          style={styles.directionalHighwayHeader}
          onPress={() => toggleSection(highway.id)}
        >
          <View style={styles.itemInfo}>
            <View style={styles.itemTitle}>
              <Text style={styles.checkbox}>
                {getStatusIcon(highway.visited, highway.completionPercent)}
              </Text>
              <Text style={styles.directionalHighwayName}>
                {directionIcon} {directionLabel}
              </Text>
            </View>
            <Text style={styles.itemMeta}>
              {highway.visitedExits || 0}/{highway.totalExits} exits ({progressPercent.toFixed(0)}%)
            </Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
          </TouchableOpacity>

        {isExpanded && (
          <View style={styles.itemDetails}>
            {highway.visited && highway.firstVisited && (
              <Text style={styles.detailText}>
                🎯 First visited: {new Date(highway.firstVisited).toLocaleDateString()}
              </Text>
            )}
            {highway.visited && highway.lastVisited && (
              <Text style={styles.detailText}>
                📅 Last visited: {formatLastVisited(highway.lastVisited)}
              </Text>
            )}
            
            {/* Exits Section */}
            {highway.exits && highway.exits.length > 0 && (
              <View style={styles.exitsSection}>
                <Text style={styles.exitsSectionHeader}>
                  🚦 Exits ({highway.exits.length} discovered)
                </Text>
                {highway.exits.map((exit) => (
                  <View key={exit.id} style={styles.exitItem}>
                    <Text style={styles.checkbox}>
                      {exit.visited ? '✅' : '☐'}
                    </Text>
                    <View style={styles.exitInfo}>
                      <Text style={styles.exitNumber}>
                        Exit {exit.exitNumber} - {exit.description}
                      </Text>
                      {exit.visited && exit.lastVisited && (
                        <Text style={styles.exitMeta}>
                          Last visited: {formatLastVisited(exit.lastVisited)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* No Exits Discovered Yet */}
            {(!highway.exits || highway.exits.length === 0) && highway.totalExits > 0 && (
              <View style={styles.exitsSection}>
                <Text style={styles.exitsSectionHeader}>
                  🚦 Exits (0 / {highway.totalExits})
                </Text>
                <Text style={styles.noExitsText}>
                  No exits discovered yet. Drive this direction to discover exits!
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }, [expandedSections, toggleSection, formatLastVisited, getStatusIcon]);

  /**
   * Render landmark item
   */
  const renderLandmark = useCallback((landmark: ExplorerLandmark) => {
    const categoryIcons: Record<string, string> = {
      attraction: '🎡',
      historic: '🏛️',
      natural: '🏞️',
      cultural: '🎭',
      food: '🍴',
      entertainment: '🎬',
      sport: '⚽',
      shopping: '🛍️',
    };

    const icon = categoryIcons[landmark.category] || '📍';

    return (
      <View key={landmark.id} style={styles.subItemContainer}>
        <Text style={styles.checkbox}>
          {getStatusIcon(landmark.visited, 100)}
        </Text>
        <View style={styles.subItemInfo}>
          <Text style={styles.subItemName}>
            {icon} {landmark.name}
          </Text>
          <Text style={styles.subItemMeta}>
            {landmark.significance}
          </Text>
          {landmark.visited && (
            <Text style={styles.subItemMeta}>
              Last visited: {formatLastVisited(landmark.lastVisited)}
            </Text>
          )}
        </View>
      </View>
    );
  }, [formatLastVisited, getStatusIcon]);


  /**
   * Render city item
   */
  const renderCity = useCallback((city: ExplorerCity) => {
    const isExpanded = expandedSections.includes(city.id);
    const hasLandmarks = city.landmarks && city.landmarks.length > 0;

    return (
      <View key={city.id} style={styles.itemContainer}>
        <TouchableOpacity
          style={styles.itemHeader}
          onPress={() => toggleSection(city.id)}
        >
          <View style={styles.itemInfo}>
            <View style={styles.itemTitle}>
              <Text style={styles.checkbox}>
                {city.visited ? '✅' : '☐'}
              </Text>
              <Text style={styles.itemName}>{city.name}</Text>
            </View>
            <Text style={styles.itemMeta}>
              Visited {city.visitCount} times
            </Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.nestedContainer}>
            {/* Landmarks Section */}
            {hasLandmarks && (
              <>
                <Text style={styles.sectionHeader}>🏛️ Landmarks</Text>
                {city.landmarks.map(renderLandmark)}
              </>
            )}

            {!hasLandmarks && (
              <Text style={styles.emptyText}>
                No landmarks tracked yet
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }, [expandedSections, toggleSection, renderLandmark]);

  /**
   * Render county item
   */
  const renderCounty = useCallback((county: ExplorerCounty) => {
    const isExpanded = expandedSections.includes(county.id);

          return (
      <View key={county.id} style={styles.itemContainer}>
            <TouchableOpacity
          style={styles.itemHeader}
          onPress={() => toggleSection(county.id)}
        >
          <View style={styles.itemInfo}>
            <View style={styles.itemTitle}>
              <Text style={styles.checkbox}>
                {getStatusIcon(county.visited, county.completionPercent)}
              </Text>
              <Text style={styles.itemName}>{county.name}</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${county.completionPercent}%`,
                      backgroundColor: tint 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {county.cities.filter(c => c.visited).length}/{county.cities.length} Cities • {county.completionPercent.toFixed(1)}%
              </Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.nestedContainer}>
            {county.cities.map(renderCity)}
          </View>
        )}
      </View>
    );
  }, [expandedSections, toggleSection, renderCity, getStatusIcon, tint]);

  /**
   * Render state item
   */
  const renderState = useCallback((state: ExplorerState) => {
    const isExpanded = expandedSections.includes(state.id);
    const stateHighways = state.highways || [];
    const visitedStateHighways = stateHighways.filter(h => h.visited);

    return (
      <View key={state.id} style={styles.itemContainer}>
        <TouchableOpacity
          style={styles.itemHeader}
          onPress={() => toggleSection(state.id)}
        >
          <View style={styles.itemInfo}>
            <View style={styles.itemTitle}>
              <Text style={styles.checkbox}>
                {getStatusIcon(state.visited, state.completionPercent)}
              </Text>
              <Text style={styles.itemName}>{state.name}</Text>
            </View>
            <Text style={styles.itemMeta}>
              {state.counties.length} counties • {stateHighways.length} highways • {state.completionPercent.toFixed(0)}% complete
            </Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.nestedContainer}>
            {/* Highways Section - Organized by Type */}
            {stateHighways.length > 0 && (
              <View style={styles.subSection}>
                <TouchableOpacity
                  style={styles.subSectionHeader}
                  onPress={() => toggleSection(`${state.id}-highways`)}
                >
                  <View style={styles.subSectionHeaderContent}>
                    <Text style={styles.sectionHeader}>🛣️ Highways</Text>
                    <Text style={styles.sectionSubheader}>
                      {visitedStateHighways.length}/{stateHighways.length} highways visited ({((visitedStateHighways.length / stateHighways.length) * 100).toFixed(1)}%)
                    </Text>
                  </View>
                  <Text style={styles.expandIcon}>
                    {expandedSections.includes(`${state.id}-highways`) ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                
                {expandedSections.includes(`${state.id}-highways`) && (
                  <View>
                    {/* Interstate Highways */}
                    {(() => {
                      const interstateHighways = stateHighways.filter(h => h.highwayType === 'interstate');
                      const groupedInterstates = groupDirectionalHighways(interstateHighways);
                      const visitedInterstate = interstateHighways.filter(h => h.visited);
                      return interstateHighways.length > 0 && (
                        <View style={styles.highwayCategory}>
                          <Text style={styles.highwayCategoryHeader}>
                            🚗 Interstate Highways ({visitedInterstate.length}/{interstateHighways.length})
                          </Text>
                          {groupedInterstates.map(group => renderDirectionalHighwayGroup(group))}
                        </View>
                      );
                    })()}

                    {/* US Highways */}
                    {(() => {
                      const usHighways = stateHighways.filter(h => h.highwayType === 'us-highway');
                      const groupedUS = groupDirectionalHighways(usHighways);
                      const visitedUS = usHighways.filter(h => h.visited);
                      return usHighways.length > 0 && (
                        <View style={styles.highwayCategory}>
                          <Text style={styles.highwayCategoryHeader}>
                            🇺🇸 US Highways ({visitedUS.length}/{usHighways.length})
                          </Text>
                          {groupedUS.map(group => renderDirectionalHighwayGroup(group))}
                        </View>
                      );
                    })()}

                    {/* State Highways */}
                    {(() => {
                      const stateHighwaysFiltered = stateHighways.filter(h => h.highwayType === 'state-highway');
                      const groupedState = groupDirectionalHighways(stateHighwaysFiltered);
                      const visitedState = stateHighwaysFiltered.filter(h => h.visited);
                      return stateHighwaysFiltered.length > 0 && (
                        <View style={styles.highwayCategory}>
                          <Text style={styles.highwayCategoryHeader}>
                            🏛️ State Highways ({visitedState.length}/{stateHighwaysFiltered.length})
                          </Text>
                          {groupedState.map(group => renderDirectionalHighwayGroup(group))}
                        </View>
                      );
                    })()}

                    {/* Local/Other Highways */}
                    {(() => {
                      const otherHighways = stateHighways.filter(h => 
                        h.highwayType === 'fm-road' || 
                        h.highwayType === 'ranch-road' || 
                        h.highwayType === 'special'
                      );
                      const groupedOther = groupDirectionalHighways(otherHighways);
                      const visitedOther = otherHighways.filter(h => h.visited);
                      return otherHighways.length > 0 && (
                        <View style={styles.highwayCategory}>
                          <Text style={styles.highwayCategoryHeader}>
                            🛤️ Local/Other ({visitedOther.length}/{otherHighways.length})
                          </Text>
                          {groupedOther.map(group => renderDirectionalHighwayGroup(group))}
                        </View>
                      );
                    })()}
                  </View>
                )}
              </View>
            )}

            {/* Counties Section */}
            {state.counties.length > 0 && (
              <View style={styles.subSection}>
                <TouchableOpacity
                  style={styles.subSectionHeader}
                  onPress={() => toggleSection(`${state.id}-counties`)}
                >
                  <View style={styles.subSectionHeaderContent}>
                    <Text style={styles.sectionHeader}>🏛️ Counties & Cities</Text>
                  </View>
                  <Text style={styles.expandIcon}>
                    {expandedSections.includes(`${state.id}-counties`) ? '▼' : '▶'}
                  </Text>
            </TouchableOpacity>
                
                {expandedSections.includes(`${state.id}-counties`) && (
                  <View>
                    {state.counties.map(renderCounty)}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  }, [expandedSections, toggleSection, renderCounty, getStatusIcon, renderDirectionalHighwayGroup]);

  /**
   * Render country item
   */
  const renderCountry = useCallback((country: ExplorerCountry) => {
    const isExpanded = expandedSections.includes(country.id);

    return (
      <View key={country.id} style={styles.itemContainer}>
        <TouchableOpacity
          style={styles.itemHeader}
          onPress={() => toggleSection(country.id)}
        >
          <View style={styles.itemInfo}>
            <View style={styles.itemTitle}>
              <Text style={styles.checkbox}>
                {getStatusIcon(country.visited, country.completionPercent)}
              </Text>
              <Text style={styles.itemName}>{country.name}</Text>
            </View>
            <Text style={styles.itemMeta}>
              {country.states.length} states • {country.completionPercent.toFixed(0)}% complete
            </Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
            </TouchableOpacity>

        {isExpanded && (
          <View style={styles.nestedContainer}>
            {country.states.length > 0 ? (
              country.states.map(renderState)
            ) : (
              <Text style={styles.emptySubtext}>
                No states match the current filters.
              </Text>
            )}
          </View>
        )}
    </View>
  );
  }, [expandedSections, toggleSection, renderState, getStatusIcon]);

  /**
   * Handle visibility mode change
   */
  const handleVisibilityChange = useCallback((mode: 'all' | 'discovered' | 'undiscovered') => {
    setVisibilityMode(mode);
  }, [setVisibilityMode]);

  /**
   * Filter data based on visibility mode
   */
  const filteredData = React.useMemo(() => {
    if (!explorerData) return { highways: [], countries: [] };

    const filterByVisited = (item: { visited?: boolean }) => {
      if (visibilityMode === 'all') return true;
      if (visibilityMode === 'discovered') return item.visited === true;
      return item.visited !== true; // undiscovered
    };

    const matchesSearch = (name: string): boolean => {
      if (!searchQuery.trim()) return true;
      return name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    };

    // Filter countries/states/counties/cities/highways recursively with search
    const countries = explorerData.countries.map(country => ({
      ...country,
      states: country.states
        .filter(state => matchesSearch(state.name))
        .map(state => ({
          ...state,
          highways: (state.highways || [])
            .filter(filterByVisited)
            .filter(highway => matchesSearch(highway.name) || matchesSearch(highway.fullName)),
          counties: state.counties
            .filter(county => matchesSearch(county.name))
            .map(county => ({
              ...county,
              cities: county.cities
                .filter(filterByVisited)
                .filter(city => matchesSearch(city.name)),
            }))
            .filter(county => visibilityMode === 'all' || county.visited || county.cities.length > 0),
        }))
        .filter(state => 
          visibilityMode === 'all' || 
          state.visited || 
          (state.counties.length > 0 || (state.highways && state.highways.length > 0))
        ),
    })).filter(country => visibilityMode === 'all' || country.visited || country.states.length > 0);

    return { countries };
  }, [explorerData, visibilityMode, searchQuery]);

  if (!explorerData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading explorer data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get all highways from all states
  const allHighways = explorerData.countries.flatMap(country => 
    country.states.flatMap(state => state.highways || [])
  );
  const visitedHighways = allHighways.filter(h => h.visited);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Checklist</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            {stats.visitedLocations.toLocaleString()} locations explored
          </Text>
        </View>
        <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
          <Text style={[styles.clearButtonText, { color: tint }]}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.secondaryBackground, borderBottomColor: theme.border }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.background, color: theme.text }]}
          placeholder="Search states, counties, cities..."
          placeholderTextColor={theme.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: theme.secondaryBackground, borderBottomColor: theme.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.countriesVisited}</Text>
          <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Countries</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.statesVisited}</Text>
          <Text style={[styles.statLabel, { color: theme.secondaryText }]}>States</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.citiesVisited}</Text>
          <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Cities</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{visitedHighways.length}</Text>
          <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Highways</Text>
        </View>
      </View>

      {/* Visibility Mode Selector */}
      <View style={[styles.visibilitySelector, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.visibilityButton,
            { backgroundColor: theme.inactive, borderColor: theme.border },
            visibilityMode === 'all' && { backgroundColor: selectedBgColor, borderColor: selectedBgColor },
          ]}
          onPress={() => handleVisibilityChange('all')}
        >
          <Text
            style={[
              styles.visibilityButtonText,
              { color: theme.secondaryText },
              visibilityMode === 'all' && { color: '#fff', fontWeight: '700' },
            ]}
          >
            Show All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.visibilityButton,
            { backgroundColor: theme.inactive, borderColor: theme.border },
            visibilityMode === 'discovered' && { backgroundColor: selectedBgColor, borderColor: selectedBgColor },
          ]}
          onPress={() => handleVisibilityChange('discovered')}
        >
          <Text
            style={[
              styles.visibilityButtonText,
              { color: theme.secondaryText },
              visibilityMode === 'discovered' && { color: '#fff', fontWeight: '700' },
            ]}
          >
            ✅ Discovered
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.visibilityButton,
            { backgroundColor: theme.inactive, borderColor: theme.border },
            visibilityMode === 'undiscovered' && { backgroundColor: selectedBgColor, borderColor: selectedBgColor },
          ]}
          onPress={() => handleVisibilityChange('undiscovered')}
        >
          <Text
            style={[
              styles.visibilityButtonText,
              { color: theme.secondaryText },
              visibilityMode === 'undiscovered' && { color: '#fff', fontWeight: '700' },
            ]}
          >
            🔍 Undiscovered
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tracking Status */}
      <View style={[styles.trackingStatus, { backgroundColor: isTracking ? '#4CAF50' : '#888' }]}>
        <Text style={styles.trackingStatusText}>
          {isTracking ? '🟢 Tracking Active' : '⚫ Tracking Paused'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Countries/States/Locations Section (Highways are now nested under Texas) */}
        {filteredData.countries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={[styles.majorSectionHeader, { color: theme.text }]}>🌍 Locations</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.secondaryText }]}>
                Explore Texas cities, counties, and streets
                {visibilityMode !== 'all' && ` (showing ${visibilityMode})`}
              </Text>
            </View>
            {filteredData.countries.map(renderCountry)}
          </View>
        )}

        {/* No Locations Message */}
        {filteredData.countries.length === 0 && explorerData.countries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={[styles.majorSectionHeader, { color: theme.text }]}>🌍 Locations</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.secondaryText }]}>
                {visibilityMode === 'discovered' && 'No locations discovered yet'}
                {visibilityMode === 'undiscovered' && 'All locations discovered! 🎉'}
              </Text>
            </View>
          </View>
        )}

        {/* Loading State */}
        {explorerData.countries.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>🔄 Loading Texas Data...</Text>
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
              Preparing 148 highways and thousands of cities for you to explore!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
});

Explorer.displayName = 'Explorer';

export default Explorer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  trackingStatus: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  trackingStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderContainer: {
    marginBottom: 12,
  },
  majorSectionHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 8,
  },
  sectionSubheader: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
    marginLeft: 8,
  },
  subSection: {
    marginBottom: 16,
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  subSectionHeaderContent: {
    flex: 1,
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkbox: {
    fontSize: 20,
    marginRight: 8,
  },
  checkboxChecked: {
    // Checked state styling
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  itemMeta: {
    fontSize: 12,
    color: '#888',
    marginLeft: 28,
  },
  expandIcon: {
    fontSize: 16,
    color: '#999',
    marginLeft: 8,
  },
  itemDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  nestedContainer: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  subItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 6,
  },
  subItemInfo: {
    flex: 1,
  },
  subItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  subItemMeta: {
    fontSize: 12,
    color: '#888',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 8,
  },
  placeholderContainer: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e0e0e0',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  visibilitySelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  visibilityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  exitsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  exitsSectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  exitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 6,
  },
  exitInfo: {
    flex: 1,
    marginLeft: 4,
  },
  exitNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  exitDescription: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
  exitMeta: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  noExitsText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  highwayCategory: {
    marginBottom: 16,
  },
  highwayCategoryHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  directionalHighwayItem: {
    marginLeft: 12,
    marginBottom: 8,
  },
  directionalHighwayContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
  },
  directionalHighwayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  directionalHighwayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
});
