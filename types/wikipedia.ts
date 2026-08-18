/**
 * Wikipedia article summary types (cached locally on visit)
 */

export interface WikipediaSummary {
  title: string;
  extract: string;
  description?: string;
  pageUrl: string;
  thumbnailUrl?: string;
  fetchedAt: number;
  source: 'wikipedia';
}

export interface WikipediaCacheEntry extends WikipediaSummary {
  cacheKey: string;
}

export interface WikipediaExitListEntry {
  exitNumber: string;
  description: string;
  milepointStart?: number;
  coordinates?: { latitude: number; longitude: number };
}

export interface WikipediaExitList {
  highwayId: string;
  highwayName: string;
  stateCode: string;
  sourceArticle: string;
  sourceUrl: string;
  fetchedAt: string;
  exits: WikipediaExitListEntry[];
}
