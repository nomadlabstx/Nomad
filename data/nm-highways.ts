/**
 * New Mexico Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.790Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN NM
 */

const NM_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-10',
    name: 'Interstate 10',
    type: 'highway',
    highwayType: 'interstate',
    number: '10',
    fullName: 'Interstate 10',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 38,
  },
  {
    id: 'interstate-25',
    name: 'Interstate 25',
    type: 'highway',
    highwayType: 'interstate',
    number: '25',
    fullName: 'Interstate 25',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 36,
  },
  {
    id: 'interstate-40',
    name: 'Interstate 40',
    type: 'highway',
    highwayType: 'interstate',
    number: '40',
    fullName: 'Interstate 40',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 12,
  },
];

/**
 * US HIGHWAYS IN NM
 */

const NM_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-478',
    name: 'US Highway 478',
    type: 'highway',
    highwayType: 'us-highway',
    number: '478',
    fullName: 'US Highway 478',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'us-461',
    name: 'US Highway 461',
    type: 'highway',
    highwayType: 'us-highway',
    number: '461',
    fullName: 'US Highway 461',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 14,
  },
];

/**
 * STATE HIGHWAYS IN NM
 */

const NM_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'New Mexico State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'New Mexico State Route 1',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-2',
    name: 'New Mexico State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'New Mexico State Route 2',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-3',
    name: 'New Mexico State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'New Mexico State Route 3',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-4',
    name: 'New Mexico State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'New Mexico State Route 4',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-5',
    name: 'New Mexico State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'New Mexico State Route 5',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-6',
    name: 'New Mexico State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'New Mexico State Route 6',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 2,
  },
  {
    id: 'state-7',
    name: 'New Mexico State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'New Mexico State Route 7',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-8',
    name: 'New Mexico State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'New Mexico State Route 8',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-9',
    name: 'New Mexico State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'New Mexico State Route 9',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-10',
    name: 'New Mexico State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'New Mexico State Route 10',
    states: ['NM'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
];

/**
 * ALL NM HIGHWAYS
 */

export const ALL_NM_HIGHWAYS: HighwayData[] = [
  ...NM_INTERSTATES,
  ...NM_US_HIGHWAYS,
  ...NM_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const NM_HIGHWAY_STATS = {
  totalHighways: 15,
  interstates: 3,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 163,
};

/**
 * Helper Functions
 */
export function getNewMexicoHighwayById(id: string): HighwayData | undefined {
  return ALL_NM_HIGHWAYS.find(hw => hw.id === id);
}

export function getNewMexicoHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_NM_HIGHWAYS.filter(hw => hw.highwayType === type);
}
