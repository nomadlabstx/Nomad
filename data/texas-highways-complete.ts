/**
 * Complete Texas Highway Database
 * All Interstates, US Highways, State Highways, and major FM/Ranch Roads in Texas
 * 
 * Data organized by highway type for easy maintenance and expansion
 */

import type { ExplorerHighway } from '../types/explorer';

const createHighwayId = (type: string, number: string, direction?: string): string => {
  const base = `${type}-${number}`.toLowerCase().replace(/\s+/g, '-');
  return direction ? `${base}-${direction}` : base;
};

const createDirectionalHighway = (
  baseHighway: Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent' | 'direction' | 'parentHighwayId'>,
  direction: 'north' | 'south' | 'east' | 'west',
  exitCount: number
): Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'> => {
  const directionLabel = direction.charAt(0).toUpperCase() + direction.slice(1);
  return {
    ...baseHighway,
    id: createHighwayId(baseHighway.highwayType, baseHighway.number, direction),
    name: `${baseHighway.name} ${directionLabel}`,
    fullName: `${baseHighway.fullName} ${directionLabel}`,
    direction,
    parentHighwayId: baseHighway.id,
    totalExits: exitCount,
  };
};

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

/**
 * INTERSTATE HIGHWAYS IN TEXAS (17 base highways → 28 with directional splits)
 * All Interstate highways that pass through Texas
 * Major highways are split by direction (North/South or East/West)
 * Loop/Spur highways are not split (circular or short routes)
 */

// Base highway definitions (for creating directional variants)
const I10_BASE = { id: createHighwayId('interstate', '10'), name: 'Interstate 10', type: 'highway' as const, highwayType: 'interstate' as const, number: '10', fullName: 'Interstate 10', states: ['TX'], totalExits: 278 };
const I20_BASE = { id: createHighwayId('interstate', '20'), name: 'Interstate 20', type: 'highway' as const, highwayType: 'interstate' as const, number: '20', fullName: 'Interstate 20', states: ['TX'], totalExits: 186 };
const I30_BASE = { id: createHighwayId('interstate', '30'), name: 'Interstate 30', type: 'highway' as const, highwayType: 'interstate' as const, number: '30', fullName: 'Interstate 30', states: ['TX'], totalExits: 72 };
const I40_BASE = { id: createHighwayId('interstate', '40'), name: 'Interstate 40', type: 'highway' as const, highwayType: 'interstate' as const, number: '40', fullName: 'Interstate 40', states: ['TX'], totalExits: 36 };
const I35_BASE = { id: createHighwayId('interstate', '35'), name: 'Interstate 35', type: 'highway' as const, highwayType: 'interstate' as const, number: '35', fullName: 'Interstate 35', states: ['TX'], totalExits: 232 };
const I35E_BASE = { id: createHighwayId('interstate', '35E'), name: 'Interstate 35E', type: 'highway' as const, highwayType: 'interstate' as const, number: '35E', fullName: 'Interstate 35E (Dallas)', states: ['TX'], totalExits: 56 };
const I35W_BASE = { id: createHighwayId('interstate', '35W'), name: 'Interstate 35W', type: 'highway' as const, highwayType: 'interstate' as const, number: '35W', fullName: 'Interstate 35W (Fort Worth)', states: ['TX'], totalExits: 64 };
const I37_BASE = { id: createHighwayId('interstate', '37'), name: 'Interstate 37', type: 'highway' as const, highwayType: 'interstate' as const, number: '37', fullName: 'Interstate 37', states: ['TX'], totalExits: 142 };
const I45_BASE = { id: createHighwayId('interstate', '45'), name: 'Interstate 45', type: 'highway' as const, highwayType: 'interstate' as const, number: '45', fullName: 'Interstate 45', states: ['TX'], totalExits: 286 };
const I27_BASE = { id: createHighwayId('interstate', '27'), name: 'Interstate 27', type: 'highway' as const, highwayType: 'interstate' as const, number: '27', fullName: 'Interstate 27', states: ['TX'], totalExits: 124 };
const I69_BASE = { id: createHighwayId('interstate', '69'), name: 'Interstate 69', type: 'highway' as const, highwayType: 'interstate' as const, number: '69', fullName: 'Interstate 69', states: ['TX'], totalExits: 48 };

