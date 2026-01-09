import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useSearchParams } from 'react-router-dom'
import { getAllHives, getAllApiaries, createHive, updateHive } from '../db/repository'
import { compressImage, getBase64Size } from '../utils/imageUtils'
import './Hives.css'

const Hives = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const apiaryFilter = searchParams.get('apiary')
  
  const hives = useLiveQuery(() => getAllHives(false), [])
  const apiaries = useLiveQuery(() => getAllApiaries(true), [])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [apiaryId, setApiaryId] = useState('')
  const [location, setLocation] = useState('')
  const [image, setImage] = useState<string | undefined>(undefined)
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (apiaryFilter && !apiaryId) {
      setApiaryId(apiaryFilter)
    }
  }, [apiaryFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError(t('hives.nameRequired'))
      return
    }

    try {
      if (editingId) {
        await updateHive(editingId, { 
          name, 
          apiaryId: apiaryId || undefined,
          location: location || undefined,
          image: image
        })
        setEditingId(null)
      } else {
        await createHive(name, apiaryId || undefined, location || undefined, image)
      }

      setName('')
      setApiaryId('')
      setLocation('')
      setImage(undefined)
      setImagePreview(undefined)
      setShowForm(false)
    } catch (err) {
      setError(t('hives.error'))
    }
  }

  const handleEdit = (hive: any) => {
    setEditingId(hive.id)
    setName(hive.name)
    setApiaryId(hive.apiaryId || '')
    setLocation(hive.location || '')
    setImage(hive.image)
    setImagePreview(hive.image)
    setShowForm(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError('')

    try {
      const compressed = await compressImage(file)
      const sizeKB = getBase64Size(compressed)
      
      if (sizeKB > 500) {
        setError(t('hives.imageTooLarge', { size: sizeKB.toFixed(0) }))
        setUploadingImage(false)
        return
      }

      setImage(compressed)
      setImagePreview(compressed)
    } catch (err) {
      setError(t('hives.imageUploadError'))
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setImage(undefined)
    setImagePreview(undefined)
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateHive(id, { isActive: !isActive })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setName('')
    setApiaryId('')
    setLocation('')
    setImage(undefined)
    setImagePreview(undefined)
    setError('')
  }

  if (!hives || !apiaries) {
    return (
      <div className="container">
        <p>Indlæser...</p>
      </div>
    )
  }

  // Filter and group hives
  let filteredHives = hives
  if (apiaryFilter) {
    filteredHives = hives.filter(h => h.apiaryId === apiaryFilter)
  }

  const activeHives = filteredHives.filter((h) => h.isActive)
  const archivedHives = filteredHives.filter((h) => !h.isActive)

  // Group hives by apiary
  const groupedHives: Record<string, any[]> = {}
  const noApiaryHives: any[] = []
  
  activeHives.forEach(hive => {
    if (hive.apiaryId) {
      if (!groupedHives[hive.apiaryId]) {
        groupedHives[hive.apiaryId] = []
      }
      groupedHives[hive.apiaryId].push(hive)
    } else {
      noApiaryHives.push(hive)
    }
  })

  const selectedApiary = apiaryFilter ? apiaries.find(a => a.id === apiaryFilter) : null

  return (
    <div className="container">
      <div className="hives-header">
        <div>
          <h1>{t('hives.title')}</h1>
          {selectedApiary && (
            <p className="breadcrumb">
              <Link to="/apiaries">{t('hives.breadcrumbApiaries')}</Link> → {selectedApiary.name}
            </p>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? t('hives.cancel') : `+ ${t('hives.newHive')}`}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="hive-form">
          <h2>{editingId ? t('hives.editHive') : t('hives.newHive')}</h2>

          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="apiaryId">{t('hives.apiaryLabel')}</label>
            <select
              id="apiaryId"
              value={apiaryId}
              onChange={(e) => setApiaryId(e.target.value)}
            >
              <option value="">{t('hives.noApiary')}</option>
              {apiaries.map((apiary) => (
                <option key={apiary.id} value={apiary.id}>
                  {apiary.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="name">{t('hives.nameLabel')} *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('hives.namePlaceholder')}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">{t('hives.locationLabel')}</label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('hives.locationPlaceholder')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="image">{t('hives.imageLabel')}</label>
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
                <button type="button" onClick={handleRemoveImage} className="remove-image-btn">
                  ✕ {t('hives.removeImage')}
                </button>
              </div>
            )}
            {!imagePreview && (
              <input
                type="file"
                id="image"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
            )}
            {uploadingImage && <p className="upload-status">{t('hives.compressingImage')}</p>}
            <p className="help-text">{t('hives.imageHelp')}</p>
          </div>

          <div className="form-actions">
            <button type="submit">{editingId ? t('hives.saveChanges') : t('hives.createHive')}</button>
            <button type="button" onClick={handleCancel} className="secondary">
              {t('hives.cancel')}
            </button>
          </div>
        </form>
      )}

      {activeHives.length === 0 && !showForm ? (
        <div className="empty-state">
          <p>{t('hives.noHives')}</p>
          <button onClick={() => setShowForm(true)}>{t('hives.createFirst')}</button>
        </div>
      ) : (
        <>
          {/* Group by apiaries */}
          {Object.keys(groupedHives).map(apiaryId => {
            const apiary = apiaries.find(a => a.id === apiaryId)
            if (!apiary) return null
            
            return (
              <div key={apiaryId} className="apiary-section">
                <h2 className="apiary-section-title">
                  {apiary.name}
                  {apiary.location && <span className="apiary-location-small"> • {apiary.location}</span>}
                </h2>
                <div className="hives-list">
                  {groupedHives[apiaryId].map((hive) => (
                    <div key={hive.id} className="hive-item">
                      <Link to={`/hives/${hive.id}`} className="hive-info">
                        {hive.image && (
                          <img src={hive.image} alt={hive.name} className="hive-thumbnail" />
                        )}
                        <div>
                          <h3>{hive.name}</h3>
                          {hive.location && <p className="hive-location">{hive.location}</p>}
                        </div>
                      </Link>
                      <div className="hive-actions">
                        <button onClick={() => handleEdit(hive)} className="secondary">
                          {t('hives.edit')}
                        </button>
                        <button
                          onClick={() => handleToggleActive(hive.id, hive.isActive)}
                          className="secondary"
                        >
                          {t('hives.archive')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Hives without apiary */}
          {noApiaryHives.length > 0 && (
            <div className="apiary-section">
              <h2 className="apiary-section-title">{t('hives.withoutApiary')}</h2>
              <div className="hives-list">
                {noApiaryHives.map((hive) => (
                  <div key={hive.id} className="hive-item">
                    <Link to={`/hives/${hive.id}`} className="hive-info">
                      {hive.image && (
                        <img src={hive.image} alt={hive.name} className="hive-thumbnail" />
                      )}
                      <div>
                        <h3>{hive.name}</h3>
                        {hive.location && <p className="hive-location">{hive.location}</p>}
                      </div>
                    </Link>
                    <div className="hive-actions">
                      <button onClick={() => handleEdit(hive)} className="secondary">
                        {t('hives.edit')}
                      </button>
                      <button
                        onClick={() => handleToggleActive(hive.id, hive.isActive)}
                        className="secondary"
                      >
                        {t('hives.archive')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {archivedHives.length > 0 && (
            <>
              <h2 className="archived-title">{t('hives.archivedTitle')}</h2>
              <div className="hives-list archived">
                {archivedHives.map((hive) => (
                  <div key={hive.id} className="hive-item">
                    <div className="hive-info">
                      <h3>{hive.name}</h3>
                      {hive.location && <p className="hive-location">{hive.location}</p>}
                    </div>
                    <div className="hive-actions">
                      <button
                        onClick={() => handleToggleActive(hive.id, hive.isActive)}
                        className="secondary"
                      >
                        {t('hives.restore')}
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

export default Hives
