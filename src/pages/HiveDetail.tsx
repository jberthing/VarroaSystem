import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { getHive, getObservationsForHive, getTreatmentsForHive, deleteObservation, deleteTreatment, updateObservation, updateTreatment } from '../db/repository'
import { Hive, Treatment, Observation } from '../db/database'
import { getMitesPerDayColor } from '../utils/calculations'
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
  annotationPlugin
)

const HiveDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [hive, setHive] = useState<Hive | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [editingObservation, setEditingObservation] = useState<string | null>(null)
  const [editingTreatment, setEditingTreatment] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})

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
      navigate('/bistader')
    }
  }

  const handleDelete = async (obsId: string) => {
    if (confirm('Er du sikker på at du vil slette denne registrering?')) {
      await deleteObservation(obsId)
    }
  }

  const handleDeleteTreatment = async (treatmentId: string) => {
    if (confirm('Er du sikker på at du vil slette denne behandling?')) {
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

  // Prepare chart data with treatment annotations
  const reversedDates = observations.map((obs) => obs.date).reverse()
  const chartData = {
    labels: reversedDates,
    datasets: [
      {
        label: 'Mider pr. dag',
        data: observations.map((obs) => obs.mitesPerDay).reverse(),
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  }

  // Create treatment annotations for the chart - find index positions
  const treatmentAnnotations: any = {}
  treatments.forEach((treatment: Treatment, index: number) => {
    const dateIndex = reversedDates.indexOf(treatment.date)
    if (dateIndex >= 0) {
      // Treatment date matches an observation date
      treatmentAnnotations[`treatment${index}`] = {
        type: 'line',
        scaleID: 'x',
        value: dateIndex,
        borderColor: '#ef4444',
        borderWidth: 3,
        borderDash: [6, 4],
        label: {
          display: true,
          content: treatment.treatmentType,
          position: 'start',
          backgroundColor: 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          font: {
            size: 11,
            weight: 'bold'
          },
          padding: 4,
          rotation: 0
        }
      }
    } else {
      // Treatment date doesn't match - find closest date
      const treatmentTime = new Date(treatment.date).getTime()
      let closestIndex = 0
      let minDiff = Math.abs(new Date(reversedDates[0]).getTime() - treatmentTime)
      
      reversedDates.forEach((date, idx) => {
        const diff = Math.abs(new Date(date).getTime() - treatmentTime)
        if (diff < minDiff) {
          minDiff = diff
          closestIndex = idx
        }
      })

      treatmentAnnotations[`treatment${index}`] = {
        type: 'line',
        scaleID: 'x',
        value: closestIndex,
        borderColor: '#ef4444',
        borderWidth: 3,
        borderDash: [6, 4],
        label: {
          display: true,
          content: `${treatment.treatmentType} (${treatment.date})`,
          position: 'start',
          backgroundColor: 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          font: {
            size: 10,
            weight: 'bold'
          },
          padding: 4,
          rotation: 0
        }
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
      annotation: {
        annotations: treatmentAnnotations
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Mider pr. dag'
        }
      }
    }
  }

  return (
    <div className="container">
      <div className="detail-header">
        <div>
          <Link to="/bistader" className="back-link">
            ← Tilbage til bistader
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
            title="Klik for at se i fuld størrelse"
          />
        )}
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Skjul formular' : '+ Ny registrering'}
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
          <p>Ingen registreringer for dette bistade endnu.</p>
          <button onClick={() => setShowForm(true)}>Tilføj første registrering</button>
        </div>
      ) : (
        <>
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>

          <div className="observations-section">
            <h2>Målinger</h2>
            <div className="observations-table">
              <table>
                <thead>
                  <tr>
                    <th>Dato</th>
                    <th>Mider</th>
                    <th>Dage</th>
                    <th>Mider/dag</th>
                    <th>Noter</th>
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
                              placeholder="Noter"
                              style={{ width: '100%' }}
                            />
                          </td>
                          <td>
                            <button
                              onClick={() => handleSaveObservation(obs.id)}
                              className="small"
                              style={{ marginRight: '4px' }}
                            >
                              Gem
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="secondary small"
                            >
                              Annuller
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
                              Rediger
                            </button>
                            <button
                              onClick={() => handleDelete(obs.id)}
                              className="danger small"
                            >
                              Slet
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
              <h2>Behandlinger</h2>
              <div className="observations-table">
                <table>
                  <thead>
                    <tr>
                      <th>Dato</th>
                      <th>Type</th>
                      <th>Noter</th>
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
                                <option value="Oxalsyre">Oxalsyre</option>
                                <option value="Myresyre">Myresyre</option>
                                <option value="Thymol">Thymol</option>
                                <option value="Apiguard">Apiguard</option>
                                <option value="ApiLife Var">ApiLife Var</option>
                                <option value="Dronelarve udskæring">Dronelarve udskæring</option>
                                <option value="Andet">Andet</option>
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
                                Gem
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="secondary small"
                              >
                                Annuller
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
                                Rediger
                              </button>
                              <button
                                onClick={() => handleDeleteTreatment(treatment.id)}
                                className="danger small"
                              >
                                Slet
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
