import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../App'

const NAVY = '#0D0D14'
const NAVY_DARK = '#0D0D14'
const NAVY_DARKER = '#050507'

function SikshaLogoCompact() {
  return (
    <img src="/Siksha-Logo.png" alt="Siksha" style={{ width: 140, height: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
  )
}

const navItems = [
  { path: '/admin/dashboard', label: 'Clients', icon: '🏢' },
  { path: '/admin/forms', label: 'Assessments', icon: '📋' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
]

const pageTitles = {
  '/admin/dashboard': 'Clients',
  '/admin/clients': 'Client Assessments',
  '/admin/results': 'Assessment Results',
  '/admin/forms': 'Assessments',
  '/admin/form-builder': 'Upload Assessment',
  '/admin/users': 'Users',
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: '260px',
    minWidth: '260px',
    background: `linear-gradient(180deg, ${NAVY_DARK} 0%, ${NAVY_DARKER} 100%)`,
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
  },
  sidebarHeader: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    color: '#71717F',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  },
  navItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    background: 'rgba(255,255,255,0.1)',
    borderLeft: '3px solid #00D4FF',
  },
  navIcon: {
    fontSize: '18px',
    width: '24px',
    textAlign: 'center',
  },
  sidebarFooter: {
    padding: '16px 16px 24px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #7C5CFF 0%, #00D4FF 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '14px',
    fontWeight: '700',
    boxShadow: '0 2px 12px rgba(124,92,255,0.35)',
  },
  userName: {
    color: 'white',
    fontSize: '13px',
    fontWeight: '600',
  },
  userEmail: {
    color: '#71717F',
    fontSize: '11px',
  },
  logoutBtn: {
    width: '100%',
    padding: '10px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#71717F',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  main: {
    flex: 1,
    marginLeft: '260px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  header: {
    height: '64px',
    background: '#1A1A24',
    borderBottom: '1px solid #2A2A38',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  headerTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#F4F4F8',
    letterSpacing: '-0.01em',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #7C5CFF, #00D4FF)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '14px',
    fontWeight: '700',
    boxShadow: '0 2px 12px rgba(124,92,255,0.35)',
  },
  content: {
    flex: 1,
    padding: '28px 32px',
    background: '#0A0A0F',
  },
}

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { auth, logout } = useAuth()

  const getPageTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (location.pathname.startsWith(path)) return title
    }
    return 'Dashboard'
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = auth?.name
    ? auth.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : 'A'

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <SikshaLogoCompact />
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                style={isActive ? styles.navItemActive : styles.navItem}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.color = 'white'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#71717F'
                  }
                }}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>{initials}</div>
            <div>
              <div style={styles.userName}>{auth?.name || 'Admin'}</div>
              <div style={styles.userEmail}>{auth?.email || 'admin@siksha.io'}</div>
            </div>
          </div>
          <button
            style={styles.logoutBtn}
            onClick={handleLogout}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.12)'
              e.target.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.06)'
              e.target.style.color = '#71717F'
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.headerTitle}>{getPageTitle()}</h1>
          <div style={styles.headerRight}>
            <span style={{ fontSize: '13px', color: '#B4B4C4' }}>
              {auth?.name || 'Admin'}
            </span>
            <div style={styles.headerAvatar}>{initials}</div>
          </div>
        </header>
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
