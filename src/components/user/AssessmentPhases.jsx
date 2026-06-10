import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ClipboardCheck, CalendarCheck, Sparkles, Lock } from 'lucide-react';
import { publishedAssessments, uiStrings } from '../../data/assessmentData';

// Per-assessment metadata: title shown on the chooser, plus per-phase routing.
// Each phase entry: { available, kind: 'dashboard' | 'pdf' | null, stats }
const ASSESSMENT_META = {
  tm: {
    title: 'Tenured Managers',
    pre: { available: true, kind: 'pdf', stats: [
      { label: 'Respondents', value: '16/17' },
      { label: 'Status', value: 'Complete' },
      { label: 'Captured', value: 'Apr 2026' },
    ] },
    post: { available: false, kind: null, stats: [
      { label: 'Status', value: 'Coming Soon' },
      { label: 'Window', value: 'TBC' },
      { label: 'Respondents', value: '—' },
    ] },
  },
  // NM Cohort lives at numeric id 9 (matches publishedAssessments)
  '9': {
    title: 'New Managers',
    pre: { available: true, kind: 'dashboard', stats: [
      { label: 'Respondents', value: '27' },
      { label: 'Status', value: 'Complete' },
      { label: 'Captured', value: 'May 2026' },
    ] },
    post: { available: false, kind: null, stats: [
      { label: 'Status', value: 'Pending' },
      { label: 'Window', value: 'TBC' },
      { label: 'Respondents', value: '—' },
    ] },
  },
};

const s = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '24px 24px', fontFamily: "'Poppins', system-ui, sans-serif" },
  backLink: {
    display: 'inline-flex', alignItems: 'center', gap: 6, color: '#9B83FF',
    fontSize: 13, fontWeight: 500, textDecoration: 'none', marginBottom: 16,
  },
  header: { marginBottom: 24 },
  brand: {
    display: 'inline-flex', alignItems: 'center', marginBottom: 10,
    padding: '6px 14px', borderRadius: 999,
    background: 'linear-gradient(135deg, rgba(124,92,255,0.22), rgba(0,212,255,0.18))',
    border: '1px solid rgba(124,92,255,0.45)',
    color: '#FFFFFF', fontSize: 16, fontWeight: 800, letterSpacing: '0.04em',
    boxShadow: '0 6px 18px rgba(124,92,255,0.25), inset 0 0 0 1px rgba(255,255,255,0.06)',
  },
  title: { fontSize: 22, fontWeight: 700, color: '#F4F4F8', letterSpacing: '-0.01em', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#B4B4C4' },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 20,
  },
  card: (active, accent) => ({
    background: 'linear-gradient(180deg, #1A1A24 0%, #16161F 100%)',
    borderRadius: 16,
    padding: '28px 26px',
    border: `1px solid ${active ? accent : '#2A2A38'}`,
    transition: 'all 0.2s',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: active
      ? `0 12px 32px rgba(0,0,0,0.55), 0 0 0 1px ${accent}55, 0 0 36px ${accent}33`
      : '0 4px 18px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.2)',
    transform: active ? 'translateY(-3px)' : 'none',
  }),
  glow: (accent) => ({
    position: 'absolute',
    top: -40, right: -40,
    width: 120, height: 120,
    borderRadius: '50%',
    background: `radial-gradient(circle, ${accent}40 0%, transparent 70%)`,
    filter: 'blur(8px)',
    pointerEvents: 'none',
  }),
  iconWrap: (accent) => ({
    width: 44, height: 44, borderRadius: 12,
    background: `linear-gradient(135deg, ${accent}33, ${accent}11)`,
    border: `1px solid ${accent}55`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: accent, marginBottom: 14,
  }),
  phaseLabel: (accent) => ({
    fontSize: 10, fontWeight: 700, color: accent,
    letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6,
  }),
  cardTitle: { fontSize: 17, fontWeight: 700, color: '#F4F4F8', letterSpacing: '-0.005em', marginBottom: 6 },
  cardDesc: { fontSize: 12.5, color: '#B4B4C4', lineHeight: 1.55, marginBottom: 18 },

  stats: { display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 100 },
  statLabel: { fontSize: 10, color: '#71717F', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 },
  statValue: { fontSize: 18, fontWeight: 700, color: '#F4F4F8' },

  cta: (accent) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 8,
    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
    color: '#FFFFFF', fontSize: 12, fontWeight: 600,
    border: 'none', cursor: 'pointer',
    boxShadow: `0 2px 12px ${accent}55`,
  }),
};