export const TEXAS_INTERSTATES: HighwayData[] = [
  // Major East-West Interstates (split into East/West)
  createDirectionalHighway(I10_BASE, 'east', 139),  // I-10 East (Houston → Louisiana)
  createDirectionalHighway(I10_BASE, 'west', 139),  // I-10 West (Louisiana → El Paso)
  createDirectionalHighway(I20_BASE, 'east', 93),   // I-20 East (DFW → Louisiana)
  createDirectionalHighway(I20_BASE, 'west', 93),   // I-20 West (Louisiana → Midland)
  createDirectionalHighway(I30_BASE, 'east', 36),   // I-30 East (DFW → Arkansas)
  createDirectionalHighway(I30_BASE, 'west', 36),   // I-30 West (Arkansas → Fort Worth)
  createDirectionalHighway(I40_BASE, 'east', 18),   // I-40 East (Amarillo → Oklahoma)
  createDirectionalHighway(I40_BASE, 'west', 18),   // I-40 West (Oklahoma → New Mexico)
  
  // Major North-South Interstates (split into North/South)
  createDirectionalHighway(I35_BASE, 'north', 116), // I-35 North (San Antonio → Oklahoma)
  createDirectionalHighway(I35_BASE, 'south', 116), // I-35 South (Oklahoma → Laredo)
  createDirectionalHighway(I35E_BASE, 'north', 28), // I-35E North (Dallas area)
  createDirectionalHighway(I35E_BASE, 'south', 28), // I-35E South (Dallas area)
  createDirectionalHighway(I35W_BASE, 'north', 32), // I-35W North (Fort Worth area)
  createDirectionalHighway(I35W_BASE, 'south', 32), // I-35W South (Fort Worth area)
  createDirectionalHighway(I37_BASE, 'north', 71),  // I-37 North (Corpus → San Antonio)
  createDirectionalHighway(I37_BASE, 'south', 71),  // I-37 South (San Antonio → Corpus)
  createDirectionalHighway(I45_BASE, 'north', 143), // I-45 North (Houston → Dallas)
  createDirectionalHighway(I45_BASE, 'south', 143), // I-45 South (Dallas → Galveston)
  createDirectionalHighway(I27_BASE, 'north', 62),  // I-27 North (Lubbock → Amarillo)
  createDirectionalHighway(I27_BASE, 'south', 62),  // I-27 South (Amarillo → Lubbock)
  createDirectionalHighway(I69_BASE, 'north', 24),  // I-69 North (RGV → Houston)
  createDirectionalHighway(I69_BASE, 'south', 24),  // I-69 South (Houston → RGV)
  
  // Loop/Spur Interstates (NOT split - circular or short routes)
  { id: createHighwayId('interstate', '410'), name: 'Interstate 410', type: 'highway', highwayType: 'interstate', number: '410', fullName: 'Interstate 410 (San Antonio Loop)', states: ['TX'], totalExits: 53 },
  { id: createHighwayId('interstate', '610'), name: 'Interstate 610', type: 'highway', highwayType: 'interstate', number: '610', fullName: 'Interstate 610 (Houston Loop)', states: ['TX'], totalExits: 38 },
  { id: createHighwayId('interstate', '820'), name: 'Interstate 820', type: 'highway', highwayType: 'interstate', number: '820', fullName: 'Interstate 820 (Fort Worth Loop)', states: ['TX'], totalExits: 34 },
  { id: createHighwayId('interstate', '635'), name: 'Interstate 635', type: 'highway', highwayType: 'interstate', number: '635', fullName: 'Interstate 635 (LBJ Freeway)', states: ['TX'], totalExits: 36 },
  { id: createHighwayId('interstate', '345'), name: 'Interstate 345', type: 'highway', highwayType: 'interstate', number: '345', fullName: 'Interstate 345 (Dallas)', states: ['TX'], totalExits: 8 },
  { id: createHighwayId('interstate', '110'), name: 'Interstate 110', type: 'highway', highwayType: 'interstate', number: '110', fullName: 'Interstate 110 (El Paso)', states: ['TX'], totalExits: 12 },
];

/**
 * US HIGHWAYS IN TEXAS (28 base routes → with directional splits for major routes)
 * Federal highways that pass through Texas
 * Major long-distance routes split by direction, regional routes kept single
 */

