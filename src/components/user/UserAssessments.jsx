import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Eye, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../App';
import { userAssessments as apiUserAssessments, uiStrings } from '../../data/assessmentData';

const statusConfig = {
  'pending': { label: 'Pending', color: '#FFB547', bg: 'rgba(255,181,71,0.12)', icon: Clock },
  'completed': { label: 'Pre-Program Completed', color: '#2DD4BF', bg: 'rgba(45,212,191,0.1)', icon: CheckCircle2 },
};

const s = {
  container: { maxWidth: 1400, margin: '0 auto', padding: '28px 24px', fontFamily: "'Poppins', system-ui, sans-serif" },
  welcomeCard: {
    background: 'linear-gradient(135deg, #7C5CFF 0%, #9B83FF 50%, #00D4FF 100%)',
    borderRadius: 16, padding: '28px 32px', color: '#FFFFFF', marginBottom: 28,
    boxShadow: '0 12px 32px rgba(124,92,255,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
  },
  welcomeTitle: { fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.01em' },
  welcomeSub: { fontSize: 13, opacity: 0.92 },
  clientChip: {
    display: 'inline-flex', alignItems: 'center',
    padding: '8px 18px', marginBottom: 14, borderRadius: 999,
    background: 'rgba(255,255,255,0.22)',
    border: '1px solid rgba(255,255,255,0.45)',
    color: '#FFFFFF',
    fontSize: 18, fontWeight: 800, letterSpacing: '0.04em',
    boxShadow: '0 6px 18px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.08)',
    textShadow: '0 1px 2px rgba(0,0,0,0.18)',
  },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#F4F4F8', marginBottom: 16, letterSpacing: '-0.01em' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
  },
  card: (isCompleted) => ({
    background: 'linear-gradient(180deg, #1A1A24 0%, #16161F 100%)',
    borderRadius: 14, boxShadow: '0 4px 18px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.2)',
    padding: '18px 20px', border: '1px solid #2A2A38',
    transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
    cursor: isCompleted ? 'pointer' : 'not-allowed',
    opacity: isCompleted ? 1 : 0.7,
    display: 'flex', flexDirection: 'column',
  }),
  cardHover: {
    transform: 'translateY(-3px)',
    boxShadow: '0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,92,255,0.3)',
    borderColor: '#7C5CFF',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 10 },
  cardTitleWrap: { flex: 1, minWidth: 0, paddingRight: 4 },
  cardTitle: {
    fontSize: 15, fontWeight: 700, color: '#F4F4F8', marginBottom: 4,
    lineHeight: 1.3, letterSpacing: '-0.005em',
    minHeight: '2.6em', // reserves space for 2 title lines so all cards align
  },
  cardMeta: { fontSize: 11, color: '#71717F' },
  badge: (status) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 12,
    fontSize: 10, fontWeight: 600, flexShrink: 0,
    maxWidth: 110, textAlign: 'center', lineHeight: 1.25,
    whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'break-word',
    background: statusConfig[status]?.bg || '#14141C',
    color: statusConfig[status]?.color || '#B4B4C4',
    border: '1px solid rgba(255,255,255,0.06)',
  }),
  progressWrap: { marginTop: 'auto', paddingTop: 12, marginBottom: 12 },
  progressLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#B4B4C4', marginBottom: 5 },
  progressBar: { width: '100%', height: 5, borderRadius: 8, background: '#0A0A0F', border: '1px solid #2A2A38' },
  progressFill: (pct) => ({
    height: '100%', borderRadius: 8, width: `${pct}%`,
    background: pct === 100 ? '#2DD4BF' : 'linear-gradient(90deg, #7C5CFF, #00D4FF)',
    transition: 'width 0.5s',
    boxShadow: pct === 100 ? '0 0 8px rgba(45,212,191,0.5)' : '0 0 8px rgba(124,92,255,0.4)',
  }),
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  dueDate: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#71717F' },
  btn: (isCompleted) => ({
    padding: '7px 14px', borderRadius: 8,
    border: isCompleted ? 'none' : '1px solid #2A2A38',
    fontSize: 12, fontWeight: 600,
    cursor: isCompleted ? 'pointer' : 'not-allowed',
    display: 'flex', alignItems: 'center', gap: 5,
    fontFamily: "'Poppins', system-ui, sans-serif",
    background: isCompleted ? 'linear-gradient(135deg, #7C5CFF, #00D4FF)' : '#14141C',
    color: isCompleted ? '#FFFFFF' : '#71717F',
    boxShadow: isCompleted ? '0 2px 10px rgba(124,92,255,0.35)' : 'none',
  }),
};

