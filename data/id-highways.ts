/**
 * Idaho Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.803Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN ID
 */

const ID_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-15',
    name: 'Interstate 15',
    type: 'highway',
    highwayType: 'interstate',
    number: '15',
    fullName: 'Interstate 15',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 12,
  },
  {
    id: 'interstate-84',
    name: 'Interstate 84',
    type: 'highway',
    highwayType: 'interstate',
    number: '84',
    fullName: 'Interstate 84',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 13,
  },
  {
    id: 'interstate-86',
    name: 'Interstate 86',
    type: 'highway',
    highwayType: 'interstate',
    number: '86',
    fullName: 'Interstate 86',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 10,
  },
  {
    id: 'interstate-90',
    name: 'Interstate 90',
    type: 'highway',
    highwayType: 'interstate',
    number: '90',
    fullName: 'Interstate 90',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 29,
  },
];

/**
 * US HIGHWAYS IN ID
 */

const ID_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-379',
    name: 'US Highway 379',
    type: 'highway',
    highwayType: 'us-highway',
    number: '379',
    fullName: 'US Highway 379',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 12,
  },
  {
    id: 'us-361',
    name: 'US Highway 361',
    type: 'highway',
    highwayType: 'us-highway',
    number: '361',
    fullName: 'US Highway 361',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 10,
  },
];

/**
 * STATE HIGHWAYS IN ID
 */

const ID_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'Idaho State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'Idaho State Route 1',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-2',
    name: 'Idaho State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'Idaho State Route 2',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-3',
    name: 'Idaho State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'Idaho State Route 3',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-4',
    name: 'Idaho State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'Idaho State Route 4',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-5',
    name: 'Idaho State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'Idaho State Route 5',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-6',
    name: 'Idaho State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'Idaho State Route 6',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-7',
    name: 'Idaho State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'Idaho State Route 7',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-8',
    name: 'Idaho State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'Idaho State Route 8',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 2,
  },
  {
    id: 'state-9',
    name: 'Idaho State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'Idaho State Route 9',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 2,
  },
  {
    id: 'state-10',
    name: 'Idaho State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'Idaho State Route 10',
    states: ['ID'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
];

/**
 * ALL ID HIGHWAYS
 */

export const ALL_ID_HIGHWAYS: HighwayData[] = [
  ...ID_INTERSTATES,
  ...ID_US_HIGHWAYS,
  ...ID_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const ID_HIGHWAY_STATS = {
  totalHighways: 16,
  interstates: 4,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 134,
};

/**
 * Helper Functions
 */
export function getIdahoHighwayById(id: string): HighwayData | undefined {
  return ALL_ID_HIGHWAYS.find(hw => hw.id === id);
}

export function getIdahoHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_ID_HIGHWAYS.filter(hw => hw.highwayType === type);
}
