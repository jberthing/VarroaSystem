import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getApiary, getHivesForApiary, createObservation, createTreatment } from '../db/repository';
import { Apiary, Hive } from '../db/database';
import { getTodayString } from '../utils/dateUtils';
import { isBiotechnicalTreatment } from '../utils/calculations';
import './ApiaryBulkEntry.css';

type RegistrationType = 'observation' | 'treatment';

const ApiaryBulkEntry = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [apiary, setApiary] = useState<Apiary | null>(null);
  const [hives, setHives] = useState<Hive[]>([]);
  const [registrationType, setRegistrationType] = useState<RegistrationType>('treatment');
  const [date, setDate] = useState(getTodayString());

  // Treatment fields
  const [treatmentType, setTreatmentType] = useState('Oxalsyre');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedHiveIds, setSelectedHiveIds] = useState<Set<string>>(new Set());

  // Observation fields
  const [trayDays, setTrayDays] = useState('3');
  const [miteCounts, setMiteCounts] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [apiaryData, hiveData] = await Promise.all([
        getApiary(id),
        getHivesForApiary(id),
      ]);
      setApiary(apiaryData ?? null);
      const activeHives = hiveData.filter((h) => h.isActive);
      setHives(activeHives);
      // Select all hives by default for treatment
      setSelectedHiveIds(new Set(activeHives.map((h) => h.id)));
      setLoading(false);
    };
    load();
  }, [id]);

  const toggleHive = (hiveId: string) => {
    setSelectedHiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(hiveId)) {
        next.delete(hiveId);
      } else {
        next.add(hiveId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedHiveIds.size === hives.length) {
      setSelectedHiveIds(new Set());
    } else {
      setSelectedHiveIds(new Set(hives.map((h) => h.id)));
    }
  };

  const filledObservationCount = Object.values(miteCounts).filter(
    (v) => v !== '' && !isNaN(parseInt(v)) && parseInt(v) >= 0
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessCount(null);

    if (registrationType === 'treatment') {
      if (selectedHiveIds.size === 0) {
        setError(t('apiaryBulk.errorNoHivesSelected'));
        return;
      }
    } else {
      if (filledObservationCount === 0) {
        setError(t('apiaryBulk.errorNoObservations'));
        return;
      }
      const trayDaysNum = parseInt(trayDays);
      if (isNaN(trayDaysNum) || trayDaysNum < 1) {
        setError(t('quickObservation.errorTrayDays'));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let count = 0;
      if (registrationType === 'treatment') {
        for (const hive of hives) {
          if (selectedHiveIds.has(hive.id)) {
            await createTreatment(
              hive.id,
              date,
              treatmentType,
              notes || undefined,
              endDate || undefined
            );
            count++;
          }
        }
      } else {
        const trayDaysNum = parseInt(trayDays);
        for (const hive of hives) {
          const raw = miteCounts[hive.id];
          if (raw === '' || raw === undefined) continue;
          const miteCountNum = parseInt(raw);
          if (isNaN(miteCountNum) || miteCountNum < 0) continue;
          await createObservation(hive.id, date, miteCountNum, trayDaysNum, notes || undefined);
          count++;
        }
      }

      setSuccessCount(count);
      // Reset per-entry state but keep shared fields
      setSelectedHiveIds(new Set(hives.map((h) => h.id)));
      setMiteCounts({});
      setNotes('');
      setEndDate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('quickObservation.errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (!apiary) {
    return (
      <div className="container">
        <p>{t('common.error')}</p>
        <Link to="/apiaries">{t('apiaries.title')}</Link>
      </div>
    );
  }

  if (hives.length === 0) {
    return (
      <div className="container">
        <div className="page-intro">
          <div>
            <p className="breadcrumb-nav">
              <Link to="/apiaries">{t('apiaries.title')}</Link>
              {' › '}
              {apiary.name}
            </p>
            <h1>{apiary.name}</h1>
          </div>
        </div>
        <div className="empty-state empty-state-card">
          <p>{t('apiaryBulk.noHives')}</p>
          <Link to="/hives">
            <button>{t('hives.createFirst')}</button>
          </Link>
        </div>
      </div>
    );
  }

  const submitLabel =
    registrationType === 'treatment'
      ? t('apiaryBulk.submitTreatment', { count: selectedHiveIds.size })
      : t('apiaryBulk.submitObservation', { count: filledObservationCount });

  return (
    <div className="container">
      <div className="page-intro">
        <div>
          <p className="breadcrumb-nav">
            <Link to="/apiaries">{t('apiaries.title')}</Link>
            {' › '}
            {apiary.name}
          </p>
          <h1>{t('apiaryBulk.title', { name: apiary.name })}</h1>
          <p className="page-lead">{t('apiaryBulk.subtitle')}</p>
        </div>
      </div>

      {successCount !== null && (
        <div className="bulk-success-banner">
          {registrationType === 'treatment'
            ? t('apiaryBulk.successTreatment', { count: successCount })
            : t('apiaryBulk.successObservation', { count: successCount })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bulk-form surface">
        {/* Type toggle */}
        <div className="form-group">
          <label>{t('quickObservation.typeLabel')}</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                value="treatment"
                checked={registrationType === 'treatment'}
                onChange={() => {
                  setRegistrationType('treatment');
                  setSuccessCount(null);
                  setError('');
                }}
              />
              <span>{t('quickObservation.treatment')}</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="observation"
                checked={registrationType === 'observation'}
                onChange={() => {
                  setRegistrationType('observation');
                  setSuccessCount(null);
                  setError('');
                }}
              />
              <span>{t('quickObservation.measurement')}</span>
            </label>
          </div>
        </div>

        {/* Shared date */}
        <div className="form-group">
          <label htmlFor="bulk-date">{t('quickObservation.dateLabel')}</label>
          <input
            type="date"
            id="bulk-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={getTodayString()}
          />
        </div>

        {registrationType === 'treatment' ? (
          <>
            {/* Treatment type */}
            <div className="form-group">
              <label htmlFor="bulk-treatmentType">{t('quickObservation.productLabel')}</label>
              <select
                id="bulk-treatmentType"
                value={treatmentType}
                onChange={(e) => setTreatmentType(e.target.value)}
                required
              >
                <optgroup label={t('treatments.chemicalGroup')}>
                  <option value="Oxalsyre">{t('treatments.oxalicAcid')}</option>
                  <option value="Myresyre">{t('treatments.formicAcid')}</option>
                  <option value="Thymol">{t('treatments.thymol')}</option>
                  <option value="Apiguard">{t('treatments.apiguard')}</option>
                  <option value="ApiLife Var">{t('treatments.apiLifeVar')}</option>
                </optgroup>
                <optgroup label={t('treatments.biotechnicalGroup')}>
                  <option value="Dronning indespærring">{t('treatments.queenConfinement')}</option>
                  <option value="Total yngel fratagelse">{t('treatments.totalBroodRemoval')}</option>
                  <option value="Fangstkassette">{t('treatments.trapComb')}</option>
                  <option value="Dronelarve udskæring">{t('treatments.droneBroodRemoval')}</option>
                </optgroup>
                <option value="Andet">{t('treatments.other')}</option>
              </select>
            </div>

            {isBiotechnicalTreatment(treatmentType) && (
              <div className="form-group">
                <label htmlFor="bulk-endDate">{t('treatments.endDateLabel')}</label>
                <input
                  type="date"
                  id="bulk-endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={date}
                />
              </div>
            )}

            {/* Notes */}
            <div className="form-group">
              <label htmlFor="bulk-notes">{t('quickObservation.notesLabel')}</label>
              <textarea
                id="bulk-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Hive selection */}
            <div className="bulk-hives-section">
              <div className="bulk-hives-header">
                <span className="bulk-hives-label">{t('apiaryBulk.selectHives')}</span>
                <button type="button" className="link-button" onClick={toggleAll}>
                  {selectedHiveIds.size === hives.length
                    ? t('apiaryBulk.deselectAll')
                    : t('apiaryBulk.selectAll')}
                </button>
              </div>
              <div className="bulk-hive-list">
                {hives.map((hive) => (
                  <label key={hive.id} className="bulk-hive-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedHiveIds.has(hive.id)}
                      onChange={() => toggleHive(hive.id)}
                    />
                    <span>{hive.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Shared tray days for observation */}
            <div className="form-group">
              <label htmlFor="bulk-trayDays">{t('quickObservation.trayDaysLabel')}</label>
              <input
                type="number"
                id="bulk-trayDays"
                value={trayDays}
                onChange={(e) => setTrayDays(e.target.value)}
                min="1"
                step="1"
                required
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label htmlFor="bulk-notes-obs">{t('quickObservation.notesLabel')}</label>
              <textarea
                id="bulk-notes-obs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Per-hive mite count */}
            <div className="bulk-hives-section">
              <div className="bulk-hives-header">
                <span className="bulk-hives-label">{t('apiaryBulk.miteCountPerHive')}</span>
                <span className="bulk-hives-hint">{t('apiaryBulk.emptySkips')}</span>
              </div>
              <div className="bulk-obs-list">
                {hives.map((hive) => (
                  <div key={hive.id} className="bulk-obs-row">
                    <label htmlFor={`mite-${hive.id}`} className="bulk-obs-label">
                      {hive.name}
                    </label>
                    <input
                      type="number"
                      id={`mite-${hive.id}`}
                      className="bulk-obs-input"
                      value={miteCounts[hive.id] ?? ''}
                      onChange={(e) =>
                        setMiteCounts((prev) => ({ ...prev, [hive.id]: e.target.value }))
                      }
                      min="0"
                      step="1"
                      placeholder="–"
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('quickObservation.submitting') : submitLabel}
          </button>
          <Link to="/apiaries">
            <button type="button" className="secondary">
              {t('apiaryBulk.backToApiaries')}
            </button>
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ApiaryBulkEntry;
