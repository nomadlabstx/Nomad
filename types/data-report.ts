/**
 * Types for data reporting system
 * Allows users to report missing counties, cities, or other location data
 */

export type ReportType = 'missing_county' | 'missing_city' | 'missing_highway' | 'missing_exit' | 'data_error' | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'rejected';

export interface DataReport {
  id: string;
  type: ReportType;
  status: ReportStatus;
  timestamp: number;
  
  // Location information
  state?: string;
  stateCode?: string;
  county?: string;
  city?: string;
  highway?: string;
  exit?: string;
  
  // User details
  userNote?: string;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  
  // Dev team fields (set during review)
  devNotes?: string;
  reviewedBy?: string;
  reviewedAt?: number;
  resolvedAt?: number;
}

export interface ReportSubmission {
  type: ReportType;
  state?: string;
  stateCode?: string;
  county?: string;
  city?: string;
  highway?: string;
  exit?: string;
  userNote?: string;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

