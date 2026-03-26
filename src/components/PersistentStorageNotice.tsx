import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './PersistentStorageNotice.css';

type StorageStatus = 'checking' | 'granted' | 'denied' | 'unsupported' | 'requesting';
const STORAGE_DISMISS_KEY = 'storageNoticeDismissedStatus';

const storageAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readDismissedStatus = (): StorageStatus | null => {
  if (!storageAvailable()) return null;
  const value = window.localStorage.getItem(STORAGE_DISMISS_KEY);
  if (!value) return null;
  if (['checking', 'granted', 'denied', 'unsupported', 'requesting'].includes(value)) {
    return value as StorageStatus;
  }
  return null;
};

const writeDismissedStatus = (status: StorageStatus): void => {
  if (!storageAvailable()) return;
  window.localStorage.setItem(STORAGE_DISMISS_KEY, status);
};

const supportsPersistentStorage = (): boolean => {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.storage !== 'undefined' &&
    typeof navigator.storage.persist === 'function' &&
    typeof navigator.storage.persisted === 'function'
  );
};

const PersistentStorageNotice = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StorageStatus>('checking');
  const [dismissedStatus, setDismissedStatus] = useState<StorageStatus | null>(() =>
    readDismissedStatus()
  );

  useEffect(() => {
    let isMounted = true;

    const ensurePersistentStorage = async () => {
      if (!supportsPersistentStorage()) {
        if (isMounted) setStatus('unsupported');
        return;
      }

      try {
        const alreadyPersisted = await navigator.storage.persisted();
        if (!isMounted) return;

        if (alreadyPersisted) {
          setStatus('granted');
          return;
        }

        const granted = await navigator.storage.persist();
        if (isMounted) {
          setStatus(granted ? 'granted' : 'denied');
        }
      } catch {
        if (isMounted) {
          setStatus('denied');
        }
      }
    };

    void ensurePersistentStorage();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRequest = async () => {
    if (!supportsPersistentStorage()) return;
    setStatus('requesting');
    try {
      const granted = await navigator.storage.persist();
      setStatus(granted ? 'granted' : 'denied');
    } catch {
      setStatus('denied');
    }
  };

  const hasDismissedCurrentStatus = dismissedStatus === status;
  const shouldShowBanner = !hasDismissedCurrentStatus && status !== 'checking' && status !== 'granted';

  if (!shouldShowBanner) {
    return null;
  }

  const descriptionKey =
    status === 'unsupported'
      ? 'storage.unsupportedDescription'
      : status === 'denied'
      ? 'storage.deniedDescription'
      : 'storage.warningDescription';

  const canRequest = supportsPersistentStorage() && status !== 'unsupported';
  const isRequesting = status === 'requesting';

  return (
    <div className="storage-banner" role="status" aria-live="polite">
      <div className="storage-banner__content">
        <div>
          <p className="storage-banner__title">{t('storage.warningTitle')}</p>
          <p className="storage-banner__text">{t(descriptionKey)}</p>
        </div>
        <div className="storage-banner__actions">
          {canRequest && (
            <button
              className="storage-banner__primary"
              onClick={handleRequest}
              disabled={isRequesting}
            >
              {isRequesting ? t('storage.requesting') : t('storage.requestButton')}
            </button>
          )}
          <button
            className="storage-banner__dismiss"
            onClick={() => {
              setDismissedStatus(status);
              writeDismissedStatus(status);
            }}
            aria-label={t('storage.dismiss')}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersistentStorageNotice;
