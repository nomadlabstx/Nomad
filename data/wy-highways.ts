/**
 * Wyoming Highway Database
 * Programmatically generated highway data
 * 
 * Generated: 2025-10-30T18:25:10.839Z
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN WY
 */

const WY_INTERSTATES: HighwayData[] = [
  {
    id: 'interstate-25',
    name: 'Interstate 25',
    type: 'highway',
    highwayType: 'interstate',
    number: '25',
    fullName: 'Interstate 25',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 36,
  },
  {
    id: 'interstate-80',
    name: 'Interstate 80',
    type: 'highway',
    highwayType: 'interstate',
    number: '80',
    fullName: 'Interstate 80',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 14,
  },
  {
    id: 'interstate-84',
    name: 'Interstate 84',
    type: 'highway',
    highwayType: 'interstate',
    number: '84',
    fullName: 'Interstate 84',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 29,
  },
  {
    id: 'interstate-90',
    name: 'Interstate 90',
    type: 'highway',
    highwayType: 'interstate',
    number: '90',
    fullName: 'Interstate 90',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 34,
  },
];

/**
 * US HIGHWAYS IN WY
 */

const WY_US_HIGHWAYS: HighwayData[] = [
  {
    id: 'us-455',
    name: 'US Highway 455',
    type: 'highway',
    highwayType: 'us-highway',
    number: '455',
    fullName: 'US Highway 455',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 11,
  },
  {
    id: 'us-376',
    name: 'US Highway 376',
    type: 'highway',
    highwayType: 'us-highway',
    number: '376',
    fullName: 'US Highway 376',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
];

/**
 * STATE HIGHWAYS IN WY
 */

const WY_STATE_HIGHWAYS: HighwayData[] = [
  {
    id: 'state-1',
    name: 'Wyoming State Route 1',
    type: 'highway',
    highwayType: 'state-highway',
    number: '1',
    fullName: 'Wyoming State Route 1',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-2',
    name: 'Wyoming State Route 2',
    type: 'highway',
    highwayType: 'state-highway',
    number: '2',
    fullName: 'Wyoming State Route 2',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-3',
    name: 'Wyoming State Route 3',
    type: 'highway',
    highwayType: 'state-highway',
    number: '3',
    fullName: 'Wyoming State Route 3',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 8,
  },
  {
    id: 'state-4',
    name: 'Wyoming State Route 4',
    type: 'highway',
    highwayType: 'state-highway',
    number: '4',
    fullName: 'Wyoming State Route 4',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 2,
  },
  {
    id: 'state-5',
    name: 'Wyoming State Route 5',
    type: 'highway',
    highwayType: 'state-highway',
    number: '5',
    fullName: 'Wyoming State Route 5',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-6',
    name: 'Wyoming State Route 6',
    type: 'highway',
    highwayType: 'state-highway',
    number: '6',
    fullName: 'Wyoming State Route 6',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 4,
  },
  {
    id: 'state-7',
    name: 'Wyoming State Route 7',
    type: 'highway',
    highwayType: 'state-highway',
    number: '7',
    fullName: 'Wyoming State Route 7',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-8',
    name: 'Wyoming State Route 8',
    type: 'highway',
    highwayType: 'state-highway',
    number: '8',
    fullName: 'Wyoming State Route 8',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 5,
  },
  {
    id: 'state-9',
    name: 'Wyoming State Route 9',
    type: 'highway',
    highwayType: 'state-highway',
    number: '9',
    fullName: 'Wyoming State Route 9',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 7,
  },
  {
    id: 'state-10',
    name: 'Wyoming State Route 10',
    type: 'highway',
    highwayType: 'state-highway',
    number: '10',
    fullName: 'Wyoming State Route 10',
    states: ['WY'],
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 6,
  },
];

/**
 * ALL WY HIGHWAYS
 */

export const ALL_WY_HIGHWAYS: HighwayData[] = [
  ...WY_INTERSTATES,
  ...WY_US_HIGHWAYS,
  ...WY_STATE_HIGHWAYS,
];

/**
 * STATISTICS
 */
export const WY_HIGHWAY_STATS = {
  totalHighways: 16,
  interstates: 4,
  usHighways: 2,
  stateHighways: 10,
  totalExits: 189,
};

/**
 * Helper Functions
 */
export function getWyomingHighwayById(id: string): HighwayData | undefined {
  return ALL_WY_HIGHWAYS.find(hw => hw.id === id);
}

export function getWyomingHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_WY_HIGHWAYS.filter(hw => hw.highwayType === type);
}
