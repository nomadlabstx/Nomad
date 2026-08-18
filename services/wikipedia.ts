/**
 * Wikipedia REST API client — summaries, search, exit-list cache.
 * Sole source for new geographic content per docs/DATA_STRATEGY_WIKIPEDIA.md
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WikipediaCacheEntry, WikipediaExitList, WikipediaSummary } from '../types/wikipedia';

const WIKI_REST_BASE = 'https://en.wikipedia.org/api/rest_v1';
const WIKI_API_BASE = 'https://en.wikipedia.org/w/api.php';
const CACHE_PREFIX = '@nomad_wikipedia_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_REQUEST_INTERVAL_MS = 200;
const USER_AGENT = 'NomadApp/1.0 (travel tracker; contact: nomad-app-local)';

class WikipediaService {
  private lastRequestAt = 0;

  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  private cacheKey(kind: string, key: string): string {
    return `${CACHE_PREFIX}${kind}_${key.toLowerCase().replace(/\s+/g, '_')}`;
  }

  private async readCache(key: string): Promise<WikipediaCacheEntry | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const entry = JSON.parse(raw) as WikipediaCacheEntry;
      if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
      return entry;
    } catch {
      return null;
    }
  }

  private async writeCache(key: string, entry: WikipediaCacheEntry): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.warn('[Wikipedia] Cache write failed:', error);
    }
  }

  /** Attribution string for UI */
  attribution(title: string): string {
    return `From Wikipedia: ${title}`;
  }

  /** Build canonical article title for a US place */
  buildPlaceTitle(name: string, state?: string, kind: 'city' | 'county' | 'state' = 'city'): string {
    const trimmed = name.trim();
    if (kind === 'state' && state) {
      return trimmed;
    }
    if (kind === 'county') {
      return trimmed.includes('County') ? trimmed : `${trimmed} County`;
    }
    if (state) {
      return `${trimmed}, ${state}`;
    }
    return trimmed;
  }

  /** Fetch page summary by exact or resolved title */
  async getSummary(title: string): Promise<WikipediaSummary | null> {
    const normalized = title.replace(/ /g, '_');
    const storageKey = this.cacheKey('summary', normalized);
    const cached = await this.readCache(storageKey);
    if (cached) {
      return cached;
    }

    await this.throttle();
    try {
      const url = `${WIKI_REST_BASE}/page/summary/${encodeURIComponent(normalized)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } });
      if (!res.ok) {
        if (res.status === 404) {
          const resolved = await this.searchTitle(title);
          if (resolved && resolved !== normalized) {
            return this.getSummary(resolved);
          }
        }
        return null;
      }
      const data = await res.json();
      const summary: WikipediaSummary = {
        title: data.title ?? title,
        extract: data.extract ?? '',
        description: data.description,
        pageUrl: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(normalized)}`,
        thumbnailUrl: data.thumbnail?.source,
        fetchedAt: Date.now(),
        source: 'wikipedia',
      };
      if (!summary.extract) return null;
      await this.writeCache(storageKey, { ...summary, cacheKey: storageKey });
      return summary;
    } catch (error) {
      console.warn('[Wikipedia] Summary fetch failed:', error);
      return null;
    }
  }

  /** Search for best matching article title */
  async searchTitle(query: string): Promise<string | null> {
    await this.throttle();
    try {
      const params = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: query,
        format: 'json',
        origin: '*',
        srlimit: '3',
      });
      const res = await fetch(`${WIKI_API_BASE}?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const first = data?.query?.search?.[0]?.title;
      return first ?? null;
    } catch {
      return null;
    }
  }

  /** Place summary with city/state disambiguation */
  async getPlaceSummary(
    placeName: string,
    state?: string,
    kind: 'city' | 'county' | 'state' = 'city'
  ): Promise<WikipediaSummary | null> {
    const title = this.buildPlaceTitle(placeName, state, kind);
    return this.getSummary(title);
  }

  /** Highway exit list article title helper */
  buildExitListTitle(interstateNumber: string, stateName: string): string {
    return `List of exits on Interstate ${interstateNumber} in ${stateName}`;
  }

  /** Load bundled exit list (pilot: I-95 CT) */
  async getBundledExitList(highwayId: string): Promise<WikipediaExitList | null> {
    if (highwayId === 'interstate-95') {
      const { I95_CONNECTICUT_EXITS_WIKIPEDIA } = await import('../data/i95-connecticut-exits-wikipedia');
      return I95_CONNECTICUT_EXITS_WIKIPEDIA;
    }
    return null;
  }
}

export const wikipediaService = new WikipediaService();
export default wikipediaService;
