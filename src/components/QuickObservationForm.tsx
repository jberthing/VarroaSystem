import { useState, useEffect } from 'react'
import { createObservation, createTreatment, getAllHives, getAllApiaries } from '../db/repository'
import { Hive, Apiary } from '../db/database'
import { getTodayString } from '../utils/dateUtils'
import './QuickObservationForm.css'

interface QuickObservationFormProps {
  defaultHiveId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

type RegistrationType = 'observation' | 'treatment'

const QuickObservationForm = ({
  defaultHiveId,
  onSuccess,
  onCancel
}: QuickObservationFormProps) => {
  const [hives, setHives] = useState<Hive[]>([])
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [hiveId, setHiveId] = useState(defaultHiveId || '')
  const [registrationType, setRegistrationType] = useState<RegistrationType>('observation')
  const [date, setDate] = useState(getTodayString())
  const [miteCount, setMiteCount] = useState('')
  const [trayDays, setTrayDays] = useState('3')
  const [treatmentType, setTreatmentType] = useState('Oxalsyre')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadHives()
    loadApiaries()
  }, [])

  const loadHives = async () => {
    const allHives = await getAllHives(true)
    setHives(allHives)
    if (!defaultHiveId && allHives.length > 0) {
      setHiveId(allHives[0].id)
    }
  }

  const loadApiaries = async () => {
    const allApiaries = await getAllApiaries(true)
    setApiaries(allApiaries)
  }

  const getHiveDisplayName = (hive: Hive) => {
    const apiary = apiaries.find(a => a.id === hive.apiaryId)
    if (apiary) {
      return `${apiary.name} - ${hive.name}`
    }
    return hive.name
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!hiveId) {
      setError('Vælg venligst et bistade')
      return
    }

    setIsSubmitting(true)

    try {
      if (registrationType === 'treatment') {
        await createTreatment(
          hiveId,
          date,
          treatmentType,
          notes || undefined
        )
      } else {
        const miteCountNum = parseInt(miteCount)
        const trayDaysNum = parseInt(trayDays)

        if (isNaN(miteCountNum) || miteCountNum < 0) {
          setError('Antal mider skal være et positivt tal')
          setIsSubmitting(false)
          return
        }

        if (isNaN(trayDaysNum) || trayDaysNum < 1) {
          setError('Antal dage skal være mindst 1')
          setIsSubmitting(false)
          return
        }

        await createObservation(
          hiveId,
          date,
          miteCountNum,
          trayDaysNum,
          notes || undefined
        )
      }

      // Reset form
      setMiteCount('')
      setTrayDays('3')
      setTreatmentType('Oxalsyre')
      setNotes('')
      setDate(getTodayString())

      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Der opstod en fejl')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (hives.length === 0) {
    return (
      <div className="quick-form">
        <p className="empty-state">
          Du har ingen aktive bistader. Opret først et bistade under "Bistader".
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="quick-form">
      <h2>Ny registrering</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="hiveId">Bistade</label>
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
        <label>Type registrering</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              value="observation"
              checked={registrationType === 'observation'}
              onChange={(e) => setRegistrationType(e.target.value as RegistrationType)}
            />
            <span>Måling (mider)</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              value="treatment"
              checked={registrationType === 'treatment'}
              onChange={(e) => setRegistrationType(e.target.value as RegistrationType)}
            />
            <span>Behandling</span>
          </label>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="date">Dato</label>
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
              <label htmlFor="miteCount">Antal mider</label>
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
              <label htmlFor="trayDays">Dage i familien</label>
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
        <div className="form-group">
          <label htmlFor="treatmentType">Behandlingstype</label>
          <select
            id="treatmentType"
            value={treatmentType}
            onChange={(e) => setTreatmentType(e.target.value)}
            required
          >
            <option value="Oxalsyre">Oxalsyre</option>
            <option value="Myresyre">Myresyre</option>
            <option value="Thymol">Thymol</option>
            <option value="Apiguard">Apiguard</option>
            <option value="ApiLife Var">ApiLife Var</option>
            <option value="Dronelarve udskæring">Dronelarve udskæring</option>
            <option value="Andet">Andet</option>
          </select>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="notes">Noter (valgfrit)</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Gemmer...' : 'Gem registrering'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="secondary">
            Annullér
          </button>
        )}
      </div>
    </form>
  )
}

export default QuickObservationForm