const ASSESSMENTS = [
  {
    id: 'arc-tm',
    assessmentId: 'tm',
    title: 'Tenured Managers',
    note: 'Post-journey assessment sent to both Learner and Manager of Learner',
    postLaunch: 'Post-program to be launched on: May 18, 2026',
    dueDate: 'May 18, 2026',
    status: 'completed',
    totalUsers: 18,
    respondedUsers: 18,
  },
  {
    id: 'arc-nm',
    assessmentId: 9,
    title: 'New Managers',
    note: 'Pre-assessment sent — Designing and Analyzing; both Learner and Manager of Learner',
    postLaunch: 'Post-program to be launched on: July 13th 2026',
    dueDate: '15 May',
    status: 'completed',
    totalUsers: 29,
    respondedUsers: 29,
  },
  {
    id: 'arc-sr',
    title: 'New Senior Managers',
    note: 'Awaiting pre-assessment results',
    postLaunch: 'Post-program to be launched on: July 15th 2026',
    dueDate: '29 May',
    status: 'pending',
    totalUsers: 0,
    respondedUsers: 0,
  },
  {
    id: 'arc-tech',
    title: 'Tech BU',
    note: 'Awaiting pre-assessment results',
    postLaunch: 'Post-program to be launched on: July 14th 2026',
    dueDate: '20 June',
    status: 'pending',
    totalUsers: 0,
    respondedUsers: 0,
    hidden: true,
  },
];

