/**
 * North Dakota Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.834Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN ND
 */

const ND_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-94',
    name: 'Interstate 94',
    type: 'highway',
    highwayType: 'interstate',
    number: '94',
    fullName: 'Interstate 94',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 15,
  },
  {
    id: 'interstate-752',
    name: 'Interstate 752',
    type: 'highway',
    highwayType: 'interstate',
    number: '752',
    fullName: 'Interstate 752',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 13,
  },
  {
    id: 'interstate-563',
    name: 'Interstate 563',
    type: 'highway',
    highwayType: 'interstate',
    number: '563',
    fullName: 'Interstate 563',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
];

/**
 * US HIGHWAYS IN ND
 */

const ND_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-240',
    name: 'US Highway 240',
    type: 'highway',
    highwayType: 'us-highway',
    number: '240',
    fullName: 'US Highway 240',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'us-262',
    name: 'US Highway 262',
    type: 'highway',
    highwayType: 'us-highway',
    number: '262',
    fullName: 'US Highway 262',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 15,
  },
];

/**
 * STATE HIGHWAYS IN ND
 */

const ND_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'North Dakota State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'North Dakota State Route 1',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-2',
    name: 'North Dakota State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'North Dakota State Route 2',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-3',
    name: 'North Dakota State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'North Dakota State Route 3',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-4',
    name: 'North Dakota State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'North Dakota State Route 4',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-5',
    name: 'North Dakota State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'North Dakota State Route 5',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-6',
    name: 'North Dakota State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'North Dakota State Route 6',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-7',
    name: 'North Dakota State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'North Dakota State Route 7',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-8',
    name: 'North Dakota State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'North Dakota State Route 8',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-9',
    name: 'North Dakota State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'North Dakota State Route 9',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-10',
    name: 'North Dakota State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'North Dakota State Route 10',
    states: ['ND'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
];

/**
 * ALL ND HIGHWAYS
 */

export const ALL_ND_HIGHWAYS: HighwayData[] = [
  ...ND_INTERSTATES,
  ...ND_US_HIGHWAYS,
  ...ND_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const ND_HIGHWAY_STATS = {
  totalHighways: 15,
  interstates: 3,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 120,
};

/**
 * Helper Functions
 */
export function getNorthDakotaHighwayById(id: string): HighwayData | undefined {
  return ALL_ND_HIGHWAYS.find(hw => hw.id === id);
}

export function getNorthDakotaHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_ND_HIGHWAYS.filter(hw => hw.highwayType === type);
}
