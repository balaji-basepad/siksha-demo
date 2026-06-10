import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../App'

const NAVY = '#9B83FF'
const NAVY_LIGHT = '#00D4FF'
const NAVY_DARK = '#F4F4F8'

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0A0A0F',
    backgroundImage:
      'radial-gradient(circle at 20% 20%, rgba(124,92,255,0.18) 0%, transparent 45%),' +
      'radial-gradient(circle at 80% 80%, rgba(0,212,255,0.14) 0%, transparent 40%)',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgOrb1: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,92,255,0.18) 0%, transparent 70%)',
    top: '-150px',
    left: '-150px',
    filter: 'blur(20px)',
  },
  bgOrb2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)',
    bottom: '-100px',
    right: '-100px',
    filter: 'blur(20px)',
  },
  bgOrb3: {
    position: 'absolute',
    width: '250px',
    height: '250px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(251,113,133,0.1) 0%, transparent 70%)',
    top: '30%',
    right: '15%',
    filter: 'blur(20px)',
  },
  card: {
    background: 'linear-gradient(180deg, rgba(26,26,36,0.95) 0%, rgba(20,20,28,0.95) 100%)',
    backdropFilter: 'blur(20px)',
    border: '1px solid #2A2A38',
    borderRadius: '18px',
    padding: '42px 36px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.55), 0 0 32px rgba(124,92,255,0.15)',
    position: 'relative',
    zIndex: 1,
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  title: {
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: '700',
    color: '#F4F4F8',
    marginBottom: '8px',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '500',
    color: '#B4B4C4',
    marginBottom: '32px',
    letterSpacing: '0.5px',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#B4B4C4',
    marginBottom: '6px',
    letterSpacing: '0.02em',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    border: '1px solid #2A2A38',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#F4F4F8',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s',
    background: '#14141C',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '10px',
    background: `linear-gradient(135deg, ${NAVY}, ${NAVY_LIGHT})`,
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.1s ease, box-shadow 0.2s ease',
    boxShadow: `0 4px 14px rgba(124, 92, 255, 0.4)`,
    marginTop: '8px',
  },
  demoNote: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#71717F',
    marginTop: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  demoBadge: {
    background: '#14141C',
    color: NAVY,
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
  },
  error: {
    background: 'rgba(251,113,133,0.1)',
    color: '#FDA4AF',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  adminLink: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#B4B4C4',
    marginTop: '20px',
  },
  link: {
    color: NAVY,
    fontWeight: '600',
    textDecoration: 'none',
    cursor: 'pointer',
  },
}

function SikshaLogo({ width = 200 }) {
  return (
    <img
      src="/Siksha-Logo.png"
      alt="Siksha"
      style={{
        width,
        height: 'auto',
        filter: 'brightness(0) invert(1)',
        opacity: 0.95,
      }}
    />
  )
}

export default function UserLoginPage() {
  const navigate = useNavigate()
  const { auth, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (auth) navigate(auth.permissions?.defaultRoute || '/user/assessments', { replace: true })
  }, [auth, navigate])

  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await login(username.trim(), password)
      if (result?.ok) {
        navigate(result.user?.permissions?.defaultRoute || '/user/assessments')
      } else {
        setError(result?.error || 'Invalid credentials')
      }
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />
      <div style={styles.bgOrb3} />

      <div style={styles.card} className="animate-scale-in">
        <div style={styles.logoContainer}>
          <SikshaLogo width={220} />
        </div>
        <h1 style={styles.title}>Sign In</h1>
        <p style={styles.subtitle}>Assessment Platform</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              onFocus={(e) => {
                e.target.style.borderColor = NAVY
                e.target.style.boxShadow = '0 0 0 3px rgba(124, 92, 255, 0.18)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#2A2A38'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                style={{ ...styles.input, paddingRight: 42 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                onFocus={(e) => {
                  e.target.style.borderColor = NAVY
                  e.target.style.boxShadow = '0 0 0 3px rgba(124, 92, 255, 0.18)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#2A2A38'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 6,
                  color: '#71717F',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#B4B4C4' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#71717F' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={styles.button}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)'
              e.target.style.boxShadow = '0 6px 20px rgba(124, 92, 255, 0.55)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 14px rgba(124, 92, 255, 0.4)'
            }}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
