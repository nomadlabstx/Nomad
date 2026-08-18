/**
 * Waypoint Manager Component
 * Allows users to add, remove, and reorder waypoints for multi-stop routes
 */

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import type { Coordinates } from '../services/navigation';

export interface WaypointData {
  id: string;
  name: string;
  location: Coordinates;
  stopDuration?: number; // in minutes
}

interface WaypointManagerProps {
  waypoints: WaypointData[];
  onWaypointsChange: (waypoints: WaypointData[]) => void;
  onAddWaypoint: () => void;
  tintColor?: string;
}

export function WaypointManager({
  waypoints,
  onWaypointsChange,
  onAddWaypoint,
  tintColor = '#007AFF',
}: WaypointManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState('');

  /**
   * Remove a waypoint
   */
  const handleRemove = useCallback((id: string) => {
    onWaypointsChange(waypoints.filter(wp => wp.id !== id));
  }, [waypoints, onWaypointsChange]);

  /**
   * Move waypoint up in the list
   */
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const newWaypoints = [...waypoints];
    [newWaypoints[index - 1], newWaypoints[index]] = [newWaypoints[index], newWaypoints[index - 1]];
    onWaypointsChange(newWaypoints);
  }, [waypoints, onWaypointsChange]);

  /**
   * Move waypoint down in the list
   */
  const handleMoveDown = useCallback((index: number) => {
    if (index === waypoints.length - 1) return;
    const newWaypoints = [...waypoints];
    [newWaypoints[index], newWaypoints[index + 1]] = [newWaypoints[index + 1], newWaypoints[index]];
    onWaypointsChange(newWaypoints);
  }, [waypoints, onWaypointsChange]);

  /**
   * Start editing a waypoint
   */
  const handleEdit = useCallback((waypoint: WaypointData) => {
    setEditingId(waypoint.id);
    setEditName(waypoint.name);
    setEditDuration(waypoint.stopDuration?.toString() || '');
  }, []);

  /**
   * Save waypoint edits
   */
  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;

    const newWaypoints = waypoints.map(wp => {
      if (wp.id === editingId) {
        return {
          ...wp,
          name: editName.trim() || wp.name,
          stopDuration: (() => {
            if (!editDuration.trim()) return undefined;
            const parsed = parseInt(editDuration, 10);
            return Number.isFinite(parsed) && parsed >= 0 ? parsed : wp.stopDuration;
          })(),
        };
      }
      return wp;
    });

    onWaypointsChange(newWaypoints);
    setEditingId(null);
    setEditName('');
    setEditDuration('');
  }, [editingId, editName, editDuration, waypoints, onWaypointsChange]);

  /**
   * Calculate total stop time
   */
  const totalStopTime = waypoints.reduce((sum, wp) => sum + (wp.stopDuration || 0), 0);

  /**
   * Render a single waypoint
   */
  const renderWaypoint = useCallback(({ item, index }: { item: WaypointData; index: number }) => {
    return (
      <View style={styles.waypointCard}>
        {/* Stop Number */}
        <View style={[styles.stopNumber, { backgroundColor: tintColor }]}>
          <Text style={styles.stopNumberText}>{index + 1}</Text>
        </View>

        {/* Waypoint Info */}
        <View style={styles.waypointInfo}>
          <Text style={styles.waypointName} numberOfLines={1}>
            {item.name}
          </Text>
          {index === waypoints.length - 1 ? (
            <Text style={styles.endHint}>Ends here</Text>
          ) : null}
          {item.stopDuration ? (
            <Text style={styles.stopDuration}>
              Stop: {item.stopDuration} min
            </Text>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Move Up */}
          <TouchableOpacity
            onPress={() => handleMoveUp(index)}
            disabled={index === 0}
            style={styles.actionButton}
          >
            <Ionicons
              name="chevron-up"
              size={20}
              color={index === 0 ? '#ccc' : tintColor}
            />
          </TouchableOpacity>

          {/* Move Down */}
          <TouchableOpacity
            onPress={() => handleMoveDown(index)}
            disabled={index === waypoints.length - 1}
            style={styles.actionButton}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={index === waypoints.length - 1 ? '#ccc' : tintColor}
            />
          </TouchableOpacity>

          {/* Edit */}
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            style={styles.actionButton}
          >
            <Ionicons name="create-outline" size={20} color={tintColor} />
          </TouchableOpacity>

          {/* Remove */}
          <TouchableOpacity
            onPress={() => handleRemove(item.id)}
            style={styles.actionButton}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [waypoints.length, tintColor, handleMoveUp, handleMoveDown, handleEdit, handleRemove]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Stops ({waypoints.length})</Text>
        {totalStopTime > 0 && (
          <Text style={styles.totalTime}>
            Total stop time: {totalStopTime} min
          </Text>
        )}
      </View>

      {waypoints.length > 0 ? (
        <View style={styles.listContent}>
          {waypoints.map((item, index) => (
            <View key={item.id}>{renderWaypoint({ item, index })}</View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No stops added yet</Text>
          <Text style={styles.emptySubtext}>
            Add stops to create a multi-destination route
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: tintColor }]}
        onPress={onAddWaypoint}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Stop</Text>
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal
        visible={editingId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Stop</Text>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Stop name"
                placeholderTextColor="#999"
              />
            </View>

            {/* Duration Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Stop Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={editDuration}
                onChangeText={setEditDuration}
                placeholder="Optional"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditingId(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: tintColor }]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  totalTime: {
    fontSize: 14,
    color: '#888',
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  waypointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopNumberText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  waypointInfo: {
    flex: 1,
  },
  waypointName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  stopDuration: {
    fontSize: 13,
    color: '#888',
  },
  endHint: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#888',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#f9f9f9',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

