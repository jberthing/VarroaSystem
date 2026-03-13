import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exportAllData, importAllData, clearAllData, seedDemoData } from '../db/repository';
import { downloadJSON, readFileAsText } from '../utils/fileUtils';
import { Observation, Treatment } from '../db/database';
import ExportHtmlModal from '../components/ExportHtmlModal';
import './ImportExport.css';

const ImportExport = () => {
  const { t, i18n } = useTranslation();
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExportHtmlModalOpen, setIsExportHtmlModalOpen] = useState(false);

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

  return (
    <div className="container">
      <div className="page-intro">
        <div>
          <h1>{t('importExport.title')}</h1>
          <p className="page-lead">
            {t('importExport.subtitle', {
              defaultValue: 'Keep local data safe with one-tap exports, HTML summaries, and cross-device imports.',
            })}
          </p>
        </div>
      </div>

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
    </div>
  );
};

export default ImportExport;
