/**
 * Data Reports Service
 * Handles submission and management of data reports (missing counties, cities, etc.)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DataReport, ReportSubmission } from '../types/data-reports';

const REPORTS_KEY = '@nomad_data_reports';
const REPORTS_EXPORT_KEY = '@nomad_data_reports_export';

class DataReportsService {
  private reports: DataReport[] = [];

  /**
   * Initialize reports from storage
   */
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(REPORTS_KEY);
      if (stored) {
        this.reports = JSON.parse(stored);
      } else {
        this.reports = [];
      }
    } catch (error) {
      console.error('[DataReports] Failed to initialize:', error);
      this.reports = [];
    }
  }

  /**
   * Save reports to storage
   */
  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(this.reports));
      
      // Also save to export location for dev team review
      // This creates a JSON file that can be easily accessed
      await this.exportReportsForReview();
    } catch (error) {
      console.error('[DataReports] Failed to save:', error);
    }
  }

  /**
   * Submit a new data report
   */
  async submitReport(submission: ReportSubmission): Promise<DataReport> {
    const report: DataReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: submission.type,
      status: 'pending',
      timestamp: Date.now(),
      state: submission.state,
      stateCode: submission.stateCode,
      county: submission.county,
      city: submission.city,
      description: submission.description,
      suggestedData: submission.suggestedData,
      userEmail: submission.userEmail,
    };

    this.reports.push(report);
    await this.save();

    console.log('[DataReports] New report submitted:', report.id);
    return report;
  }

  /**
   * Get all reports (for admin/dev review)
   */
  async getAllReports(): Promise<DataReport[]> {
    await this.initialize();
    return [...this.reports];
  }

  /**
   * Get pending reports
   */
  async getPendingReports(): Promise<DataReport[]> {
    await this.initialize();
    return this.reports.filter(r => r.status === 'pending');
  }

  /**
   * Update report status (for dev team review)
   */
  async updateReportStatus(
    reportId: string,
    status: DataReport['status'],
    reviewNotes?: string,
    reviewedBy?: string
  ): Promise<boolean> {
    await this.initialize();
    
    const report = this.reports.find(r => r.id === reportId);
    if (!report) {
      console.warn('[DataReports] Report not found:', reportId);
      return false;
    }

    report.status = status;
    report.reviewedAt = Date.now();
    if (reviewNotes) report.reviewNotes = reviewNotes;
    if (reviewedBy) report.reviewedBy = reviewedBy;
    
    if (status === 'resolved') {
      report.resolvedAt = Date.now();
    }

    await this.save();
    return true;
  }

  /**
   * Export reports to a format for dev team review
   * This creates a JSON file in the data directory
   */
  private async exportReportsForReview(): Promise<void> {
    try {
      // Store export data in AsyncStorage for easy access
      const exportData = {
        exportedAt: Date.now(),
        totalReports: this.reports.length,
        pendingReports: this.reports.filter(r => r.status === 'pending').length,
        reports: this.reports,
      };

      await AsyncStorage.setItem(REPORTS_EXPORT_KEY, JSON.stringify(exportData, null, 2));
      
      // On web, also try to save to a file
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          // Note: Actual file download would require user interaction
          // This is just storing it for now
        } catch (e) {
          // Ignore file save errors on web
        }
      }
    } catch (error) {
      console.warn('[DataReports] Failed to export reports:', error);
    }
  }

  /**
   * Get export data for dev team
   */
  async getExportData(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REPORTS_EXPORT_KEY);
    } catch (error) {
      console.error('[DataReports] Failed to get export data:', error);
      return null;
    }
  }

  /**
   * Clear all reports (admin function)
   */
  async clearAllReports(): Promise<boolean> {
    try {
      this.reports = [];
      await AsyncStorage.removeItem(REPORTS_KEY);
      await AsyncStorage.removeItem(REPORTS_EXPORT_KEY);
      return true;
    } catch (error) {
      console.error('[DataReports] Failed to clear reports:', error);
      return false;
    }
  }
}

export const dataReportsService = new DataReportsService();

