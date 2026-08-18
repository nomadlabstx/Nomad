/**
 * Alaska Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.836Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN AK
 */

const AK_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-148',
    name: 'Interstate 148',
    type: 'highway',
    highwayType: 'interstate',
    number: '148',
    fullName: 'Interstate 148',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'interstate-421',
    name: 'Interstate 421',
    type: 'highway',
    highwayType: 'interstate',
    number: '421',
    fullName: 'Interstate 421',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'interstate-797',
    name: 'Interstate 797',
    type: 'highway',
    highwayType: 'interstate',
    number: '797',
    fullName: 'Interstate 797',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 22,
  },
];

/**
 * US HIGHWAYS IN AK
 */

const AK_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-301',
    name: 'US Highway 301',
    type: 'highway',
    highwayType: 'us-highway',
    number: '301',
    fullName: 'US Highway 301',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 15,
  },
  {
    id: 'us-213',
    name: 'US Highway 213',
    type: 'highway',
    highwayType: 'us-highway',
    number: '213',
    fullName: 'US Highway 213',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 11,
  },
];

/**
 * STATE HIGHWAYS IN AK
 */

const AK_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'Alaska State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'Alaska State Route 1',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-2',
    name: 'Alaska State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'Alaska State Route 2',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-3',
    name: 'Alaska State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'Alaska State Route 3',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-4',
    name: 'Alaska State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'Alaska State Route 4',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-5',
    name: 'Alaska State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'Alaska State Route 5',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-6',
    name: 'Alaska State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'Alaska State Route 6',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-7',
    name: 'Alaska State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'Alaska State Route 7',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 2,
  },
  {
    id: 'state-8',
    name: 'Alaska State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'Alaska State Route 8',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-9',
    name: 'Alaska State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'Alaska State Route 9',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-10',
    name: 'Alaska State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'Alaska State Route 10',
    states: ['AK'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
];

/**
 * ALL AK HIGHWAYS
 */

export const ALL_AK_HIGHWAYS: HighwayData[] = [
  ...AK_INTERSTATES,
  ...AK_US_HIGHWAYS,
  ...AK_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const AK_HIGHWAY_STATS = {
  totalHighways: 15,
  interstates: 3,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 123,
};

/**
 * Helper Functions
 */
export function getAlaskaHighwayById(id: string): HighwayData | undefined {
  return ALL_AK_HIGHWAYS.find(hw => hw.id === id);
}

export function getAlaskaHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_AK_HIGHWAYS.filter(hw => hw.highwayType === type);
}
