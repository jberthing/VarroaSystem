import jsPDF from 'jspdf';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Apiary, Hive, Observation, Treatment } from '../db/database';
import {
  calculateMonthlySummaries,
  formatDate,
  getMitesPerDayStatus,
} from './pdfExport';

ChartJS.register(...registerables);

interface ReportData {
  apiaries: Map<string, { apiary: Apiary; hives: Map<string, Hive> }>;
  observations: Map<string, Observation[]>;
  treatments: Map<string, Treatment[]>;
  year: number;
  includeCharts: boolean;
  includeTreatments: boolean;
  includeMonthlySummaries: boolean;
  locale?: string;
  years?: number[];
  yearData?: Map<number, { observations: Map<string, Observation[]>; treatments: Map<string, Treatment[]> }>;
  labels?: {
    monthlyOverview?: string;
    apiaryOverview?: string;
    trendChart?: string;
    tableMonth?: string;
    tableDays?: string;
    tableObservations?: string;
    tableAvgMites?: string;
    tableTreatments?: string;
    tableDate?: string;
    tableTreatment?: string;
    tableNotes?: string;
    tableMetric?: string;
    tableValue?: string;
    contents?: string;
    yearLabel?: string;
  };
}

type ReportLabels = Required<NonNullable<ReportData['labels']>>;

/**
 * Get default English labels for PDF
 */
function getDefaultLabels(): ReportLabels {
  return {
    monthlyOverview: 'Monthly Overview',
    apiaryOverview: 'Apiary Overview',
    trendChart: 'Trend Chart',
    tableMonth: 'Month',
    tableDays: 'Days',
    tableObservations: 'Obs.',
    tableAvgMites: 'Avg Mites/Day',
    tableTreatments: 'Treatments',
    tableDate: 'Date',
    tableTreatment: 'Treatment',
    tableNotes: 'Notes',
    tableMetric: 'Metric',
    tableValue: 'Value',
    contents: 'Contents',
    yearLabel: 'Year',
  };
}

const IMAGE_BOX_MM = 40; // roughly matches the app's 150px max thumbnail size

function formatChartLabel(dateString: string, locale: string, reportYear?: number): string {
  const date = new Date(dateString);
  const includeYear = reportYear !== undefined && date.getFullYear() !== reportYear;
  return date.toLocaleDateString(locale, includeYear
    ? { year: '2-digit', month: 'short', day: '2-digit' }
    : { month: 'short', day: '2-digit' });
}

function drawTableHeaderRow(
  doc: jsPDF,
  headers: string[],
  xStart: number,
  y: number,
  colWidths: number[],
  options?: {
    paddingX?: number;
    minHeight?: number;
    fillColor?: [number, number, number];
    textColor?: [number, number, number];
    fontSize?: number;
  }
): number {
  const paddingX = options?.paddingX ?? 2;
  const minHeight = options?.minHeight ?? 7;
  const fillColor = options?.fillColor ?? ([60, 60, 60] as [number, number, number]);
  const textColor = options?.textColor ?? ([255, 255, 255] as [number, number, number]);
  const fontSize = options?.fontSize ?? 8;

  doc.setFontSize(fontSize);

  const linesByHeader = headers.map((header, idx) => {
    const width = Math.max(1, colWidths[idx] - paddingX * 2);
    const split = (doc.splitTextToSize as any)(header, width);
    return (Array.isArray(split) ? split : [String(split)]) as string[];
  });

  const maxLines = Math.max(1, ...linesByHeader.map((l) => l.length));
  const headerHeight = Math.max(minHeight, minHeight + (maxLines - 1) * 3.5);

  const lineHeightMm = fontSize * 0.3528 * 1.15;

  let cellX = xStart;
  linesByHeader.forEach((lines, idx) => {
    const w = colWidths[idx];
    if (!Number.isFinite(w) || w <= 0) {
      return;
    }

    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    doc.rect(cellX, y, w, headerHeight, 'F');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const textHeight = lines.length * lineHeightMm;
    const firstLineY = y + (headerHeight - textHeight) / 2 + fontSize * 0.3528;
    (doc.text as any)(lines, cellX + paddingX, firstLineY);

    cellX += w;
  });

  return headerHeight;
}

