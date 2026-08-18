/**
 * US Highway Database
 * Major highways tracked in the Explorer system
 */

import type { ExplorerHighway } from '../types/explorer';

// Helper function to create highway ID
const createHighwayId = (type: string, number: string): string => {
  return `${type}-${number}`.toLowerCase().replace(/\s+/g, '-');
};

/**
 * Interstate Highways
 * Major cross-country interstates
 */
export const INTERSTATE_HIGHWAYS: Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>[] = [
  {
    id: createHighwayId('interstate', '5'),
    name: 'Interstate 5',
    type: 'highway',
    highwayType: 'interstate',
    number: '5',
    fullName: 'Interstate 5',
    states: ['CA', 'OR', 'WA'],
    totalExits: 790,
  },
  {
    id: createHighwayId('interstate', '10'),
    name: 'Interstate 10',
    type: 'highway',
    highwayType: 'interstate',
    number: '10',
    fullName: 'Interstate 10',
    states: ['CA', 'AZ', 'NM', 'TX', 'LA', 'MS', 'AL', 'FL'],
    totalExits: 880,
  },
  {
    id: createHighwayId('interstate', '15'),
    name: 'Interstate 15',
    type: 'highway',
    highwayType: 'interstate',
    number: '15',
    fullName: 'Interstate 15',
    states: ['CA', 'NV', 'AZ', 'UT', 'ID', 'MT'],
    totalExits: 585,
  },
  {
    id: createHighwayId('interstate', '20'),
    name: 'Interstate 20',
    type: 'highway',
    highwayType: 'interstate',
    number: '20',
    fullName: 'Interstate 20',
    states: ['TX', 'LA', 'MS', 'AL', 'GA', 'SC'],
    totalExits: 535,
  },
  {
    id: createHighwayId('interstate', '25'),
    name: 'Interstate 25',
    type: 'highway',
    highwayType: 'interstate',
    number: '25',
    fullName: 'Interstate 25',
    states: ['NM', 'CO', 'WY'],
    totalExits: 460,
  },
  {
    id: createHighwayId('interstate', '35'),
    name: 'Interstate 35',
    type: 'highway',
    highwayType: 'interstate',
    number: '35',
    fullName: 'Interstate 35',
    states: ['TX', 'OK', 'KS', 'MO', 'IA', 'MN'],
    totalExits: 505,
  },
  {
    id: createHighwayId('interstate', '40'),
    name: 'Interstate 40',
    type: 'highway',
    highwayType: 'interstate',
    number: '40',
    fullName: 'Interstate 40',
    states: ['CA', 'AZ', 'NM', 'TX', 'OK', 'AR', 'TN', 'NC'],
    totalExits: 655,
  },
  {
    id: createHighwayId('interstate', '45'),
    name: 'Interstate 45',
    type: 'highway',
    highwayType: 'interstate',
    number: '45',
    fullName: 'Interstate 45',
    states: ['TX'],
    totalExits: 286,
  },
  {
    id: createHighwayId('interstate', '70'),
    name: 'Interstate 70',
    type: 'highway',
    highwayType: 'interstate',
    number: '70',
    fullName: 'Interstate 70',
    states: ['UT', 'CO', 'KS', 'MO', 'IL', 'IN', 'OH', 'WV', 'PA', 'MD'],
    totalExits: 699,
  },
  {
    id: createHighwayId('interstate', '75'),
    name: 'Interstate 75',
    type: 'highway',
    highwayType: 'interstate',
    number: '75',
    fullName: 'Interstate 75',
    states: ['FL', 'GA', 'TN', 'KY', 'OH', 'MI'],
    totalExits: 786,
  },
  {
    id: createHighwayId('interstate', '80'),
    name: 'Interstate 80',
    type: 'highway',
    highwayType: 'interstate',
    number: '80',
    fullName: 'Interstate 80',
    states: ['CA', 'NV', 'UT', 'WY', 'NE', 'IA', 'IL', 'IN', 'OH', 'PA', 'NJ'],
    totalExits: 911,
  },
  {
    id: createHighwayId('interstate', '90'),
    name: 'Interstate 90',
    type: 'highway',
    highwayType: 'interstate',
    number: '90',
    fullName: 'Interstate 90',
    states: ['WA', 'ID', 'MT', 'WY', 'SD', 'MN', 'WI', 'IL', 'IN', 'OH', 'PA', 'NY', 'MA'],
    totalExits: 1020,
  },
  {
    id: createHighwayId('interstate', '95'),
    name: 'Interstate 95',
    type: 'highway',
    highwayType: 'interstate',
    number: '95',
    fullName: 'Interstate 95',
    states: ['FL', 'GA', 'SC', 'NC', 'VA', 'MD', 'DE', 'PA', 'NJ', 'NY', 'CT', 'RI', 'MA', 'NH', 'ME'],
    totalExits: 1065,
  },
];

/**
 * US Highways (Federal)
 * Historic and major US routes
 */
export const US_HIGHWAYS: Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>[] = [
  {
    id: createHighwayId('us', '1'),
    name: 'US Route 1',
    type: 'highway',
    highwayType: 'us-highway',
    number: '1',
    fullName: 'US Route 1',
    states: ['FL', 'GA', 'SC', 'NC', 'VA', 'MD', 'DE', 'PA', 'NJ', 'NY', 'CT', 'RI', 'MA', 'NH', 'ME'],
    totalExits: 450,
  },
  {
    id: createHighwayId('us', '50'),
    name: 'US Route 50',
    type: 'highway',
    highwayType: 'us-highway',
    number: '50',
    fullName: 'US Route 50',
    states: ['CA', 'NV', 'UT', 'CO', 'KS', 'MO', 'IL', 'IN', 'OH', 'WV', 'VA', 'MD'],
    totalExits: 280,
  },
  {
    id: createHighwayId('us', '66'),
    name: 'US Route 66',
    type: 'highway',
    highwayType: 'us-highway',
    number: '66',
    fullName: 'Historic Route 66',
    states: ['IL', 'MO', 'KS', 'OK', 'TX', 'NM', 'AZ', 'CA'],
    totalExits: 420,
  },
  {
    id: createHighwayId('us', '101'),
    name: 'US Route 101',
    type: 'highway',
    highwayType: 'us-highway',
    number: '101',
    fullName: 'US Route 101',
    states: ['CA', 'OR', 'WA'],
    totalExits: 385,
  },
];

/**
 * Texas-specific highways
 * Import from comprehensive Texas database
 */
import { ALL_TEXAS_HIGHWAYS } from './texas-highways-complete';
export const TEXAS_HIGHWAYS = ALL_TEXAS_HIGHWAYS;

/**
 * All highways combined
 */
export const ALL_HIGHWAYS = [
  ...INTERSTATE_HIGHWAYS,
  ...US_HIGHWAYS,
  ...TEXAS_HIGHWAYS,
];

/**
 * Get highway by ID
 */
export function getHighwayById(id: string) {
  return ALL_HIGHWAYS.find(hw => hw.id === id);
}

/**
 * Get highways by state
 */
export function getHighwaysByState(stateAbbr: string) {
  return ALL_HIGHWAYS.filter(hw => hw.states.includes(stateAbbr));
}

/**
 * Get highways by type
 */
export function getHighwaysByType(type: ExplorerHighway['highwayType']) {
  return ALL_HIGHWAYS.filter(hw => hw.highwayType === type);
}