export default function UserAssessments() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [hoveredCard, setHoveredCard] = useState(null);
  const userName = auth?.name || 'there';

  // Build the visible list from the DB-derived userAssessments, filtered by this user's
  // permissions:
  //   - If allowedAssessmentIds is an explicit array → show exactly those (hidden ones too;
  //     explicit access overrides the hidden flag).
  //   - Else if the user is an admin → show everything, including hidden assessments.
  //   - Else (default learner with no allow-list) → drop hidden assessments.
  const allowed = auth?.permissions?.allowedAssessmentIds;
  const isAdmin = auth?.role === 'admin';
  const visibleAssessments = useMemo(() => {
    const base = (apiUserAssessments || []).map((a, idx) => ({
      id: a.id,
      assessmentId: a.assessmentId,
      title: a.title,
      hidden: !!a.hidden,
      // Only assessments with `viewable: true` (i.e. backed by real cohort data) are clickable.
      // Others render the "completed/pending" card but the button is locked so we don't
      // misroute users to the New Managers dashboard.
      viewable: !!a.viewable,
      status: a.status === 'completed' ? 'completed' : 'pending',
      note: a.note || (a.status === 'completed'
        ? 'Pre-assessment sent — Designing and Analyzing; both Learner and Manager of Learner'
        : 'Awaiting pre-assessment results'),
      postLaunch: `Post-program to be launched on: ${a.dueDate || '—'}`,
      dueDate: a.dueDate || '—',
      totalUsers: a.totalUsers || 0,
      respondedUsers: a.respondedUsers || 0,
      position: idx + 1,
    }));
    if (Array.isArray(allowed)) return base.filter(a => allowed.includes(a.id));
    if (isAdmin) return base;
    return base.filter(a => !a.hidden);
  }, [allowed, isAdmin]);
  const completedCount = visibleAssessments.filter(a => a.status === 'completed').length;
  const pendingCount = visibleAssessments.length - completedCount;

  const handleAction = (assessment) => {
    // Only navigate when the assessment is both completed AND has a real backing dashboard.
    // Placeholders (Tenured Managers, Senior Managers, Tech BU) stay on the list so they
    // don't route the user to the New Managers data.
    if (assessment.status !== 'completed' || !assessment.viewable) return;
    navigate(`/user/phases/${assessment.assessmentId}`);
  };

  return (
    <div style={s.container} className="page-enter">
      {isAdmin && (
        <button
          type="button"
          onClick={() => navigate('/admin/clients')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: '1px solid #2A2A38',
            color: '#B4B4C4',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 13,
            cursor: 'pointer',
            marginBottom: 16,
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#F4F4F8'; e.currentTarget.style.borderColor = '#3A3A48'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#B4B4C4'; e.currentTarget.style.borderColor = '#2A2A38'; }}
        >
          <ArrowLeft size={14} /> Back to clients
        </button>
      )}
      <div style={s.welcomeCard} className="animate-fade-in-down">
        <div style={s.clientChip}>{uiStrings.client || 'Arcesium'}</div>
        <div style={s.welcomeTitle}>Welcome back, {userName}!</div>
        <div style={s.welcomeSub}>
          {completedCount} completed · {pendingCount} pending. Reports unlock once an assessment is complete.
        </div>
      </div>

      <div style={s.sectionTitle} className="animate-fade-in">Your Assessments</div>

      <div style={s.grid} className="stagger">
        {visibleAssessments.map(a => {
          // The card is "clickable" only when status is completed AND the assessment has
          // backing data. Cards that look completed (e.g. Tenured Managers 18/18) but
          // aren't viewable show a Lock icon with "Report under preparation".
          const isCompleted = a.status === 'completed';
          const clickable = isCompleted && a.viewable;
          const StatusIcon = statusConfig[a.status]?.icon || Clock;
          const ActionIcon = clickable ? Eye : Lock;
          const actionLabel = clickable
            ? 'View Report'
            : (isCompleted ? 'Report under preparation' : 'Coming Soon');
          return (
            <div
              key={a.id}
              style={{ ...s.card(clickable), ...(clickable && hoveredCard === a.id ? s.cardHover : {}) }}
              onMouseEnter={() => clickable && setHoveredCard(a.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleAction(a)}
              aria-disabled={!clickable}
            >
              <div style={s.cardHeader}>
                <div style={s.cardTitleWrap}>
                  <div style={s.cardTitle}>{a.title}</div>
                </div>
                <span style={s.badge(a.status)}>
                  <StatusIcon size={11} />
                  {statusConfig[a.status]?.label}
                </span>
              </div>

              {!isCompleted && (
                <div style={{ ...s.progressWrap, paddingTop: 0, marginTop: 12 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    fontSize: 11, fontWeight: 600, color: '#F4F4F8', lineHeight: 1.4,
                    padding: '6px 10px', borderRadius: 8,
                    background: 'rgba(124,92,255,0.18)',
                    border: '1px solid rgba(124,92,255,0.45)',
                  }}>
                    {a.note}
                  </span>
                </div>
              )}

              {a.postLaunch && (
                <div style={{
                  marginTop: 'auto', paddingTop: 12, marginBottom: 12,
                  fontSize: 11, fontWeight: 600, color: '#00D4FF', lineHeight: 1.4,
                  display: 'inline-flex', alignItems: 'center',
                  padding: '6px 10px', borderRadius: 8,
                  background: 'rgba(0,212,255,0.08)',
                  border: '1px solid rgba(0,212,255,0.25)',
                  alignSelf: 'flex-start',
                }}>
                  {a.postLaunch}
                </div>
              )}

              <div style={s.cardFooter}>
                <button
                  style={s.btn(isCompleted)}
                  disabled={!isCompleted}
                  onClick={e => { e.stopPropagation(); handleAction(a); }}
                >
                  <ActionIcon size={13} /> {actionLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