// Base US Highway definitions (major routes that warrant directional split)
const US59_BASE = { id: createHighwayId('us', '59'), name: 'US Highway 59', type: 'highway' as const, highwayType: 'us-highway' as const, number: '59', fullName: 'US Highway 59', states: ['TX'], totalExits: 185 };
const US77_BASE = { id: createHighwayId('us', '77'), name: 'US Highway 77', type: 'highway' as const, highwayType: 'us-highway' as const, number: '77', fullName: 'US Highway 77', states: ['TX'], totalExits: 168 };
const US281_BASE = { id: createHighwayId('us', '281'), name: 'US Highway 281', type: 'highway' as const, highwayType: 'us-highway' as const, number: '281', fullName: 'US Highway 281', states: ['TX'], totalExits: 324 };
const US287_BASE = { id: createHighwayId('us', '287'), name: 'US Highway 287', type: 'highway' as const, highwayType: 'us-highway' as const, number: '287', fullName: 'US Highway 287', states: ['TX'], totalExits: 245 };
const US83_BASE = { id: createHighwayId('us', '83'), name: 'US Highway 83', type: 'highway' as const, highwayType: 'us-highway' as const, number: '83', fullName: 'US Highway 83', states: ['TX'], totalExits: 245 };
const US90_BASE = { id: createHighwayId('us', '90'), name: 'US Highway 90', type: 'highway' as const, highwayType: 'us-highway' as const, number: '90', fullName: 'US Highway 90', states: ['TX'], totalExits: 234 };
const US290_BASE = { id: createHighwayId('us', '290'), name: 'US Highway 290', type: 'highway' as const, highwayType: 'us-highway' as const, number: '290', fullName: 'US Highway 290', states: ['TX'], totalExits: 168 };

