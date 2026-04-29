import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createObservation, createTreatment, getAllHives, getAllApiaries } from '../db/repository';
import { Hive, Apiary } from '../db/database';
import { getTodayString } from '../utils/dateUtils';
import { isBiotechnicalTreatment } from '../utils/calculations';
import './QuickObservationForm.css';

interface QuickObservationFormProps {
  defaultHiveId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type RegistrationType = 'observation' | 'treatment';

const QuickObservationForm = ({
  defaultHiveId,
  onSuccess,
  onCancel,
}: QuickObservationFormProps) => {
  const { t } = useTranslation();
  const [hives, setHives] = useState<Hive[]>([]);
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [hiveId, setHiveId] = useState(defaultHiveId || '');
  const [registrationType, setRegistrationType] = useState<RegistrationType>('observation');
  const [date, setDate] = useState(getTodayString());
  const [miteCount, setMiteCount] = useState('');
  const [trayDays, setTrayDays] = useState('3');
  const [treatmentType, setTreatmentType] = useState('Oxalsyre');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadHives();
    loadApiaries();
  }, []);

  const loadHives = async () => {
    const allHives = await getAllHives(true);
    setHives(allHives);
    if (!defaultHiveId && allHives.length > 0) {
      setHiveId(allHives[0].id);
    }
  };

  const loadApiaries = async () => {
    const allApiaries = await getAllApiaries(true);
    setApiaries(allApiaries);
  };

  const getHiveDisplayName = (hive: Hive) => {
    const apiary = apiaries.find((a) => a.id === hive.apiaryId);
    if (apiary) {
      return `${apiary.name} - ${hive.name}`;
    }
    return hive.name;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hiveId) {
      setError(t('quickObservation.selectHive'));
      return;
    }

    setIsSubmitting(true);

    try {
      if (registrationType === 'treatment') {
        await createTreatment(
          hiveId,
          date,
          treatmentType,
          notes || undefined,
          endDate || undefined
        );
      } else {
        const miteCountNum = parseInt(miteCount);
        const trayDaysNum = parseInt(trayDays);

        if (isNaN(miteCountNum) || miteCountNum < 0) {
          setError(t('quickObservation.errorMiteCount'));
          setIsSubmitting(false);
          return;
        }

        if (isNaN(trayDaysNum) || trayDaysNum < 1) {
          setError(t('quickObservation.errorTrayDays'));
          setIsSubmitting(false);
          return;
        }

        await createObservation(hiveId, date, miteCountNum, trayDaysNum, notes || undefined);
      }

      // Reset form
      setMiteCount('');
      setTrayDays('3');
      setTreatmentType('Oxalsyre');
      setEndDate('');
      setNotes('');
      setDate(getTodayString());

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('quickObservation.errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hives.length === 0) {
    return (
      <div className="quick-form">
        <p className="empty-state">{t('hives.noHives')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="quick-form">
      <h2>{t('quickObservation.title')}</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="hiveId">{t('quickObservation.hiveLabel')}</label>
        <select
          id="hiveId"
          value={hiveId}
          onChange={(e) => setHiveId(e.target.value)}
          disabled={!!defaultHiveId}
        >
          {hives.map((hive) => (
            <option key={hive.id} value={hive.id}>
              {getHiveDisplayName(hive)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>{t('quickObservation.typeLabel')}</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              value="observation"
              checked={registrationType === 'observation'}
              onChange={(e) => setRegistrationType(e.target.value as RegistrationType)}
            />
            <span>{t('quickObservation.measurement')}</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              value="treatment"
              checked={registrationType === 'treatment'}
              onChange={(e) => setRegistrationType(e.target.value as RegistrationType)}
            />
            <span>{t('quickObservation.treatment')}</span>
          </label>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="date">{t('quickObservation.dateLabel')}</label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={getTodayString()}
        />
      </div>

      {registrationType === 'observation' ? (
        <>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="miteCount">{t('quickObservation.miteCountLabel')}</label>
              <input
                type="number"
                id="miteCount"
                value={miteCount}
                onChange={(e) => setMiteCount(e.target.value)}
                min="0"
                step="1"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="trayDays">{t('quickObservation.trayDaysLabel')}</label>
              <input
                type="number"
                id="trayDays"
                value={trayDays}
                onChange={(e) => setTrayDays(e.target.value)}
                min="1"
                step="1"
                required
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="form-group">
            <label htmlFor="treatmentType">{t('quickObservation.productLabel')}</label>
            <select
              id="treatmentType"
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
              <label htmlFor="endDate">{t('treatments.endDateLabel')}</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={date}
              />
            </div>
          )}
        </>
      )}

      <div className="form-group">
        <label htmlFor="notes">{t('quickObservation.notesLabel')}</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('quickObservation.submitting') : t('quickObservation.submitButton')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="secondary">
            {t('quickObservation.cancelButton')}
          </button>
        )}
      </div>
    </form>
  );
};

export default QuickObservationForm;
