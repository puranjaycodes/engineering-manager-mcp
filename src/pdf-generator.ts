// src/pdf-generator.ts
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger.js';

interface StandupReport {
  sprintName: string;
  sprintId: number;
  date: string;
  staleIssues: any[];
  overdueIssues: any[];
  unassignedIssues: any[];
  blockedIssues: any[];
  byAssignee: any;
  summary: {
    totalSprintIssues: number;
    completedIssues: number;
    inProgressIssues: number;
    todoIssues: number;
    projectFiltered: boolean;
    projectKey: string | null;
  };
}

function generateHTMLReport(reportData: StandupReport): string {
  logger.info('Starting HTML report generation', {
    sprint: reportData.sprintName,
    sprintId: reportData.sprintId,
    date: reportData.date,
    projectKey: reportData.summary.projectKey
  });
  
  const completionPercentage = Math.round((reportData.summary.completedIssues / reportData.summary.totalSprintIssues) * 100);
  const inProgressPercentage = Math.round((reportData.summary.inProgressIssues / reportData.summary.totalSprintIssues) * 100);
  const todoPercentage = Math.round((reportData.summary.todoIssues / reportData.summary.totalSprintIssues) * 100);
  
  logger.debug('Calculated progress percentages', {
    completed: completionPercentage,
    inProgress: inProgressPercentage,
    todo: todoPercentage
  });
  
  logger.debug('Report statistics', {
    totalIssues: reportData.summary.totalSprintIssues,
    staleCount: reportData.staleIssues?.length || 0,
    overdueCount: reportData.overdueIssues?.length || 0,
    unassignedCount: reportData.unassignedIssues?.length || 0,
    blockedCount: reportData.blockedIssues?.length || 0,
    teamMemberCount: Object.keys(reportData.byAssignee || {}).length
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Standup Report - ${reportData.sprintName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        .header {
            text-align: center;
            padding: 30px 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: -20px -20px 30px -20px;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header h2 {
            font-size: 1.5em;
            opacity: 0.9;
        }
        
        .meta-info {
            display: flex;
            justify-content: space-around;
            margin-bottom: 30px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .meta-info div {
            text-align: center;
        }
        
        .meta-info .label {
            font-size: 0.9em;
            color: #666;
        }
        
        .meta-info .value {
            font-size: 1.2em;
            font-weight: bold;
            color: #333;
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .card.completed {
            background: #d4edda;
            border: 1px solid #c3e6cb;
        }
        
        .card.in-progress {
            background: #fff3cd;
            border: 1px solid #ffeeba;
        }
        
        .card.todo {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
        }
        
        .card.critical {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
        }
        
        .card h3 {
            font-size: 1.1em;
            margin-bottom: 10px;
            color: #495057;
        }
        
        .card .number {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .card .percentage {
            font-size: 1em;
            color: #6c757d;
        }
        
        .issues-section {
            margin-bottom: 40px;
        }
        
        .issues-section h2 {
            font-size: 1.8em;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #dee2e6;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        thead {
            background: #f8f9fa;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        
        th {
            font-weight: 600;
            color: #495057;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .issue-key {
            font-weight: bold;
            color: #007bff;
        }
        
        .priority-high {
            color: #dc3545;
            font-weight: bold;
        }
        
        .priority-medium {
            color: #ffc107;
        }
        
        .priority-low {
            color: #28a745;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 600;
        }
        
        .status-new {
            background: #e7f3ff;
            color: #0052cc;
        }
        
        .status-in-progress {
            background: #fff0b3;
            color: #172b4d;
        }
        
        .status-blocked {
            background: #ffebe6;
            color: #bf2600;
        }
        
        .days-stale {
            font-weight: bold;
        }
        
        .days-stale.critical {
            color: #dc3545;
        }
        
        .days-stale.warning {
            color: #ffc107;
        }
        
        .team-summary {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .team-member-card {
            padding: 15px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            background: #f8f9fa;
        }
        
        .team-member-card h4 {
            margin-bottom: 10px;
            color: #495057;
        }
        
        .team-stats {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
        }
        
        .team-stat {
            text-align: center;
        }
        
        .team-stat .number {
            font-size: 1.5em;
            font-weight: bold;
        }
        
        .team-stat .label {
            font-size: 0.85em;
            color: #6c757d;
        }
        
        .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 0.9em;
        }
        
        @media print {
            body {
                background: white;
            }
            .container {
                max-width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Daily Standup Report</h1>
            <h2>${reportData.sprintName}</h2>
        </div>
        
        <div class="meta-info">
            <div>
                <div class="label">Date</div>
                <div class="value">${new Date(reportData.date).toLocaleDateString()}</div>
            </div>
            <div>
                <div class="label">Sprint ID</div>
                <div class="value">${reportData.sprintId}</div>
            </div>
            ${reportData.summary.projectKey ? `
            <div>
                <div class="label">Project</div>
                <div class="value">${reportData.summary.projectKey}</div>
            </div>
            ` : ''}
        </div>
        
        <div class="summary-cards">
            <div class="card completed">
                <h3>Completed</h3>
                <div class="number">${reportData.summary.completedIssues}</div>
                <div class="percentage">${completionPercentage}%</div>
            </div>
            <div class="card in-progress">
                <h3>In Progress</h3>
                <div class="number">${reportData.summary.inProgressIssues}</div>
                <div class="percentage">${inProgressPercentage}%</div>
            </div>
            <div class="card todo">
                <h3>To Do</h3>
                <div class="number">${reportData.summary.todoIssues}</div>
                <div class="percentage">${todoPercentage}%</div>
            </div>
            <div class="card critical">
                <h3>Critical Metrics</h3>
                <div style="text-align: left; font-size: 0.9em;">
                    <div>🚨 Overdue: <strong>${reportData.overdueIssues?.length || 0}</strong></div>
                    <div>⚠️ Stale: <strong>${reportData.staleIssues?.length || 0}</strong></div>
                    <div>👤 Unassigned: <strong>${reportData.unassignedIssues?.length || 0}</strong></div>
                    <div>🚧 Blocked: <strong>${reportData.blockedIssues?.length || 0}</strong></div>
                </div>
            </div>
        </div>
        
        ${reportData.overdueIssues && reportData.overdueIssues.length > 0 ? `
        <div class="issues-section">
            <h2>🚨 Overdue Issues</h2>
            <table>
                <thead>
                    <tr>
                        <th>Issue</th>
                        <th>Summary</th>
                        <th>Assignee</th>
                        <th>Due Date</th>
                        <th>Priority</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.overdueIssues.slice(0, 15).map(issue => `
                    <tr>
                        <td class="issue-key">${issue.key}</td>
                        <td>${issue.summary}</td>
                        <td>${issue.assignee || 'Unassigned'}</td>
                        <td>${issue.duedate || 'N/A'}</td>
                        <td class="${issue.priority?.includes('High') ? 'priority-high' : issue.priority?.includes('Low') ? 'priority-low' : 'priority-medium'}">${issue.priority}</td>
                        <td><span class="status-badge status-${issue.status?.toLowerCase().replace(/\s+/g, '-')}">${issue.status}</span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            ${reportData.overdueIssues.length > 15 ? `<p>... and ${reportData.overdueIssues.length - 15} more overdue issues</p>` : ''}
        </div>
        ` : ''}
        
        ${reportData.staleIssues && reportData.staleIssues.length > 0 ? `
        <div class="issues-section">
            <h2>⚠️ Stale Issues (No updates for 2+ days)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Issue</th>
                        <th>Summary</th>
                        <th>Assignee</th>
                        <th>Days Stale</th>
                        <th>Status</th>
                        <th>Priority</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.staleIssues.slice(0, 20).map(issue => `
                    <tr>
                        <td class="issue-key">${issue.key}</td>
                        <td>${issue.summary}</td>
                        <td>${issue.assignee || 'Unassigned'}</td>
                        <td class="days-stale ${issue.daysSinceUpdate > 7 ? 'critical' : issue.daysSinceUpdate > 4 ? 'warning' : ''}">${issue.daysSinceUpdate} days</td>
                        <td><span class="status-badge status-${issue.status?.toLowerCase().replace(/\s+/g, '-')}">${issue.status}</span></td>
                        <td class="${issue.priority?.includes('High') ? 'priority-high' : issue.priority?.includes('Low') ? 'priority-low' : 'priority-medium'}">${issue.priority}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            ${reportData.staleIssues.length > 20 ? `<p>... and ${reportData.staleIssues.length - 20} more stale issues</p>` : ''}
        </div>
        ` : ''}
        
        ${reportData.byAssignee && Object.keys(reportData.byAssignee).length > 0 ? `
        <div class="issues-section">
            <h2>👥 Team Member Summary</h2>
            <div class="team-summary">
                ${Object.entries(reportData.byAssignee).map(([name, data]: [string, any]) => `
                <div class="team-member-card">
                    <h4>${name}</h4>
                    <div class="team-stats">
                        <div class="team-stat">
                            <div class="number">${data.issues.length}</div>
                            <div class="label">Total</div>
                        </div>
                        <div class="team-stat">
                            <div class="number" style="color: ${data.staleCount > 0 ? '#ffc107' : '#28a745'};">${data.staleCount}</div>
                            <div class="label">Stale</div>
                        </div>
                        <div class="team-stat">
                            <div class="number" style="color: ${data.overdueCount > 0 ? '#dc3545' : '#28a745'};">${data.overdueCount}</div>
                            <div class="label">Overdue</div>
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="footer">
            <p>Generated on ${new Date().toLocaleString()} | Engineering Manager MCP</p>
            <p>© 2025 CleverTap - Sprint Management Dashboard</p>
        </div>
    </div>
</body>
</html>
  `;
  
  logger.debug('HTML generation completed', { 
    htmlLength: html.length 
  });
  
  return html;
}

export async function generateStandupPDF(reportData: StandupReport, outputPath?: string): Promise<string> {
  logger.info('Starting PDF generation', {
    sprint: reportData.sprintName,
    outputPath: outputPath || 'auto-generated'
  });
  
  try {
    // Generate HTML first
    logger.debug('Generating HTML report');
    const html = generateHTMLReport(reportData);
    
    // Save HTML file for debugging/preview (optional)
    const htmlPath = `/tmp/standup-report-${reportData.sprintId}-${Date.now()}.html`;
    fs.writeFileSync(htmlPath, html);
    logger.info('HTML report saved', { path: htmlPath });
    
    // Determine PDF output path
    const pdfPath = outputPath || `/tmp/standup-report-${reportData.sprintId}-${Date.now()}.pdf`;
    
    logger.debug('Launching Puppeteer for PDF conversion');
    
    // Launch Puppeteer and convert HTML to PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    logger.debug('Puppeteer browser launched successfully');
    
    const page = await browser.newPage();
    
    // Set content and wait for any dynamic content
    await page.setContent(html, { waitUntil: 'networkidle0' });
    logger.debug('HTML content loaded into Puppeteer');
    
    // Generate PDF with proper formatting
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();
    logger.info('PDF generated successfully via Puppeteer', { path: pdfPath });
    
    return pdfPath;
    
  } catch (error: any) {
    logger.error('Puppeteer PDF generation failed, falling back to PDFKit', { 
      error: error.message 
    });
    
    // Fallback to PDFKit if Puppeteer fails
    return generatePDFWithPDFKit(reportData, outputPath);
  }
}

// Fallback function using PDFKit (original implementation)
import PDFDocument from 'pdfkit';

function generatePDFWithPDFKit(reportData: StandupReport, outputPath?: string): Promise<string> {
  logger.info('Using PDFKit fallback for PDF generation', {
    sprint: reportData.sprintName
  });
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const fileName = outputPath || `/tmp/standup-report-${reportData.sprintId}-${Date.now()}.pdf`;
      const filePath = path.resolve(fileName);
      
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      logger.debug('PDFKit document created, generating content');
      
      // Title Page
      doc.fontSize(24).font('Helvetica-Bold').text('Daily Standup Report', { align: 'center' });
      doc.fontSize(18).font('Helvetica').text(reportData.sprintName, { align: 'center' });
      doc.moveDown();
      
      // Date and Sprint Info
      doc.fontSize(12).font('Helvetica');
      doc.text(`Date: ${new Date(reportData.date).toLocaleDateString()}`, { align: 'left' });
      doc.text(`Sprint ID: ${reportData.sprintId}`, { align: 'left' });
      if (reportData.summary.projectKey) {
        doc.text(`Project: ${reportData.summary.projectKey}`, { align: 'left' });
      }
      doc.moveDown();
      
      // Summary Statistics
      doc.fontSize(16).font('Helvetica-Bold').text('Sprint Summary', { underline: true });
      doc.fontSize(12).font('Helvetica');
      doc.text(`Total Issues: ${reportData.summary.totalSprintIssues}`);
      doc.text(`Completed: ${reportData.summary.completedIssues} (${Math.round(reportData.summary.completedIssues / reportData.summary.totalSprintIssues * 100)}%)`);
      doc.text(`In Progress: ${reportData.summary.inProgressIssues} (${Math.round(reportData.summary.inProgressIssues / reportData.summary.totalSprintIssues * 100)}%)`);
      doc.text(`To Do: ${reportData.summary.todoIssues} (${Math.round(reportData.summary.todoIssues / reportData.summary.totalSprintIssues * 100)}%)`);
      doc.moveDown();
      
      // Critical Metrics
      doc.fontSize(16).font('Helvetica-Bold').text('Critical Metrics', { underline: true });
      doc.fontSize(12).font('Helvetica');
      doc.fillColor('red').text(`🚨 Overdue Issues: ${reportData.overdueIssues?.length || 0}`, { continued: false });
      doc.fillColor('orange').text(`⚠️ Stale Issues: ${reportData.staleIssues?.length || 0}`);
      doc.fillColor('blue').text(`👤 Unassigned Issues: ${reportData.unassignedIssues?.length || 0}`);
      doc.fillColor('red').text(`🚧 Blocked Issues: ${reportData.blockedIssues?.length || 0}`);
      doc.fillColor('black');
      doc.moveDown();
      
      // Overdue Issues Section
      if (reportData.overdueIssues && reportData.overdueIssues.length > 0) {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('Overdue Issues', { underline: true });
        doc.fontSize(10).font('Helvetica');
        
        reportData.overdueIssues.slice(0, 10).forEach((issue: any) => {
          doc.text(`• ${issue.key}: ${issue.summary}`);
          doc.text(`  Assignee: ${issue.assignee} | Due: ${issue.duedate || 'N/A'} | Priority: ${issue.priority}`);
          doc.moveDown(0.5);
        });
        
        if (reportData.overdueIssues.length > 10) {
          doc.text(`... and ${reportData.overdueIssues.length - 10} more`);
        }
        doc.moveDown();
      }
      
      // Stale Issues Section
      if (reportData.staleIssues && reportData.staleIssues.length > 0) {
        if (reportData.overdueIssues && reportData.overdueIssues.length === 0) {
          doc.addPage();
        }
        doc.fontSize(16).font('Helvetica-Bold').text('Stale Issues (>2 days)', { underline: true });
        doc.fontSize(10).font('Helvetica');
        
        reportData.staleIssues.slice(0, 10).forEach((issue: any) => {
          doc.text(`• ${issue.key}: ${issue.summary}`);
          doc.text(`  Assignee: ${issue.assignee} | Last Updated: ${issue.daysSinceUpdate} days ago | Status: ${issue.status}`);
          doc.moveDown(0.5);
        });
        
        if (reportData.staleIssues.length > 10) {
          doc.text(`... and ${reportData.staleIssues.length - 10} more`);
        }
        doc.moveDown();
      }
      
      // Team Member Summary
      if (reportData.byAssignee && Object.keys(reportData.byAssignee).length > 0) {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('Team Member Summary', { underline: true });
        doc.fontSize(10).font('Helvetica');
        
        Object.entries(reportData.byAssignee).forEach(([name, data]: [string, any]) => {
          doc.text(`${name}:`);
          doc.text(`  Total Issues: ${data.issues.length} | Stale: ${data.staleCount} | Overdue: ${data.overdueCount}`);
          doc.moveDown(0.5);
        });
      }
      
      // Footer
      doc.fontSize(8).font('Helvetica');
      doc.text(`Generated on ${new Date().toLocaleString()} | Engineering Manager MCP`, { align: 'center' });
      
      doc.end();
      
      stream.on('finish', () => {
        logger.info('PDFKit PDF generated successfully', { path: filePath });
        resolve(filePath);
      });
      
      stream.on('error', (error) => {
        logger.error('PDFKit stream error', { error: error.message });
        reject(error);
      });
      
    } catch (error: any) {
      logger.error('PDFKit PDF generation failed', { error: error.message });
      reject(new Error(`Failed to generate PDF: ${error.message}`));
    }
  });
}

// Export both HTML generation and PDF generation functions
export { generateHTMLReport };
