import JSZip from 'jszip';
import { Apiary, Hive, Observation, Treatment } from '../db/database';

export interface ExportData {
  apiary: Apiary;
  hives: Hive[];
  observations: Map<string, Observation[]>;
  treatments: Map<string, Treatment[]>;
  yearlyAverages: Map<
    string,
    {
      year: number;
      averageMitesPerDay: number;
      totalObservations: number;
      sampledDays: number;
      isLowSampleCount: boolean;
      totalMiteCount: number;
    }
  >;
}

// Generate a complete standalone HTML app export
export const generateStandaloneHTMLApp = async (
  exportDatas: ExportData[],
  language: string
): Promise<string> => {
  const now = new Date();
  const exportDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Prepare data for embedding in HTML
  const allData = exportDatas.map((data) => ({
    apiary: data.apiary,
    hives: data.hives,
    observations: Array.from(data.observations.entries()),
    treatments: Array.from(data.treatments.entries()),
    yearlyAverages: Array.from(data.yearlyAverages.entries()),
  }));

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Varroa Monitor - Apiary Export</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0"></script>
  <style>
    ${getStandaloneCSS()}
  </style>
</head>
<body>
  <div id="app">
    <header class="header">
      <div class="container header-content">
        <h1 class="logo">🐝 Varroa Monitor</h1>
        <nav class="nav">
          <button id="nav-apiaries" class="nav-button active">Apiaries</button>
          <button id="nav-details" class="nav-button">Details</button>
        </nav>
      </div>
    </header>

    <main class="main">
      <!-- Apiaries Page -->
      <div id="apiaries-page" class="page active">
        <div class="container">
          <div class="dashboard-header">
            <h1>Apiaries</h1>
          </div>
          <div id="apiaries-content"></div>
        </div>
      </div>

      <!-- Details Page -->
      <div id="details-page" class="page">
        <div class="container">
          <div class="dashboard-header">
            <h1>Details</h1>
            <div class="selectors-row">
              <select id="apiary-selector" class="hive-select">
                <option value="">Select an apiary...</option>
              </select>
              <select id="hive-selector" class="hive-select">
                <option value="">Select a hive...</option>
              </select>
            </div>
          </div>
          <div id="details-content"></div>
        </div>
      </div>
    </main>

    <!-- Modal for comparison graph -->
    <div id="modal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="modal-title">Hive Comparison</h2>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div style="position: relative; height: 400px;">
            <canvas id="comparisonChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <footer class="footer">
      <div class="container">
        <p class="version">
          Varroa Monitor Export • Generated ${exportDate}
        </p>
      </div>
    </footer>
  </div>

  <script>
    const DATA = ${JSON.stringify(allData)};
    const LANGUAGE = '${language}';

    let currentApiaryIndex = 0;
    let currentHiveId = null;
    let chartInstances = [];

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      initNavigation();
      renderApiaries();
    });

    function initNavigation() {
      document.getElementById('nav-apiaries').addEventListener('click', () => switchPage('apiaries'));
      document.getElementById('nav-details').addEventListener('click', () => switchPage('details'));
    }

    function switchPage(page) {
      // Hide all pages
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));

      // Show selected page
      document.getElementById(page + '-page').classList.add('active');
      document.getElementById('nav-' + page).classList.add('active');

      // Render content
      if (page === 'apiaries') renderApiaries();
      else if (page === 'details') renderDetails();
    }

    function renderApiaries() {
      const content = document.getElementById('apiaries-content');
      let html = '';

      DATA.forEach((data, idx) => {
        const apiary = data.apiary;
        const currentYear = new Date().getFullYear();
        
        html += \`
          <div class="apiary-section">
            <div class="apiary-section-header">
              <h2 class="apiary-title">\${apiary.name}</h2>
              <button class="view-graph-btn" onclick="showComparisonGraph(\${idx})">📊 View Apiary Graph</button>
            </div>
            <div class="hive-grid">
        \`;

        // Sort hives by mites/day from the latest observation by date (descending)
        const sortedHives = data.hives.slice().sort((a, b) => {
          const aObs = data.observations.find(([id]) => id === a.id)?.[1] || [];
          const bObs = data.observations.find(([id]) => id === b.id)?.[1] || [];

          const aLatest = aObs.reduce((newest, obs) => {
            if (!newest) return obs;
            return new Date(obs.date).getTime() > new Date(newest.date).getTime() ? obs : newest;
          }, null);

          const bLatest = bObs.reduce((newest, obs) => {
            if (!newest) return obs;
            return new Date(obs.date).getTime() > new Date(newest.date).getTime() ? obs : newest;
          }, null);

          const aMites = aLatest?.mitesPerDay ?? -1;
          const bMites = bLatest?.mitesPerDay ?? -1;

          return bMites - aMites; // Descending (highest first)
        });

        sortedHives.forEach((hive, hiveIdx) => {
          const hiveObs = data.observations.find(([id]) => id === hive.id)?.[1] || [];
          
          // Find latest observation by date (not by array position)
          const latest = hiveObs.reduce((newest, obs) => {
            if (!newest) return obs;
            return new Date(obs.date).getTime() > new Date(newest.date).getTime() ? obs : newest;
          }, null);
          
          const status = getStatusLevel(latest?.mitesPerDay ?? -1);
          
          // Filter observations for current year only
          const currentYearObs = hiveObs.filter(obs => {
            const obsYear = new Date(obs.date).getFullYear();
            return obsYear === currentYear;
          });
          
          // Get yearly average - key is just hive.id
          const yearly = data.yearlyAverages.find(([k]) => k === hive.id)?.[1];
          const totalMites = yearly?.totalMiteCount ?? 0;
          const avgMites = yearly?.averageMitesPerDay ? yearly.averageMitesPerDay.toFixed(2) : '—';

          html += \`
            <div class="hive-card \${status}" onclick="switchToHiveDetails(\${idx}, '\${hive.id}')">
              <div class="hive-status-bar"></div>
              <div class="hive-card-content">
                <h3>\${hive.name}</h3>
                <div class="metric-row">
                  <span class="metric-label">Current:</span>
                  <span class="metric-value">\${(latest?.mitesPerDay ?? 0).toFixed(2)} mites/day</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">\${currentYear} Avg:</span>
                  <span class="metric-value">\${avgMites} mites/day</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">\${currentYear} Total:</span>
                  <span class="metric-value">\${totalMites} mites</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Observations:</span>
                  <span class="metric-value">\${currentYearObs.length}</span>
                </div>
              </div>
            </div>
          \`;
        });

        html += '</div></div>';
      });

      content.innerHTML = html;
    }

    function renderDetails() {
      const content = document.getElementById('details-content'); // (bruges evt. i renderHiveDetails)
      const apiarySelector = document.getElementById('apiary-selector');
      const hiveSelector = document.getElementById('hive-selector');

      // 1) Populate apiary selector (alle bigårde)
      apiarySelector.innerHTML = '<option value="">Select an apiary...</option>';
      DATA.forEach((d, idx) => {
        const opt = document.createElement('option');
        opt.value = String(idx);          // bruger index som value
        opt.textContent = d.apiary.name;
        apiarySelector.appendChild(opt);
      });

      // Helper: fyld hive dropdown ud fra valgt bigård
      function populateHivesForApiary(apiaryIdx) {
        const data = DATA[apiaryIdx];
        hiveSelector.innerHTML = '<option value="">Select a hive...</option>';

        data.hives.forEach(hive => {
          const opt = document.createElement('option');
          opt.value = hive.id;
          opt.textContent = hive.name;
          hiveSelector.appendChild(opt);
        });

        // Vælg nuværende hive hvis den findes i den nye bigård, ellers første hive
        const exists = data.hives.some(h => h.id === currentHiveId);
        if (exists) {
          hiveSelector.value = currentHiveId;
        } else if (data.hives.length > 0) {
          currentHiveId = data.hives[0].id;
          hiveSelector.value = currentHiveId;
        } else {
          currentHiveId = '';
          hiveSelector.value = '';
        }
      }

      // 2) Sæt default valgt bigård
      if (currentApiaryIndex == null || currentApiaryIndex === '') {
        currentApiaryIndex = 0;
      }
      apiarySelector.value = String(currentApiaryIndex);

      // 3) Populate hives for valgt bigård
      populateHivesForApiary(currentApiaryIndex);

      // 4) Events (brug onchange så vi ikke stapler listeners)
      apiarySelector.onchange = (e) => {
        const idx = Number(e.target.value);
        if (Number.isNaN(idx)) return;

        currentApiaryIndex = idx;
        // når bigård skifter, opdater hive dropdown + vælg fornuftig hive
        populateHivesForApiary(currentApiaryIndex);

        // render detaljer for den valgte hive (hvis der er en)
        renderHiveDetails();
      };

      hiveSelector.onchange = (e) => {
        currentHiveId = e.target.value;
        renderHiveDetails();
      };

      // 5) Render initialt
      renderHiveDetails();
    }

    function renderHiveDetails() {
      const content = document.getElementById('details-content');
      const data = DATA[currentApiaryIndex];
      const hive = data.hives.find(h => h.id === currentHiveId);

      if (!hive) return;

      const hiveObs = data.observations.find(([id]) => id === currentHiveId)?.[1] || [];
      const treatments = data.treatments.find(([id]) => id === currentHiveId)?.[1] || [];

      let html = \`
        <div class="hive-details">
          <h2>\${hive.name}</h2>
          <div class="details-section">
            <h3>Trend Chart</h3>
            <div style="position: relative; height: 350px;">
              <canvas id="trendChart"></canvas>
            </div>
          </div>

          <div class="details-section">
            <h3>Observations (\${hiveObs.length})</h3>
            <table class="observations-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mites</th>
                  <th>Tray Days</th>
                  <th>Mites/Day</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
      \`;

      // Sort observations by date descending (newest first)
      const sortedObs = hiveObs.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      sortedObs.forEach(obs => {
        html += \`
          <tr>
            <td>\${formatDate(obs.date)}</td>
            <td>\${obs.miteCount}</td>
            <td>\${obs.trayDays}</td>
            <td><strong>\${obs.mitesPerDay.toFixed(2)}</strong></td>
            <td>\${obs.notes || '—'}</td>
          </tr>
        \`;
      });

      html += \`
              </tbody>
            </table>
          </div>
      \`;

      if (treatments.length > 0) {
        html += \`
          <div class="details-section">
            <h3>Treatments (\${treatments.length})</h3>
            <div class="treatments-list">
        \`;

        treatments.slice().reverse().forEach(t => {
          html += \`
            <div class="treatment-item">
              <div class="treatment-date">\${formatDate(t.date)}</div>
              <div class="treatment-type">\${t.treatmentType}</div>
              \${t.notes ? \`<div class="treatment-notes">\${t.notes}</div>\` : ''}
            </div>
          \`;
        });

        html += '</div></div>';
      }

      html += '</div>';
      content.innerHTML = html;

      // Render chart
      setTimeout(() => renderChart(hiveObs), 100);
    }

    function renderChart(observations) {
      destroyCharts();

      const canvas = document.getElementById('trendChart');
      if (!canvas) return;

      const sorted = observations.slice().sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const ctx = canvas.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: sorted.map(o => formatDate(o.date)),
          datasets: [
            {
              label: 'Mites per Day',
              data: sorted.map(o => o.mitesPerDay),
              borderColor: '#fbbf24',
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: { color: '#374151' }
            },
            tooltip: {
              mode: 'nearest',
              axis: 'x',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.1)' },
              ticks: { color: '#374151' }
            },
            x: {
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: { color: '#374151' }
            }
          }
        }
      });

      chartInstances.push(chart);
    }

    function switchToApiary(idx) {
      currentApiaryIndex = idx;
      currentHiveId = null;
      switchPage('details');
    }

    function switchToHiveDetails(idx, hiveId) {
      currentApiaryIndex = idx;
      currentHiveId = hiveId;
      switchPage('details');
      
      // Update selector
      setTimeout(() => {
        const selector = document.getElementById('hive-selector');
        if (selector) {
          selector.value = hiveId;
        }
      }, 50);
    }

    function destroyCharts() {
      chartInstances.forEach(c => c.destroy());
      chartInstances = [];
    }

    function openModal() {
      document.getElementById('modal').style.display = 'flex';
    }

    function closeModal() {
      document.getElementById('modal').style.display = 'none';
      destroyCharts();
    }

    function showComparisonGraph(apiaryIndex) {
      currentApiaryIndex = apiaryIndex;
      openModal();
      
      const data = DATA[currentApiaryIndex];
      document.getElementById('modal-title').textContent = \`\${data.apiary.name} - All Hives\`;

      // Wait for modal to be visible
      setTimeout(() => renderComparisonChart(), 100);
    }

    function renderComparisonChart() {
      destroyCharts();

      const canvas = document.getElementById('comparisonChart');
      if (!canvas) return;

      const data = DATA[currentApiaryIndex];
      const colors = ['#fbbf24', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fb923c'];

      // Prepare datasets for all hives
      const datasets = data.hives.map((hive, idx) => {
        const hiveObs = data.observations.find(([id]) => id === hive.id)?.[1] || [];
        const sorted = hiveObs.slice().sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        return {
          label: hive.name,
          data: sorted.map(o => o.mitesPerDay),
          borderColor: colors[idx % colors.length],
          backgroundColor: colors[idx % colors.length] + '22',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        };
      });

      // Get all unique dates across all hives
      const allDates = new Set();
      data.hives.forEach(hive => {
        const hiveObs = data.observations.find(([id]) => id === hive.id)?.[1] || [];
        hiveObs.forEach(o => allDates.add(formatDate(o.date)));
      });
      const labels = Array.from(allDates).sort();

      const ctx = canvas.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: { color: '#374151' }
            },
            tooltip: {
              mode: 'nearest',
              axis: 'x',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.1)' },
              ticks: { color: '#374151' }
            },
            x: {
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: { color: '#374151' }
            }
          }
        }
      });

      chartInstances.push(chart);
    }

    function getStatusLevel(mitesPerDay) {
      if (mitesPerDay < 0) return 'no-data';
      if (mitesPerDay < 1) return 'good';
      if (mitesPerDay < 3) return 'warning';
      if (mitesPerDay < 10) return 'danger';
      return 'critical';
    }

    function formatDate(dateString) {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return dateString;
      }
    }
  </script>
</body>
</html>`;
};

// CSS for standalone app
const getStandaloneCSS = (): string => {
  return `
    :root {
      --color-good: #22c55e;
      --color-warning: #eab308;
      --color-danger: #f97316;
      --color-critical: #ef4444;
      --color-no-data: #d1d5db;
      --color-gold: #fbbf24;
      --color-text-primary: #1f2937;
      --color-text-secondary: #374151;
      --color-border: #d1d5db;
      --color-bg: #f3f4f6;
      --color-white: #ffffff;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: var(--color-bg);
      color: var(--color-text-primary);
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    .header {
      background: var(--color-white);
      border-bottom: 1px solid var(--color-border);
      padding: 1rem 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .nav {
      display: flex;
      gap: 1rem;
    }

    .nav-button {
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-weight: 500;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .nav-button:hover {
      color: var(--color-text-primary);
      border-bottom-color: var(--color-gold);
    }

    .nav-button.active {
      color: var(--color-gold);
      border-bottom-color: var(--color-gold);
    }

    .main {
      padding: 2rem 0;
      min-height: calc(100vh - 200px);
    }

    .page {
      display: none;
    }

    .page.active {
      display: block;
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .dashboard-header h1 {
      font-size: 2rem;
      font-weight: 700;
    }

    .hive-select {
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font-size: 1rem;
      background-color: var(--color-white);
      color: var(--color-text-primary);
      cursor: pointer;
    }

    .hive-select:focus {
      outline: none;
      border-color: var(--color-gold);
      box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
    }

    .apiary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .apiary-card {
      background: var(--color-white);
      border-radius: 12px;
      padding: 1.5rem;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s;
      border: 2px solid transparent;
    }

    .apiary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-color: var(--color-gold);
    }

    .apiary-card h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .card-stats {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .stat {
      display: flex;
      justify-content: space-between;
    }

    .stat-label {
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    .stat-value {
      color: var(--color-text-primary);
      font-weight: 600;
    }

    .apiary-section {
      margin-bottom: 3rem;
    }

    .apiary-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .apiary-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      padding-bottom: 0.75rem;
      border-bottom: 2px solid var(--color-gold);
      margin: 0;
      flex: 1;
    }

    .hive-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .hive-card {
      display: flex;
      background: var(--color-white);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s;
      cursor: pointer;
    }

    .hive-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .hive-status-bar {
      width: 6px;
      flex-shrink: 0;
    }

    .hive-card.good .hive-status-bar { background: var(--color-good); }
    .hive-card.warning .hive-status-bar { background: var(--color-warning); }
    .hive-card.danger .hive-status-bar { background: var(--color-danger); }
    .hive-card.critical .hive-status-bar { background: var(--color-critical); }
    .hive-card.no-data .hive-status-bar { background: var(--color-no-data); }

    .hive-card-content {
      flex: 1;
      padding: 1.25rem;
    }

    .hive-card-content h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      font-size: 0.9rem;
    }

    .metric-label {
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    .metric-value {
      color: var(--color-text-primary);
      font-weight: 600;
    }

    .hive-details {
      background: var(--color-white);
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .hive-details h2 {
      margin-bottom: 2rem;
      font-size: 1.75rem;
    }

    .details-section {
      margin-bottom: 2rem;
    }

    .details-section h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--color-text-secondary);
    }

    .observations-table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 8px;
      overflow: hidden;
    }

    .observations-table thead {
      background-color: #f9fafb;
      border-bottom: 2px solid var(--color-border);
    }

    .observations-table th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 600;
      color: var(--color-text-secondary);
      font-size: 0.9rem;
    }

    .observations-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.9rem;
    }

    .observations-table tbody tr:hover {
      background-color: #f9fafb;
    }

    .treatments-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .treatment-item {
      padding: 0.75rem;
      border-left: 3px solid var(--color-gold);
      background-color: #fffbf0;
      border-radius: 4px;
    }

    .treatment-date {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .treatment-type {
      color: var(--color-text-secondary);
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }

    .treatment-notes {
      color: var(--color-text-secondary);
      font-size: 0.85rem;
      margin-top: 0.25rem;
      font-style: italic;
    }

    .footer {
      background: var(--color-white);
      border-top: 1px solid var(--color-border);
      padding: 2rem 0;
      margin-top: 3rem;
      text-align: center;
      color: var(--color-text-secondary);
      font-size: 0.9rem;
    }

    /* Modal Styles */
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
    }

    .modal-content {
      background-color: var(--color-white);
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 1000px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
      color: var(--color-text-primary);
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 2rem;
      cursor: pointer;
      color: var(--color-text-secondary);
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-close:hover {
      color: var(--color-text-primary);
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .view-graph-btn {
      margin-top: 0.75rem;
      padding: 0.5rem 1rem;
      background-color: var(--color-gold);
      color: #000;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.2s;
      width: auto;
      white-space: nowrap;
    }

    .view-graph-btn:hover {
      background-color: #f59e0b;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
    }

    .apiary-section-header .view-graph-btn {
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .hive-grid {
        grid-template-columns: 1fr;
      }

      .modal-content {
        width: 95%;
        max-height: 90vh;
      }
    }

      .apiary-grid {
        grid-template-columns: 1fr;
      }

      .nav {
        gap: 0.5rem;
      }

      .nav-button {
        padding: 0.5rem;
        font-size: 0.9rem;
      }
    }
  `;
};

// Dashboard-inspired CSS styling
const getCSS = (): string => {
  return `
    :root {
      --color-good: #22c55e;
      --color-warning: #eab308;
      --color-danger: #f97316;
      --color-critical: #ef4444;
      --color-no-data: #d1d5db;
      --color-gold: #fbbf24;
      --color-text-primary: #1f2937;
      --color-text-secondary: #374151;
      --color-border: #d1d5db;
      --color-bg: #f3f4f6;
      --color-white: #ffffff;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: var(--color-bg);
      color: var(--color-text-primary);
      line-height: 1.6;
      padding: 1rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      color: var(--color-text-primary);
    }

    .header-meta {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
      margin-top: 1rem;
      font-size: 0.95rem;
      color: var(--color-text-secondary);
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .meta-label {
      font-weight: 500;
      color: var(--color-text-secondary);
    }

    .meta-value {
      color: var(--color-text-primary);
      font-weight: 600;
    }

    .apiary-section {
      margin-bottom: 3rem;
    }

    .apiary-section-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      padding-bottom: 0.75rem;
      border-bottom: 3px solid var(--color-gold);
      margin-bottom: 1.5rem;
    }

    .hive-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .hive-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
    }

    .hive-status-bar {
      width: 6px;
      flex-shrink: 0;
    }

    .hive-card.good .hive-status-bar {
      background: var(--color-good);
    }
    .hive-card.warning .hive-status-bar {
      background: var(--color-warning);
    }
    .hive-card.danger .hive-status-bar {
      background: var(--color-danger);
    }
    .hive-card.critical .hive-status-bar {
      background: var(--color-critical);
    }
    .hive-card.no-data .hive-status-bar {
      background: var(--color-no-data);
    }

    .hive-card-content {
      flex: 1;
      padding: 1.25rem;
    }

    .hive-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .hive-card-header h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .trend {
      font-size: 1.5rem;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.75rem;
      font-size: 0.9rem;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      flex: 1;
    }

    .metric-label {
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    .metric-value {
      color: var(--color-text-primary);
      font-weight: 600;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-top: 0.5rem;
    }

    .status-good {
      background-color: rgba(34, 197, 94, 0.1);
      color: var(--color-good);
    }
    .status-warning {
      background-color: rgba(234, 179, 8, 0.1);
      color: #b8860b;
    }
    .status-danger {
      background-color: rgba(249, 115, 22, 0.1);
      color: var(--color-danger);
    }
    .status-critical {
      background-color: rgba(239, 68, 68, 0.1);
      color: var(--color-critical);
    }

    .observations-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-top: 1rem;
    }

    .observations-table thead {
      background-color: #f9fafb;
      border-bottom: 2px solid var(--color-border);
    }

    .observations-table th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 600;
      color: var(--color-text-secondary);
      font-size: 0.9rem;
    }

    .observations-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.9rem;
    }

    .observations-table tbody tr:last-child td {
      border-bottom: none;
    }

    .observations-table tbody tr:hover {
      background-color: #f9fafb;
    }

    .note-text {
      font-style: italic;
      color: var(--color-text-secondary);
      font-size: 0.85rem;
    }

    .chart-container {
      margin-top: 1rem;
      background: white;
      border-radius: 8px;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow-x: auto;
    }

    .chart-container svg {
      max-width: 100%;
      height: auto;
    }

    .treatments-list {
      margin-top: 1rem;
      background: white;
      border-radius: 8px;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .treatment-item {
      padding: 0.75rem;
      border-left: 3px solid var(--color-gold);
      margin-bottom: 0.75rem;
      background-color: #fffbf0;
    }

    .treatment-item:last-child {
      margin-bottom: 0;
    }

    .treatment-date {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .treatment-type {
      color: var(--color-text-secondary);
      font-size: 0.9rem;
    }

    .treatment-notes {
      color: var(--color-text-secondary);
      font-size: 0.85rem;
      margin-top: 0.25rem;
      font-style: italic;
    }

    .yearly-stats {
      background: white;
      border-radius: 8px;
      padding: 1rem;
      margin-top: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .yearly-stats h4 {
      margin-bottom: 0.75rem;
      color: var(--color-text-primary);
      font-size: 1rem;
    }

    .yearly-stats-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .yearly-stat {
      padding: 0.75rem;
      background-color: var(--color-bg);
      border-radius: 6px;
      border-left: 3px solid var(--color-gold);
    }

    .yearly-stat-label {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    .yearly-stat-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin-top: 0.25rem;
    }

    .no-data {
      background: white;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      color: var(--color-text-secondary);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .footer {
      margin-top: 3rem;
      padding: 2rem;
      background: white;
      border-radius: 12px;
      text-align: center;
      color: var(--color-text-secondary);
      font-size: 0.9rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .header {
        box-shadow: none;
        border-bottom: 2px solid var(--color-border);
      }
      .hive-card {
        page-break-inside: avoid;
      }
      .observations-table {
        page-break-inside: avoid;
      }
    }
  `;
};

const getStatusLevel = (mitesPerDay: number): 'good' | 'warning' | 'danger' | 'critical' | 'no-data' => {
  if (mitesPerDay < 0) return 'no-data';
  if (mitesPerDay < 1) return 'good';
  if (mitesPerDay < 3) return 'warning';
  if (mitesPerDay < 10) return 'danger';
  return 'critical';
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

// Generate a simple SVG chart for hive data
const generateChartSVG = (observations: Observation[]): string => {
  if (observations.length === 0) {
    return '<div class="no-data">No chart data available</div>';
  }

  const sortedObs = [...observations]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30); // Last 30 observations

  const dataPoints = sortedObs.map((o) => o.mitesPerDay);
  const maxValue = Math.max(...dataPoints, 10);
  const minValue = 0;
  const range = maxValue - minValue;

  const width = 800;
  const height = 300;
  const padding = 40;
  const graphWidth = width - 2 * padding;
  const graphHeight = height - 2 * padding;

  const pointSpacing = graphWidth / (sortedObs.length - 1 || 1);

  // Generate path points
  let pathPoints = '';
  sortedObs.forEach((obs, idx) => {
    const x = padding + idx * pointSpacing;
    const y =
      padding + graphHeight - ((obs.mitesPerDay - minValue) / range) * graphHeight;
    pathPoints += `${x},${y} `;
  });

  // Color based on threshold
  let strokeColor = '#22c55e'; // good
  const avgMites =
    dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;
  if (avgMites >= 10) strokeColor = '#ef4444'; // critical
  else if (avgMites >= 3) strokeColor = '#f97316'; // danger
  else if (avgMites >= 1) strokeColor = '#eab308'; // warning

  return `
    <div class="chart-container">
      <svg width="${width}" height="${height}" style="border: 1px solid #d1d5db; border-radius: 8px; background: white;">
        <!-- Y Axis -->
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#d1d5db" stroke-width="2"/>
        <!-- X Axis -->
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#d1d5db" stroke-width="2"/>
        
        <!-- Y Axis Labels -->
        <text x="${padding - 10}" y="${padding + 5}" font-size="12" text-anchor="end" fill="#6b7280">${maxValue.toFixed(1)}</text>
        <text x="${padding - 10}" y="${height - padding + 5}" font-size="12" text-anchor="end" fill="#6b7280">${minValue.toFixed(1)}</text>
        
        <!-- Grid lines -->
        <line x1="${padding}" y1="${padding + graphHeight / 2}" x2="${width - padding}" y2="${padding + graphHeight / 2}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="5,5"/>
        <text x="${padding - 10}" y="${padding + graphHeight / 2 + 5}" font-size="12" text-anchor="end" fill="#6b7280">${(maxValue / 2).toFixed(1)}</text>
        
        <!-- Data line -->
        <polyline points="${pathPoints.trim()}" fill="none" stroke="${strokeColor}" stroke-width="2"/>
        
        <!-- Data points -->
        ${sortedObs
          .map((obs, idx) => {
            const x = padding + idx * pointSpacing;
            const y =
              padding + graphHeight - ((obs.mitesPerDay - minValue) / range) * graphHeight;
            return `<circle cx="${x}" cy="${y}" r="3" fill="${strokeColor}"/>`;
          })
          .join('')}
        
        <!-- Labels -->
        <text x="${width / 2}" y="${height - 10}" font-size="12" text-anchor="middle" fill="#6b7280">Mites per Day Over Time</text>
        <text x="15" y="${height / 2}" font-size="12" fill="#6b7280" text-anchor="middle" transform="rotate(-90 15 ${height / 2})">Mites/Day</text>
      </svg>
    </div>
  `;
};

const generateHiveHTML = (
  hive: Hive,
  observations: Observation[],
  treatments: Treatment[],
  yearlyAverage: any
): string => {
  const status = observations.length === 0
    ? 'no-data'
    : getStatusLevel(observations[observations.length - 1]?.mitesPerDay ?? -1);

  const latestObs = observations.length > 0 ? observations[observations.length - 1] : null;
  const mitesPerDay = latestObs?.mitesPerDay ?? 0;

  let trendIcon = '•';
  if (observations.length >= 2) {
    const current = observations[observations.length - 1]?.mitesPerDay ?? 0;
    const previous = observations[observations.length - 2]?.mitesPerDay ?? 0;
    if (current > previous) trendIcon = '📈';
    else if (current < previous) trendIcon = '📉';
    else trendIcon = '→';
  }

  const statusText = {
    good: '✓ Good',
    warning: '⚠ Warning',
    danger: '⚠ Danger',
    critical: '⚠ Critical',
    'no-data': '○ No data',
  }[status] || 'No data';

  let observationsHTML = '';
  if (observations.length > 0) {
    observationsHTML = `
      <table class="observations-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Mites Counted</th>
            <th>Tray Days</th>
            <th>Mites/Day</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${observations
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(
              (obs) => `
            <tr>
              <td>${formatDate(obs.date)}</td>
              <td>${obs.miteCount}</td>
              <td>${obs.trayDays}</td>
              <td><strong>${obs.mitesPerDay.toFixed(2)}</strong></td>
              <td>${obs.notes ? `<span class="note-text">${obs.notes}</span>` : '—'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  } else {
    observationsHTML = '<div class="no-data">No observations recorded yet</div>';
  }

  let treatmentsHTML = '';
  if (treatments.length > 0) {
    treatmentsHTML = `
      <div class="treatments-list">
        <h4>Treatments (${treatments.length})</h4>
        ${treatments
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map(
            (treatment) => `
          <div class="treatment-item">
            <div class="treatment-date">${formatDate(treatment.date)}</div>
            <div class="treatment-type">${treatment.treatmentType}</div>
            ${treatment.notes ? `<div class="treatment-notes">${treatment.notes}</div>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  let yearlyStatsHTML = '';
  if (yearlyAverage && yearlyAverage.totalObservations > 0) {
    const sampledDaysText = yearlyAverage.isLowSampleCount
      ? `${yearlyAverage.sampledDays} (⚠ Low sample)`
      : yearlyAverage.sampledDays;

    yearlyStatsHTML = `
      <div class="yearly-stats">
        <h4>Yearly Average (${yearlyAverage.year})</h4>
        <div class="yearly-stats-content">
          <div class="yearly-stat">
            <div class="yearly-stat-label">Avg Mites/Day</div>
            <div class="yearly-stat-value">${yearlyAverage.averageMitesPerDay.toFixed(2)}</div>
          </div>
          <div class="yearly-stat">
            <div class="yearly-stat-label">Total Mites</div>
            <div class="yearly-stat-value">${yearlyAverage.totalMiteCount}</div>
          </div>
          <div class="yearly-stat">
            <div class="yearly-stat-label">Observations</div>
            <div class="yearly-stat-value">${yearlyAverage.totalObservations}</div>
          </div>
          <div class="yearly-stat">
            <div class="yearly-stat-label">Sampled Days</div>
            <div class="yearly-stat-value">${sampledDaysText}</div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="hive-card ${status}">
      <div class="hive-status-bar"></div>
      <div class="hive-card-content">
        <div class="hive-card-header">
          <h3>${hive.name}</h3>
          <div class="trend">${trendIcon}</div>
        </div>
        
        <div class="metric-row">
          <div class="metric">
            <span class="metric-label">Current:</span>
            <span class="metric-value">${mitesPerDay.toFixed(2)} mites/day</span>
          </div>
        </div>

        ${latestObs ? `<div class="metric-row">
          <div class="metric">
            <span class="metric-label">Last count:</span>
            <span class="metric-value">${formatDate(latestObs.date)} (${latestObs.miteCount} mites)</span>
          </div>
        </div>` : ''}

        <div class="status-badge status-${status}">${statusText}</div>

        <h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem; color: var(--color-text-primary);">Trend Chart</h4>
        ${generateChartSVG(observations)}

        <h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem; color: var(--color-text-primary);">Observations (${observations.length})</h4>
        ${observationsHTML}

        ${treatmentsHTML}
        ${yearlyStatsHTML}
      </div>
    </div>
  `;
};

export const generateHTMLExport = async (data: ExportData, language: string): Promise<string> => {
  const now = new Date();
  const exportDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const hiveCardsHTML = data.hives
    .map((hive) => {
      const observations = data.observations.get(hive.id) || [];
      const treatments = data.treatments.get(hive.id) || [];
      const yearly = data.yearlyAverages.get(hive.id);
      return generateHiveHTML(hive, observations, treatments, yearly);
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="${language}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Varroa Monitor - ${data.apiary.name} Export</title>
      <style>${getCSS()}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🐝 Varroa Monitor</h1>
          <h2>${data.apiary.name}</h2>
          <div class="header-meta">
            <div class="meta-item">
              <span class="meta-label">Location</span>
              <span class="meta-value">${data.apiary.location || 'Not specified'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Hives</span>
              <span class="meta-value">${data.hives.length}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Exported</span>
              <span class="meta-value">${exportDate}</span>
            </div>
          </div>
        </div>

        <div class="apiary-section">
          <h2 class="apiary-section-title">Hive Status</h2>
          <div class="hive-grid">
            ${hiveCardsHTML}
          </div>
        </div>

        <div class="footer">
          <p>🐝 Varroa Monitor - HTML Export</p>
          <p>Generated on ${exportDate}</p>
          <p>This document contains monitoring data for ${data.apiary.name} with ${data.hives.length} hive(s)</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
};

export const createExportZip = async (
  htmlContent: string,
  apiaryName: string
): Promise<Blob> => {
  const zip = new JSZip();

  // Add the HTML file
  const filename = `${apiaryName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.html`;
  zip.file(filename, htmlContent);

  // Generate the zip file
  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
};

export const downloadZip = (blob: Blob, apiaryName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${apiaryName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_varroa_export_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