export const TEXAS_US_HIGHWAYS: HighwayData[] = [
  // Major North-South US Highways (split into North/South)
  createDirectionalHighway(US59_BASE, 'north', 93),   // US-59 North (Houston → Texarkana)
  createDirectionalHighway(US59_BASE, 'south', 92),   // US-59 South (Texarkana → Laredo)
  createDirectionalHighway(US77_BASE, 'north', 84),   // US-77 North (Brownsville → Oklahoma)
  createDirectionalHighway(US77_BASE, 'south', 84),   // US-77 South (Oklahoma → Brownsville)
  createDirectionalHighway(US281_BASE, 'north', 162), // US-281 North (RGV → Oklahoma)
  createDirectionalHighway(US281_BASE, 'south', 162), // US-281 South (Oklahoma → RGV)
  createDirectionalHighway(US287_BASE, 'north', 123), // US-287 North (Port Arthur → Amarillo)
  createDirectionalHighway(US287_BASE, 'south', 122), // US-287 South (Amarillo → Port Arthur)
  createDirectionalHighway(US83_BASE, 'north', 123),  // US-83 North (RGV → Panhandle)
  createDirectionalHighway(US83_BASE, 'south', 122),  // US-83 South (Panhandle → RGV)
  
  // Major East-West US Highways (split into East/West)
  createDirectionalHighway(US90_BASE, 'east', 117),   // US-90 East (San Antonio → Louisiana)
  createDirectionalHighway(US90_BASE, 'west', 117),   // US-90 West (Louisiana → El Paso)
  createDirectionalHighway(US290_BASE, 'east', 84),   // US-290 East (Austin → Houston)
  createDirectionalHighway(US290_BASE, 'west', 84),   // US-290 West (Houston → Junction)
  
  // Regional/Smaller US Routes (NOT split - shorter distances or regional coverage)
  { id: createHighwayId('us', '67'), name: 'US Highway 67', type: 'highway', highwayType: 'us-highway', number: '67', fullName: 'US Highway 67', states: ['TX'], totalExits: 142 },
  { id: createHighwayId('us', '69'), name: 'US Highway 69', type: 'highway', highwayType: 'us-highway', number: '69', fullName: 'US Highway 69', states: ['TX'], totalExits: 98 },
  { id: createHighwayId('us', '75'), name: 'US Highway 75', type: 'highway', highwayType: 'us-highway', number: '75', fullName: 'US Highway 75', states: ['TX'], totalExits: 156 },
  { id: createHighwayId('us', '79'), name: 'US Highway 79', type: 'highway', highwayType: 'us-highway', number: '79', fullName: 'US Highway 79', states: ['TX'], totalExits: 124 },
  { id: createHighwayId('us', '80'), name: 'US Highway 80', type: 'highway', highwayType: 'us-highway', number: '80', fullName: 'US Highway 80', states: ['TX'], totalExits: 145 },
  { id: createHighwayId('us', '81'), name: 'US Highway 81', type: 'highway', highwayType: 'us-highway', number: '81', fullName: 'US Highway 81', states: ['TX'], totalExits: 86 },
  { id: createHighwayId('us', '82'), name: 'US Highway 82', type: 'highway', highwayType: 'us-highway', number: '82', fullName: 'US Highway 82', states: ['TX'], totalExits: 128 },
  { id: createHighwayId('us', '84'), name: 'US Highway 84', type: 'highway', highwayType: 'us-highway', number: '84', fullName: 'US Highway 84', states: ['TX'], totalExits: 168 },
  { id: createHighwayId('us', '87'), name: 'US Highway 87', type: 'highway', highwayType: 'us-highway', number: '87', fullName: 'US Highway 87', states: ['TX'], totalExits: 196 },
  { id: createHighwayId('us', '96'), name: 'US Highway 96', type: 'highway', highwayType: 'us-highway', number: '96', fullName: 'US Highway 96', states: ['TX'], totalExits: 76 },
  { id: createHighwayId('us', '175'), name: 'US Highway 175', type: 'highway', highwayType: 'us-highway', number: '175', fullName: 'US Highway 175', states: ['TX'], totalExits: 64 },
  { id: createHighwayId('us', '180'), name: 'US Highway 180', type: 'highway', highwayType: 'us-highway', number: '180', fullName: 'US Highway 180', states: ['TX'], totalExits: 158 },
  { id: createHighwayId('us', '181'), name: 'US Highway 181', type: 'highway', highwayType: 'us-highway', number: '181', fullName: 'US Highway 181', states: ['TX'], totalExits: 142 },
  { id: createHighwayId('us', '183'), name: 'US Highway 183', type: 'highway', highwayType: 'us-highway', number: '183', fullName: 'US Highway 183', states: ['TX'], totalExits: 176 },
  { id: createHighwayId('us', '190'), name: 'US Highway 190', type: 'highway', highwayType: 'us-highway', number: '190', fullName: 'US Highway 190', states: ['TX'], totalExits: 186 },
  { id: createHighwayId('us', '277'), name: 'US Highway 277', type: 'highway', highwayType: 'us-highway', number: '277', fullName: 'US Highway 277', states: ['TX'], totalExits: 134 },
  { id: createHighwayId('us', '377'), name: 'US Highway 377', type: 'highway', highwayType: 'us-highway', number: '377', fullName: 'US Highway 377', states: ['TX'], totalExits: 156 },
  { id: createHighwayId('us', '380'), name: 'US Highway 380', type: 'highway', highwayType: 'us-highway', number: '380', fullName: 'US Highway 380', states: ['TX'], totalExits: 184 },
  { id: createHighwayId('us', '385'), name: 'US Highway 385', type: 'highway', highwayType: 'us-highway', number: '385', fullName: 'US Highway 385', states: ['TX'], totalExits: 142 },
];

/**
 * TEXAS STATE HIGHWAYS (Major routes)
 * State-maintained highways with significant traffic
 */
