/**
 * Texas Highway Exit Data Mapping
 * Maps highway IDs to their exit data
 * 
 * Generated: 2025-11-04
 * 
 * This file provides a mapping from highway IDs (e.g., "interstate-10-east")
 * to their exit data arrays. Use this in explorer.ts to populate exits.
 */

import type { ExplorerHighwayExit } from '../types/explorer';
import * as ExitData from './texas-highway-exits-integrated';

/**
 * Map highway IDs to their exit data
 * Key: highway ID (e.g., "interstate-10-east")
 * Value: Array of exits for that highway
 */
export const TEXAS_HIGHWAY_EXITS: Record<string, Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[]> = {
  // Loop/Spur Interstates (no direction)
  'interstate-110': ExitData.I110_EXITS,
  'interstate-345': ExitData.I345_EXITS,
  'interstate-410': ExitData.I410_EXITS,
  'interstate-610': ExitData.I610_EXITS,
  'interstate-635': ExitData.I635_EXITS,
  'interstate-820': ExitData.I820_EXITS,
  
  // Interstate 10 (East-West)
  'interstate-10-east': ExitData.I10_EAST_EXITS,
  'interstate-10-west': ExitData.I10_WEST_EXITS,
  
  // Interstate 20 (East-West)
  'interstate-20-east': ExitData.I20_EAST_EXITS,
  'interstate-20-west': ExitData.I20_WEST_EXITS,
  
  // Interstate 27 (North-South)
  'interstate-27-north': ExitData.I27_NORTH_EXITS,
  'interstate-27-south': ExitData.I27_SOUTH_EXITS,
  
  // Interstate 27 (East-West - may share exits with North/South)
  'interstate-27-east': ExitData.I27_EAST_EXITS,
  'interstate-27-west': ExitData.I27_WEST_EXITS,
  
  // Interstate 30 (East-West)
  'interstate-30-east': ExitData.I30_EAST_EXITS,
  'interstate-30-west': ExitData.I30_WEST_EXITS,
  
  // Interstate 35 (North-South)
  'interstate-35-north': ExitData.I35_NORTH_EXITS,
  'interstate-35-south': ExitData.I35_SOUTH_EXITS,
  
  // Interstate 35 (East-West - may share exits with North/South)
  'interstate-35-east': ExitData.I35_EAST_EXITS,
  'interstate-35-west': ExitData.I35_WEST_EXITS,
  
  // Interstate 37 (North-South)
  'interstate-37-north': ExitData.I37_NORTH_EXITS,
  'interstate-37-south': ExitData.I37_SOUTH_EXITS,
  
  // Interstate 37 (East-West - may share exits with North/South)
  'interstate-37-east': ExitData.I37_EAST_EXITS,
  'interstate-37-west': ExitData.I37_WEST_EXITS,
  
  // Interstate 40 (East-West)
  'interstate-40-east': ExitData.I40_EAST_EXITS,
  'interstate-40-west': ExitData.I40_WEST_EXITS,
  
  // Interstate 45 (North-South)
  'interstate-45-north': ExitData.I45_NORTH_EXITS,
  'interstate-45-south': ExitData.I45_SOUTH_EXITS,
  
  // Interstate 45 (East-West - may share exits with North/South)
  'interstate-45-east': ExitData.I45_EAST_EXITS,
  'interstate-45-west': ExitData.I45_WEST_EXITS,
  
  // Interstate 69 (North-South)
  'interstate-69-north': ExitData.I69_NORTH_EXITS,
  'interstate-69-south': ExitData.I69_SOUTH_EXITS,
  
  // Interstate 69 (East-West - may share exits with North/South)
  'interstate-69-east': ExitData.I69_EAST_EXITS,
  'interstate-69-west': ExitData.I69_WEST_EXITS,
};

/**
 * Get exits for a specific highway ID
 */
export function getTexasHighwayExits(highwayId: string): Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[] {
  return (TEXAS_HIGHWAY_EXITS[highwayId] || []).filter((exit) => {
    const lat = exit.coordinates?.latitude;
    const lng = exit.coordinates?.longitude;
    return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  });
}

/**
 * Summary:
 * Total highways with exit data: 34
 * 
 * Note: Some highways have both directional (North/South or East/West) and 
 * non-directional variants. Exit data is shared between directional variants
 * of the same base highway.
 */
