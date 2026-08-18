/**
 * Data Reports Review Script
 * For dev team to review and manage user-submitted data reports
 * 
 * Usage: node scripts/review-data-reports.js [command]
 * Commands:
 *   list          - List all reports
 *   pending       - List pending reports
 *   review [id]   - Review a specific report
 *   approve [id]  - Approve a report
 *   reject [id]   - Reject a report
 *   resolve [id]  - Mark a report as resolved
 *   export        - Export all reports to JSON file
 */

const fs = require('fs');
const path = require('path');

const REPORTS_FILE = path.join(__dirname, '../data/data-reports.json');

// Ensure reports file exists
if (!fs.existsSync(REPORTS_FILE)) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify({ reports: [], exportedAt: Date.now() }, null, 2));
}

function loadReports() {
  try {
    const data = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
    return data.reports || [];
  } catch (error) {
    console.error('Failed to load reports:', error);
    return [];
  }
}

function saveReports(reports) {
  try {
    const data = {
      reports,
      exportedAt: Date.now(),
      totalReports: reports.length,
      pendingReports: reports.filter(r => r.status === 'pending').length,
    };
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save reports:', error);
    return false;
  }
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function listReports(status = null) {
  const reports = loadReports();
  let filtered = status ? reports.filter(r => r.status === status) : reports;
  
  if (filtered.length === 0) {
    console.log(`\nNo ${status || 'reports'} found.\n`);
    return;
  }

  console.log(`\n${status ? status.toUpperCase() : 'ALL'} REPORTS (${filtered.length}):\n`);
  console.log('='.repeat(80));

  filtered.forEach((report, index) => {
    console.log(`\n${index + 1}. ${report.id}`);
    console.log(`   Type: ${report.type}`);
    console.log(`   Status: ${report.status}`);
    console.log(`   State: ${report.state} (${report.stateCode})`);
    if (report.county) console.log(`   County: ${report.county}`);
    if (report.city) console.log(`   City: ${report.city}`);
    console.log(`   Description: ${report.description.substring(0, 100)}${report.description.length > 100 ? '...' : ''}`);
    console.log(`   Submitted: ${formatDate(report.timestamp)}`);
    if (report.reviewedAt) {
      console.log(`   Reviewed: ${formatDate(report.reviewedAt)} by ${report.reviewedBy || 'Unknown'}`);
    }
    if (report.suggestedData) {
      console.log(`   Suggested: ${JSON.stringify(report.suggestedData)}`);
    }
  });

  console.log('\n' + '='.repeat(80) + '\n');
}

function showReportDetails(reportId) {
  const reports = loadReports();
  const report = reports.find(r => r.id === reportId);

  if (!report) {
    console.error(`\nReport not found: ${reportId}\n`);
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('REPORT DETAILS');
  console.log('='.repeat(80));
  console.log(`ID: ${report.id}`);
  console.log(`Type: ${report.type}`);
  console.log(`Status: ${report.status}`);
  console.log(`State: ${report.state} (${report.stateCode})`);
  if (report.county) console.log(`County: ${report.county}`);
  if (report.city) console.log(`City: ${report.city}`);
  console.log(`\nDescription:\n${report.description}`);
  if (report.suggestedData) {
    console.log(`\nSuggested Data:\n${JSON.stringify(report.suggestedData, null, 2)}`);
  }
  if (report.userEmail) {
    console.log(`\nUser Email: ${report.userEmail}`);
  }
  console.log(`\nSubmitted: ${formatDate(report.timestamp)}`);
  if (report.reviewedAt) {
    console.log(`Reviewed: ${formatDate(report.reviewedAt)} by ${report.reviewedBy || 'Unknown'}`);
    if (report.reviewNotes) {
      console.log(`Review Notes: ${report.reviewNotes}`);
    }
  }
  if (report.resolvedAt) {
    console.log(`Resolved: ${formatDate(report.resolvedAt)}`);
    if (report.resolutionNotes) {
      console.log(`Resolution Notes: ${report.resolutionNotes}`);
    }
  }
  console.log('='.repeat(80) + '\n');
}

function updateReportStatus(reportId, status, notes = null) {
  const reports = loadReports();
  const report = reports.find(r => r.id === reportId);

  if (!report) {
    console.error(`\nReport not found: ${reportId}\n`);
    return false;
  }

  report.status = status;
  report.reviewedAt = Date.now();
  report.reviewedBy = process.env.USER || process.env.USERNAME || 'dev';
  if (notes) {
    report.reviewNotes = notes;
  }
  if (status === 'resolved') {
    report.resolvedAt = Date.now();
  }

  if (saveReports(reports)) {
    console.log(`\n✓ Report ${reportId} updated to status: ${status}\n`);
    showReportDetails(reportId);
    return true;
  } else {
    console.error(`\n✗ Failed to update report ${reportId}\n`);
    return false;
  }
}

function exportReports() {
  const reports = loadReports();
  const exportData = {
    exportedAt: Date.now(),
    totalReports: reports.length,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    reportsByStatus: {
      pending: reports.filter(r => r.status === 'pending').length,
      reviewed: reports.filter(r => r.status === 'reviewed').length,
      approved: reports.filter(r => r.status === 'approved').length,
      rejected: reports.filter(r => r.status === 'rejected').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
    },
    reports,
  };

  const exportFile = path.join(__dirname, '../data/data-reports-export.json');
  fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
  console.log(`\n✓ Exported ${reports.length} reports to ${exportFile}\n`);
}

// Main command handler
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

switch (command) {
  case 'list':
    listReports();
    break;
  
  case 'pending':
    listReports('pending');
    break;
  
  case 'review':
    if (!arg1) {
      console.error('\nUsage: node scripts/review-data-reports.js review [report-id]\n');
      process.exit(1);
    }
    showReportDetails(arg1);
    break;
  
  case 'approve':
    if (!arg1) {
      console.error('\nUsage: node scripts/review-data-reports.js approve [report-id] [notes]\n');
      process.exit(1);
    }
    updateReportStatus(arg1, 'approved', arg2);
    break;
  
  case 'reject':
    if (!arg1) {
      console.error('\nUsage: node scripts/review-data-reports.js reject [report-id] [notes]\n');
      process.exit(1);
    }
    updateReportStatus(arg1, 'rejected', arg2);
    break;
  
  case 'resolve':
    if (!arg1) {
      console.error('\nUsage: node scripts/review-data-reports.js resolve [report-id] [notes]\n');
      process.exit(1);
    }
    updateReportStatus(arg1, 'resolved', arg2);
    break;
  
  case 'export':
    exportReports();
    break;
  
  default:
    console.log(`
Data Reports Review Script

Usage: node scripts/review-data-reports.js [command] [args]

Commands:
  list                    List all reports
  pending                 List pending reports
  review [id]             Show detailed information about a report
  approve [id] [notes]    Approve a report (add optional notes)
  reject [id] [notes]     Reject a report (add optional notes)
  resolve [id] [notes]    Mark a report as resolved (add optional notes)
  export                  Export all reports to JSON file

Examples:
  node scripts/review-data-reports.js pending
  node scripts/review-data-reports.js review report_1234567890_abc123
  node scripts/review-data-reports.js approve report_1234567890_abc123 "Verified, will add to database"
  node scripts/review-data-reports.js export
`);
    break;
}

