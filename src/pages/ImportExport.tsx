import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  exportAllData,
  importAllData,
  clearAllData,
  seedDemoData,
  getAllApiaries,
  getAllHives,
  getObservationsForHiveByYear,
  getTreatmentsForHive,
} from '../db/repository';
import { downloadJSON, readFileAsText } from '../utils/fileUtils';
import { Observation, Treatment } from '../db/database';
import ExportHtmlModal from '../components/ExportHtmlModal';
import PdfExportModal from '../components/PdfExportModal';
import { generatePdfReport } from '../utils/pdfGenerator';
import './ImportExport.css';

const ImportExport = () => {
  const { t, i18n } = useTranslation();
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExportHtmlModalOpen, setIsExportHtmlModalOpen] = useState(false);
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  const handleExportJSON = async () => {
    try {
      const data = await exportAllData();
      const timestamp = new Date().toISOString().split('T')[0];
      downloadJSON(data, `varroa-backup-${timestamp}.json`);
    } catch (err) {
      alert(
        t('importExport.exportError') +
          ': ' +
          (err instanceof Error ? err.message : t('importExport.unknownError'))
      );
    }
  };

  const handleExportCSV = async () => {
    try {
      const data = await exportAllData();

      // CSV header
      let csv =
        'Type,Bistade,Bigård,Placering,Dato,Antal mider,Dage,Mider pr. dag,Behandling,Produkt,Noter\n';

      // Create a map of hive IDs to names and apiary IDs
      const hiveMap = new Map(data.hives.map((h) => [h.id, h]));
      const apiaryMap = new Map(data.apiaries.map((a) => [a.id, a.name]));

      // Add observation rows
      data.observations.forEach((obs: Observation) => {
        const hive = hiveMap.get(obs.hiveId);
        const hiveName = hive?.name || 'Ukendt';
        const apiaryName = hive?.apiaryId ? apiaryMap.get(hive.apiaryId) || '' : '';
        const location = hive?.location || '';
        const notes = (obs.notes || '').replace(/"/g, '""');

        csv += `"Måling","${hiveName}","${apiaryName}","${location}","${obs.date}",${obs.miteCount},${obs.trayDays},${obs.mitesPerDay},"","","${notes}"\n`;
      });

      // Add treatment rows
      data.treatments.forEach((treatment: Treatment) => {
        const hive = hiveMap.get(treatment.hiveId);
        const hiveName = hive?.name || 'Ukendt';
        const apiaryName = hive?.apiaryId ? apiaryMap.get(hive.apiaryId) || '' : '';
        const location = hive?.location || '';
        const notes = (treatment.notes || '').replace(/"/g, '""');

        csv += `"Behandling","${hiveName}","${apiaryName}","${location}","${treatment.date}","","","","${treatment.treatmentType}","","${notes}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `varroa-data-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        t('importExport.csvExportError') +
          ': ' +
          (err instanceof Error ? err.message : t('importExport.unknownError'))
      );
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportSuccess('');
    setIsProcessing(true);

    try {
      const text = await readFileAsText(file);
      const data = JSON.parse(text);

      // Basic validation
      if (
        !data.hives ||
        !data.observations ||
        !Array.isArray(data.hives) ||
        !Array.isArray(data.observations)
      ) {
        throw new Error(t('importExport.invalidFileFormat'));
      }

      if (
        !confirm(
          t('importExport.confirmImport', {
            hives: data.hives.length,
            observations: data.observations.length,
          })
        )
      ) {
        setIsProcessing(false);
        return;
      }

      await importAllData(data);
      setImportSuccess(
        t('importExport.importSuccess', {
          hives: data.hives.length,
          observations: data.observations.length,
        })
      );
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t('importExport.importReadError'));
    } finally {
      setIsProcessing(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleClearData = async () => {
    if (!confirm(t('importExport.confirmClearData'))) {
      return;
    }

    if (!confirm(t('importExport.confirmClearDataFinal'))) {
      return;
    }

    try {
      await clearAllData();
      alert(t('importExport.clearDataSuccess'));
    } catch (err) {
      alert(
        t('importExport.clearDataError') +
          ': ' +
          (err instanceof Error ? err.message : t('importExport.unknownError'))
      );
    }
  };

  const handleSeedDemo = async () => {
    if (!confirm(t('importExport.confirmSeedDemo'))) {
      return;
    }

    try {
      await seedDemoData();
      alert(t('importExport.seedDemoSuccess'));
    } catch (err) {
      alert(
        t('importExport.seedDemoError') +
          ': ' +
          (err instanceof Error ? err.message : t('importExport.unknownError'))
      );
    }
  };

  const handleExportPdf = async (options: {
    selectedApiaryIds: string[];
    selectedHiveIds: string[];
    years: number[];
    includeCharts: boolean;
    includeTreatments: boolean;
    includeMonthlySummaries: boolean;
  }) => {
    setIsPdfExporting(true);
    try {
      // Fetch all required data
      const allApiaries = await getAllApiaries();
      const allHives = await getAllHives();

      // Filter selected data
      const selectedApiaries = allApiaries.filter((a) =>
        options.selectedApiaryIds.includes(a.id)
      );
      const selectedHives = allHives.filter((h) => options.selectedHiveIds.includes(h.id));

      const years = [...options.years].sort((a, b) => a - b);

      const needsTreatments = options.includeTreatments || options.includeMonthlySummaries;
      const treatmentsAllByHive = new Map<string, Treatment[]>();
      if (needsTreatments) {
        for (const hive of selectedHives) {
          treatmentsAllByHive.set(hive.id, await getTreatmentsForHive(hive.id));
        }
      }

      for (const year of years) {
        // Build report data structure (per-year)
        const apiariesMap = new Map();
        const observationsMap = new Map();
        const treatmentsMap = new Map();

        for (const apiary of selectedApiaries) {
          const hivesForApiary = selectedHives.filter((h) => h.apiaryId === apiary.id);
          if (hivesForApiary.length > 0) {
            apiariesMap.set(apiary.id, {
              apiary,
              hives: new Map(hivesForApiary.map((h) => [h.id, h])),
            });
          }
        }

        // Fetch observations and treatments for selected hives
        for (const hive of selectedHives) {
          const observations = await getObservationsForHiveByYear(hive.id, year);
          const treatments = needsTreatments ? (treatmentsAllByHive.get(hive.id) || []) : [];
          const filteredTreatments = needsTreatments
            ? treatments.filter((t) => t.date >= `${year}-01-01` && t.date <= `${year}-12-31`)
            : [];

          if (observations.length > 0) {
            observationsMap.set(hive.id, observations);
          }
          if (filteredTreatments.length > 0) {
            treatmentsMap.set(hive.id, filteredTreatments);
          }
        }

        // Generate PDF (one per year)
        await generatePdfReport({
          apiaries: apiariesMap,
          observations: observationsMap,
          treatments: treatmentsMap,
          year,
          includeCharts: options.includeCharts,
          includeTreatments: options.includeTreatments,
          includeMonthlySummaries: options.includeMonthlySummaries,
          locale: i18n.language,
          labels: {
            monthlyOverview: t('pdfExport.monthlyOverview'),
            apiaryOverview: t('pdfExport.apiaryOverview'),
            trendChart: t('pdfExport.trendChart'),
            tableMonth: t('pdfExport.tableMonth'),
            tableDays: t('pdfExport.tableDays'),
            tableObservations: t('pdfExport.tableObservations'),
            tableAvgMites: t('pdfExport.tableAvgMites'),
            tableTreatments: t('pdfExport.tableTreatments'),
            tableDate: t('pdfExport.tableDate'),
            tableTreatment: t('pdfExport.tableTreatment'),
            tableNotes: t('pdfExport.tableNotes'),
            tableMetric: t('pdfExport.tableMetric'),
            tableValue: t('pdfExport.tableValue'),
          },
        });
      }

      setIsPdfExportModalOpen(false);
    } catch (err) {
      alert(
        t('importExport.pdfExportError') +
          ': ' +
          (err instanceof Error ? err.message : t('importExport.unknownError'))
      );
    } finally {
      setIsPdfExporting(false);
    }
  };

  return (
    <div className="container">
      <h1>{t('importExport.title')}</h1>

      <div className="import-export-section">
        <div className="section-card">
          <h2>📥 {t('importExport.exportData')}</h2>
          <p>{t('importExport.exportDescription')}</p>
          <div className="button-group">
            <button onClick={handleExportJSON}>{t('importExport.exportJSON')}</button>
            <button onClick={handleExportCSV} className="secondary">
              {t('importExport.exportCSV')}
            </button>
            <button onClick={() => setIsExportHtmlModalOpen(true)} className="secondary">
              📊 {t('importExport.exportHTML')}
            </button>
            <button onClick={() => setIsPdfExportModalOpen(true)} className="secondary">
              📄 {t('importExport.exportPDF', { defaultValue: 'Export PDF Report' })}
            </button>
          </div>
        </div>

        <div className="section-card">
          <h2>📤 {t('importExport.importData')}</h2>
          <p dangerouslySetInnerHTML={{ __html: t('importExport.importDescription') }} />

          {importError && <div className="error-message">{importError}</div>}
          {importSuccess && <div className="success-message">{importSuccess}</div>}

          <div className="file-input-wrapper">
            <input
              type="file"
              id="import-file"
              accept=".json"
              onChange={handleImportJSON}
              disabled={isProcessing}
              className="file-input"
            />
            <label htmlFor="import-file" className="file-input-button">
              {isProcessing ? t('importExport.processing') : t('importExport.importJSON')}
            </label>
          </div>
        </div>

        <div className="section-card">
          <h2>🧪 {t('importExport.testData')}</h2>
          <p>{t('importExport.testDataDescription')}</p>
          <button onClick={handleSeedDemo} className="secondary">
            {t('importExport.loadDemoData')}
          </button>
        </div>

        <div className="section-card danger-zone">
          <h2>⚠️ {t('importExport.dangerZone')}</h2>
          <p dangerouslySetInnerHTML={{ __html: t('importExport.dangerZoneDescription') }} />
          <button onClick={handleClearData} className="danger">
            {t('importExport.clearAllData')}
          </button>
        </div>
      </div>

      <div className="info-box">
        <h3>ℹ️ {t('importExport.aboutBackup')}</h3>
        <ul>
          <li>{t('importExport.backupInfo1')}</li>
          <li>{t('importExport.backupInfo2')}</li>
          <li>{t('importExport.backupInfo3')}</li>
          <li>{t('importExport.backupInfo4')}</li>
        </ul>
      </div>

      <ExportHtmlModal
        isOpen={isExportHtmlModalOpen}
        onClose={() => setIsExportHtmlModalOpen(false)}
        language={i18n.language}
      />

      <PdfExportModal
        isOpen={isPdfExportModalOpen}
        onClose={() => setIsPdfExportModalOpen(false)}
        onExport={handleExportPdf}
        isLoading={isPdfExporting}
      />
    </div>
  );
};

export default ImportExport;