export const TEXAS_STATE_HIGHWAYS: HighwayData[] = [
  // Major Metro Area Highways
  { id: createHighwayId('sh', '6'), name: 'State Highway 6', type: 'highway', highwayType: 'state-highway', number: '6', fullName: 'Texas State Highway 6', states: ['TX'], totalExits: 245 },
  { id: createHighwayId('sh', '7'), name: 'State Highway 7', type: 'highway', highwayType: 'state-highway', number: '7', fullName: 'Texas State Highway 7', states: ['TX'], totalExits: 124 },
  { id: createHighwayId('sh', '16'), name: 'State Highway 16', type: 'highway', highwayType: 'state-highway', number: '16', fullName: 'Texas State Highway 16', states: ['TX'], totalExits: 156 },
  { id: createHighwayId('sh', '21'), name: 'State Highway 21', type: 'highway', highwayType: 'state-highway', number: '21', fullName: 'Texas State Highway 21', states: ['TX'], totalExits: 142 },
  { id: createHighwayId('sh', '36'), name: 'State Highway 36', type: 'highway', highwayType: 'state-highway', number: '36', fullName: 'Texas State Highway 36', states: ['TX'], totalExits: 98 },
  { id: createHighwayId('sh', '71'), name: 'State Highway 71', type: 'highway', highwayType: 'state-highway', number: '71', fullName: 'Texas State Highway 71', states: ['TX'], totalExits: 168 },
  { id: createHighwayId('sh', '114'), name: 'State Highway 114', type: 'highway', highwayType: 'state-highway', number: '114', fullName: 'Texas State Highway 114', states: ['TX'], totalExits: 86 },
  { id: createHighwayId('sh', '121'), name: 'State Highway 121', type: 'highway', highwayType: 'state-highway', number: '121', fullName: 'Texas State Highway 121', states: ['TX'], totalExits: 124 },
  { id: createHighwayId('sh', '123'), name: 'State Highway 123', type: 'highway', highwayType: 'state-highway', number: '123', fullName: 'Texas State Highway 123', states: ['TX'], totalExits: 76 },
  { id: createHighwayId('sh', '130'), name: 'State Highway 130', type: 'highway', highwayType: 'state-highway', number: '130', fullName: 'Texas State Highway 130 (Toll)', states: ['TX'], totalExits: 72 },
  { id: createHighwayId('sh', '146'), name: 'State Highway 146', type: 'highway', highwayType: 'state-highway', number: '146', fullName: 'Texas State Highway 146', states: ['TX'], totalExits: 98 },
  { id: createHighwayId('sh', '183'), name: 'State Highway 183', type: 'highway', highwayType: 'state-highway', number: '183', fullName: 'Texas State Highway 183', states: ['TX'], totalExits: 124 },
  { id: createHighwayId('sh', '190'), name: 'State Highway 190', type: 'highway', highwayType: 'state-highway', number: '190', fullName: 'Texas State Highway 190', states: ['TX'], totalExits: 86 },
  { id: createHighwayId('sh', '249'), name: 'State Highway 249', type: 'highway', highwayType: 'state-highway', number: '249', fullName: 'Texas State Highway 249', states: ['TX'], totalExits: 64 },
  { id: createHighwayId('sh', '288'), name: 'State Highway 288', type: 'highway', highwayType: 'state-highway', number: '288', fullName: 'Texas State Highway 288 (Toll)', states: ['TX'], totalExits: 42 },
  { id: createHighwayId('sh', '289'), name: 'State Highway 289', type: 'highway', highwayType: 'state-highway', number: '289', fullName: 'Texas State Highway 289', states: ['TX'], totalExits: 54 },
  { id: createHighwayId('sh', '290'), name: 'State Highway 290', type: 'highway', highwayType: 'state-highway', number: '290', fullName: 'Texas State Highway 290', states: ['TX'], totalExits: 98 },
  { id: createHighwayId('sh', '360'), name: 'State Highway 360', type: 'highway', highwayType: 'state-highway', number: '360', fullName: 'Texas State Highway 360', states: ['TX'], totalExits: 48 },
  { id: createHighwayId('sh', '99'), name: 'State Highway 99', type: 'highway', highwayType: 'state-highway', number: '99', fullName: 'Texas State Highway 99 (Grand Parkway)', states: ['TX'], totalExits: 76 },
  { id: createHighwayId('sh', '45'), name: 'State Highway 45', type: 'highway', highwayType: 'state-highway', number: '45', fullName: 'Texas State Highway 45 (Toll)', states: ['TX'], totalExits: 34 },
];

/**
 * FARM-TO-MARKET ROADS (Most traveled/significant)
 * Texas has 2,700+ FM roads - these are the most significant
 */
