/**
 * Nebraska Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.797Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN NE
 */

const NE_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-76',
    name: 'Interstate 76',
    type: 'highway',
    highwayType: 'interstate',
    number: '76',
    fullName: 'Interstate 76',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 19,
  },
  {
    id: 'interstate-80',
    name: 'Interstate 80',
    type: 'highway',
    highwayType: 'interstate',
    number: '80',
    fullName: 'Interstate 80',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 23,
  },
  {
    id: 'interstate-84',
    name: 'Interstate 84',
    type: 'highway',
    highwayType: 'interstate',
    number: '84',
    fullName: 'Interstate 84',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 30,
  },
];

/**
 * US HIGHWAYS IN NE
 */

const NE_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-330',
    name: 'US Highway 330',
    type: 'highway',
    highwayType: 'us-highway',
    number: '330',
    fullName: 'US Highway 330',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'us-275',
    name: 'US Highway 275',
    type: 'highway',
    highwayType: 'us-highway',
    number: '275',
    fullName: 'US Highway 275',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
];

/**
 * STATE HIGHWAYS IN NE
 */

const NE_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'Nebraska State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'Nebraska State Route 1',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-2',
    name: 'Nebraska State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'Nebraska State Route 2',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-3',
    name: 'Nebraska State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'Nebraska State Route 3',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-4',
    name: 'Nebraska State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'Nebraska State Route 4',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-5',
    name: 'Nebraska State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'Nebraska State Route 5',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-6',
    name: 'Nebraska State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'Nebraska State Route 6',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-7',
    name: 'Nebraska State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'Nebraska State Route 7',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-8',
    name: 'Nebraska State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'Nebraska State Route 8',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-9',
    name: 'Nebraska State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'Nebraska State Route 9',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-10',
    name: 'Nebraska State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'Nebraska State Route 10',
    states: ['NE'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
];

/**
 * ALL NE HIGHWAYS
 */

export const ALL_NE_HIGHWAYS: HighwayData[] = [
  ...NE_INTERSTATES,
  ...NE_US_HIGHWAYS,
  ...NE_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const NE_HIGHWAY_STATS = {
  totalHighways: 15,
  interstates: 3,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 133,
};

/**
 * Helper Functions
 */
export function getNebraskaHighwayById(id: string): HighwayData | undefined {
  return ALL_NE_HIGHWAYS.find(hw => hw.id === id);
}

export function getNebraskaHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_NE_HIGHWAYS.filter(hw => hw.highwayType === type);
}
