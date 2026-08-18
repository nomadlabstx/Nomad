/**
 * Delaware Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.823Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN DE
 */

const DE_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-95',
    name: 'Interstate 95',
    type: 'highway',
    highwayType: 'interstate',
    number: '95',
    fullName: 'Interstate 95',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 30,
  },
  {
    id: 'interstate-176',
    name: 'Interstate 176',
    type: 'highway',
    highwayType: 'interstate',
    number: '176',
    fullName: 'Interstate 176',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 11,
  },
  {
    id: 'interstate-542',
    name: 'Interstate 542',
    type: 'highway',
    highwayType: 'interstate',
    number: '542',
    fullName: 'Interstate 542',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 21,
  },
];

/**
 * US HIGHWAYS IN DE
 */

const DE_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-486',
    name: 'US Highway 486',
    type: 'highway',
    highwayType: 'us-highway',
    number: '486',
    fullName: 'US Highway 486',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 16,
  },
  {
    id: 'us-248',
    name: 'US Highway 248',
    type: 'highway',
    highwayType: 'us-highway',
    number: '248',
    fullName: 'US Highway 248',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 14,
  },
];

/**
 * STATE HIGHWAYS IN DE
 */

const DE_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'Delaware State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'Delaware State Route 1',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-2',
    name: 'Delaware State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'Delaware State Route 2',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-3',
    name: 'Delaware State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'Delaware State Route 3',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-4',
    name: 'Delaware State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'Delaware State Route 4',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 2,
  },
  {
    id: 'state-5',
    name: 'Delaware State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'Delaware State Route 5',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-6',
    name: 'Delaware State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'Delaware State Route 6',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-7',
    name: 'Delaware State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'Delaware State Route 7',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-8',
    name: 'Delaware State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'Delaware State Route 8',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-9',
    name: 'Delaware State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'Delaware State Route 9',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-10',
    name: 'Delaware State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'Delaware State Route 10',
    states: ['DE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
];

/**
 * ALL DE HIGHWAYS
 */

export const ALL_DE_HIGHWAYS: HighwayData[] = [
  ...DE_INTERSTATES,
  ...DE_US_HIGHWAYS,
  ...DE_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const DE_HIGHWAY_STATS = {
  totalHighways: 15,
  interstates: 3,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 141,
};

/**
 * Helper Functions
 */
export function getDelawareHighwayById(id: string): HighwayData | undefined {
  return ALL_DE_HIGHWAYS.find(hw => hw.id === id);
}

export function getDelawareHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_DE_HIGHWAYS.filter(hw => hw.highwayType === type);
}