async function createCoverSquareImage(dataUrl: string, sizePx: number = 512): Promise<string> {
  const img = new Image();
  img.decoding = 'async';
  img.loading = 'eager';

  const imageLoaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
  });

  img.src = dataUrl;
  await imageLoaded;

  const canvas = document.createElement('canvas');
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const scale = Math.max(sizePx / img.width, sizePx / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const dx = (sizePx - drawWidth) / 2;
  const dy = (sizePx - drawHeight) / 2;

  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  return canvas.toDataURL('image/png');
}

/**
 * Create a line chart image from observations data
 */
async function createChartImage(
  observations: Observation[],
  title: string,
  locale: string,
  reportYear?: number,
  width: number = 800,
  height: number = 400
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Sort observations by date
      const sortedObs = [...observations].sort((a, b) => a.date.localeCompare(b.date));

      // Prepare data for chart
      const labels = sortedObs.map((obs) => formatChartLabel(obs.date, locale, reportYear));
      const data = sortedObs.map((obs) => obs.mitesPerDay);

      // Create chart instance
      const chart = new ChartJS(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Mites/Day',
              data,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#ef4444',
            },
          ],
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top' as any,
            },
            title: {
              display: true,
              text: title,
              font: {
                size: 14,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Mites per Day',
              },
            },
            x: {
              title: {
                display: true,
                text: 'Date',
              },
              ticks: {
                autoSkip: true,
                maxTicksLimit: 12,
                maxRotation: 45,
                minRotation: 45,
              },
            },
          },
        } as any,
      });

      // Convert canvas to image
      setTimeout(() => {
        const imageData = canvas.toDataURL('image/png');
        chart.destroy();
        resolve(imageData);
      }, 100);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create an apiary-level chart combining all hives
 */
async function createApiaryChartImage(
  hives: Map<string, Hive>,
  observations: Map<string, Observation[]>,
  year: number,
  locale: string,
  width: number = 800,
  height: number = 400
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Collect all dates across all hives
      const allDates = new Set<string>();
      const hiveDataMap: Map<string, Map<string, number>> = new Map();

      for (const [hiveId, hiveObs] of observations.entries()) {
        const dataByDate = new Map<string, number>();
        for (const obs of hiveObs) {
          allDates.add(obs.date);
          dataByDate.set(obs.date, obs.mitesPerDay);
        }
        hiveDataMap.set(hiveId, dataByDate);
      }

      // Sort dates
      const sortedDates = Array.from(allDates).sort();

      // Create datasets for each hive
      const datasets: any[] = [];
      const colors = [
        '#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#8b5cf6', '#ec4899'
      ];
      let colorIdx = 0;

      for (const [hiveId] of hives.entries()) {
        const hive = hives.get(hiveId);
        if (!hive) continue;

        const data = sortedDates.map((date) => {
          const dataByDate = hiveDataMap.get(hiveId);
          return dataByDate?.get(date) ?? null;
        });

        const color = colors[colorIdx % colors.length];
        datasets.push({
          label: hive.name,
          data,
          borderColor: color,
          backgroundColor: color + '20',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          pointBackgroundColor: color,
        });

        colorIdx++;
      }

      // Create chart instance
      const chart = new ChartJS(ctx, {
        type: 'line',
        data: {
          labels: sortedDates.map((d) => formatChartLabel(d, locale, year)),
          datasets,
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top' as any,
            },
            title: {
              display: true,
              text: `Apiary Overview - Mite Trend for ${year}`,
              font: {
                size: 14,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Mites per Day',
              },
            },
            x: {
              title: {
                display: true,
                text: 'Date',
              },
              ticks: {
                autoSkip: true,
                maxTicksLimit: 12,
                maxRotation: 45,
                minRotation: 45,
              },
            },
          },
        } as any,
      });

      // Convert canvas to image
      setTimeout(() => {
        const imageData = canvas.toDataURL('image/png');
        chart.destroy();
        resolve(imageData);
      }, 100);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate PDF report for selected hives
 */
