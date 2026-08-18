/**
 * I-95 Connecticut exit list — sourced from Wikipedia
 * Source: https://en.wikipedia.org/wiki/Interstate_95_in_Connecticut
 * Pilot dataset for Wikipedia-first highway exit strategy (Phase 4)
 */

import type { WikipediaExitList } from '../types/wikipedia';

export const I95_CONNECTICUT_EXITS_WIKIPEDIA: WikipediaExitList = {
  highwayId: 'interstate-95',
  highwayName: 'Interstate 95',
  stateCode: 'CT',
  sourceArticle: 'Interstate 95 in Connecticut',
  sourceUrl: 'https://en.wikipedia.org/wiki/Interstate_95_in_Connecticut',
  fetchedAt: '2026-06-20',
  exits: [
    { exitNumber: '57', description: 'US 1 – Byram, Port Chester NY' },
    { exitNumber: '58', description: 'Arch Street – Greenwich' },
    { exitNumber: '59', description: 'Mead Avenue – Greenwich' },
    { exitNumber: '60', description: 'US 1 / Merritt Parkway south – Stamford' },
    { exitNumber: '61', description: 'US 1 – Darien, Norwalk' },
    { exitNumber: '62', description: 'US 7 / Route 15 – Norwalk' },
    { exitNumber: '63', description: 'US 1 – Westport, Fairfield' },
    { exitNumber: '64', description: 'Route 136 – Fairfield' },
    { exitNumber: '65', description: 'Route 135 – Fairfield' },
    { exitNumber: '66', description: 'Route 130 – Bridgeport' },
    { exitNumber: '67', description: 'Route 8 / Route 25 – Bridgeport' },
    { exitNumber: '68', description: 'Route 113 – Bridgeport' },
    { exitNumber: '69', description: 'Route 122 – Milford' },
    { exitNumber: '70', description: 'US 1 – Milford, Orange' },
    { exitNumber: '71', description: 'Route 17 – West Haven' },
    { exitNumber: '72', description: 'Route 162 – West Haven' },
    { exitNumber: '73', description: 'I-91 / Route 34 – New Haven' },
    { exitNumber: '74', description: 'Route 10 – New Haven' },
    { exitNumber: '75', description: 'Route 80 – New Haven' },
    { exitNumber: '76', description: 'Route 100 – East Haven' },
    { exitNumber: '77', description: 'Route 142 – Branford' },
    { exitNumber: '78', description: 'Route 146 – Branford' },
    { exitNumber: '79', description: 'Route 81 – Clinton' },
    { exitNumber: '80', description: 'Route 145 – Madison' },
    { exitNumber: '81', description: 'Route 153 – Old Saybrook' },
    { exitNumber: '82', description: 'Route 9 – Old Saybrook' },
    { exitNumber: '83', description: 'Route 161 – Old Lyme' },
    { exitNumber: '84', description: 'Route 156 – East Lyme' },
    { exitNumber: '85', description: 'Route 32 – Waterford' },
    { exitNumber: '86', description: 'Route 85 – Waterford' },
    { exitNumber: '87', description: 'Route 32 – New London' },
    { exitNumber: '88', description: 'Route 349 – Groton' },
    { exitNumber: '89', description: 'Route 117 – Groton' },
    { exitNumber: '90', description: 'Route 216 – Stonington' },
    { exitNumber: '91', description: 'Route 2 – Stonington' },
    { exitNumber: '92', description: 'US 1 – Stonington, Westerly RI' },
  ],
};