export const TEXAS_FM_ROADS: HighwayData[] = [
  // Austin Area
  { id: createHighwayId('fm', '620'), name: 'FM 620', type: 'highway', highwayType: 'fm-road', number: '620', fullName: 'Farm to Market Road 620', states: ['TX'], totalExits: 28 },
  { id: createHighwayId('fm', '969'), name: 'FM 969', type: 'highway', highwayType: 'fm-road', number: '969', fullName: 'Farm to Market Road 969', states: ['TX'], totalExits: 24 },
  { id: createHighwayId('fm', '973'), name: 'FM 973', type: 'highway', highwayType: 'fm-road', number: '973', fullName: 'Farm to Market Road 973', states: ['TX'], totalExits: 18 },
  { id: createHighwayId('fm', '1325'), name: 'FM 1325', type: 'highway', highwayType: 'fm-road', number: '1325', fullName: 'Farm to Market Road 1325', states: ['TX'], totalExits: 22 },
  { id: createHighwayId('fm', '1431'), name: 'FM 1431', type: 'highway', highwayType: 'fm-road', number: '1431', fullName: 'Farm to Market Road 1431', states: ['TX'], totalExits: 32 },
  { id: createHighwayId('fm', '1826'), name: 'FM 1826', type: 'highway', highwayType: 'fm-road', number: '1826', fullName: 'Farm to Market Road 1826', states: ['TX'], totalExits: 16 },
  { id: createHighwayId('fm', '2222'), name: 'FM 2222', type: 'highway', highwayType: 'fm-road', number: '2222', fullName: 'Farm to Market Road 2222 (Koenig Lane)', states: ['TX'], totalExits: 32 },
  { id: createHighwayId('fm', '2244'), name: 'FM 2244', type: 'highway', highwayType: 'fm-road', number: '2244', fullName: 'Farm to Market Road 2244 (Bee Cave Rd)', states: ['TX'], totalExits: 18 },
  { id: createHighwayId('fm', '2769'), name: 'FM 2769', type: 'highway', highwayType: 'fm-road', number: '2769', fullName: 'Farm to Market Road 2769', states: ['TX'], totalExits: 14 },
  { id: createHighwayId('fm', '3177'), name: 'FM 3177', type: 'highway', highwayType: 'fm-road', number: '3177', fullName: 'Farm to Market Road 3177', states: ['TX'], totalExits: 12 },
  
  // Houston Area
  { id: createHighwayId('fm', '518'), name: 'FM 518', type: 'highway', highwayType: 'fm-road', number: '518', fullName: 'Farm to Market Road 518', states: ['TX'], totalExits: 36 },
  { id: createHighwayId('fm', '521'), name: 'FM 521', type: 'highway', highwayType: 'fm-road', number: '521', fullName: 'Farm to Market Road 521', states: ['TX'], totalExits: 42 },
  { id: createHighwayId('fm', '529'), name: 'FM 529', type: 'highway', highwayType: 'fm-road', number: '529', fullName: 'Farm to Market Road 529', states: ['TX'], totalExits: 28 },
  { id: createHighwayId('fm', '762'), name: 'FM 762', type: 'highway', highwayType: 'fm-road', number: '762', fullName: 'Farm to Market Road 762', states: ['TX'], totalExits: 24 },
  { id: createHighwayId('fm', '1092'), name: 'FM 1092', type: 'highway', highwayType: 'fm-road', number: '1092', fullName: 'Farm to Market Road 1092', states: ['TX'], totalExits: 32 },
  { id: createHighwayId('fm', '1093'), name: 'FM 1093', type: 'highway', highwayType: 'fm-road', number: '1093', fullName: 'Farm to Market Road 1093', states: ['TX'], totalExits: 38 },
  { id: createHighwayId('fm', '1488'), name: 'FM 1488', type: 'highway', highwayType: 'fm-road', number: '1488', fullName: 'Farm to Market Road 1488', states: ['TX'], totalExits: 28 },
  { id: createHighwayId('fm', '1960'), name: 'FM 1960', type: 'highway', highwayType: 'fm-road', number: '1960', fullName: 'Farm to Market Road 1960', states: ['TX'], totalExits: 45 },
  { id: createHighwayId('fm', '2100'), name: 'FM 2100', type: 'highway', highwayType: 'fm-road', number: '2100', fullName: 'Farm to Market Road 2100', states: ['TX'], totalExits: 22 },
  { id: createHighwayId('fm', '2920'), name: 'FM 2920', type: 'highway', highwayType: 'fm-road', number: '2920', fullName: 'Farm to Market Road 2920', states: ['TX'], totalExits: 34 },
  { id: createHighwayId('fm', '2978'), name: 'FM 2978', type: 'highway', highwayType: 'fm-road', number: '2978', fullName: 'Farm to Market Road 2978', states: ['TX'], totalExits: 18 },
  
  // Dallas-Fort Worth Area
  { id: createHighwayId('fm', '157'), name: 'FM 157', type: 'highway', highwayType: 'fm-road', number: '157', fullName: 'Farm to Market Road 157', states: ['TX'], totalExits: 26 },
  { id: createHighwayId('fm', '407'), name: 'FM 407', type: 'highway', highwayType: 'fm-road', number: '407', fullName: 'Farm to Market Road 407', states: ['TX'], totalExits: 38 },
  { id: createHighwayId('fm', '423'), name: 'FM 423', type: 'highway', highwayType: 'fm-road', number: '423', fullName: 'Farm to Market Road 423', states: ['TX'], totalExits: 22 },
  { id: createHighwayId('fm', '544'), name: 'FM 544', type: 'highway', highwayType: 'fm-road', number: '544', fullName: 'Farm to Market Road 544', states: ['TX'], totalExits: 18 },
  { id: createHighwayId('fm', '720'), name: 'FM 720', type: 'highway', highwayType: 'fm-road', number: '720', fullName: 'Farm to Market Road 720', states: ['TX'], totalExits: 16 },
  { id: createHighwayId('fm', '1171'), name: 'FM 1171', type: 'highway', highwayType: 'fm-road', number: '1171', fullName: 'Farm to Market Road 1171', states: ['TX'], totalExits: 24 },
  { id: createHighwayId('fm', '1187'), name: 'FM 1187', type: 'highway', highwayType: 'fm-road', number: '1187', fullName: 'Farm to Market Road 1187', states: ['TX'], totalExits: 28 },
  { id: createHighwayId('fm', '1938'), name: 'FM 1938', type: 'highway', highwayType: 'fm-road', number: '1938', fullName: 'Farm to Market Road 1938', states: ['TX'], totalExits: 14 },
  { id: createHighwayId('fm', '2181'), name: 'FM 2181', type: 'highway', highwayType: 'fm-road', number: '2181', fullName: 'Farm to Market Road 2181', states: ['TX'], totalExits: 16 },
  { id: createHighwayId('fm', '2499'), name: 'FM 2499', type: 'highway', highwayType: 'fm-road', number: '2499', fullName: 'Farm to Market Road 2499', states: ['TX'], totalExits: 20 },
  
  // San Antonio Area
  { id: createHighwayId('fm', '78'), name: 'FM 78', type: 'highway', highwayType: 'fm-road', number: '78', fullName: 'Farm to Market Road 78', states: ['TX'], totalExits: 32 },
  { id: createHighwayId('fm', '471'), name: 'FM 471', type: 'highway', highwayType: 'fm-road', number: '471', fullName: 'Farm to Market Road 471', states: ['TX'], totalExits: 24 },
  { id: createHighwayId('fm', '1518'), name: 'FM 1518', type: 'highway', highwayType: 'fm-road', number: '1518', fullName: 'Farm to Market Road 1518', states: ['TX'], totalExits: 28 },
  { id: createHighwayId('fm', '1604'), name: 'FM 1604', type: 'highway', highwayType: 'fm-road', number: '1604', fullName: 'Farm to Market Road 1604 (Loop 1604)', states: ['TX'], totalExits: 54 },
  { id: createHighwayId('fm', '2252'), name: 'FM 2252', type: 'highway', highwayType: 'fm-road', number: '2252', fullName: 'Farm to Market Road 2252', states: ['TX'], totalExits: 18 },
  { id: createHighwayId('fm', '3009'), name: 'FM 3009', type: 'highway', highwayType: 'fm-road', number: '3009', fullName: 'Farm to Market Road 3009', states: ['TX'], totalExits: 16 },
  
  // Other Major FM Roads
  { id: createHighwayId('fm', '66'), name: 'FM 66', type: 'highway', highwayType: 'fm-road', number: '66', fullName: 'Farm to Market Road 66', states: ['TX'], totalExits: 28 },
  { id: createHighwayId('fm', '150'), name: 'FM 150', type: 'highway', highwayType: 'fm-road', number: '150', fullName: 'Farm to Market Road 150', states: ['TX'], totalExits: 24 },
  { id: createHighwayId('fm', '1101'), name: 'FM 1101', type: 'highway', highwayType: 'fm-road', number: '1101', fullName: 'Farm to Market Road 1101', states: ['TX'], totalExits: 18 },
  { id: createHighwayId('fm', '2818'), name: 'FM 2818', type: 'highway', highwayType: 'fm-road', number: '2818', fullName: 'Farm to Market Road 2818', states: ['TX'], totalExits: 22 },
];

