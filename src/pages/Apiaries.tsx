import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { getAllApiaries, createApiary, updateApiary, getHivesForApiary } from '../db/repository'
import './Apiaries.css'

const Apiaries = () => {
  const apiaries = useLiveQuery(() => getAllApiaries(false), [])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [hiveCounts, setHiveCounts] = useState<Record<string, number>>({})

  // Load hive counts for each apiary
  useLiveQuery(async () => {
    if (!apiaries) return
    const counts: Record<string, number> = {}
    for (const apiary of apiaries) {
      const hives = await getHivesForApiary(apiary.id)
      counts[apiary.id] = hives.filter(h => h.isActive).length
    }
    setHiveCounts(counts)
  }, [apiaries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Bigård navn er påkrævet')
      return
    }

    try {
      if (editingId) {
        await updateApiary(editingId, { name, location: location || undefined })
        setEditingId(null)
      } else {
        await createApiary(name, location || undefined)
      }

      setName('')
      setLocation('')
      setShowForm(false)
    } catch (err) {
      setError('Der opstod en fejl')
    }
  }

  const handleEdit = (apiary: any) => {
    setEditingId(apiary.id)
    setName(apiary.name)
    setLocation(apiary.location || '')
    setShowForm(true)
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateApiary(id, { isActive: !isActive })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setName('')
    setLocation('')
    setError('')
  }

  if (!apiaries) {
    return (
      <div className="container">
        <p>Indlæser...</p>
      </div>
    )
  }

  const activeApiaries = apiaries.filter((a) => a.isActive)
  const archivedApiaries = apiaries.filter((a) => !a.isActive)

  return (
    <div className="container">
      <div className="apiaries-header">
        <h1>Bigårde</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annullér' : '+ Ny bigård'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="apiary-form">
          <h2>{editingId ? 'Redigér bigård' : 'Ny bigård'}</h2>

          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Bigård navn *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="f.eks. Bigård 1 eller Nordlige mark"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Adresse/beskrivelse (valgfrit)</label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="f.eks. Strandvej 42, 8000 Aarhus"
            />
          </div>

          <div className="form-actions">
            <button type="submit">{editingId ? 'Gem ændringer' : 'Opret bigård'}</button>
            <button type="button" onClick={handleCancel} className="secondary">
              Annullér
            </button>
          </div>
        </form>
      )}

      {activeApiaries.length === 0 && !showForm ? (
        <div className="empty-state">
          <p>Du har ingen bigårde endnu.</p>
          <button onClick={() => setShowForm(true)}>Opret din første bigård</button>
        </div>
      ) : (
        <>
          <div className="apiaries-grid">
            {activeApiaries.map((apiary) => (
              <div key={apiary.id} className="apiary-card">
                <div className="apiary-card-header">
                  <h3>{apiary.name}</h3>
                  {apiary.location && <p className="apiary-location">{apiary.location}</p>}
                  <p className="hive-count">
                    {hiveCounts[apiary.id] || 0} aktive bistader
                  </p>
                </div>
                <div className="apiary-actions">
                  <Link to={`/bistader?apiary=${apiary.id}`}>
                    <button className="secondary">Se bistader</button>
                  </Link>
                  <button onClick={() => handleEdit(apiary)} className="secondary">
                    Redigér
                  </button>
                  <button
                    onClick={() => handleToggleActive(apiary.id, apiary.isActive)}
                    className="secondary"
                  >
                    Arkivér
                  </button>
                </div>
              </div>
            ))}
          </div>

          {archivedApiaries.length > 0 && (
            <>
              <h2 className="archived-title">Arkiverede bigårde</h2>
              <div className="apiaries-grid archived">
                {archivedApiaries.map((apiary) => (
                  <div key={apiary.id} className="apiary-card">
                    <div className="apiary-card-header">
                      <h3>{apiary.name}</h3>
                      {apiary.location && <p className="apiary-location">{apiary.location}</p>}
                    </div>
                    <div className="apiary-actions">
                      <button
                        onClick={() => handleToggleActive(apiary.id, apiary.isActive)}
                        className="secondary"
                      >
                        Gendan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default Apiaries