const PHASE_DEFS = {
  pre: {
    key: 'pre',
    label: 'Pre-Program',
    title: 'Pre-Program Assessment',
    description: 'Baseline measurement captured before the program began. Establishes the starting point for capability, confidence, and applied judgement across the five modules.',
    accent: '#7C5CFF',
    Icon: ClipboardCheck,
  },
  post: {
    key: 'post',
    label: 'Post-Program',
    title: 'Post-Program Assessment',
    description: 'Re-assessment captured at program close. Same instrument as Pre, so module-level deltas reflect program impact.',
    accent: '#00D4FF',
    Icon: CalendarCheck,
  },
};

export default function AssessmentPhases() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);

  const meta = ASSESSMENT_META[id] || ASSESSMENT_META['9'];
  const publishedMatch = publishedAssessments.find(a => String(a.id) === String(id));
  const headerTitle = meta?.title || publishedMatch?.title || 'Assessment';
  const client = publishedMatch?.client || uiStrings.client || 'Arcesium';

  const goToPhase = (phaseKey) => {
    const phaseMeta = meta[phaseKey];
    if (!phaseMeta?.available) return;
    if (phaseMeta.kind === 'pdf') {
      navigate(`/user/report/${id}?phase=${phaseKey}`);
    } else {
      navigate(`/user/results/${id}?phase=${phaseKey}`);
    }
  };

  return (
    <div style={s.container} className="page-enter">
      <Link to="/user/assessments" style={s.backLink} className="animate-fade-in">
        <ArrowLeft size={14} /> Back to Assessments
      </Link>

      <div style={s.header} className="animate-fade-in-down">
        <div style={s.brand}>{client}</div>
        <div style={s.title}>{headerTitle}</div>
      </div>

      <div style={s.grid} className="stagger">
        {['pre', 'post'].map(phaseKey => {
          const p = PHASE_DEFS[phaseKey];
          const phaseMeta = meta[phaseKey] || { available: false, kind: null, stats: [] };
          const Icon = p.Icon;
          const isAvailable = phaseMeta.available;
          const active = isAvailable && hovered === p.key;
          const accent = isAvailable ? p.accent : '#3A3A4A';
          return (
            <div
              key={p.key}
              style={{
                ...s.card(active, accent),
                cursor: isAvailable ? 'pointer' : 'not-allowed',
                opacity: isAvailable ? 1 : 0.65,
              }}
              onMouseEnter={() => isAvailable && setHovered(p.key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => goToPhase(p.key)}
              aria-disabled={!isAvailable}
            >
              {isAvailable && <div style={s.glow(p.accent)} />}
              <div style={s.iconWrap(accent)}>
                <Icon size={22} />
              </div>
              <div style={s.phaseLabel(accent)}>
                {isAvailable
                  ? <><Sparkles size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />{p.label}</>
                  : <><Lock size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />{p.label}</>}
              </div>
              <div style={s.cardTitle}>{p.title}</div>
              <div style={s.cardDesc}>
                {isAvailable
                  ? p.description
                  : 'Not available yet — this phase will unlock once the assessment is completed and analysed.'}
              </div>

              <div style={s.stats}>
                {phaseMeta.stats.map(st => (
                  <div key={st.label} style={s.stat}>
                    <div style={s.statLabel}>{st.label}</div>
                    <div style={s.statValue}>{st.value}</div>
                  </div>
                ))}
              </div>

              <button
                style={{
                  ...s.cta(accent),
                  cursor: isAvailable ? 'pointer' : 'not-allowed',
                  opacity: isAvailable ? 1 : 0.7,
                  background: isAvailable
                    ? `linear-gradient(135deg, ${p.accent}, ${p.accent}cc)`
                    : '#14141C',
                  border: isAvailable ? 'none' : '1px solid #2A2A38',
                  color: isAvailable ? '#FFFFFF' : '#71717F',
                  boxShadow: isAvailable ? `0 2px 12px ${p.accent}55` : 'none',
                }}
                disabled={!isAvailable}
                onClick={e => { e.stopPropagation(); goToPhase(p.key); }}
              >
                {isAvailable
                  ? (phaseMeta.kind === 'pdf'
                      ? <>See Results <ArrowRight size={13} /></>
                      : <>View Report <ArrowRight size={13} /></>)
                  : <>Coming Soon <Lock size={12} /></>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
