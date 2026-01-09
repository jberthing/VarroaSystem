import { useState, useEffect } from 'react'
import { createObservation, getObservationByHiveAndDate, getAllApiaries, getHivesForApiary } from '../db/repository'
import { readFileAsText } from '../utils/fileUtils'
import { Apiary, Hive } from '../db/database'
import { parseVarroDetectorCSV, VarroDetectorRow } from '../utils/csvParser'
import { db } from '../db/database'
import './VarroDetectorImport.css'

interface HiveMapping {
  csvRow: VarroDetectorRow
  matchedHiveId: string | null
  matchedHiveName: string | null
  isAutoMatched: boolean
}

const VarroDetectorImport = () => {
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [selectedApiaryId, setSelectedApiaryId] = useState<string>('')
  const [apiaryHives, setApiaryHives] = useState<Hive[]>([])
  const [csvData, setCsvData] = useState<VarroDetectorRow[]>([])
  const [hiveMappings, setHiveMappings] = useState<HiveMapping[]>([])
  const [observationDate, setObservationDate] = useState<string>('')
  const [trayDays, setTrayDays] = useState<number>(7)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadApiaries()
  }, [])

  const loadApiaries = async () => {
    const allApiaries = await getAllApiaries(true)
    setApiaries(allApiaries)
  }

  const handleApiaryChange = async (apiaryId: string) => {
    setSelectedApiaryId(apiaryId)
    setImportError('')
    setCsvData([])
    setHiveMappings([])
    
    if (apiaryId) {
      const hives = await getHivesForApiary(apiaryId)
      setApiaryHives(hives)
    } else {
      setApiaryHives([])
    }
  }

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportError('')
    setImportSuccess('')

    if (!selectedApiaryId) {
      setImportError('Vælg venligst en bigård først')
      e.target.value = ''
      return
    }

    try {
      const text = await readFileAsText(file)
      const rows = parseVarroDetectorCSV(text)
      setCsvData(rows)

      // Auto-match hives by name
      const mappings: HiveMapping[] = rows.map(row => {
        const matchedHive = apiaryHives.find(
          h => h.name.toLowerCase() === row.folderName.toLowerCase()
        )
        return {
          csvRow: row,
          matchedHiveId: matchedHive?.id || null,
          matchedHiveName: matchedHive?.name || null,
          isAutoMatched: !!matchedHive
        }
      })

      setHiveMappings(mappings)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Kunne ikke læse CSV-filen')
      setCsvData([])
      setHiveMappings([])
    } finally {
      e.target.value = ''
    }
  }

  const handleMappingChange = (index: number, hiveId: string) => {
    const updatedMappings = [...hiveMappings]
    const selectedHive = apiaryHives.find(h => h.id === hiveId)
    updatedMappings[index] = {
      ...updatedMappings[index],
      matchedHiveId: hiveId || null,
      matchedHiveName: selectedHive?.name || null,
      isAutoMatched: false
    }
    setHiveMappings(updatedMappings)
  }

  const handleImport = async () => {
    setImportError('')
    setImportSuccess('')

    // Validation
    if (!observationDate) {
      setImportError('Indtast venligst observationsdato')
      return
    }

    if (trayDays < 1 || trayDays > 365) {
      setImportError('Antal dage skal være mellem 1 og 365')
      return
    }

    const unmappedRows = hiveMappings.filter(m => !m.matchedHiveId)
    if (unmappedRows.length > 0) {
      setImportError(`${unmappedRows.length} rækker er ikke koblet til nogen bistade`)
      return
    }

    setIsProcessing(true)

    try {
      // Check for conflicts
      const conflicts: { hiveName: string; date: string }[] = []
      
      for (const mapping of hiveMappings) {
        if (!mapping.matchedHiveId) continue
        
        const existing = await getObservationByHiveAndDate(mapping.matchedHiveId, observationDate)
        if (existing) {
          conflicts.push({
            hiveName: mapping.matchedHiveName || mapping.csvRow.folderName,
            date: observationDate
          })
        }
      }

      // Handle conflicts
      if (conflicts.length > 0) {
        const conflictList = conflicts.map(c => `- ${c.hiveName} (${c.date})`).join('\n')
        const message = `Følgende bistader har allerede en observation på ${observationDate}:\n\n${conflictList}\n\nVil du erstatte de eksisterende observationer?`
        
        if (!confirm(message)) {
          setIsProcessing(false)
          return
        }

        // Delete existing observations
        for (const mapping of hiveMappings) {
          if (!mapping.matchedHiveId) continue
          const existing = await getObservationByHiveAndDate(mapping.matchedHiveId, observationDate)
          if (existing) {
            await db.observations.delete(existing.id)
          }
        }
      }

      // Import observations
      let importedCount = 0
      for (const mapping of hiveMappings) {
        if (!mapping.matchedHiveId) continue
        
        await createObservation(
          mapping.matchedHiveId,
          observationDate,
          mapping.csvRow.numVarroaMites,
          trayDays
        )
        importedCount++
      }

      setImportSuccess(`Importeret ${importedCount} observationer`)
      
      // Reset form
      setCsvData([])
      setHiveMappings([])
      setObservationDate('')
      setTrayDays(7)
      
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Fejl ved import')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container">
      <div className="header-section">
        <h1>🔬 VarroDetector Import</h1>
        <p className="subtitle">
          Importér varroa-tællinger fra VarroDetector analyse resultater
        </p>
      </div>

      <div className="info-card">
        <h3>📋 Om VarroDetector import</h3>
        <ul>
          <li>Upload <strong>statistics_subfolders.csv</strong> filen fra VarroDetector</li>
          <li>Vælg hvilken bigård dataene tilhører</li>
          <li>Angiv dato og antal dage for monitoreringen</li>
          <li>Gennemse og tilpas koblingen mellem CSV data og dine bistader</li>
          <li>Importér alle observationer på én gang</li>
        </ul>
      </div>

      {importError && <div className="error-message">{importError}</div>}
      {importSuccess && <div className="success-message">{importSuccess}</div>}

      <div className="import-steps">
        <div className="step-card">
          <div className="step-number">1</div>
          <div className="step-content">
            <label htmlFor="apiary-select">Vælg bigård</label>
            <select
              id="apiary-select"
              value={selectedApiaryId}
              onChange={(e) => handleApiaryChange(e.target.value)}
              className="form-select"
            >
              <option value="">-- Vælg bigård --</option>
              {apiaries.map(apiary => (
                <option key={apiary.id} value={apiary.id}>
                  {apiary.name}
                </option>
              ))}
            </select>
            {!selectedApiaryId && apiaries.length === 0 && (
              <p className="hint">Du skal først oprette en bigård</p>
            )}
          </div>
        </div>

        {selectedApiaryId && (
          <>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-content">
                <label htmlFor="csv-file">Upload CSV fil</label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="csv-file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="file-input"
                  />
                  <label htmlFor="csv-file" className="file-upload-button">
                    {csvData.length > 0 
                      ? `✓ ${csvData.length} rækker indlæst` 
                      : '📄 Vælg statistics_subfolders.csv'}
                  </label>
                </div>
                <p className="hint">Filen skal være i VarroDetector CSV format</p>
              </div>
            </div>

            {csvData.length > 0 && (
              <>
                <div className="step-card">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <label htmlFor="observation-date">Observationsdato</label>
                    <input
                      type="date"
                      id="observation-date"
                      value={observationDate}
                      onChange={(e) => setObservationDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="step-card">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <label htmlFor="tray-days">Antal moniteringsdage</label>
                    <input
                      type="number"
                      id="tray-days"
                      value={trayDays}
                      onChange={(e) => setTrayDays(parseInt(e.target.value) || 1)}
                      min="1"
                      max="365"
                      className="form-input"
                    />
                    <p className="hint">Hvor mange dage har bundbrættet ligget under bistaden?</p>
                  </div>
                </div>

                <div className="step-card full-width">
                  <div className="step-number">5</div>
                  <div className="step-content">
                    <h3>Kontroller kobling mellem CSV data og bistader</h3>
                    <div className="mapping-table-wrapper">
                      <table className="mapping-table">
                        <thead>
                          <tr>
                            <th>Mappe navn (CSV)</th>
                            <th>Varroa antal</th>
                            <th>Billeder</th>
                            <th>Koblet til bistade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hiveMappings.map((mapping, index) => (
                            <tr key={index} className={mapping.matchedHiveId ? 'mapped' : 'unmapped'}>
                              <td className="folder-name">{mapping.csvRow.folderName}</td>
                              <td className="number">{mapping.csvRow.numVarroaMites}</td>
                              <td className="number">{mapping.csvRow.numImages}</td>
                              <td className="mapping-cell">
                                <select
                                  value={mapping.matchedHiveId || ''}
                                  onChange={(e) => handleMappingChange(index, e.target.value)}
                                  className="hive-select"
                                >
                                  <option value="">-- Vælg bistade --</option>
                                  {apiaryHives.map(hive => (
                                    <option key={hive.id} value={hive.id}>
                                      {hive.name}
                                    </option>
                                  ))}
                                </select>
                                {mapping.isAutoMatched && (
                                  <span className="auto-match-badge" title="Automatisk koblet">✓</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="import-actions">
                      <div className="import-summary">
                        <div className="summary-item">
                          <span className="summary-label">Total rækker:</span>
                          <span className="summary-value">{hiveMappings.length}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Klar til import:</span>
                          <span className="summary-value success">
                            {hiveMappings.filter(m => m.matchedHiveId).length}
                          </span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Mangler kobling:</span>
                          <span className="summary-value error">
                            {hiveMappings.filter(m => !m.matchedHiveId).length}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleImport}
                        disabled={isProcessing || !observationDate || hiveMappings.some(m => !m.matchedHiveId)}
                        className="import-button"
                      >
                        {isProcessing ? '⏳ Importerer...' : '✓ Importér observationer'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default VarroDetectorImport
