/**
 * Maine Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.816Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN ME
 */

const ME_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-95',
    name: 'Interstate 95',
    type: 'highway',
    highwayType: 'interstate',
    number: '95',
    fullName: 'Interstate 95',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 36,
  },
  {
    id: 'interstate-510',
    name: 'Interstate 510',
    type: 'highway',
    highwayType: 'interstate',
    number: '510',
    fullName: 'Interstate 510',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 17,
  },
  {
    id: 'interstate-252',
    name: 'Interstate 252',
    type: 'highway',
    highwayType: 'interstate',
    number: '252',
    fullName: 'Interstate 252',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 11,
  },
];

/**
 * US HIGHWAYS IN ME
 */

const ME_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-48',
    name: 'US Highway 48',
    type: 'highway',
    highwayType: 'us-highway',
    number: '48',
    fullName: 'US Highway 48',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 16,
  },
  {
    id: 'us-90',
    name: 'US Highway 90',
    type: 'highway',
    highwayType: 'us-highway',
    number: '90',
    fullName: 'US Highway 90',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 16,
  },
];

/**
 * STATE HIGHWAYS IN ME
 */

const ME_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'Maine State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'Maine State Route 1',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-2',
    name: 'Maine State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'Maine State Route 2',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 3,
  },
  {
    id: 'state-3',
    name: 'Maine State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'Maine State Route 3',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-4',
    name: 'Maine State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'Maine State Route 4',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-5',
    name: 'Maine State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'Maine State Route 5',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-6',
    name: 'Maine State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'Maine State Route 6',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 9,
  },
  {
    id: 'state-7',
    name: 'Maine State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'Maine State Route 7',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-8',
    name: 'Maine State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'Maine State Route 8',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-9',
    name: 'Maine State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'Maine State Route 9',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-10',
    name: 'Maine State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'Maine State Route 10',
    states: ['ME'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
];

/**
 * ALL ME HIGHWAYS
 */

export const ALL_ME_HIGHWAYS: HighwayData[] = [
  ...ME_INTERSTATES,
  ...ME_US_HIGHWAYS,
  ...ME_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const ME_HIGHWAY_STATS = {
  totalHighways: 15,
  interstates: 3,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 154,
};

/**
 * Helper Functions
 */
export function getMaineHighwayById(id: string): HighwayData | undefined {
  return ALL_ME_HIGHWAYS.find(hw => hw.id === id);
}

export function getMaineHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_ME_HIGHWAYS.filter(hw => hw.highwayType === type);
}
