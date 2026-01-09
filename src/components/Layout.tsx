import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import './Layout.css'
import packageJson from '../../package.json'

const Layout = () => {
  const { t } = useTranslation()
  
  return (
    <div className="layout">
      <header className="header">
        <div className="container header-content">
          <h1 className="logo">🐝 {t('app.title')}</h1>
          <nav className="nav">
            <NavLink to="/overview" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {t('nav.overview')}
            </NavLink>
            <NavLink to="/apiaries" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {t('nav.apiaries')}
            </NavLink>
            <NavLink to="/hives" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {t('nav.hives')}
            </NavLink>
            <NavLink to="/varrodetector" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {t('nav.varrodetector')}
            </NavLink>
            <NavLink to="/import-eksport" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {t('nav.importExport')}
            </NavLink>
          </nav>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          <p className="version">{t('app.version')} {packageJson.version} • {t('app.developedBy')}</p>
        </div>
      </footer>
    </div>
  )
}

export default Layout
