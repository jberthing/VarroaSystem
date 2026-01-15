import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import i18n from "i18next";
import { db } from '../db/database';
import {
  getAllHives,
  getAllApiaries,
  getObservationsForHive,
  getTreatmentsForHive,
} from '../db/repository';
import { getDaysAgo } from '../utils/dateUtils';
import {
  calculateTrend,
  getTrendIcon,
  getTrendColor,
  getMitesPerDayColor,
  calculateYearlyAverage,
} from '../utils/calculations';
import QuickObservationForm from '../components/QuickObservationForm';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';
import './Dashboard.css';

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
);

type TimeFilter = 'all' | '7' | '30';

const getStatusLevel = (mitesPerDay: number): 'good' | 'warning' | 'danger' | 'critical' => {
  if (mitesPerDay < 1) return 'good';
  if (mitesPerDay < 3) return 'warning';
  if (mitesPerDay < 10) return 'danger';
  return 'critical';
};

const Dashboard = () => {
  const { t } = useTranslation();
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30');
  const [apiaryFilter, setApiaryFilter] = useState<string>('all');
  const [showChartsForApiary, setShowChartsForApiary] = useState<string | null>(null);

  // Use Dexie live query to auto-update when data changes
  const hives = useLiveQuery(() => getAllHives(true), []);
  const apiaries = useLiveQuery(() => getAllApiaries(true), []);
  const observations = useLiveQuery(() => db.observations.toArray(), []);

  const [hiveData, setHiveData] = useState<
    Array<{
      hive: any;
      latest: any;
      previous: any;
      trend: 'up' | 'down' | 'flat' | 'none';
      yearlyAverage: {
        year: number;
        averageMitesPerDay: number;
        totalObservations: number;
        sampledDays: number;
        isLowSampleCount: boolean;
        totalMiteCount: number;
      };
    }>
  >([]);

  useEffect(() => {
    loadDashboardData();
  }, [hives, observations, timeFilter, apiaryFilter]);

  const loadDashboardData = async () => {
    if (!hives) return;

    // Filter by apiary if selected
    let filteredHives = hives;
    if (apiaryFilter !== 'all') {
      if (apiaryFilter === 'none') {
        filteredHives = hives.filter((h) => !h.apiaryId);
      } else {
        filteredHives = hives.filter((h) => h.apiaryId === apiaryFilter);
      }
    }

    const cutoffDate = timeFilter === 'all' ? null : getDaysAgo(parseInt(timeFilter));

    const data = await Promise.all(
      filteredHives.map(async (hive) => {
        let hiveObservations = await db.observations
          .where('hiveId')
          .equals(hive.id)
          .reverse()
          .sortBy('date');

        if (cutoffDate) {
          hiveObservations = hiveObservations.filter((obs) => obs.date >= cutoffDate);
        }

        const latest = hiveObservations[0];
        const previous = hiveObservations[1];
        const trend = calculateTrend(latest, previous);

        // Calculate yearly average for current year using all observations
        const allObservations = await getObservationsForHive(hive.id);
        const yearlyAverage = calculateYearlyAverage(allObservations);

        return { hive, latest, previous, trend, yearlyAverage };
      })
    );

    // Sort by highest mites per day first
    data.sort((a, b) => {
      if (!a.latest) return 1;
      if (!b.latest) return -1;
      return b.latest.mitesPerDay - a.latest.mitesPerDay;
    });

    setHiveData(data);
  };

  // Group hives by apiary for display
  const groupedHiveData = () => {
    if (apiaryFilter !== 'all') {
      // If filtered, don't group
      return { ungrouped: hiveData };
    }

    // Build apiary groups with names
    const grouped: Record<
      string,
      {
        apiaryName: string;
        hives: typeof hiveData;
      }
    > = {};

    const noApiaryData: typeof hiveData = [];

    hiveData.forEach((item) => {
      if (item.hive.apiaryId) {
        if (!grouped[item.hive.apiaryId]) {
          const apiary = apiaries?.find((a) => a.id === item.hive.apiaryId);
          grouped[item.hive.apiaryId] = {
            apiaryName: apiary?.name || 'Ukendt bigård',
            hives: [],
          };
        }
        grouped[item.hive.apiaryId].hives.push(item);
      } else {
        noApiaryData.push(item);
      }
    });

    // If there are hives without apiary, add them as a special group
    if (noApiaryData.length > 0) {
      grouped['__no_apiary__'] = {
        apiaryName: 'Uden bigård',
        hives: noApiaryData,
      };
    }

    return { grouped };
  };

  if (!hives || !apiaries) {
    return (
      <div className="container">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (hives.length === 0) {
    return (
      <div className="container">
        <div className="empty-dashboard">
          <h2>{t('dashboard.welcome')}</h2>
          <p>{t('dashboard.noHives')}</p>
          <Link to="/apiaries">
            <button>{t('dashboard.createFirstApiary')}</button>
          </Link>
        </div>
      </div>
    );
  }

  const groupData = groupedHiveData();

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>{t('dashboard.title')}</h1>
        <button onClick={() => setShowQuickForm(!showQuickForm)}>
          {showQuickForm ? t('dashboard.hideForm') : `⚡ ${t('dashboard.newObservation')}`}
        </button>
      </div>

      {showQuickForm && (
        <QuickObservationForm
          onSuccess={() => {
            setShowQuickForm(false);
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
              backgroundColor: timeFilter === '7' ? '#fbbf24' : undefined,
            }}
          >
            {t('dashboard.7days')}
          </button>
          <button
            className={timeFilter === '30' ? 'secondary' : 'secondary'}
            onClick={() => setTimeFilter('30')}
            style={{
              backgroundColor: timeFilter === '30' ? '#fbbf24' : undefined,
            }}
          >
            {t('dashboard.30days')}
          </button>
          <button
            className={timeFilter === 'all' ? 'secondary' : 'secondary'}
            onClick={() => setTimeFilter('all')}
            style={{
              backgroundColor: timeFilter === 'all' ? '#fbbf24' : undefined,
            }}
          >
            {t('dashboard.allData')}
          </button>
        </div>

        <div className="apiary-filter">
          <label htmlFor="apiaryFilter">{t('dashboard.apiary')}:</label>
          <select
            id="apiaryFilter"
            value={apiaryFilter}
            onChange={(e) => setApiaryFilter(e.target.value)}
          >
            <option value="all">{t('dashboard.allApiaries')}</option>
            {apiaries.map((apiary) => (
              <option key={apiary.id} value={apiary.id}>
                {apiary.name}
              </option>
            ))}
            {hives.some((h) => !h.apiaryId) && <option value="none">Uden bigård</option>}
          </select>
        </div>
      </div>

      {groupData.ungrouped ? (
        // Filtered view - no grouping but show apiary header
        <div>
          {apiaryFilter !== 'all' && (
            <div className="apiary-section-header">
              <h2 className="apiary-section-title">
                {apiaryFilter === 'none'
                  ? t('dashboard.noApiary')
                  : apiaries?.find((a) => a.id === apiaryFilter)?.name || t('dashboard.apiary')}
              </h2>
              {groupData.ungrouped.length > 0 && (
                <button className="secondary" onClick={() => setShowChartsForApiary(apiaryFilter)}>
                  📊 {t('dashboard.showAllCharts')}
                </button>
              )}
            </div>
          )}
          <div className="hive-grid">
            {groupData.ungrouped.map(({ hive, latest, trend, yearlyAverage }) => (
              <Link to={`/hives/${hive.id}`} key={hive.id} className="hive-card-link">
                <div
                  className={`hive-card ${latest ? getStatusLevel(latest.mitesPerDay) : 'no-data'}`}
                >
                  <div className="hive-status-bar" />
                  <div className="hive-card-content">
                    <div className="hive-card-header">
                      <h3>{hive.name}</h3>
                      {trend !== 'none' && latest && (
                        <span className="trend" style={{ color: getTrendColor(trend) }}>
                          {getTrendIcon(trend)}
                        </span>
                      )}
                    </div>
                    {hive.location && <p className="hive-location">{hive.location}</p>}

                    {latest ? (
                      <div className="hive-stats">
                        <div className="hive-main-stat">
                          <span
                            className="hive-mites-value"
                            style={{ color: getMitesPerDayColor(latest.mitesPerDay) }}
                          >
                            {latest.mitesPerDay.toFixed(1)}
                          </span>
                          <span className="hive-unit">{t('dashboard.mitesPerDay')}</span>
                        </div>
                        <div className="hive-meta">
                          <span className="hive-date">{latest.date}</span>
                          <span className="hive-count">
                            {latest.miteCount} {t('dashboard.mitesCounted')}
                          </span>
                        </div>

                        {yearlyAverage.totalObservations > 0 && (
                          <div className="hive-yearly">
                            <div className="hive-yearly-header">
                              <span className="hive-yearly-label">
                                {t('dashboard.yearlyAverage')} {yearlyAverage.year}
                                {yearlyAverage.isLowSampleCount && (
                                  <span
                                    className="warning-icon"
                                    title={t('dashboard.lowSampleWarning', {
                                      days: yearlyAverage.sampledDays,
                                    })}
                                  >
                                    ⚠️
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="hive-yearly-stats">
                              <div className="hive-yearly-stat">
                                <span
                                  className="hive-yearly-value"
                                  style={{
                                    color: getMitesPerDayColor(yearlyAverage.averageMitesPerDay),
                                  }}
                                >
                                  {yearlyAverage.averageMitesPerDay.toFixed(1)}
                                </span>
                                <span className="hive-yearly-unit">
                                  {t('dashboard.avgMitesPerDay')}
                                </span>
                              </div>
                              <div className="hive-yearly-stat">
                                <span className="hive-yearly-value">
                                  {yearlyAverage.totalMiteCount}
                                </span>
                                <span className="hive-yearly-unit">
                                  {t('dashboard.mitesTotal')}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="no-data">{t('dashboard.noObservations')}</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        // Grouped view by apiary
        <div>
          {Object.entries(groupData.grouped || {}).map(
            ([apiaryId, { apiaryName, hives: groupHives }]) => (
              <div key={apiaryId} className="apiary-section">
                <div className="apiary-section-header">
                  <h2 className="apiary-section-title">{apiaryName}</h2>
                  <button className="secondary" onClick={() => setShowChartsForApiary(apiaryId)}>
                    📊 {t('dashboard.showAllCharts')}
                  </button>
                </div>
                <div className="hive-grid">
                  {groupHives.map(({ hive, latest, trend, yearlyAverage }) => (
                    <Link to={`/hives/${hive.id}`} key={hive.id} className="hive-card-link">
                      <div
                        className={`hive-card ${latest ? getStatusLevel(latest.mitesPerDay) : 'no-data'}`}
                      >
                        <div className="hive-status-bar" />
                        <div className="hive-card-content">
                          <div className="hive-card-header">
                            <h3>{hive.name}</h3>
                            {trend !== 'none' && latest && (
                              <span className="trend" style={{ color: getTrendColor(trend) }}>
                                {getTrendIcon(trend)}
                              </span>
                            )}
                          </div>
                          {hive.location && <p className="hive-location">{hive.location}</p>}

                          {latest ? (
                            <div className="hive-stats">
                              <div className="hive-main-stat">
                                <span
                                  className="hive-mites-value"
                                  style={{ color: getMitesPerDayColor(latest.mitesPerDay) }}
                                >
                                  {latest.mitesPerDay.toFixed(1)}
                                </span>
                                <span className="hive-unit">{t('dashboard.mitesPerDay')}</span>
                              </div>
                              <div className="hive-meta">
                                <span className="hive-date">{latest.date}</span>
                                <span className="hive-count">
                                  {latest.miteCount} {t('dashboard.mitesCounted')}
                                </span>
                              </div>

                              {yearlyAverage.totalObservations > 0 && (
                                <div className="hive-yearly">
                                  <div className="hive-yearly-header">
                                    <span className="hive-yearly-label">
                                      {t('dashboard.yearlyAverage')} {yearlyAverage.year}
                                      {yearlyAverage.isLowSampleCount && (
                                        <span
                                          className="warning-icon"
                                          title={t('dashboard.lowSampleWarning', {
                                            days: yearlyAverage.sampledDays,
                                          })}
                                        >
                                          ⚠️
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="hive-yearly-stats">
                                    <div className="hive-yearly-stat">
                                      <span
                                        className="hive-yearly-value"
                                        style={{
                                          color: getMitesPerDayColor(
                                            yearlyAverage.averageMitesPerDay
                                          ),
                                        }}
                                      >
                                        {yearlyAverage.averageMitesPerDay.toFixed(1)}
                                      </span>
                                      <span className="hive-yearly-unit">
                                        {t('dashboard.avgMitesPerDay')}
                                      </span>
                                    </div>
                                    <div className="hive-yearly-stat">
                                      <span className="hive-yearly-value">
                                        {yearlyAverage.totalMiteCount}
                                      </span>
                                      <span className="hive-yearly-unit">
                                        {t('dashboard.mitesTotal')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="no-data">{t('dashboard.noObservations')}</div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Charts Modal */}
      {showChartsForApiary && <ApiaryChartsModal />}
    </div>
  );

  function ApiaryChartsModal() {
    const chartRef = useRef<any>(null);

    if (!showChartsForApiary) return null;

    // Handle both grouped and ungrouped views
    let apiaryName: string;
    let hivesToShow: any[];

    if (apiaryFilter !== 'all' && showChartsForApiary === apiaryFilter) {
      // Filtered view - use the ungrouped data
      apiaryName =
        apiaryFilter === 'none'
          ? 'Uden bigård'
          : apiaries?.find((a) => a.id === apiaryFilter)?.name || 'Bigård';
      hivesToShow = groupData.ungrouped || [];
    } else {
      // Grouped view
      const apiaryData = groupData.grouped?.[showChartsForApiary];
      if (!apiaryData) return null;
      apiaryName = apiaryData.apiaryName;
      hivesToShow = apiaryData.hives;
    }

    return (
      <div className="modal-overlay" onClick={() => setShowChartsForApiary(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>
              {t('dashboard.chartsFor')} {apiaryName}
            </h2>
            <div className="modal-actions">
              <button className="close-button" onClick={() => setShowChartsForApiary(null)}>
                ✕
              </button>
            </div>
          </div>
          <div className="modal-body">
            <CombinedApiaryChart
              hives={hivesToShow.map((item: any) => item.hive || item)}
              chartRef={chartRef}
              apiaryName={apiaryName}
            />
          </div>
        </div>
      </div>
    );
  }

  function CombinedApiaryChart({
    hives,
    chartRef,
    apiaryName,
  }: {
    hives: any[];
    chartRef: any;
    apiaryName: string;
  }) {
    const [chartData, setChartData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'daily' | 'moving10' | 'weekly' | 'monthly'>('daily');
    const [chartInstance, setChartInstance] = useState<any>(null);

    useEffect(() => {
      loadAllData();
    }, [hives, viewMode]);

    const loadAllData = async () => {
      const colors = [
        { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
        { border: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
        { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
        { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
        { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },
        { border: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
      ];

      // Aggregation function
      const aggregateData = (data: any[], mode: string) => {
        if (mode === 'daily') return data;

        if (mode === 'moving10') {
          const movingAvg = [];
          const windowSize = 10;
          for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - windowSize + 1);
            const window = data.slice(start, i + 1);
            const sum = window.reduce((acc: number, point: any) => acc + point.mitesPerDay, 0);
            const avg = sum / window.length;
            movingAvg.push({ ...data[i], mitesPerDay: parseFloat(avg.toFixed(2)) });
          }
          return movingAvg;
        }

        const aggregated: any = {};
        data.forEach((point: any) => {
          let key: string;
          const date = new Date(point.date);

          if (mode === 'weekly') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
          } else {
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          }

          if (!aggregated[key]) {
            aggregated[key] = { sum: 0, count: 0, date: point.date };
          }
          aggregated[key].sum += point.mitesPerDay;
          aggregated[key].count += 1;
        });

        return Object.values(aggregated).map((group: any) => ({
          date: group.date,
          mitesPerDay: parseFloat((group.sum / group.count).toFixed(2)),
        }));
      };

      // Collect all observations
      const hivesData = await Promise.all(
        hives.map(async (hive, index) => {
          const observations = await getObservationsForHive(hive.id);
          const treatments = await getTreatmentsForHive(hive.id);
          return {
            hive,
            observations,
            treatments,
            color: colors[index % colors.length],
          };
        })
      );

      // Create datasets for each hive with time-series data
      const datasets = hivesData.map(({ hive, observations, color }) => {
        const aggregatedObs = aggregateData([...observations].reverse(), viewMode);

        return {
          label: hive.name,
          data: aggregatedObs.map((obs: any) => ({
            x: new Date(obs.date),
            y: obs.mitesPerDay,
          })),
          borderColor: color.border,
          backgroundColor: color.bg,
          tension: viewMode === 'moving10' ? 0.4 : 0.3,
          pointRadius: viewMode === 'daily' ? 2 : viewMode === 'moving10' ? 1 : 3,
          pointHoverRadius: 5,
          fill: false,
        };
      });

      // Create treatment annotations with time-series
      const treatmentAnnotations = hivesData.reduce(
        (acc: any, { treatments, color }, hiveIndex) => {
          treatments.forEach((treatment: any, treatIndex: number) => {
            acc[`treatment_${hiveIndex}_${treatIndex}`] = {
              type: 'line',
              xMin: new Date(treatment.date),
              xMax: new Date(treatment.date),
              borderColor: color.border,
              borderWidth: 2,
              borderDash: [5, 5],
              label: {
                content: treatment.treatmentType,
                display: true,
                position: 'start',
                backgroundColor: color.border,
                color: 'white',
                font: { size: 9 },
                padding: 3,
              },
            };
          });
          return acc;
        },
        {}
      );

      setChartData({
        datasets,
        annotations: treatmentAnnotations,
      });
      setLoading(false);
    };

    if (loading) {
      return <div className="loading">{t('dashboard.loadingCharts')}</div>;
    }

    if (!chartData || chartData.datasets.length === 0) {
      return <div className="no-data">{t('dashboard.noDataToShow')}</div>;
    }

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: `${apiaryName} - ${t('dashboard.mitesPerDay')}`,
          font: { size: 16, weight: 'bold' as const },
        },
        tooltip: {
          mode: 'nearest' as const,
          axis: 'x' as const,
          intersect: false,
          callbacks: {
            title: function (context: any) {
              const date = new Date(context[0].parsed.x);
              return date.toLocaleDateString(i18n.resolvedLanguage, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
            },
            label: function (context: any) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} ${t('dashboard.mitesPerDay')}`;
            },
          },
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1,
            },
            pinch: {
              enabled: true,
            },
            mode: 'x' as const,
          },
          pan: {
            enabled: true,
            mode: 'x' as const,
          },
          limits: {
            x: {
              min: 'original' as const,
              max: 'original' as const,
            },
          },
        },
        annotation: {
          annotations: chartData.annotations,
        },
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            unit:
              viewMode === 'monthly'
                ? ('month' as const)
                : viewMode === 'weekly'
                  ? ('week' as const)
                  : ('day' as const),
            displayFormats: {
              day: 'MMM d',
              week: 'MMM d',
              month: 'MMM yyyy',
            },
            tooltipFormat: 'PP',
          },
          title: {
            display: true,
            text: 'Dato',
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: `${t('dashboard.mitesPerDay')}`,
          },
        },
      },
    };

    const resetZoom = () => {
      if (chartInstance) {
        chartInstance.resetZoom();
      }
    };

    const handleDownload = () => {
      if (chartInstance) {
        const url = chartInstance.toBase64Image();
        const link = document.createElement('a');
        link.download = `${apiaryName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        link.click();
      }
    };

    return (
      <div className="combined-chart-container">
        <div
          className="chart-controls"
          style={{
            marginBottom: '10px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            fontSize: '14px',
          }}
        >
          <label style={{ fontWeight: 500, fontSize: '13px' }}>{t('dashboard.view')}:</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
            }}
          >
            <option value="daily">{t('dashboard.daily')}</option>
            <option value="moving10">{t('dashboard.moving10')}</option>
            <option value="weekly">{t('dashboard.weekly')}</option>
            <option value="monthly">{t('dashboard.monthly')}</option>
          </select>
          <button
            onClick={resetZoom}
            className="secondary"
            style={{ padding: '4px 10px', fontSize: '13px' }}
          >
            🔍 {t('dashboard.resetZoom')}
          </button>
          <button
            onClick={handleDownload}
            className="secondary"
            style={{ padding: '4px 10px', fontSize: '13px' }}
          >
            📥 {t('dashboard.download')}
          </button>
          <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>
            💡 {t('dashboard.zoomHelp')}
          </span>
        </div>
        <Line
          ref={(ref: any) => {
            if (ref) {
              setChartInstance(ref);
              if (chartRef) {
                chartRef.current = ref;
              }
            }
          }}
          data={chartData}
          options={chartOptions}
        />
      </div>
    );
  }
};

export default Dashboard;
