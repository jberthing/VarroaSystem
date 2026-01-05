import { useState } from 'react'
import { exportAllData, importAllData, clearAllData, seedDemoData } from '../db/repository'
import { downloadJSON, readFileAsText } from '../utils/fileUtils'
import { Observation, Treatment } from '../db/database'
import './ImportExport.css'

const ImportExport = () => {
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleExportJSON = async () => {
    try {
      const data = await exportAllData()
      const timestamp = new Date().toISOString().split('T')[0]
      downloadJSON(data, `varroa-backup-${timestamp}.json`)
    } catch (err) {
      alert('Fejl ved eksport: ' + (err instanceof Error ? err.message : 'Ukendt fejl'))
    }
  }

  const handleExportCSV = async () => {
    try {
      const data = await exportAllData()
      
      // CSV header
      let csv = 'Type,Bistade,Bigård,Placering,Dato,Antal mider,Dage,Mider pr. dag,Behandling,Produkt,Noter\n'

      // Create a map of hive IDs to names and apiary IDs
      const hiveMap = new Map(data.hives.map((h) => [h.id, h]))
      const apiaryMap = new Map(data.apiaries.map((a) => [a.id, a.name]))

      // Add observation rows
      data.observations.forEach((obs: Observation) => {
        const hive = hiveMap.get(obs.hiveId)
        const hiveName = hive?.name || 'Ukendt'
        const apiaryName = hive?.apiaryId ? (apiaryMap.get(hive.apiaryId) || '') : ''
        const location = hive?.location || ''
        const notes = (obs.notes || '').replace(/"/g, '""')
        
        csv += `"Måling","${hiveName}","${apiaryName}","${location}","${obs.date}",${obs.miteCount},${obs.trayDays},${obs.mitesPerDay},"","","${notes}"\n`
      })

      // Add treatment rows
      data.treatments.forEach((treatment: Treatment) => {
        const hive = hiveMap.get(treatment.hiveId)
        const hiveName = hive?.name || 'Ukendt'
        const apiaryName = hive?.apiaryId ? (apiaryMap.get(hive.apiaryId) || '') : ''
        const location = hive?.location || ''
        const notes = (treatment.notes || '').replace(/"/g, '""')
        
        csv += `"Behandling","${hiveName}","${apiaryName}","${location}","${treatment.date}","","","","${treatment.treatmentType}","","${notes}"\n`
      })

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().split('T')[0]
      link.href = url
      link.download = `varroa-data-${timestamp}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Fejl ved CSV eksport: ' + (err instanceof Error ? err.message : 'Ukendt fejl'))
    }
  }

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportError('')
    setImportSuccess('')
    setIsProcessing(true)

    try {
      const text = await readFileAsText(file)
      const data = JSON.parse(text)

      // Basic validation
      if (!data.hives || !data.observations || !Array.isArray(data.hives) || !Array.isArray(data.observations)) {
        throw new Error('Ugyldig filformat')
      }

      if (!confirm(`Dette vil erstatte alle dine nuværende data med ${data.hives.length} bistader og ${data.observations.length} registreringer. Er du sikker?`)) {
        setIsProcessing(false)
        return
      }

      await importAllData(data)
      setImportSuccess(`Importeret ${data.hives.length} bistader og ${data.observations.length} registreringer`)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Kunne ikke læse eller importere filen')
    } finally {
      setIsProcessing(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const handleClearData = async () => {
    if (!confirm('Dette vil slette ALLE dine bistader og registreringer permanent. Er du sikker?')) {
      return
    }

    if (!confirm('Er du helt sikker? Denne handling kan ikke fortrydes!')) {
      return
    }

    try {
      await clearAllData()
      alert('Alle data er blevet slettet')
    } catch (err) {
      alert('Fejl ved sletning: ' + (err instanceof Error ? err.message : 'Ukendt fejl'))
    }
  }

  const handleSeedDemo = async () => {
    if (!confirm('Dette vil erstatte alle dine data med demo-data. Er du sikker?')) {
      return
    }

    try {
      await seedDemoData()
      alert('Demo-data er blevet indlæst')
    } catch (err) {
      alert('Fejl ved indlæsning af demo-data: ' + (err instanceof Error ? err.message : 'Ukendt fejl'))
    }
  }

  return (
    <div className="container">
      <h1>Import & Eksport</h1>

      <div className="import-export-section">
        <div className="section-card">
          <h2>📥 Eksportér data</h2>
          <p>Download en sikkerhedskopi af alle dine bistader og registreringer.</p>
          <div className="button-group">
            <button onClick={handleExportJSON}>
              Eksportér JSON (backup)
            </button>
            <button onClick={handleExportCSV} className="secondary">
              Eksportér CSV (Excel)
            </button>
          </div>
        </div>

        <div className="section-card">
          <h2>📤 Importér data</h2>
          <p>
            Gendan en tidligere backup. <strong>Dette vil erstatte alle dine nuværende data.</strong>
          </p>

          {importError && <div className="error-message">{importError}</div>}
          {importSuccess && <div className="success-message">{importSuccess}</div>}

          <div className="file-input-wrapper">
            <label htmlFor="import-file" className="file-input-label">
              {isProcessing ? 'Behandler...' : 'Vælg JSON backup fil'}
            </label>
            <input
              type="file"
              id="import-file"
              accept=".json"
              onChange={handleImportJSON}
              disabled={isProcessing}
              className="file-input"
            />
          </div>
        </div>

        <div className="section-card">
          <h2>🧪 Test data</h2>
          <p>Indlæs demo-data til test og udvikling.</p>
          <button onClick={handleSeedDemo} className="secondary">
            Indlæs demo-data
          </button>
        </div>

        <div className="section-card danger-zone">
          <h2>⚠️ Farezone</h2>
          <p>
            Slet alle data permanent. <strong>Dette kan ikke fortrydes!</strong>
          </p>
          <button onClick={handleClearData} className="danger">
            Slet alle data
          </button>
        </div>
      </div>

      <div className="info-box">
        <h3>ℹ️ Om backup</h3>
        <ul>
          <li>JSON-filer kan importeres tilbage i denne app</li>
          <li>CSV-filer kan åbnes i Excel eller Google Sheets</li>
          <li>Alle data gemmes kun lokalt på din computer</li>
          <li>Husk at lave regelmæssige backups!</li>
        </ul>
      </div>
    </div>
  )
}

export default ImportExport
