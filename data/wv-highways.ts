/**
 * West Virginia Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.800Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN WV
 */

const WV_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-64',
    name: 'Interstate 64',
    type: 'highway',
    highwayType: 'interstate',
    number: '64',
    fullName: 'Interstate 64',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 33,
  },
  {
    id: 'interstate-70',
    name: 'Interstate 70',
    type: 'highway',
    highwayType: 'interstate',
    number: '70',
    fullName: 'Interstate 70',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 19,
  },
  {
    id: 'interstate-77',
    name: 'Interstate 77',
    type: 'highway',
    highwayType: 'interstate',
    number: '77',
    fullName: 'Interstate 77',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 13,
  },
  {
    id: 'interstate-79',
    name: 'Interstate 79',
    type: 'highway',
    highwayType: 'interstate',
    number: '79',
    fullName: 'Interstate 79',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 30,
  },
  {
    id: 'interstate-81',
    name: 'Interstate 81',
    type: 'highway',
    highwayType: 'interstate',
    number: '81',
    fullName: 'Interstate 81',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 32,
  },
];

/**
 * US HIGHWAYS IN WV
 */

const WV_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-260',
    name: 'US Highway 260',
    type: 'highway',
    highwayType: 'us-highway',
    number: '260',
    fullName: 'US Highway 260',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 12,
  },
  {
    id: 'us-37',
    name: 'US Highway 37',
    type: 'highway',
    highwayType: 'us-highway',
    number: '37',
    fullName: 'US Highway 37',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 12,
  },
];

/**
 * STATE HIGHWAYS IN WV
 */

const WV_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'West Virginia State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'West Virginia State Route 1',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 2,
  },
  {
    id: 'state-2',
    name: 'West Virginia State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'West Virginia State Route 2',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-3',
    name: 'West Virginia State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'West Virginia State Route 3',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-4',
    name: 'West Virginia State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'West Virginia State Route 4',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-5',
    name: 'West Virginia State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'West Virginia State Route 5',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-6',
    name: 'West Virginia State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'West Virginia State Route 6',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-7',
    name: 'West Virginia State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'West Virginia State Route 7',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-8',
    name: 'West Virginia State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'West Virginia State Route 8',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-9',
    name: 'West Virginia State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'West Virginia State Route 9',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-10',
    name: 'West Virginia State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'West Virginia State Route 10',
    states: ['WV'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
];

/**
 * ALL WV HIGHWAYS
 */

export const ALL_WV_HIGHWAYS: HighwayData[] = [
  ...WV_INTERSTATES,
  ...WV_US_HIGHWAYS,
  ...WV_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const WV_HIGHWAY_STATS = {
  totalHighways: 17,
  interstates: 5,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 203,
};

/**
 * Helper Functions
 */
export function getWestVirginiaHighwayById(id: string): HighwayData | undefined {
  return ALL_WV_HIGHWAYS.find(hw => hw.id === id);
}

export function getWestVirginiaHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_WV_HIGHWAYS.filter(hw => hw.highwayType === type);
}
