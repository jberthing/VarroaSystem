import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '../db/database';
import {
  getAllApiaries,
  getAllHives,
  getObservationsForHive,
  getTreatmentsForHive,
  getObservationsForHiveByYear,
} from '../db/repository';
import { calculateYearlyAverage } from '../utils/calculations';
import { generateStandaloneHTMLApp, ExportData } from '../utils/exportHtml';
import './ExportHtmlModal.css';

interface ExportHtmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
}

const ExportHtmlModal = ({ isOpen, onClose, language }: ExportHtmlModalProps) => {
  const { t } = useTranslation();
  const [selectedApiaries, setSelectedApiaries] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apiaries = useLiveQuery(() => getAllApiaries(true), []);
  const hives = useLiveQuery(() => getAllHives(true), []);

  const toggleApiary = (apiaryId: string) => {
    setSelectedApiaries((prev) =>
      prev.includes(apiaryId)
        ? prev.filter((id) => id !== apiaryId)
        : [...prev, apiaryId]
    );
    setError(null);
  };

  const selectAll = () => {
    if (apiaries) {
      setSelectedApiaries(
        selectedApiaries.length === apiaries.length
          ? []
          : apiaries.map((a) => a.id)
      );
    }
  };

  const handleExport = async () => {
    if (selectedApiaries.length === 0) {
      setError(t('importExport.exportHtmlModal.selectAtLeastOne'));
      return;
    }

    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const allExportDatas: ExportData[] = [];
      let totalHives = 0;

      // Process each selected apiary
      for (const apiaryId of selectedApiaries) {
        const apiary = await db.apiaries.get(apiaryId);
        if (!apiary) continue;

        const apiaryHives = hives?.filter((h) => h.apiaryId === apiaryId) || [];
        totalHives += apiaryHives.length;

        if (apiaryHives.length === 0) continue;

        // Collect data for all hives
        const observations = new Map<string, any[]>();
        const treatments = new Map<string, any[]>();
        const yearlyAverages = new Map<string, any>();

        for (const hive of apiaryHives) {
          const hiveObs = await getObservationsForHive(hive.id);
          observations.set(hive.id, hiveObs || []);

          const hiveTreatments = await getTreatmentsForHive(hive.id);
          treatments.set(hive.id, hiveTreatments || []);

          // Calculate yearly average for current year
          const currentYear = new Date().getFullYear();
          const yearObs = await getObservationsForHiveByYear(hive.id, currentYear);
          if (yearObs && yearObs.length > 0) {
            const yearly = calculateYearlyAverage(yearObs);
            yearly.year = currentYear;
            yearlyAverages.set(hive.id, yearly);
          }
        }

        // Create export data
        const exportData: ExportData = {
          apiary,
          hives: apiaryHives,
          observations,
          treatments,
          yearlyAverages,
        };

        allExportDatas.push(exportData);
      }

      // Generate single interactive HTML app
      const htmlContent = await generateStandaloneHTMLApp(allExportDatas, language);

      // Create download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `varroa_monitor_${dateStr}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const count = selectedApiaries.length;
      setSuccess(
        t('importExport.exportHtmlModal.success', {
          count: count,
          hives: totalHives,
        })
      );
      setSelectedApiaries([]);
    } catch (err) {
      setError(t('importExport.exportHtmlModal.exportFailed', {
        error: err instanceof Error ? err.message : 'Unknown error'
      }));
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setSelectedApiaries([]);
    setError(null);
    setSuccess(null);
    setIsExporting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="export-html-modal-overlay" onClick={handleClose}>
      <div className="export-html-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 {t('importExport.exportHtmlModal.title')}</h2>
          <button className="modal-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="modal-content">
          <p className="modal-description">
            {t('importExport.exportHtmlModal.description')}
          </p>

          <div className="form-group">
            <h3>{t('importExport.exportHtmlModal.selectApiaries')}</h3>
            <div className="apiary-selection">
              <label>
                <input
                  type="checkbox"
                  checked={
                    apiaries && selectedApiaries.length === apiaries.length && apiaries.length > 0
                  }
                  onChange={selectAll}
                  disabled={isExporting || !apiaries || apiaries.length === 0}
                />
                <strong>{t('importExport.exportHtmlModal.selectAll')}</strong>
              </label>
            </div>

            {apiaries?.map((apiary) => (
              <div key={apiary.id} className="apiary-selection">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedApiaries.includes(apiary.id)}
                    onChange={() => toggleApiary(apiary.id)}
                    disabled={isExporting}
                  />
                  {apiary.name}
                  {apiary.location ? ` (${apiary.location})` : ''}
                </label>
              </div>
            ))}

            {!apiaries || apiaries.length === 0 ? (
              <p className="no-apiaries-message">{t('importExport.exportHtmlModal.noApiaries')}</p>
            ) : null}
          </div>

          {selectedApiaries.length > 0 && (
            <div className="apiary-info">
              <div className="info-box">
                <div className="info-item">
                  <span className="info-label">{t('importExport.exportHtmlModal.selectedApiaries')}</span>
                  <span className="info-value">{selectedApiaries.length}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('importExport.exportHtmlModal.totalHives')}</span>
                  <span className="info-value">
                    {hives?.filter((h) => selectedApiaries.includes(h.apiaryId || '')).length || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="features-info">
            <h4>{t('importExport.exportHtmlModal.whatsIncluded')}</h4>
            <ul>
              <li>✓ {t('importExport.exportHtmlModal.feature1')}</li>
              <li>✓ {t('importExport.exportHtmlModal.feature2')}</li>
              <li>✓ {t('importExport.exportHtmlModal.feature3')}</li>
              <li>✓ {t('importExport.exportHtmlModal.feature4')}</li>
              <li>✓ {t('importExport.exportHtmlModal.feature5')}</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isExporting}
          >
            {t('importExport.exportHtmlModal.cancel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={selectedApiaries.length === 0 || isExporting}
          >
            {isExporting ? t('importExport.exportHtmlModal.exporting') : `📥 ${t('importExport.exportHtmlModal.export')}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportHtmlModal;
