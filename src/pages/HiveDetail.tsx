import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Line } from 'react-chartjs-2'
import { useTranslation } from 'react-i18next'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import annotationPlugin from 'chartjs-plugin-annotation'
import zoomPlugin from 'chartjs-plugin-zoom'
import { getHive, getObservationsForHive, getTreatmentsForHive, deleteObservation, deleteTreatment, updateObservation, updateTreatment } from '../db/repository'
import { Hive, Treatment, Observation } from '../db/database'
import { getMitesPerDayColor, calculateYearlyAverage } from '../utils/calculations'
import QuickObservationForm from '../components/QuickObservationForm'
import './HiveDetail.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  annotationPlugin,
  zoomPlugin
)

type ViewMode = 'daily' | 'moving10' | 'weekly' | 'monthly'

const HiveDetail = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [hive, setHive] = useState<Hive | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [editingObservation, setEditingObservation] = useState<string | null>(null)
  const [editingTreatment, setEditingTreatment] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const [chartInstance, setChartInstance] = useState<any>(null)

  // Live query for observations and treatments
  const observations = useLiveQuery(
    () => (id ? getObservationsForHive(id) : Promise.resolve([])),
    [id]
  )

  const treatments = useLiveQuery(
    () => (id ? getTreatmentsForHive(id) : Promise.resolve([])),
    [id]
  )

  useEffect(() => {
    loadHive()
  }, [id])

  const loadHive = async () => {
    if (!id) return
    const hiveData = await getHive(id)
    if (hiveData) {
      setHive(hiveData)
    } else {
      navigate('/hives')
    }
  }

  const handleDelete = async (obsId: string) => {
    if (confirm(t('hiveDetail.confirmDeleteObservation'))) {
      await deleteObservation(obsId)
    }
  }

  const handleDeleteTreatment = async (treatmentId: string) => {
    if (confirm(t('hiveDetail.confirmDeleteTreatment'))) {
      await deleteTreatment(treatmentId)
    }
  }

  const handleEditObservation = (obs: Observation) => {
    setEditingObservation(obs.id)
    setEditForm({
      date: obs.date,
      miteCount: obs.miteCount,
      trayDays: obs.trayDays,
      notes: obs.notes || ''
    })
  }

  const handleSaveObservation = async (obsId: string) => {
    try {
      await updateObservation(obsId, {
        date: editForm.date,
        miteCount: Number(editForm.miteCount),
        trayDays: Number(editForm.trayDays),
        notes: editForm.notes
      })
      setEditingObservation(null)
      setEditForm({})
    } catch (err) {
      alert('Fejl ved opdatering: ' + (err instanceof Error ? err.message : 'Ukendt fejl'))
    }
  }

  const handleCancelEdit = () => {
    setEditingObservation(null)
    setEditingTreatment(null)
    setEditForm({})
  }

  const handleEditTreatment = (treatment: Treatment) => {
    setEditingTreatment(treatment.id)
    setEditForm({
      date: treatment.date,
      treatmentType: treatment.treatmentType,
      notes: treatment.notes || ''
    })
  }

  const handleSaveTreatment = async (treatmentId: string) => {
    try {
      await updateTreatment(treatmentId, {
        date: editForm.date,
        treatmentType: editForm.treatmentType,
        notes: editForm.notes
      })
      setEditingTreatment(null)
      setEditForm({})
    } catch (err) {
      alert('Fejl ved opdatering: ' + (err instanceof Error ? err.message : 'Ukendt fejl'))
    }
  }

  if (!hive || !observations || !treatments) {
    return (
      <div className="container">
        <p>Indlæser...</p>
      </div>
    )
  }

  // Aggregate data based on view mode
  const aggregateData = (data: any[], mode: ViewMode) => {
    if (mode === 'daily') {
      return data
    }

    if (mode === 'moving10') {
      const movingAvg = []
      const windowSize = 10
      for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - windowSize + 1)
        const window = data.slice(start, i + 1)
        const sum = window.reduce((acc, point) => acc + point.mitesPerDay, 0)
        const avg = sum / window.length
        movingAvg.push({ ...data[i], mitesPerDay: parseFloat(avg.toFixed(2)) })
      }
      return movingAvg
    }

    const aggregated: any = {}
    data.forEach(point => {
      let key: string
      const date = new Date(point.date)
      
      if (mode === 'weekly') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }

      if (!aggregated[key]) {
        aggregated[key] = { sum: 0, count: 0, date: point.date }
      }
      aggregated[key].sum += point.mitesPerDay
      aggregated[key].count += 1
    })

    return Object.values(aggregated).map((group: any) => ({
      date: group.date,
      mitesPerDay: parseFloat((group.sum / group.count).toFixed(2))
    }))
  }

  const aggregatedObservations = aggregateData([...observations].reverse(), viewMode)

  // Prepare chart data with time-series
  const chartData = {
    datasets: [
      {
        label: viewMode === 'moving10' ? 'Mider pr. dag (10-dages gns.)' : 'Mider pr. dag',
        data: aggregatedObservations.map((obs) => ({
          x: new Date(obs.date),
          y: obs.mitesPerDay
        })),
        borderColor: viewMode === 'moving10' ? '#8b5cf6' : '#fbbf24',
        backgroundColor: viewMode === 'moving10' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(251, 191, 36, 0.1)',
        tension: viewMode === 'moving10' ? 0.4 : 0.3,
        pointRadius: viewMode === 'daily' ? 2 : viewMode === 'moving10' ? 1 : 4,
        pointHoverRadius: 6,
        fill: true
      }
    ]
  }

  // Create treatment annotations for time-series
  const treatmentAnnotations: any = {}
  treatments.forEach((treatment: Treatment, index: number) => {
    treatmentAnnotations[`treatment${index}`] = {
      type: 'line',
      xMin: new Date(treatment.date),
      xMax: new Date(treatment.date),
      borderColor: '#ef4444',
      borderWidth: 2,
      borderDash: [6, 4],
      label: {
        display: true,
        content: treatment.treatmentType,
        position: 'start',
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        color: 'white',
        font: {
          size: 10,
          weight: 'bold'
        },
        padding: 4
      }
    }
  })

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Mider pr. dag over tid',
        font: {
          size: 16,
          weight: 600 as const
        }
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            const date = new Date(context[0].parsed.x)
            return date.toLocaleDateString('da-DK', { 
              weekday: 'short',
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })
          },
          label: function(context: any) {
            return `Mider/dag: ${context.parsed.y.toFixed(2)}`
          }
        }
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1
          },
          pinch: {
            enabled: true
          },
          mode: 'x' as const
        },
        pan: {
          enabled: true,
          mode: 'x' as const
        },
        limits: {
          x: {
            min: 'original' as const,
            max: 'original' as const
          }
        }
      },
      annotation: {
        annotations: treatmentAnnotations
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: viewMode === 'monthly' ? 'month' as const : viewMode === 'weekly' ? 'week' as const : 'day' as const,
          displayFormats: {
            day: 'MMM d',
            week: 'MMM d',
            month: 'MMM yyyy'
          },
          tooltipFormat: 'PP'
        },
        title: {
          display: true,
          text: 'Dato'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Mider pr. dag'
        }
      }
    }
  }

  const resetZoom = () => {
    if (chartInstance) {
      chartInstance.resetZoom()
    }
  }

  return (
    <div className="container">
      <div className="detail-header">
        <div>
          <Link to="/hives" className="back-link">
            ← {t('hiveDetail.backToHives')}
          </Link>
          <h1>{hive.name}</h1>
          {hive.location && <p className="location">{hive.location}</p>}
        </div>
        {hive.image && (
          <img 
            src={hive.image} 
            alt={hive.name} 
            className="hive-detail-image" 
            onClick={() => setShowImageModal(true)}
            style={{ cursor: 'pointer' }}
            title={t('hiveDetail.imageClickToView')}
          />
        )}
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? t('hiveDetail.hideForm') : `+ ${t('hiveDetail.newObservation')}`}
        </button>
      </div>

      {showImageModal && hive.image && (
        <div className="image-modal" onClick={() => setShowImageModal(false)}>
          <div className="image-modal-content">
            <button className="image-modal-close" onClick={() => setShowImageModal(false)}>
              ×
            </button>
            <img src={hive.image} alt={hive.name} />
          </div>
        </div>
      )}

      {showForm && (
        <QuickObservationForm
          defaultHiveId={id}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {observations.length === 0 ? (
        <div className="empty-chart">
          <p>{t('hiveDetail.noObservations')}</p>
          <button onClick={() => setShowForm(true)}>{t('hiveDetail.addFirst')}</button>
        </div>
      ) : (
        <>
          <div className="chart-controls" style={{ marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
            <label style={{ fontWeight: 500, fontSize: '13px' }}>{t('hiveDetail.viewLabel')}:</label>
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
            >
              <option value="daily">{t('hiveDetail.daily')}</option>
              <option value="moving10">{t('hiveDetail.moving10')}</option>
              <option value="weekly">{t('hiveDetail.weekly')}</option>
              <option value="monthly">{t('hiveDetail.monthly')}</option>
            </select>
            <button onClick={resetZoom} className="secondary" style={{ padding: '4px 10px', fontSize: '13px' }}>
              🔍 {t('hiveDetail.resetZoom')}
            </button>
            <button onClick={() => {
              if (chartInstance) {
                const url = chartInstance.toBase64Image()
                const link = document.createElement('a')
                link.download = `${hive.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.png`
                link.href = url
                link.click()
              }
            }} className="secondary" style={{ padding: '4px 10px', fontSize: '13px' }}>
              📥 {t('hiveDetail.download')}
            </button>
            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>
              💡 {t('hiveDetail.zoomHelp')}
            </span>
          </div>
          <div className="chart-container">
            <Line ref={(ref: any) => ref && setChartInstance(ref)} data={chartData} options={chartOptions} />
          </div>

          {/* Yearly Average Summary */}
          <div className="yearly-summary-section">
            <h2>{t('hiveDetail.yearlyAverage')}</h2>
            <div className="yearly-summary-cards">
              {[new Date().getFullYear(), new Date().getFullYear() - 1].map(year => {
                const yearlyAvg = calculateYearlyAverage(observations, year)
                if (yearlyAvg.totalObservations === 0) return null
                
                return (
                  <div key={year} className="yearly-summary-card">
                    <div className="yearly-summary-year">{year}</div>
                    <div 
                      className="yearly-summary-value" 
                      style={{ color: getMitesPerDayColor(yearlyAvg.averageMitesPerDay) }}
                    >
                      {yearlyAvg.averageMitesPerDay.toFixed(1)} <span className="unit">{t('hiveDetail.mitesPerDay')}</span>
                    </div>
                    <div className="yearly-summary-details">
                      <div className="yearly-summary-detail">
                        <span className="label">{t('hiveDetail.daysUnit')}:</span>
                        <span className="value">
                          {yearlyAvg.sampledDays}
                          {yearlyAvg.isLowSampleCount && (
                            <span className="warning-icon" title={t('hiveDetail.lowSampleWarning', { days: yearlyAvg.sampledDays })}>
                              ⚠️
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="yearly-summary-detail">
                        <span className="label">{t('hiveDetail.observations')}:</span>
                        <span className="value">{yearlyAvg.totalObservations}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="observations-section">
            <h2>{t('hiveDetail.observations')}</h2>
            <div className="observations-table">
              <table>
                <thead>
                  <tr>
                    <th>{t('hiveDetail.date')}</th>
                    <th>{t('hiveDetail.mites')}</th>
                    <th>{t('hiveDetail.days')}</th>
                    <th>{t('hiveDetail.mitesPerDay')}</th>
                    <th>{t('hiveDetail.notes')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {observations.slice(0, 10).map((obs) => (
                    <tr key={obs.id}>
                      {editingObservation === obs.id ? (
                        <>
                          <td>
                            <input
                              type="date"
                              value={editForm.date}
                              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={editForm.miteCount}
                              onChange={(e) => setEditForm({ ...editForm, miteCount: e.target.value })}
                              min="0"
                              style={{ width: '80px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={editForm.trayDays}
                              onChange={(e) => setEditForm({ ...editForm, trayDays: e.target.value })}
                              min="1"
                              style={{ width: '60px' }}
                            />
                          </td>
                          <td>
                            {((Number(editForm.miteCount) || 0) / (Number(editForm.trayDays) || 1)).toFixed(1)}
                          </td>
                          <td>
                            <input
                              type="text"
                              value={editForm.notes}
                              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                              placeholder={t('hiveDetail.notesPlaceholder')}
                              style={{ width: '100%' }}
                            />
                          </td>
                          <td>
                            <button
                              onClick={() => handleSaveObservation(obs.id)}
                              className="small"
                              style={{ marginRight: '4px' }}
                            >
                              {t('hiveDetail.save')}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="secondary small"
                            >
                              {t('hiveDetail.cancel')}
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{obs.date}</td>
                          <td>{obs.miteCount}</td>
                          <td>{obs.trayDays}</td>
                          <td>
                            <span
                              className="mites-value"
                              style={{ color: getMitesPerDayColor(obs.mitesPerDay) }}
                            >
                              {obs.mitesPerDay.toFixed(1)}
                            </span>
                          </td>
                          <td className="notes-cell">{obs.notes || '-'}</td>
                          <td>
                            <button
                              onClick={() => handleEditObservation(obs)}
                              className="secondary small"
                              style={{ marginRight: '4px' }}
                            >
                              {t('hiveDetail.edit')}
                            </button>
                            <button
                              onClick={() => handleDeleteObservation(obs.id)}
                              className="danger small"
                            >
                              {t('hiveDetail.delete')}
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {observations.length > 10 && (
              <p className="showing-info">
                Viser de seneste 10 af {observations.length} målinger
              </p>
            )}
          </div>

          {treatments.length > 0 && (
            <div className="observations-section">
              <h2>{t('hiveDetail.treatments')}</h2>
              <div className="observations-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t('hiveDetail.date')}</th>
                      <th>{t('hiveDetail.product')}</th>
                      <th>{t('hiveDetail.notes')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {treatments.slice(0, 10).map((treatment) => (
                      <tr key={treatment.id}>
                        {editingTreatment === treatment.id ? (
                          <>
                            <td>
                              <input
                                type="date"
                                value={editForm.date}
                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                              />
                            </td>
                            <td>
                              <select
                                value={editForm.treatmentType}
                                onChange={(e) => setEditForm({ ...editForm, treatmentType: e.target.value })}
                                style={{ width: '150px' }}
                              >
                                <option value="Oxalsyre">{t('treatments.oxalicAcid')}</option>
                                <option value="Myresyre">{t('treatments.formicAcid')}</option>
                                <option value="Thymol">{t('treatments.thymol')}</option>
                                <option value="Apiguard">{t('treatments.apiguard')}</option>
                                <option value="ApiLife Var">{t('treatments.apiLifeVar')}</option>
                                <option value="Dronelarve udskæring">{t('treatments.droneBroodRemoval')}</option>
                                <option value="Andet">{t('treatments.other')}</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="text"
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                placeholder="Noter"
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <button
                                onClick={() => handleSaveTreatment(treatment.id)}
                                className="small"
                                style={{ marginRight: '4px' }}
                              >
                                {t('hiveDetail.save')}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="secondary small"
                              >
                                {t('hiveDetail.cancel')}
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{treatment.date}</td>
                            <td><strong>{treatment.treatmentType}</strong></td>
                            <td className="notes-cell">{treatment.notes || '-'}</td>
                            <td>
                              <button
                                onClick={() => handleEditTreatment(treatment)}
                                className="secondary small"
                                style={{ marginRight: '4px' }}
                              >
                                {t('hiveDetail.edit')}
                              </button>
                              <button
                                onClick={() => handleDeleteTreatment(treatment.id)}
                                className="danger small"
                              >
                                {t('hiveDetail.delete')}
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {treatments.length > 10 && (
                <p className="showing-info">
                  Viser de seneste 10 af {treatments.length} behandlinger
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default HiveDetail
