import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../App'

const navLinks = []

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    height: '64px',
    background: 'linear-gradient(180deg, #16161F 0%, #0D0D14 100%)',
    borderBottom: '1px solid #2A2A38',
    boxShadow: '0 1px 0 rgba(124,92,255,0.08), 0 4px 18px rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#F4F4F8',
    letterSpacing: '-0.5px',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  navLink: {
    padding: '8px 16px',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  },
  navLinkActive: {
    padding: '8px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#F4F4F8',
    background: 'rgba(124, 92, 255, 0.1)',
    textDecoration: 'none',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'relative',
  },
  userName: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text)',
  },
  avatarBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #7C5CFF, #00D4FF)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '14px',
    fontWeight: '700',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
  dropdown: {
    position: 'absolute',
    top: '48px',
    right: 0,
    background: '#1A1A24',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border)',
    padding: '8px',
    minWidth: '180px',
    zIndex: 200,
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    background: 'transparent',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text)',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  dropdownDivider: {
    height: '1px',
    background: 'var(--border)',
    margin: '6px 0',
  },
  dropdownEmail: {
    padding: '8px 14px',
    fontSize: '12px',
    color: 'var(--text-light)',
  },
  content: {
    flex: 1,
    padding: '24px 28px',
    maxWidth: '90%',
    width: '100%',
    margin: '0 auto',
  },
}

export default function UserLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { auth, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = auth?.name
    ? auth.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : 'U'

  return (
    <div style={styles.wrapper}>
      {/* Top Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <Link to="/user/assessments" style={styles.logoRow}>
            <img
              src="/Siksha-Logo.png"
              alt="Siksha"
              style={{
                width: 120,
                height: 'auto',
                filter: 'brightness(0) invert(1)',
                opacity: 0.95,
              }}
            />
          </Link>
          <div style={styles.navLinks}>
            {navLinks.map((item) => {
              const isActive = location.pathname === item.path ||
                location.pathname.startsWith(item.path + '/')
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={isActive ? styles.navLinkActive : styles.navLink}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--text)'
                      e.currentTarget.style.background = '#1A1A24'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--text-secondary)'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div style={styles.navRight}>
          <span style={styles.userName}>{auth?.name || 'User'}</span>
          <button
            style={styles.avatarBtn}
            onClick={() => setShowDropdown(!showDropdown)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {initials}
          </button>

          {showDropdown && (
            <div style={styles.dropdown}>
              <div style={styles.dropdownEmail}>{auth?.email || 'user@arcesium.com'}</div>
              <div style={styles.dropdownDivider} />
              <button
                style={styles.dropdownItem}
                onClick={handleLogout}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1A1A24'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Click-away overlay for dropdown */}
      {showDropdown && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setShowDropdown(false)}
        />
      )}

      {/* Content */}
      <main style={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
