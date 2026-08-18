/**
 * Data Reporting Types
 * Types for reporting missing or incorrect data
 */

export type ReportType = 'missing_city' | 'missing_county' | 'incorrect_data' | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'approved' | 'rejected' | 'resolved';

export interface DataReport {
  id: string;
  type: ReportType;
  status: ReportStatus;
  timestamp: number;
  
  // Location information
  state: string;
  stateCode: string;
  county?: string;
  city?: string;
  
  // Report details
  description: string;
  suggestedData?: {
    name?: string;
    latitude?: number;
    longitude?: number;
    population?: number;
    [key: string]: any;
  };
  
  // User information (optional)
  userId?: string;
  userEmail?: string;
  
  // Review information
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNotes?: string;
  
  // Resolution
  resolvedAt?: number;
  resolutionNotes?: string;
}

export interface ReportSubmission {
  type: ReportType;
  state: string;
  stateCode: string;
  county?: string;
  city?: string;
  description: string;
  suggestedData?: DataReport['suggestedData'];
  userEmail?: string;
}

