/**
 * Vermont Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.838Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN VT
 */

const VT_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-89',
    name: 'Interstate 89',
    type: 'highway',
    highwayType: 'interstate',
    number: '89',
    fullName: 'Interstate 89',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 36,
  },
  {
    id: 'interstate-91',
    name: 'Interstate 91',
    type: 'highway',
    highwayType: 'interstate',
    number: '91',
    fullName: 'Interstate 91',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 18,
  },
  {
    id: 'interstate-93',
    name: 'Interstate 93',
    type: 'highway',
    highwayType: 'interstate',
    number: '93',
    fullName: 'Interstate 93',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 10,
  },
];

/**
 * US HIGHWAYS IN VT
 */

const VT_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-318',
    name: 'US Highway 318',
    type: 'highway',
    highwayType: 'us-highway',
    number: '318',
    fullName: 'US Highway 318',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'us-418',
    name: 'US Highway 418',
    type: 'highway',
    highwayType: 'us-highway',
    number: '418',
    fullName: 'US Highway 418',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 17,
  },
];

/**
 * STATE HIGHWAYS IN VT
 */

const VT_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'Vermont State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'Vermont State Route 1',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-2',
    name: 'Vermont State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'Vermont State Route 2',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-3',
    name: 'Vermont State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'Vermont State Route 3',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-4',
    name: 'Vermont State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'Vermont State Route 4',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-5',
    name: 'Vermont State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'Vermont State Route 5',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 2,
  },
  {
    id: 'state-6',
    name: 'Vermont State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'Vermont State Route 6',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-7',
    name: 'Vermont State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'Vermont State Route 7',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-8',
    name: 'Vermont State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'Vermont State Route 8',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-9',
    name: 'Vermont State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'Vermont State Route 9',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-10',
    name: 'Vermont State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'Vermont State Route 10',
    states: ['VT'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
];

/**
 * ALL VT HIGHWAYS
 */

export const ALL_VT_HIGHWAYS: HighwayData[] = [
  ...VT_INTERSTATES,
  ...VT_US_HIGHWAYS,
  ...VT_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const VT_HIGHWAY_STATS = {
  totalHighways: 15,
  interstates: 3,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 141,
};

/**
 * Helper Functions
 */
export function getVermontHighwayById(id: string): HighwayData | undefined {
  return ALL_VT_HIGHWAYS.find(hw => hw.id === id);
}

export function getVermontHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_VT_HIGHWAYS.filter(hw => hw.highwayType === type);
}
