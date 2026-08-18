/**
 * Combined State Highway Database
 * All highways from multiple states
 * 
 * Generated: 2025-10-30T18:09:59.394Z
 */

import { ALL_CA_HIGHWAYS } from './ca-highways';
import { ALL_FL_HIGHWAYS } from './fl-highways';
import { ALL_NY_HIGHWAYS } from './ny-highways';


export const ALL_STATE_HIGHWAYS: any[] = [
  ...ALL_CA_HIGHWAYS,
  ...ALL_FL_HIGHWAYS,
  ...ALL_NY_HIGHWAYS,
];

export const COMBINED_HIGHWAY_STATS = {
  totalHighways: ALL_STATE_HIGHWAYS.length,
  states: 3,
  interstates: ALL_STATE_HIGHWAYS.filter(h => h.highwayType === 'interstate').length,
  usHighways: ALL_STATE_HIGHWAYS.filter(h => h.highwayType === 'us-highway').length,
  stateHighways: ALL_STATE_HIGHWAYS.filter(h => h.highwayType === 'state-highway').length,
  totalExits: ALL_STATE_HIGHWAYS.reduce((sum, h) => sum + h.totalExits, 0),
};
