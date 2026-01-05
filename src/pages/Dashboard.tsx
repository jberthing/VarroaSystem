import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { getAllHives, getAllApiaries, getObservationsForHive, getTreatmentsForHive } from '../db/repository'
import { getDaysAgo, formatDate } from '../utils/dateUtils'
import { calculateTrend, getTrendIcon, getTrendColor, getMitesPerDayColor } from '../utils/calculations'
import QuickObservationForm from '../components/QuickObservationForm'
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
import { Line } from 'react-chartjs-2'
import annotationPlugin from 'chartjs-plugin-annotation'
import './Dashboard.css'

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

type TimeFilter = 'all' | '7' | '30'

const Dashboard = () => {
  const [showQuickForm, setShowQuickForm] = useState(false)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30')
  const [apiaryFilter, setApiaryFilter] = useState<string>('all')
  const [showChartsForApiary, setShowChartsForApiary] = useState<string | null>(null)

  // Use Dexie live query to auto-update when data changes
  const hives = useLiveQuery(() => getAllHives(true), [])
  const apiaries = useLiveQuery(() => getAllApiaries(true), [])
  const observations = useLiveQuery(() => db.observations.toArray(), [])

  const [hiveData, setHiveData] = useState<
    Array<{
      hive: any
      latest: any
      previous: any
      trend: 'up' | 'down' | 'flat' | 'none'
    }>
  >([])

  useEffect(() => {
    loadDashboardData()
  }, [hives, observations, timeFilter, apiaryFilter])

  const loadDashboardData = async () => {
    if (!hives) return

    // Filter by apiary if selected
    let filteredHives = hives
    if (apiaryFilter !== 'all') {
      if (apiaryFilter === 'none') {
        filteredHives = hives.filter(h => !h.apiaryId)
      } else {
        filteredHives = hives.filter(h => h.apiaryId === apiaryFilter)
      }
    }

    const cutoffDate =
      timeFilter === 'all' ? null : getDaysAgo(parseInt(timeFilter))

    const data = await Promise.all(
      filteredHives.map(async (hive) => {
        let hiveObservations = await db.observations
          .where('hiveId')
          .equals(hive.id)
          .reverse()
          .sortBy('date')

        if (cutoffDate) {
          hiveObservations = hiveObservations.filter(
            (obs) => obs.date >= cutoffDate
          )
        }

        const latest = hiveObservations[0]
        const previous = hiveObservations[1]
        const trend = calculateTrend(latest, previous)

        return { hive, latest, previous, trend }
      })
    )

    // Sort by highest mites per day first
    data.sort((a, b) => {
      if (!a.latest) return 1
      if (!b.latest) return -1
      return b.latest.mitesPerDay - a.latest.mitesPerDay
    })

    setHiveData(data)
  }

  // Group hives by apiary for display
  const groupedHiveData = () => {
    if (apiaryFilter !== 'all') {
      // If filtered, don't group
      return { ungrouped: hiveData }
    }

    // Build apiary groups with names
    const grouped: Record<string, {
      apiaryName: string
      hives: typeof hiveData
    }> = {}
    
    const noApiaryData: typeof hiveData = []

    hiveData.forEach(item => {
      if (item.hive.apiaryId) {
        if (!grouped[item.hive.apiaryId]) {
          const apiary = apiaries?.find(a => a.id === item.hive.apiaryId)
          grouped[item.hive.apiaryId] = {
            apiaryName: apiary?.name || 'Ukendt bigård',
            hives: []
          }
        }
        grouped[item.hive.apiaryId].hives.push(item)
      } else {
        noApiaryData.push(item)
      }
    })

    // If there are hives without apiary, add them as a special group
    if (noApiaryData.length > 0) {
      grouped['__no_apiary__'] = {
        apiaryName: 'Uden bigård',
        hives: noApiaryData
      }
    }

    return { grouped }
  }

  if (!hives || !apiaries) {
    return (
      <div className="container">
        <p>Indlæser...</p>
      </div>
    )
  }

  if (hives.length === 0) {
    return (
      <div className="container">
        <div className="empty-dashboard">
          <h2>Velkommen til Varroa Monitor!</h2>
          <p>Du har ingen bistader endnu.</p>
          <Link to="/bigaarde">
            <button>Opret din første bigård</button>
          </Link>
        </div>
      </div>
    )
  }

  const groupData = groupedHiveData()

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Oversigt</h1>
        <button onClick={() => setShowQuickForm(!showQuickForm)}>
          {showQuickForm ? 'Skjul formular' : '⚡ Ny registrering'}
        </button>
      </div>

      {showQuickForm && (
        <QuickObservationForm
          onSuccess={() => {
            setShowQuickForm(false)
          }}
          onCancel={() => setShowQuickForm(false)}
        />
      )}

      <div className="filter-row">
        <div className="filter-buttons">
          <button
            className={timeFilter === '7' ? 'secondary' : 'secondary'}
            onClick={() => setTimeFilter('7')}
            style={{
              backgroundColor: timeFilter === '7' ? '#fbbf24' : undefined
            }}
          >
            7 dage
          </button>
          <button
            className={timeFilter === '30' ? 'secondary' : 'secondary'}
            onClick={() => setTimeFilter('30')}
            style={{
              backgroundColor: timeFilter === '30' ? '#fbbf24' : undefined
            }}
          >
            30 dage
          </button>
          <button
            className={timeFilter === 'all' ? 'secondary' : 'secondary'}
            onClick={() => setTimeFilter('all')}
            style={{
              backgroundColor: timeFilter === 'all' ? '#fbbf24' : undefined
            }}
          >
            Alle data
          </button>
        </div>

        <div className="apiary-filter">
          <label htmlFor="apiaryFilter">Bigård:</label>
          <select
            id="apiaryFilter"
            value={apiaryFilter}
            onChange={(e) => setApiaryFilter(e.target.value)}
          >
            <option value="all">Alle bigårde</option>
            {apiaries.map(apiary => (
              <option key={apiary.id} value={apiary.id}>
                {apiary.name}
              </option>
            ))}
            {hives.some(h => !h.apiaryId) && (
              <option value="none">Uden bigård</option>
            )}
          </select>
        </div>
      </div>

      {groupData.ungrouped ? (
        // Filtered view - no grouping
        <div className="hive-grid">
          {groupData.ungrouped.map(({ hive, latest, trend }) => (
            <Link to={`/bistader/${hive.id}`} key={hive.id} className="hive-card-link">
              <div className="hive-card">
                <div className="hive-card-header">
                  <h3>{hive.name}</h3>
                  {hive.location && <p className="hive-location">{hive.location}</p>}
                </div>

                {latest ? (
                  <>
                    <div
                      className="mites-per-day"
                      style={{ color: getMitesPerDayColor(latest.mitesPerDay) }}
                    >
                      {latest.mitesPerDay.toFixed(1)}
                      <span className="unit">mider/dag</span>
                    </div>
                    <div className="hive-card-footer">
                      <span className="date">{latest.date}</span>
                      {trend !== 'none' && (
                        <span
                          className="trend"
                          style={{ color: getTrendColor(trend) }}
                        >
                          {getTrendIcon(trend)}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="no-data">Ingen registreringer endnu</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        // Grouped view by apiary
        <div>
          {Object.entries(groupData.grouped || {}).map(([apiaryId, { apiaryName, hives: groupHives }]) => (
            <div key={apiaryId} className="apiary-section">
              <div className="apiary-section-header">
                <h2 className="apiary-section-title">{apiaryName}</h2>
                <button
                  className="secondary"
                  onClick={() => setShowChartsForApiary(apiaryId)}
                >
                  📊 Vis alle grafer
                </button>
              </div>
              <div className="hive-grid">
                {groupHives.map(({ hive, latest, trend }) => (
                  <Link to={`/bistader/${hive.id}`} key={hive.id} className="hive-card-link">
                    <div className="hive-card">
                      <div className="hive-card-header">
                        <h3>{hive.name}</h3>
                        {hive.location && <p className="hive-location">{hive.location}</p>}
                      </div>

                      {latest ? (
                        <>
                          <div
                            className="mites-per-day"
                            style={{ color: getMitesPerDayColor(latest.mitesPerDay) }}
                          >
                            {latest.mitesPerDay.toFixed(1)}
                            <span className="unit">mider/dag</span>
                          </div>
                          <div className="hive-card-footer">
                            <span className="date">{latest.date}</span>
                            {trend !== 'none' && (
                              <span
                                className="trend"
                                style={{ color: getTrendColor(trend) }}
                              >
                                {getTrendIcon(trend)}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="no-data">Ingen registreringer endnu</div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts Modal */}
      {showChartsForApiary && <ApiaryChartsModal />}
    </div>
  )

  function ApiaryChartsModal() {
    if (!showChartsForApiary) return null
    const apiaryData = groupData.grouped?.[showChartsForApiary]
    if (!apiaryData) return null

    const chartRef = useRef<any>(null)

    const handleDownload = () => {
      if (chartRef.current) {
        const canvas = chartRef.current.canvas
        const url = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.download = `${apiaryData.apiaryName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.png`
        link.href = url
        link.click()
      }
    }

    return (
      <div className="modal-overlay" onClick={() => setShowChartsForApiary(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Grafer for {apiaryData.apiaryName}</h2>
            <div className="modal-actions">
              <button className="secondary" onClick={handleDownload}>
                📥 Download graf
              </button>
              <button className="close-button" onClick={() => setShowChartsForApiary(null)}>
                ✕
              </button>
            </div>
          </div>
          <div className="modal-body">
            <CombinedApiaryChart 
              hives={apiaryData.hives.map(({ hive }: any) => hive)} 
              chartRef={chartRef}
              apiaryName={apiaryData.apiaryName}
            />
          </div>
        </div>
      </div>
    )
  }

  function CombinedApiaryChart({ hives, chartRef, apiaryName }: { hives: any[]; chartRef: any; apiaryName: string }) {
    const [chartData, setChartData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      loadAllData()
    }, [hives])

    const loadAllData = async () => {
      const colors = [
        { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' }, // blue
        { border: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }, // green
        { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' }, // amber
        { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },  // red
        { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' }, // violet
        { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' }, // pink
        { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },  // cyan
        { border: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' }, // orange
      ]

      // Collect all dates across all hives
      const allDatesSet = new Set<string>()
      const hivesData = await Promise.all(
        hives.map(async (hive, index) => {
          const observations = await getObservationsForHive(hive.id)
          const treatments = await getTreatmentsForHive(hive.id)
          observations.forEach((obs: any) => allDatesSet.add(obs.date))
          return {
            hive,
            observations,
            treatments,
            color: colors[index % colors.length]
          }
        })
      )

      const allDates = Array.from(allDatesSet).sort()

      // Create datasets for each hive
      const datasets = hivesData.map(({ hive, observations, color }) => {
        const dataPoints = allDates.map(date => {
          const obs = observations.find((o: any) => o.date === date)
          return obs ? obs.mitesPerDay : null
        })

        return {
          label: hive.name,
          data: dataPoints,
          borderColor: color.border,
          backgroundColor: color.bg,
          tension: 0.4,
          spanGaps: true
        }
      })

      // Create treatment annotations
      const treatmentAnnotations = hivesData.reduce((acc: any, { treatments, color }, hiveIndex) => {
        treatments.forEach((treatment: any, treatIndex: number) => {
          const dateIndex = allDates.indexOf(treatment.date)
          if (dateIndex !== -1) {
            acc[`treatment_${hiveIndex}_${treatIndex}`] = {
              type: 'line',
              xMin: dateIndex,
              xMax: dateIndex,
              borderColor: color.border,
              borderWidth: 2,
              borderDash: [5, 5],
              label: {
                content: treatment.treatmentType,
                display: true,
                position: 'start',
                backgroundColor: color.border,
                color: 'white',
                font: { size: 10 }
              }
            }
          }
        })
        return acc
      }, {})

      setChartData({
        labels: allDates.map(date => formatDate(date)),
        datasets,
        annotations: treatmentAnnotations
      })
      setLoading(false)
    }

    if (loading) {
      return <div className="loading">Indlæser grafer...</div>
    }

    if (!chartData || chartData.datasets.length === 0) {
      return <div className="no-data">Ingen data at vise</div>
    }

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const
        },
        title: {
          display: true,
          text: `${apiaryName} - Mider pr. dag`,
          font: { size: 16, weight: 'bold' as const }
        },
        annotation: {
          annotations: chartData.annotations
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
      <div className="combined-chart-container">
        <Line ref={chartRef} data={chartData} options={chartOptions} />
      </div>
    )
  }
}

export default Dashboard