/**
 * TEXAS RANCH ROADS (Major routes)
 * Ranch roads are similar to FM roads but typically in less populated areas
 */
export const TEXAS_RANCH_ROADS: HighwayData[] = [
  { id: createHighwayId('ranch', '12'), name: 'Ranch Road 12', type: 'highway', highwayType: 'ranch-road', number: '12', fullName: 'Ranch Road 12 (Devil\'s Backbone)', states: ['TX'], totalExits: 24 },
  { id: createHighwayId('ranch', '165'), name: 'Ranch Road 165', type: 'highway', highwayType: 'ranch-road', number: '165', fullName: 'Ranch Road 165', states: ['TX'], totalExits: 18 },
  { id: createHighwayId('ranch', '337'), name: 'Ranch Road 337', type: 'highway', highwayType: 'ranch-road', number: '337', fullName: 'Ranch Road 337', states: ['TX'], totalExits: 22 },
  { id: createHighwayId('ranch', '336'), name: 'Ranch Road 336', type: 'highway', highwayType: 'ranch-road', number: '336', fullName: 'Ranch Road 336', states: ['TX'], totalExits: 16 },
  { id: createHighwayId('ranch', '1323'), name: 'Ranch Road 1323', type: 'highway', highwayType: 'ranch-road', number: '1323', fullName: 'Ranch Road 1323', states: ['TX'], totalExits: 14 },
  { id: createHighwayId('ranch', '2325'), name: 'Ranch Road 2325', type: 'highway', highwayType: 'ranch-road', number: '2325', fullName: 'Ranch Road 2325', states: ['TX'], totalExits: 12 },
  { id: createHighwayId('ranch', '2721'), name: 'Ranch Road 2721', type: 'highway', highwayType: 'ranch-road', number: '2721', fullName: 'Ranch Road 2721', states: ['TX'], totalExits: 10 },
  { id: createHighwayId('ranch', '3238'), name: 'Ranch Road 3238', type: 'highway', highwayType: 'ranch-road', number: '3238', fullName: 'Ranch Road 3238', states: ['TX'], totalExits: 8 },
];

