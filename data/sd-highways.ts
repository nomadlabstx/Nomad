/**
 * South Dakota Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.827Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN SD
 */

const SD_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-90',
    name: 'Interstate 90',
    type: 'highway',
    highwayType: 'interstate',
    number: '90',
    fullName: 'Interstate 90',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 29,
  },
  {
    id: 'interstate-892',
    name: 'Interstate 892',
    type: 'highway',
    highwayType: 'interstate',
    number: '892',
    fullName: 'Interstate 892',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 15,
  },
  {
    id: 'interstate-327',
    name: 'Interstate 327',
    type: 'highway',
    highwayType: 'interstate',
    number: '327',
    fullName: 'Interstate 327',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 22,
  },
];

/**
 * US HIGHWAYS IN SD
 */

const SD_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-443',
    name: 'US Highway 443',
    type: 'highway',
    highwayType: 'us-highway',
    number: '443',
    fullName: 'US Highway 443',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'us-335',
    name: 'US Highway 335',
    type: 'highway',
    highwayType: 'us-highway',
    number: '335',
    fullName: 'US Highway 335',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
];

/**
 * STATE HIGHWAYS IN SD
 */

const SD_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'South Dakota State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'South Dakota State Route 1',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-2',
    name: 'South Dakota State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'South Dakota State Route 2',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-3',
    name: 'South Dakota State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'South Dakota State Route 3',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-4',
    name: 'South Dakota State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'South Dakota State Route 4',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-5',
    name: 'South Dakota State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'South Dakota State Route 5',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-6',
    name: 'South Dakota State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'South Dakota State Route 6',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 2,
  },
  {
    id: 'state-7',
    name: 'South Dakota State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'South Dakota State Route 7',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-8',
    name: 'South Dakota State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'South Dakota State Route 8',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-9',
    name: 'South Dakota State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'South Dakota State Route 9',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-10',
    name: 'South Dakota State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'South Dakota State Route 10',
    states: ['SD'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 2,
  },
];

/**
 * ALL SD HIGHWAYS
 */

export const ALL_SD_HIGHWAYS: HighwayData[] = [
  ...SD_INTERSTATES,
  ...SD_US_HIGHWAYS,
  ...SD_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const SD_HIGHWAY_STATS = {
  totalHighways: 15,
  interstates: 3,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 137,
};

/**
 * Helper Functions
 */
export function getSouthDakotaHighwayById(id: string): HighwayData | undefined {
  return ALL_SD_HIGHWAYS.find(hw => hw.id === id);
}

export function getSouthDakotaHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_SD_HIGHWAYS.filter(hw => hw.highwayType === type);
}
