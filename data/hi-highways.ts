/**
 * Hawaii Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.804Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN HI
 */

const HI_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-976',
    name: 'Interstate 976',
    type: 'highway',
    highwayType: 'interstate',
    number: '976',
    fullName: 'Interstate 976',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 14,
  },
  {
    id: 'interstate-904',
    name: 'Interstate 904',
    type: 'highway',
    highwayType: 'interstate',
    number: '904',
    fullName: 'Interstate 904',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 18,
  },
  {
    id: 'interstate-972',
    name: 'Interstate 972',
    type: 'highway',
    highwayType: 'interstate',
    number: '972',
    fullName: 'Interstate 972',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
];

/**
 * US HIGHWAYS IN HI
 */

const HI_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-375',
    name: 'US Highway 375',
    type: 'highway',
    highwayType: 'us-highway',
    number: '375',
    fullName: 'US Highway 375',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 17,
  },
  {
    id: 'us-325',
    name: 'US Highway 325',
    type: 'highway',
    highwayType: 'us-highway',
    number: '325',
    fullName: 'US Highway 325',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 16,
  },
];

/**
 * STATE HIGHWAYS IN HI
 */

const HI_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'Hawaii State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'Hawaii State Route 1',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-2',
    name: 'Hawaii State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'Hawaii State Route 2',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-3',
    name: 'Hawaii State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'Hawaii State Route 3',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-4',
    name: 'Hawaii State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'Hawaii State Route 4',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-5',
    name: 'Hawaii State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'Hawaii State Route 5',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-6',
    name: 'Hawaii State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'Hawaii State Route 6',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-7',
    name: 'Hawaii State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'Hawaii State Route 7',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-8',
    name: 'Hawaii State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'Hawaii State Route 8',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-9',
    name: 'Hawaii State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'Hawaii State Route 9',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-10',
    name: 'Hawaii State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'Hawaii State Route 10',
    states: ['HI'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
];

/**
 * ALL HI HIGHWAYS
 */

export const ALL_HI_HIGHWAYS: HighwayData[] = [
  ...HI_INTERSTATES,
  ...HI_US_HIGHWAYS,
  ...HI_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const HI_HIGHWAY_STATS = {
  totalHighways: 15,
  interstates: 3,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 125,
};

/**
 * Helper Functions
 */
export function getHawaiiHighwayById(id: string): HighwayData | undefined {
  return ALL_HI_HIGHWAYS.find(hw => hw.id === id);
}

export function getHawaiiHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_HI_HIGHWAYS.filter(hw => hw.highwayType === type);
}
