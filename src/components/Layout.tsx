import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import PersistentStorageNotice from './PersistentStorageNotice';
import './Layout.css';
import packageJson from '../../package.json';

const NAV_ITEMS = [
  { path: '/overview', labelKey: 'nav.overview', icon: '📊' },
  { path: '/apiaries', labelKey: 'nav.apiaries', icon: '🌿' },
  { path: '/hives', labelKey: 'nav.hives', icon: '🐝' },
  { path: '/varrodetector', labelKey: 'nav.varrodetector', icon: '🔬' },
  { path: '/import-eksport', labelKey: 'nav.importExport', icon: '↔️' },
];

const Layout = () => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);
  const primaryNavLabel = t('nav.primary', { defaultValue: 'Primary navigation' });
  const openLabel = t('common.openMenu', { defaultValue: 'Open menu' });
  const closeLabel = t('common.closeMenu', { defaultValue: 'Close menu' });

  const renderNavLinks = (onNavigate?: () => void) => (
    <nav className="primary-nav" aria-label={primaryNavLabel}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
          onClick={() => {
            if (onNavigate) {
              onNavigate();
            }
          }}
        >
          <span className="nav-icon" aria-hidden="true">
            {item.icon}
          </span>
          <span>{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="layout">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              🐝
            </div>
            <div>
              <h1 className="logo">{t('app.title')}</h1>
            </div>
          </div>
        <div className="desktop-nav">{renderNavLinks()}</div>
        <div className="header-actions">
          <LanguageSwitcher />
          <button
            className="nav-toggle"
            aria-controls="mobile-nav-panel"
            aria-label={isMenuOpen ? closeLabel : openLabel}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>
          </div>
        </div>
      </header>

      <PersistentStorageNotice />

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <p className="version">
            {t('app.version')} {packageJson.version} • {t('app.developedBy')}
          </p>
          <p className="footer-note">{t('app.offlineReady', { defaultValue: 'Works offline & in the field' })}</p>
        </div>
      </footer>

      <div className={`mobile-nav ${isMenuOpen ? 'open' : ''}`} id="mobile-nav-panel">
        <div className="mobile-nav__header">
          <p>{t('app.title')}</p>
          <button className="ghost" onClick={closeMenu} aria-label={closeLabel}>
            ✕
          </button>
        </div>
        <div className="mobile-nav__links">{renderNavLinks(closeMenu)}</div>
        <div className="mobile-nav__footer">
          <LanguageSwitcher />
          <p>{t('app.version')} {packageJson.version}</p>
        </div>
      </div>
      {isMenuOpen && <div className="nav-backdrop" onClick={closeMenu} aria-hidden="true" />}
    </div>
  );
};

export default Layout;
