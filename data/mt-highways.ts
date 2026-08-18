/**
 * Montana Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.820Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN MT
 */

const MT_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-15',
    name: 'Interstate 15',
    type: 'highway',
    highwayType: 'interstate',
    number: '15',
    fullName: 'Interstate 15',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 14,
  },
  {
    id: 'interstate-90',
    name: 'Interstate 90',
    type: 'highway',
    highwayType: 'interstate',
    number: '90',
    fullName: 'Interstate 90',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 12,
  },
  {
    id: 'interstate-94',
    name: 'Interstate 94',
    type: 'highway',
    highwayType: 'interstate',
    number: '94',
    fullName: 'Interstate 94',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 10,
  },
];

/**
 * US HIGHWAYS IN MT
 */

const MT_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-369',
    name: 'US Highway 369',
    type: 'highway',
    highwayType: 'us-highway',
    number: '369',
    fullName: 'US Highway 369',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'us-184',
    name: 'US Highway 184',
    type: 'highway',
    highwayType: 'us-highway',
    number: '184',
    fullName: 'US Highway 184',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 12,
  },
];

/**
 * STATE HIGHWAYS IN MT
 */

const MT_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'Montana State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'Montana State Route 1',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-2',
    name: 'Montana State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'Montana State Route 2',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-3',
    name: 'Montana State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'Montana State Route 3',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-4',
    name: 'Montana State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'Montana State Route 4',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-5',
    name: 'Montana State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'Montana State Route 5',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-6',
    name: 'Montana State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'Montana State Route 6',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-7',
    name: 'Montana State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'Montana State Route 7',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-8',
    name: 'Montana State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'Montana State Route 8',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 2,
  },
  {
    id: 'state-9',
    name: 'Montana State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'Montana State Route 9',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-10',
    name: 'Montana State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'Montana State Route 10',
    states: ['MT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
];

/**
 * ALL MT HIGHWAYS
 */

export const ALL_MT_HIGHWAYS: HighwayData[] = [
  ...MT_INTERSTATES,
  ...MT_US_HIGHWAYS,
  ...MT_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const MT_HIGHWAY_STATS = {
  totalHighways: 15,
  interstates: 3,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 125,
};

/**
 * Helper Functions
 */
export function getMontanaHighwayById(id: string): HighwayData | undefined {
  return ALL_MT_HIGHWAYS.find(hw => hw.id === id);
}

export function getMontanaHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_MT_HIGHWAYS.filter(hw => hw.highwayType === type);
}