/**
 * ALL TEXAS HIGHWAYS COMBINED
 */
export const ALL_TEXAS_HIGHWAYS: HighwayData[] = [
  ...TEXAS_INTERSTATES,
  ...TEXAS_US_HIGHWAYS,
  ...TEXAS_STATE_HIGHWAYS,
  ...TEXAS_FM_ROADS,
  ...TEXAS_RANCH_ROADS,
];

/**
 * STATISTICS
 */
export const TEXAS_HIGHWAY_STATS = {
  totalHighways: ALL_TEXAS_HIGHWAYS.length,
  interstates: TEXAS_INTERSTATES.length,
  usHighways: TEXAS_US_HIGHWAYS.length,
  stateHighways: TEXAS_STATE_HIGHWAYS.length,
  fmRoads: TEXAS_FM_ROADS.length,
  ranchRoads: TEXAS_RANCH_ROADS.length,
  totalExits: ALL_TEXAS_HIGHWAYS.reduce((sum, hw) => sum + hw.totalExits, 0),
};

/**
 * Helper Functions
 */
export function getTexasHighwayById(id: string): HighwayData | undefined {
  return ALL_TEXAS_HIGHWAYS.find(hw => hw.id === id);
}

export function getTexasHighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {
  return ALL_TEXAS_HIGHWAYS.filter(hw => hw.highwayType === type);
}

export function getTexasHighwaysByArea(area: 'austin' | 'houston' | 'dallas' | 'san-antonio'): HighwayData[] {
  // This could be enhanced with actual geographic data
  // For now, returns all highways as they span multiple areas
  return ALL_TEXAS_HIGHWAYS;
}


