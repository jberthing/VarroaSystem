import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getAllApiaries, getAllHives, getAvailableYearsForHives } from '../db/repository';
import { Apiary, Hive } from '../db/database';
import '../components/ExportHtmlModal.css'; // Reuse modal styles
import './PdfExportModal.css';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: {
    selectedApiaryIds: string[];
    selectedHiveIds: string[];
    years: number[];
    includeCharts: boolean;
    includeTreatments: boolean;
    includeMonthlySummaries: boolean;
  }) => void;
  isLoading: boolean;
}

const PdfExportModal = ({ isOpen, onClose, onExport, isLoading }: PdfExportModalProps) => {
  const { t } = useTranslation();
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [hives, setHives] = useState<Hive[]>([]);
  const [selectedApiaries, setSelectedApiaries] = useState<Set<string>>(new Set());
  const [selectedHives, setSelectedHives] = useState<Set<string>>(new Set());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());
  const [isYearsLoading, setIsYearsLoading] = useState(false);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTreatments, setIncludeTreatments] = useState(true);
  const [includeMonthlySummaries, setIncludeMonthlySummaries] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const updateYears = async () => {
      try {
        setIsYearsLoading(true);
        const hiveIds =
          selectedHives.size > 0 ? Array.from(selectedHives) : hives.map((h) => h.id);

        if (hiveIds.length === 0) {
          setAvailableYears([]);
          setSelectedYears(new Set());
          return;
        }

        const years = await getAvailableYearsForHives(hiveIds);
        setAvailableYears(years);

        setSelectedYears((prev) => {
          const next = new Set<number>();
          years.forEach((y) => {
            if (prev.has(y)) next.add(y);
          });

          if (next.size === 0 && years.length > 0) {
            next.add(years[0]);
          }

          return next;
        });
      } catch (err) {
        console.error('Error loading available years:', err);
      } finally {
        setIsYearsLoading(false);
      }
    };

    void updateYears();
  }, [isOpen, selectedHives, hives]);

  const loadData = async () => {
    try {
      const apiariesData = await getAllApiaries();
      const hivesData = await getAllHives();
      setApiaries(apiariesData);
      setHives(hivesData);
    } catch (err) {
      console.error('Error loading apiaries and hives:', err);
    }
  };

  const handleApiaryToggle = (apiaryId: string) => {
    const newSelected = new Set(selectedApiaries);
    if (newSelected.has(apiaryId)) {
      newSelected.delete(apiaryId);
      // Also deselect hives in this apiary
      const apiaryHives = hives.filter((h) => h.apiaryId === apiaryId);
      const newSelectedHives = new Set(selectedHives);
      apiaryHives.forEach((h) => newSelectedHives.delete(h.id));
      setSelectedHives(newSelectedHives);
    } else {
      newSelected.add(apiaryId);
      // Auto-select all hives in this apiary
      const apiaryHives = hives.filter((h) => h.apiaryId === apiaryId);
      const newSelectedHives = new Set(selectedHives);
      apiaryHives.forEach((h) => newSelectedHives.add(h.id));
      setSelectedHives(newSelectedHives);
    }
    setSelectedApiaries(newSelected);
  };

  const handleHiveToggle = (hiveId: string) => {
    const newSelected = new Set(selectedHives);
    if (newSelected.has(hiveId)) {
      newSelected.delete(hiveId);
    } else {
      newSelected.add(hiveId);
      // Auto-select apiary if hive is selected
      const hive = hives.find((h) => h.id === hiveId);
      if (hive?.apiaryId) {
        const newSelectedApiaries = new Set(selectedApiaries);
        newSelectedApiaries.add(hive.apiaryId);
        setSelectedApiaries(newSelectedApiaries);
      }
    }
    setSelectedHives(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedApiaries(new Set(apiaries.map((a) => a.id)));
    setSelectedHives(new Set(hives.map((h) => h.id)));
  };

  const handleClearAll = () => {
    setSelectedApiaries(new Set());
    setSelectedHives(new Set());
  };

  const handleExport = () => {
    if (selectedHives.size === 0) {
      alert(t('pdfExport.selectAtLeastOneHive', { defaultValue: 'Please select at least one hive' }));
      return;
    }

    if (selectedYears.size === 0) {
      alert(t('pdfExport.selectAtLeastOneYear', { defaultValue: 'Please select at least one year' }));
      return;
    }

    onExport({
      selectedApiaryIds: Array.from(selectedApiaries),
      selectedHiveIds: Array.from(selectedHives),
      years: Array.from(selectedYears).sort((a, b) => a - b),
      includeCharts,
      includeTreatments,
      includeMonthlySummaries,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="export-html-modal-overlay" onClick={onClose}>
      <div className="export-html-modal pdf-export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('pdfExport.title', { defaultValue: 'Export PDF Report' })}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <p className="modal-description">
            {t('pdfExport.info', {
              defaultValue:
                'Selected hives will be organized by apiary in the PDF report. Each apiary will be a chapter with hives as subchapters.',
            })}
          </p>

          <div className="pdf-export-grid">
            <div className="pdf-export-section">
              <h3>{t('pdfExport.selectApiariesAndHives', { defaultValue: 'Select Apiaries and Hives' })}</h3>

              <div className="pdf-export-actions">
                <button className="btn btn-secondary btn-small" onClick={handleSelectAll} disabled={isLoading}>
                  {t('common.selectAll', { defaultValue: 'Select All' })}
                </button>
                <button className="btn btn-secondary btn-small" onClick={handleClearAll} disabled={isLoading}>
                  {t('common.clearAll', { defaultValue: 'Clear All' })}
                </button>
              </div>

              <div className="pdf-export-selection" role="group" aria-label={t('pdfExport.selectApiariesAndHives', { defaultValue: 'Select Apiaries and Hives' })}>
                {apiaries.length === 0 && (
                  <div className="pdf-export-muted">{t('common.loading', { defaultValue: 'Loading...' })}</div>
                )}

                {apiaries.map((apiary) => (
                  <div key={apiary.id} className="apiary-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedApiaries.has(apiary.id)}
                        onChange={() => handleApiaryToggle(apiary.id)}
                        disabled={isLoading}
                      />
                      <strong>{apiary.name}</strong>
                      {apiary.location && <span className="pdf-export-muted"> — {apiary.location}</span>}
                    </label>

                    <div className="hive-list">
                      {hives
                        .filter((h) => h.apiaryId === apiary.id)
                        .map((hive) => (
                          <label key={hive.id} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedHives.has(hive.id)}
                              onChange={() => handleHiveToggle(hive.id)}
                              disabled={isLoading}
                            />
                            {hive.name}
                            {hive.location && <span className="pdf-export-muted"> — {hive.location}</span>}
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pdf-export-counts" aria-label="Selection counts">
                <div className="pdf-export-count">
                  <div className="label">{t('nav.apiaries', { defaultValue: 'Apiaries' })}</div>
                  <div className="value">{selectedApiaries.size}</div>
                </div>
                <div className="pdf-export-count">
                  <div className="label">{t('nav.hives', { defaultValue: 'Hives' })}</div>
                  <div className="value">{selectedHives.size}</div>
                </div>
              </div>
            </div>

            <div className="pdf-export-section">
              <h3>{t('pdfExport.whatToInclude', { defaultValue: 'What to Include' })}</h3>

              <div className="pdf-export-years">
                <div className="pdf-export-row">
                  <label>{t('pdfExport.year', { defaultValue: 'Year' })}</label>
                  <div className="pdf-export-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => {
                        if (availableYears.length > 0) setSelectedYears(new Set([availableYears[0]]));
                      }}
                      disabled={isLoading || isYearsLoading || availableYears.length === 0}
                    >
                      {availableYears.length > 0 ? availableYears[0] : '—'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => setSelectedYears(new Set(availableYears))}
                      disabled={isLoading || isYearsLoading || availableYears.length === 0}
                    >
                      {t('common.selectAll', { defaultValue: 'Select All' })}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => setSelectedYears(new Set())}
                      disabled={isLoading || isYearsLoading || availableYears.length === 0}
                    >
                      {t('common.clearAll', { defaultValue: 'Clear All' })}
                    </button>
                  </div>
                </div>

                <div className="pdf-export-years-list" role="group" aria-label={t('pdfExport.year', { defaultValue: 'Year' })}>
                  {isYearsLoading && (
                    <div className="pdf-export-muted">{t('common.loading', { defaultValue: 'Loading...' })}</div>
                  )}
                  {!isYearsLoading && availableYears.length === 0 && (
                    <div className="pdf-export-muted">
                      {t('pdfExport.noYearsAvailable', { defaultValue: 'No data found for the selected hives.' })}
                    </div>
                  )}
                  {availableYears.map((y) => (
                    <label key={y} className="checkbox-label pdf-export-option">
                      <span className="pdf-export-option-text">{y}</span>
                      <input
                        type="checkbox"
                        checked={selectedYears.has(y)}
                        onChange={() => {
                          const next = new Set(selectedYears);
                          if (next.has(y)) next.delete(y);
                          else next.add(y);
                          setSelectedYears(next);
                        }}
                        disabled={isLoading || isYearsLoading}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="pdf-export-options">
                <label className="checkbox-label pdf-export-option">
                  <span className="pdf-export-option-text">
                    {t('pdfExport.includeCharts', { defaultValue: 'Include Charts' })}
                  </span>
                  <input
                    type="checkbox"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                    disabled={isLoading}
                  />
                </label>

                <label className="checkbox-label pdf-export-option">
                  <span className="pdf-export-option-text">
                    {t('pdfExport.includeTreatments', { defaultValue: 'Include Treatments' })}
                  </span>
                  <input
                    type="checkbox"
                    checked={includeTreatments}
                    onChange={(e) => setIncludeTreatments(e.target.checked)}
                    disabled={isLoading}
                  />
                </label>

                <label className="checkbox-label pdf-export-option">
                  <span className="pdf-export-option-text">
                    {t('pdfExport.includeMonthlySummaries', { defaultValue: 'Include Monthly Summaries' })}
                  </span>
                  <input
                    type="checkbox"
                    checked={includeMonthlySummaries}
                    onChange={(e) => setIncludeMonthlySummaries(e.target.checked)}
                    disabled={isLoading}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button className="btn btn-primary" onClick={handleExport} disabled={isLoading}>
            {isLoading
              ? t('common.exporting', { defaultValue: 'Exporting...' })
              : t('common.export', { defaultValue: 'Export' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfExportModal;
