import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { getAllApiaries, createApiary, updateApiary, getHivesForApiary } from '../db/repository';
import './Apiaries.css';

const Apiaries = () => {
  const { t } = useTranslation();
  const apiaries = useLiveQuery(() => getAllApiaries(false), []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [hiveCounts, setHiveCounts] = useState<Record<string, number>>({});

  // Load hive counts for each apiary
  useLiveQuery(async () => {
    if (!apiaries) return;
    const counts: Record<string, number> = {};
    for (const apiary of apiaries) {
      const hives = await getHivesForApiary(apiary.id);
      counts[apiary.id] = hives.filter((h) => h.isActive).length;
    }
    setHiveCounts(counts);
  }, [apiaries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('apiaries.nameRequired'));
      return;
    }

    try {
      if (editingId) {
        await updateApiary(editingId, { name, location: location || undefined });
        setEditingId(null);
      } else {
        await createApiary(name, location || undefined);
      }

      setName('');
      setLocation('');
      setShowForm(false);
    } catch (err) {
      setError(t('apiaries.error'));
    }
  };

  const handleEdit = (apiary: any) => {
    setEditingId(apiary.id);
    setName(apiary.name);
    setLocation(apiary.location || '');
    setShowForm(true);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateApiary(id, { isActive: !isActive });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setLocation('');
    setError('');
  };

  if (!apiaries) {
    return (
      <div className="container">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  const activeApiaries = apiaries.filter((a) => a.isActive);
  const archivedApiaries = apiaries.filter((a) => !a.isActive);

  return (
    <div className="container">
      <div className="page-intro">
        <div>
          <h1>{t('apiaries.title')}</h1>
          <p className="page-lead">
            {t('apiaries.subtitle', {
              defaultValue: 'Group colonies, compare locations, and keep track of seasonal notes.',
            })}
          </p>
        </div>
        <div className="page-intro-actions">
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? t('apiaries.cancel') : `+ ${t('apiaries.newApiary')}`}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="apiary-form">
          <h2>{editingId ? t('apiaries.editApiary') : t('apiaries.newApiary')}</h2>

          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">{t('apiaries.nameLabel')} *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('apiaries.namePlaceholder')}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">{t('apiaries.locationLabel')}</label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('apiaries.locationPlaceholder')}
            />
          </div>

          <div className="form-actions">
            <button type="submit">
              {editingId ? t('apiaries.saveChanges') : t('apiaries.createApiary')}
            </button>
            <button type="button" onClick={handleCancel} className="secondary">
              {t('apiaries.cancel')}
            </button>
          </div>
        </form>
      )}

      {activeApiaries.length === 0 && !showForm ? (
        <div className="empty-state empty-state-card">
          <p>{t('apiaries.noApiaries')}</p>
          <button onClick={() => setShowForm(true)}>{t('apiaries.createFirst')}</button>
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
                    {hiveCounts[apiary.id] || 0} {t('apiaries.activeHives')}
                  </p>
                </div>
                <div className="apiary-actions">
                  <Link to={`/hives?apiary=${apiary.id}`}>
                    <button className="secondary">{t('apiaries.seeHives')}</button>
                  </Link>
                  <button onClick={() => handleEdit(apiary)} className="secondary">
                    {t('apiaries.edit')}
                  </button>
                  <button
                    onClick={() => handleToggleActive(apiary.id, apiary.isActive)}
                    className="secondary"
                  >
                    {t('apiaries.archive')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {archivedApiaries.length > 0 && (
            <>
              <h2 className="archived-title">{t('apiaries.archivedTitle')}</h2>
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
                        {t('apiaries.restore')}
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
  );
};

export default Apiaries;
