/**
 * Rhode Island Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.818Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN RI
 */

const RI_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-95',
    name: 'Interstate 95',
    type: 'highway',
    highwayType: 'interstate',
    number: '95',
    fullName: 'Interstate 95',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 25,
  },
  {
    id: 'interstate-837',
    name: 'Interstate 837',
    type: 'highway',
    highwayType: 'interstate',
    number: '837',
    fullName: 'Interstate 837',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 22,
  },
  {
    id: 'interstate-808',
    name: 'Interstate 808',
    type: 'highway',
    highwayType: 'interstate',
    number: '808',
    fullName: 'Interstate 808',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 10,
  },
];

/**
 * US HIGHWAYS IN RI
 */

const RI_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-418',
    name: 'US Highway 418',
    type: 'highway',
    highwayType: 'us-highway',
    number: '418',
    fullName: 'US Highway 418',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'us-433',
    name: 'US Highway 433',
    type: 'highway',
    highwayType: 'us-highway',
    number: '433',
    fullName: 'US Highway 433',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
];

/**
 * STATE HIGHWAYS IN RI
 */

const RI_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'Rhode Island State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'Rhode Island State Route 1',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-2',
    name: 'Rhode Island State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'Rhode Island State Route 2',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-3',
    name: 'Rhode Island State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'Rhode Island State Route 3',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-4',
    name: 'Rhode Island State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'Rhode Island State Route 4',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-5',
    name: 'Rhode Island State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'Rhode Island State Route 5',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 2,
  },
  {
    id: 'state-6',
    name: 'Rhode Island State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'Rhode Island State Route 6',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-7',
    name: 'Rhode Island State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'Rhode Island State Route 7',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-8',
    name: 'Rhode Island State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'Rhode Island State Route 8',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-9',
    name: 'Rhode Island State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'Rhode Island State Route 9',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-10',
    name: 'Rhode Island State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'Rhode Island State Route 10',
    states: ['RI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
];

/**
 * ALL RI HIGHWAYS
 */

export const ALL_RI_HIGHWAYS: HighwayData[] = [
  ...RI_INTERSTATES,
  ...RI_US_HIGHWAYS,
  ...RI_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const RI_HIGHWAY_STATS = {
  totalHighways: 15,
  interstates: 3,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 128,
};

/**
 * Helper Functions
 */
export function getRhodeIslandHighwayById(id: string): HighwayData | undefined {
  return ALL_RI_HIGHWAYS.find(hw => hw.id === id);
}

export function getRhodeIslandHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_RI_HIGHWAYS.filter(hw => hw.highwayType === type);
}
