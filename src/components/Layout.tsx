import { Outlet, NavLink } from 'react-router-dom'
import './Layout.css'
import packageJson from '../../package.json'

const Layout = () => {
  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <h1 className="logo">🐝 Varroa Monitor</h1>
          <nav className="nav">
            <NavLink to="/oversigt" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Oversigt
            </NavLink>
            <NavLink to="/bigaarde" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Bigårde
            </NavLink>
            <NavLink to="/bistader" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Bistader
            </NavLink>
            <NavLink to="/import-eksport" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Import/Eksport
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          <p className="version">Version {packageJson.version}</p>
        </div>
      </footer>
    </div>
  )
}

export default Layout
