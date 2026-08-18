/**
 * New Hampshire Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.806Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN NH
 */

const NH_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-89',
    name: 'Interstate 89',
    type: 'highway',
    highwayType: 'interstate',
    number: '89',
    fullName: 'Interstate 89',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 12,
  },
  {
    id: 'interstate-91',
    name: 'Interstate 91',
    type: 'highway',
    highwayType: 'interstate',
    number: '91',
    fullName: 'Interstate 91',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 12,
  },
  {
    id: 'interstate-93',
    name: 'Interstate 93',
    type: 'highway',
    highwayType: 'interstate',
    number: '93',
    fullName: 'Interstate 93',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 34,
  },
  {
    id: 'interstate-95',
    name: 'Interstate 95',
    type: 'highway',
    highwayType: 'interstate',
    number: '95',
    fullName: 'Interstate 95',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 20,
  },
];

/**
 * US HIGHWAYS IN NH
 */

const NH_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-412',
    name: 'US Highway 412',
    type: 'highway',
    highwayType: 'us-highway',
    number: '412',
    fullName: 'US Highway 412',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'us-481',
    name: 'US Highway 481',
    type: 'highway',
    highwayType: 'us-highway',
    number: '481',
    fullName: 'US Highway 481',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
];

/**
 * STATE HIGHWAYS IN NH
 */

const NH_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'New Hampshire State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'New Hampshire State Route 1',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-2',
    name: 'New Hampshire State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'New Hampshire State Route 2',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 2,
  },
  {
    id: 'state-3',
    name: 'New Hampshire State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'New Hampshire State Route 3',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-4',
    name: 'New Hampshire State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'New Hampshire State Route 4',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-5',
    name: 'New Hampshire State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'New Hampshire State Route 5',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-6',
    name: 'New Hampshire State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'New Hampshire State Route 6',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-7',
    name: 'New Hampshire State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'New Hampshire State Route 7',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
  {
    id: 'state-8',
    name: 'New Hampshire State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'New Hampshire State Route 8',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-9',
    name: 'New Hampshire State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'New Hampshire State Route 9',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-10',
    name: 'New Hampshire State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'New Hampshire State Route 10',
    states: ['NH'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
];

/**
 * ALL NH HIGHWAYS
 */

export const ALL_NH_HIGHWAYS: HighwayData[] = [
  ...NH_INTERSTATES,
  ...NH_US_HIGHWAYS,
  ...NH_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const NH_HIGHWAY_STATS = {
  totalHighways: 16,
  interstates: 4,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 153,
};

/**
 * Helper Functions
 */
export function getNewHampshireHighwayById(id: string): HighwayData | undefined {
  return ALL_NH_HIGHWAYS.find(hw => hw.id === id);
}

export function getNewHampshireHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_NH_HIGHWAYS.filter(hw => hw.highwayType === type);
}