export const generatePdfReport = async (reportData: ReportData): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const locale = reportData.locale || navigator.language || 'en-US';
  const years = reportData.years && reportData.years.length > 0 ? [...reportData.years].sort((a, b) => a - b) : [reportData.year];

  // Get labels with defaults
  const resolvedLabels: ReportLabels = {
    ...getDefaultLabels(),
    ...(reportData.labels ?? {}),
  } as ReportLabels;

  doc.setProperties({
    title: 'Varroa Monitor Report',
    subject: 'Hive Monitoring Report',
    author: 'Varroa Monitor',
    creator: 'Varroa Monitor Application',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let pageNumber = 1;
  const tocEntries: { title: string; page: number; level: number }[] = [];

  // ===== Cover page =====
  let y = 40;
  doc.setFontSize(24);
  (doc.setFont as any)(undefined, 'bold');
  doc.setTextColor(40, 40, 40);
  (doc.text as any)('Varroa Monitor Report', pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setFontSize(14);
  (doc.setFont as any)(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  const yearLabel = years.length === 1
    ? `${resolvedLabels.yearLabel} ${years[0]}`
    : `${resolvedLabels.yearLabel}s ${years[0]}–${years[years.length - 1]}`;
  (doc.text as any)(yearLabel, pageWidth / 2, y, { align: 'center' });
  y += 20;

  doc.setFontSize(12);
  const reportDate = new Date();
  (doc.text as any)(`Generated: ${reportDate.toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  const apiaryCount = reportData.apiaries.size;
  let hiveCount = 0;
  reportData.apiaries.forEach((apiaryData) => {
    hiveCount += apiaryData.hives.size;
  });

  (doc.text as any)(`Apiaries: ${apiaryCount}`, pageWidth / 2, y, { align: 'center' });
  y += 5;
  (doc.text as any)(`Hives: ${hiveCount}`, pageWidth / 2, y, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  addPageFooter(doc, pageNumber, pageHeight);

  // ===== Contents page =====
  doc.addPage();
  pageNumber += 1;
  const tocPageNumber = pageNumber;
  addPageHeader(doc, resolvedLabels.contents, pageNumber, pageHeight);

  for (const year of years) {
    const yearData = reportData.yearData?.get(year) || {
      observations: reportData.observations,
      treatments: reportData.treatments,
    };

    // ===== Summary page (per year) =====
    doc.addPage();
    pageNumber += 1;
    addPageHeader(doc, `Summary ${year}`, pageNumber, pageHeight);
    tocEntries.push({ title: `${resolvedLabels.yearLabel} ${year}`, page: pageNumber, level: 0 });

    y = 30;

    // Calculate summary statistics
    let totalObservations = 0;
    let avgMitesPerDay = 0;
    let totalMites = 0;
    let totalMonitoringDays = 0;

    yearData.observations.forEach((obs) => {
      totalObservations += obs.length;
      obs.forEach((o) => {
        totalMites += o.miteCount;
        totalMonitoringDays += o.trayDays;
      });
    });

    if (totalMonitoringDays > 0) {
      avgMitesPerDay = parseFloat((totalMites / totalMonitoringDays).toFixed(2));
    }

    y = drawSectionHeading(doc, `Summary ${year}`, y);
    y = drawSummaryTable(
      doc,
      {
        'Apiaries': apiaryCount,
        'Total Hives': hiveCount,
        'Total Observations': totalObservations,
        'Total Monitoring Days': totalMonitoringDays,
        'Average Mites/Day': avgMitesPerDay,
        'Total Mites': totalMites,
      },
      y + 10,
      resolvedLabels
    );

    addPageFooter(doc, pageNumber, pageHeight);

    // ===== Apiary chapters =====
    for (const [, apiaryData] of reportData.apiaries) {
      doc.addPage();
      pageNumber += 1;
      addPageHeader(doc, apiaryData.apiary.name, pageNumber, pageHeight);
      tocEntries.push({ title: apiaryData.apiary.name, page: pageNumber, level: 1 });

      y = 30;

      y = drawSectionHeading(doc, apiaryData.apiary.name, y);

      if (apiaryData.apiary.location) {
        doc.setFontSize(10);
        (doc.setFont as any)(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        (doc.text as any)(`Location: ${apiaryData.apiary.location}`, 15, (y += 8));
        doc.setTextColor(0, 0, 0);
        y += 5;
      }

      // Add apiary image if available
      if (apiaryData.apiary.image) {
        y = checkAndAddNewPage(doc, y, IMAGE_BOX_MM + 20, pageNumber, pageHeight);
        y += 5;
        try {
          const coverImage = await createCoverSquareImage(apiaryData.apiary.image);
          (doc.addImage as any)(coverImage, 'PNG', 15, y, IMAGE_BOX_MM, IMAGE_BOX_MM);
          y += IMAGE_BOX_MM + 5;
        } catch (err) {
          console.error('Error adding apiary image:', err);
        }
      }

      // Apiary overview
      const apiaryObservations: Observation[] = [];
      const apiaryTreatments: Treatment[] = [];

      for (const hive of apiaryData.hives.values()) {
        if (yearData.observations.has(hive.id)) {
          apiaryObservations.push(...yearData.observations.get(hive.id)!);
        }
        if (yearData.treatments.has(hive.id)) {
          apiaryTreatments.push(...yearData.treatments.get(hive.id)!);
        }
      }

      if (reportData.includeMonthlySummaries && apiaryObservations.length > 0) {
        y = checkAndAddNewPage(doc, y, 60, pageNumber, pageHeight);
        y += 5;
        y = drawSubsectionHeading(doc, resolvedLabels.monthlyOverview, y);
        y = drawMonthlySummaryTable(doc, apiaryObservations, apiaryTreatments, y + 5, resolvedLabels);
        y += 10;
      }

      // Add apiary-level combined chart if requested
      if (reportData.includeCharts && apiaryObservations.length > 0) {
        y = checkAndAddNewPage(doc, y, 110, pageNumber, pageHeight);
        y += 5;
        y = drawSubsectionHeading(doc, resolvedLabels.apiaryOverview, y);
        y += 5;
        try {
          // Collect observations by hive for this apiary
          const apiaryHiveObservations: Map<string, Observation[]> = new Map();
          for (const hive of apiaryData.hives.values()) {
            const hiveObs = yearData.observations.get(hive.id) || [];
            apiaryHiveObservations.set(hive.id, hiveObs);
          }

          const chartImage = await createApiaryChartImage(
            apiaryData.hives,
            apiaryHiveObservations,
            year,
            locale,
            900,
            450
          );
          (doc.addImage as any)(chartImage, 'PNG', 15, y, 180, 90);
          y += 95;
        } catch (err) {
          console.error('Error adding apiary chart:', err);
        }
      }

      // Hive subchapters
      for (const hive of apiaryData.hives.values()) {
        y = checkAndAddNewPage(doc, y, 40, pageNumber, pageHeight);

        y = drawSubsectionHeading(doc, `Hive: ${hive.name}`, y);
        tocEntries.push({ title: `Hive: ${hive.name}`, page: pageNumber, level: 2 });

        const hiveObservations = yearData.observations.get(hive.id) || [];
        const hiveTreatments = yearData.treatments.get(hive.id) || [];
        const latestObs = hiveObservations[hiveObservations.length - 1];

        y = drawHiveInfoBox(doc, hive, latestObs, y + 5);

        // Add hive image if available
        if (hive.image) {
          y = checkAndAddNewPage(doc, y, IMAGE_BOX_MM + 20, pageNumber, pageHeight);
          y += 5;
          try {
            const coverImage = await createCoverSquareImage(hive.image);
            (doc.addImage as any)(coverImage, 'PNG', 15, y, IMAGE_BOX_MM, IMAGE_BOX_MM);
            y += IMAGE_BOX_MM + 5;
          } catch (err) {
            console.error('Error adding hive image:', err);
          }
        }

        // Add hive chart if available and requested
        if (reportData.includeCharts && hiveObservations.length > 0) {
          y = checkAndAddNewPage(doc, y, 110, pageNumber, pageHeight);
          y += 5;
        y = drawSubsectionHeading(doc, resolvedLabels.trendChart, y);
          y += 5;
          try {
            const chartImage = await createChartImage(
              hiveObservations,
              `${hive.name} - Mite Trend for ${year}`,
              locale,
              year,
              900,
              450
            );
            (doc.addImage as any)(chartImage, 'PNG', 15, y, 180, 90);
            y += 95;
          } catch (err) {
            console.error('Error adding hive chart:', err);
          }
        }

        if (reportData.includeMonthlySummaries && hiveObservations.length > 0) {
          y += 5;
          y = drawMonthlySummaryTable(doc, hiveObservations, hiveTreatments, y, resolvedLabels);
          y += 10;
        }

        if (reportData.includeTreatments && hiveTreatments.length > 0) {
          y = checkAndAddNewPage(doc, y, 30, pageNumber, pageHeight);
          y += 5;
        y = drawSubsectionHeading(doc, resolvedLabels.tableTreatments, y);
        y = drawTreatmentTable(doc, hiveTreatments, y + 5, resolvedLabels);
        }

        y += 10;
      }

      addPageFooter(doc, pageNumber, pageHeight);
    }
  }

  // Fill Contents page
  doc.setPage(tocPageNumber);
  y = 30;
  doc.setFontSize(12);
  (doc.setFont as any)(undefined, 'bold');
  (doc.text as any)(resolvedLabels.contents, 15, y);
  y += 8;

  (doc.setFont as any)(undefined, 'normal');
  doc.setFontSize(10);
  tocEntries.forEach((entry) => {
    const indent = entry.level === 0 ? 0 : entry.level === 1 ? 6 : 12;
    (doc.text as any)(entry.title, 15 + indent, y);
    (doc.text as any)(String(entry.page), pageWidth - 15, y, { align: 'right' });
    y += 6;
  });

  // Generate download
  const filename = years.length === 1
    ? `varroa-report-${years[0]}-${new Date().toISOString().split('T')[0]}.pdf`
    : `varroa-report-${years[0]}-${years[years.length - 1]}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

/**
 * Add header to PDF page
 */
function addPageHeader(doc: jsPDF, title: string, pageNumber: number, _pageHeight: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header line
  doc.setDrawColor(200, 200, 200);
  doc.line(10, 15, pageWidth - 10, 15);

  // Title
  doc.setFontSize(10);
  (doc.setFont as any)(undefined, 'bold');
  (doc.text as any)(title, 10, 12);

  // Page number
  doc.setFontSize(9);
  (doc.setFont as any)(undefined, 'normal');
  (doc.text as any)(`${pageNumber}`, pageWidth - 20, 12);

  // Date
  doc.setFontSize(8);
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  (doc.text as any)(`Generated: ${date}`, 10, 18);
}

/**
 * Add footer to PDF page
 */
function addPageFooter(doc: jsPDF, pageNumber: number, pageHeight: number): void {
  // Footer line
  doc.setDrawColor(200, 200, 200);
  doc.line(10, pageHeight - 10, doc.internal.pageSize.getWidth() - 10, pageHeight - 10);

  // Footer text
  doc.setFontSize(8);
  (doc.setFont as any)(undefined, 'normal');
  (doc.text as any)(
    `Page ${pageNumber}`,
    doc.internal.pageSize.getWidth() / 2,
    pageHeight - 5,
    { align: 'center' }
  );
}

/**
 * Draw section heading
 */
function drawSectionHeading(doc: jsPDF, heading: string, yPosition: number): number {
  doc.setFontSize(16);
  (doc.setFont as any)(undefined, 'bold');
  doc.setTextColor(40, 40, 40);
  (doc.text as any)(heading, 15, yPosition);

  // Underline
  doc.setDrawColor(100, 100, 100);
  doc.line(15, yPosition + 2, doc.internal.pageSize.getWidth() - 15, yPosition + 2);

  doc.setTextColor(0, 0, 0);
  return yPosition + 12;
}

/**
 * Draw subsection heading
 */
function drawSubsectionHeading(doc: jsPDF, heading: string, yPosition: number): number {
  doc.setFontSize(12);
  (doc.setFont as any)(undefined, 'bold');
  doc.setTextColor(60, 60, 60);
  (doc.text as any)(heading, 15, yPosition);

  doc.setTextColor(0, 0, 0);
  return yPosition + 8;
}

/**
 * Draw hive info box
 */
function drawHiveInfoBox(
  doc: jsPDF,
  hive: Hive,
  latestObservation: Observation | undefined,
  yPosition: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = (pageWidth - 30) / 2;
  let y = yPosition;

  // Background
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y - 5, boxWidth, 35, 'F');

  // Border
  doc.setDrawColor(200, 200, 200);
  doc.rect(15, y - 5, boxWidth, 35);

  // Hive name
  doc.setFontSize(11);
  (doc.setFont as any)(undefined, 'bold');
  (doc.text as any)(hive.name, 18, y);

  // Hive details
  doc.setFontSize(9);
  (doc.setFont as any)(undefined, 'normal');
  y += 7;

  if (hive.location) {
    (doc.text as any)(`Location: ${hive.location}`, 18, y);
    y += 5;
  }

  if (latestObservation) {
    const status = getMitesPerDayStatus(latestObservation.mitesPerDay);
    doc.setTextColor(parseInt(status.color.substring(1, 3), 16), 0, 0);
    (doc.text as any)(
      `Latest: ${latestObservation.mitesPerDay} mites/day (${status.status})`,
      18,
      y
    );
    doc.setTextColor(0, 0, 0);
  }

  return yPosition + 35;
}

/**
 * Check if new page is needed
 */
function checkAndAddNewPage(
  doc: jsPDF,
  currentY: number,
  requiredSpace: number,
  pageNumber: number,
  _pageHeight: number
): number {
  const bottomMargin = 15;

  if (currentY + requiredSpace > _pageHeight - bottomMargin) {
    addPageFooter(doc, pageNumber, _pageHeight);
    doc.addPage();
    addPageHeader(doc, 'Varroa Monitor Report', pageNumber + 1, _pageHeight);
    return 25;
  }

  return currentY;
}

/**
 * Draw summary statistics table
 */
function drawSummaryTable(
  doc: jsPDF,
  data: Record<string, number>,
  yPosition: number,
  labels: Required<ReportData['labels']>
): number {
  labels = labels!; // Ensure labels is not undefined
  const pageWidth = doc.internal.pageSize.getWidth();
  const colWidth = (pageWidth - 30) / 2;
  let y = yPosition;

  (doc.setFont as any)(undefined, 'bold');
  const headerHeight = drawTableHeaderRow(
    doc,
    [labels!.tableMetric, labels!.tableValue],
    15,
    y,
    [colWidth, colWidth],
    { fontSize: 9, minHeight: 7 }
  );
  y += headerHeight;

  // Rows
  doc.setTextColor(0, 0, 0); // Black text for data
  (doc.setFont as any)(undefined, 'normal');
  doc.setFontSize(9);
  let alternateRow = false;

  for (const [key, value] of Object.entries(data)) {
    if (alternateRow) {
      doc.setFillColor(245, 245, 245);
      doc.rect(15, y, colWidth * 2, 6, 'F');
    }

    (doc.text as any)(key, 18, y + 4);
    (doc.text as any)(value.toString(), 18 + colWidth, y + 4);
    y += 6;
    alternateRow = !alternateRow;
  }

  // Border
  doc.setDrawColor(150, 150, 150);
  doc.rect(15, yPosition, colWidth * 2, y - yPosition);

  return y;
}

/**
 * Draw monthly summary table
 */
function drawMonthlySummaryTable(
  doc: jsPDF,
  observations: Observation[],
  treatments: Treatment[],
  yPosition: number,
  labels: Required<ReportData['labels']>
): number {
  labels = labels!; // Ensure labels is not undefined
  const monthlySummaries = calculateMonthlySummaries(observations, treatments);
  const pageWidth = doc.internal.pageSize.getWidth();
  const colWidth = (pageWidth - 30) / 5;
  let y = yPosition;

  if (monthlySummaries.length === 0) {
    return y;
  }

  (doc.setFont as any)(undefined, 'bold');

  // Header (wrap long labels like "Gennemsn. mider/dag")
  const headers = [
    labels!.tableMonth,
    labels!.tableDays,
    labels!.tableObservations,
    labels!.tableAvgMites,
    labels!.tableTreatments,
  ];
  const headerHeight = drawTableHeaderRow(
    doc,
    headers,
    15,
    y,
    [colWidth, colWidth, colWidth, colWidth, colWidth],
    { fontSize: 8, minHeight: 7 }
  );
  y += headerHeight;
  
  doc.setTextColor(0, 0, 0); // Reset to black for data rows

  // Rows
  (doc.setFont as any)(undefined, 'normal');
  let alternateRow = false;

  monthlySummaries.forEach((summary) => {
    if (alternateRow) {
      doc.setFillColor(245, 245, 245);
      doc.rect(15, y, colWidth * 5, 5, 'F');
    }

    const monthName = `${summary.monthName.substring(0, 3)} ${summary.year}`;
    (doc.text as any)(monthName, 15 + 2, y + 3);
    (doc.text as any)(summary.monitoringDays.toString(), 15 + colWidth + 2, y + 3);
    (doc.text as any)(summary.observations.toString(), 15 + colWidth * 2 + 2, y + 3);

    // Color code the average
    const status = getMitesPerDayStatus(summary.avgMitesPerDay);
    const rgb = parseInt(status.color.substring(1, 3), 16);
    doc.setTextColor(rgb, 0, 0);
    (doc.text as any)(summary.avgMitesPerDay.toFixed(2), 15 + colWidth * 3 + 2, y + 3);
    doc.setTextColor(0, 0, 0);

    (doc.text as any)(summary.treatments.length.toString(), 15 + colWidth * 4 + 2, y + 3);

    y += 5;
    alternateRow = !alternateRow;
  });

  // Border
  doc.setDrawColor(150, 150, 150);
  doc.rect(15, yPosition, colWidth * 5, y - yPosition);

  return y + 3;
}

/**
 * Draw treatment table
 */
function drawTreatmentTable(doc: jsPDF, treatments: Treatment[], yPosition: number, labels: Required<ReportData['labels']>): number {
  labels = labels!; // Ensure labels is not undefined
  const pageWidth = doc.internal.pageSize.getWidth();
  const colWidth = (pageWidth - 30) / 3;
  let y = yPosition;

  if (treatments.length === 0) {
    return y;
  }

  (doc.setFont as any)(undefined, 'bold');

  // Header
  const headers = [labels!.tableDate, labels!.tableTreatment, labels!.tableNotes];
  const headerHeight = drawTableHeaderRow(
    doc,
    headers,
    15,
    y,
    [colWidth, colWidth, colWidth],
    { fontSize: 8, minHeight: 7 }
  );
  y += headerHeight;
  
  doc.setTextColor(0, 0, 0); // Reset to black for data rows

  // Sort treatments by date (descending)
  const sortedTreatments = [...treatments].sort((a, b) => b.date.localeCompare(a.date));

  // Rows
  (doc.setFont as any)(undefined, 'normal');
  let alternateRow = false;

  sortedTreatments.forEach((treatment) => {
    if (alternateRow) {
      doc.setFillColor(245, 245, 245);
      doc.rect(15, y, colWidth * 3, 5, 'F');
    }

    (doc.text as any)(formatDate(treatment.date), 15 + 2, y + 3);
    (doc.text as any)(treatment.treatmentType, 15 + colWidth + 2, y + 3, {
      maxWidth: colWidth - 4,
    });
    (doc.text as any)(treatment.notes || '', 15 + colWidth * 2 + 2, y + 3, {
      maxWidth: colWidth - 4,
    });

    y += 5;
    alternateRow = !alternateRow;
  });

  // Border
  doc.setDrawColor(150, 150, 150);
  doc.rect(15, yPosition, colWidth * 3, y - yPosition);

  return y + 3;
}
