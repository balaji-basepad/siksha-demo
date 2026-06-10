import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  Users, TrendingUp, ArrowUpDown, ClipboardCheck,
  Download, ArrowLeft, Lightbulb, AlertCircle,
} from 'lucide-react';
import { exportTabRootToPdf } from './exportPdf';
import { useAuth, useClient } from '../../App';

// Shared number-mask hook. When the dashboard is in demo mode, any visible number renders
// as ##.# / ##; otherwise it renders the real (or demoized) value. Called from every
// subcomponent that displays cohort numbers (ManagerScoringView, QuestionnaireView,
// ParticipantView, AdminDashboard).
function useNumberMask() {
  const { client } = useClient();
  const isDemo = client === 'demo';
  const nm = (v, decimals = 1) => {
    if (isDemo) return decimals > 0 ? '##.#' : '##';
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    return n.toFixed(decimals);
  };
  const intTxt = (v) => (isDemo ? '##' : String(v ?? 0));
  return { isDemo, nm, intTxt };
}
import {
  cohortSummary, subSectionAverages, learnerData,
  bandDistribution, questionAverages,
  publishedAssessments, moduleCohort, appliedJudgementItems,
  tenureSegmentation, teamSizeSegmentation,
  managerLearnerData, managerModuleCohort, managerAppliedJudgementItems,
  managerDurationSegmentation, managerTeamSegmentation,
  managerCohortSummary, managerBandDistribution,
  managerScoringHeader, managerSection2Modules, managerSection2Distribution,
  managerSection2Overall, managerSection3Items, managerSection3Overall,
  managerStrengths, managerImprovements, managerKeyInferences,
  learnerKeyInferences,
  combinedLearnerData, combinedModuleGap, calibrationPriorities,
  confidenceAlignment, bandComparison, combinedCohortSummary,
  uiStrings,
  learnerStrengths, learnerChallenges, learnerNarrativePatterns,
  teamSizeBreakdown, teamSizeMatrix, teamSizeNarrative,
  userAssessments,
} from '../../data/assessmentData';

/* ─── Derivation helpers — collapse moduleCohort/cohortSummary into the per-tile numbers
       that previously sat as JSX literals. All values come from API-loaded snapshots. ─── */
const pctTo5 = (pct) => Math.round((pct / 20) * 100) / 100;
const pctTo10 = (pct) => Math.round((pct / 10) * 100) / 100;

function deriveLearnerExecSummary() {
  const N = cohortSummary.totalRespondents || learnerData.length;
  // Cohort S2 (Knowledge) on /50 scale = sum of per-module knowledge% / 10
  const s2OutOf50 = Math.round(
    (moduleCohort.reduce((acc, m) => acc + (m.knowledge || 0), 0) / 10) * 10,
  ) / 10;
  // Cohort S3 (Applied Judgement) on /25 scale = sum of per-item avg5
  const s3OutOf25 = Math.round(
    appliedJudgementItems.reduce((acc, it) => acc + (it.avg5 || 0), 0) * 10,
  ) / 10;
  const totalOutOf75 = Math.round((s2OutOf50 + s3OutOf25) * 10) / 10;
  // Strongest / weakest module by knowledge
  const sortedByKnow = [...moduleCohort].sort((a, b) => b.knowledge - a.knowledge);
  const strongest = sortedByKnow[0] || { module: '—', knowledge: 0 };
  const weakest = sortedByKnow[sortedByKnow.length - 1] || { module: '—', knowledge: 0 };
  // Largest absolute knowledge→confidence gap (gap field is confidence − knowledge)
  const largestGapModule = [...moduleCohort].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0]
    || { module: '—', knowledge: 0, confidence: 0, gap: 0 };
  // Dominant tenure group
  const dominantTenure = [...tenureSegmentation].sort((a, b) => b.count - a.count)[0];
  const tenurePct = dominantTenure ? Math.round((dominantTenure.count / N) * 100) : 0;
  return {
    N,
    s2OutOf50,
    s3OutOf25,
    totalOutOf75,
    strongest: { name: strongest.module, knowledge5: pctTo5(strongest.knowledge) },
    weakest:  { name: weakest.module,   knowledge5: pctTo5(weakest.knowledge)   },
    largestGap: {
      name: largestGapModule.module,
      knowledge5: pctTo5(largestGapModule.knowledge),
      confidence5: pctTo5(largestGapModule.confidence),
      delta: Math.round((largestGapModule.knowledge - largestGapModule.confidence) / 20 * 100) / 100,
    },
    tenureLine: dominantTenure ? `${tenurePct}% tenure ${dominantTenure.group}` : '',
  };
}

/* ─── CSV Export helper ─── */
function exportToCSV(filename, headers, rows) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

const exportBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', border: '1px solid #2A2A38', borderRadius: 8,
  background: '#1A1A24', color: '#F4F4F8', fontSize: '0.76rem', fontWeight: 600,
  cursor: 'pointer', transition: 'all 0.15s',
};

/* ─── colour helpers ─── */
const barColor = (val) => (val >= 3.25 ? '#2DD4BF' : val >= 2.75 ? '#FFB547' : '#FB7185');
const bandColor = (band) =>
  (band === 'High' || band === 'High Effectiveness') ? '#2DD4BF'
  : (band === 'Mid' || band === 'Developing') ? '#FFB547'
  : '#FB7185';
const bandBg = (band) =>
  (band === 'High' || band === 'High Effectiveness') ? 'rgba(45,212,191,0.1)'
  : (band === 'Mid' || band === 'Developing') ? 'rgba(255,181,71,0.1)'
  : 'rgba(251,113,133,0.1)';

/* ─── shared styles ─── */
const card = {
  background: 'linear-gradient(180deg, #1A1A24 0%, #16161F 100%)',
  borderRadius: '14px',
  boxShadow: '0 4px 18px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.2)',
  padding: '1.05rem',
  border: '1px solid #2A2A38',
};
const sectionTitle = {
  fontSize: '1.2rem',
  fontWeight: 700,
  color: '#F4F4F8',
  marginBottom: '0.85rem',
  paddingBottom: '0.55rem',
  borderBottom: '1px solid #2A2A38',
  letterSpacing: '-0.005em',
};

/* ─── Circular progress (SVG) ─── */
function CircularProgress({ value, max }) {
  const pct = value / max;
  const r = 30;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={76} height={76} viewBox="0 0 76 76">
      <circle cx={38} cy={38} r={r} fill="none" stroke="#2A2A38" strokeWidth={6} />
      <circle
        cx={38} cy={38} r={r} fill="none"
        stroke="#F4F4F8" strokeWidth={6}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 38 38)"
      />
      <text x={38} y={42} textAnchor="middle" fontSize={14} fontWeight={700} fill="#F4F4F8">
        {value}
      </text>
    </svg>
  );
}

/* ─── Custom bar-shape for coloured bars ─── */
const ColouredBar = (props) => {
  const { x, y, width, height, payload } = props;
  return <rect x={x} y={y} width={width} height={height} rx={4} fill={barColor(payload?.average ?? payload?.learnerAvg ?? 0)} />;
};

/* ─── Shared dark-theme chart props ─── */
const tickStyle = { fill: '#B4B4C4', fontFamily: "'Poppins', system-ui, sans-serif" };
const tooltipContent = {
  background: '#232331',
  border: '1px solid #2A2A38',
  borderRadius: 8,
  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
  color: '#F4F4F8',
  fontFamily: "'Poppins', system-ui, sans-serif",
  fontSize: '0.78rem',
  padding: '8px 10px',
};
const tooltipLabel = { color: '#F4F4F8', fontWeight: 600, marginBottom: 2 };
const tooltipItem = { color: '#B4B4C4' };
const hoverCursor = { fill: 'rgba(124,92,255,0.10)' };
const barLabelStyle = { fill: '#F4F4F8', fontWeight: 600 };


/* ─── AI-derived insights panel ─── */
const insightStyles = {
  wrap: {
    background: 'linear-gradient(135deg, rgba(124,92,255,0.10) 0%, rgba(0,212,255,0.06) 100%)',
    border: '1px solid rgba(124,92,255,0.35)',
    borderRadius: 16,
    padding: '1.4rem 1.5rem 1.5rem',
    marginBottom: '2rem',
    position: 'relative',
    overflow: 'hidden',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    borderRadius: 999,
    background: 'linear-gradient(135deg, #7C5CFF, #00D4FF)',
    color: '#FFFFFF',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 14,
    boxShadow: '0 2px 12px rgba(124,92,255,0.35)',
  },
  title: { fontSize: '1.15rem', fontWeight: 700, color: '#F4F4F8', marginBottom: 6, letterSpacing: '-0.005em' },
  summary: { fontSize: '0.95rem', color: '#B4B4C4', lineHeight: 1.6, marginBottom: 18 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 },
  card: {
    background: 'rgba(20,20,28,0.55)',
    border: '1px solid #2A2A38',
    borderRadius: 12,
    padding: '0.9rem 1.05rem',
  },
  cardLabel: { fontSize: '0.75rem', fontWeight: 700, color: '#9B83FF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 },
  cardText: { fontSize: '0.9rem', color: '#F4F4F8', lineHeight: 1.55 },
  bullet: { display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 },
  dot: (color) => ({ width: 7, height: 7, borderRadius: '50%', background: color, marginTop: 9, flexShrink: 0 }),
};

function AIInsights({ title, summary, cards }) {
  return (
    <div style={insightStyles.wrap} className="reveal reveal-scale">
      <div style={insightStyles.badge} className="animate-float">✨ AI-derived insights</div>
      <div style={insightStyles.title}>{title}</div>
      <div style={insightStyles.summary}>{summary}</div>
      <div style={insightStyles.grid} className="stagger">
        {cards.map((c, i) => (
          <div key={i} style={insightStyles.card} className="hover-lift">
            <div style={{ ...insightStyles.cardLabel, color: c.color || '#9B83FF' }}>{c.label}</div>
            {Array.isArray(c.items) ? (
              c.items.map((b, j) => (
                <div key={j} style={insightStyles.bullet}>
                  <span style={insightStyles.dot(c.color || '#9B83FF')} />
                  <span style={insightStyles.cardText}>{b}</span>
                </div>
              ))
            ) : (
              <div style={insightStyles.cardText}>{c.text}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Questionnaire content (from NM_Pre-Program_Self-assessment_Learner_Revised.docx) ─── */
const QUESTIONNAIRE = {
  intro:
    'This assessment is designed to help you reflect on your current managerial capabilities across key areas that will be covered in the upcoming learning journey. It is not an evaluation, but a self-awareness tool to identify strengths and development areas. Please respond honestly based on your current behavior and real work situations.',
  uses: [
    'Personalize the learning experience',
    'Measure your growth through a pre & post comparison',
    'Enable focused development and application',
  ],
  section1: {
    title: 'Section 1 · Learner Details',
    fields: [
      { label: 'Name', type: 'text' },
      { label: 'Department / Function', type: 'text' },
      {
        label: 'Tenure in Managerial Role',
        type: 'choice',
        options: ['< 6 months', '6 months – 1 year', '1 – 3 years', '3+ years'],
      },
      {
        label: 'Team Size',
        type: 'choice',
        options: ['NA', '1–3', '4–6', '7–10', '10+'],
      },
    ],
  },
  modules: [
    {
      name: 'Creating Constant Momentum',
      questions: [
        {
          q: 'What is the most effective way to ensure team alignment with business goals?',
          options: [
            'Share goals once at the start',
            'Clearly cascade goals into team deliverables',
            'Let team members define their own goals',
            'Focus only on individual performance',
          ],
          correct: -1,
        },
        {
          q: 'Which of the following best drives execution consistency?',
          options: [
            'Frequent informal discussions',
            'Clear tracking and follow-ups',
            'Delegating everything',
            'Avoiding micro-management',
          ],
          correct: -1,
        },
      ],
      confidence:
        'How confident do you feel in creating clear alignment and momentum within your team?',
    },
    {
      name: 'Impactful Leadership Conversations',
      questions: [
        {
          q: 'What is key to an effective leadership conversation?',
          options: ['Speaking more', 'Clear intent and preparation', 'Avoiding difficult topics', 'Giving instructions'],
          correct: -1,
        },
        {
          q: 'Effective feedback should primarily focus on:',
          options: ['Personality', 'Behavior and impact', 'Past mistakes', 'General impressions'],
          correct: -1,
        },
      ],
      confidence:
        'How confident are you in handling difficult or performance-related conversations?',
    },
    {
      name: 'Influence Without Authority',
      questions: [
        {
          q: 'What is the most effective way to influence stakeholders?',
          options: ['Authority', 'Building trust and credibility', 'Escalation', 'Forcing decisions'],
          correct: -1,
        },
        {
          q: 'Stakeholder mapping helps in:',
          options: ['Identifying reporting lines', 'Prioritizing engagement', 'Delegating tasks', 'Evaluating performance'],
          correct: -1,
        },
      ],
      confidence:
        'How confident are you in influencing stakeholders without authority?',
    },
    {
      name: 'Managing Priorities & Delegation',
      questions: [
        {
          q: 'Effective prioritization is based on:',
          options: ['Urgency only', 'Importance and urgency', 'Personal preference', 'Manager instructions'],
          correct: -1,
        },
        {
          q: 'Delegation is effective when:',
          options: [
            'Task is assigned quickly',
            'Clear ownership and expectations are set',
            'Manager monitors everything',
            'Work is shared equally',
          ],
          correct: -1,
        },
      ],
      confidence: 'How confident are you in delegating tasks effectively?',
    },
    {
      name: 'Empowerment & Managerial Mindset',
      questions: [
        {
          q: 'Empowerment means:',
          options: ['Giving full control', 'Defining decision boundaries', 'Avoiding involvement', 'Delegating everything'],
          correct: -1,
        },
        {
          q: 'A manager demonstrates the right mindset by:',
          options: ['Doing tasks independently', 'Managing outcomes through the team', 'Monitoring closely', 'Avoiding risks'],
          correct: -1,
        },
      ],
      confidence:
        'How confident are you in empowering your team and building ownership?',
    },
  ],
  applied: [
    'When priorities are unclear, I ensure alignment before execution begins',
    'When faced with a difficult conversation, I prepare and address it proactively',
    'When stakeholders resist, I try to understand their perspective before responding',
    'When my team struggles with a task, I tend to take it back and complete it myself (reverse scored)',
    'I actively create opportunities for my team to take ownership and make decisions',
  ],
  reflection: [
    'What are your top 2 strengths as a manager today?',
    'What are your top 2 challenges in managing your team or stakeholders?',
    'Share one real situation where you felt you could have handled a managerial responsibility better. What would you do differently now?',
  ],
  levels: [
    { level: 'Level 3 · High Effectiveness', desc: 'Strong readiness; demonstrates capability', color: '#2DD4BF' },
    { level: 'Level 2 · Developing', desc: 'Moderate capability; needs refinement', color: '#FFB547' },
    { level: 'Level 1 · Emerging', desc: 'Early stage; requires focused development', color: '#FB7185' },
  ],
};

/* ─── Manager Questionnaire content (from NM_Pre-Program Skill Assessment_Manager of Learner_Revised.docx) ─── */
const MANAGER_QUESTIONNAIRE = {
  intro:
    'This assessment is designed to capture your observations of your team member’s (learner’s) current managerial effectiveness across key capability areas. Please respond based on recent, observable behavior (last 2–3 months) and not intent or potential.',
  uses: [
    'Help establish a baseline of observable behaviors',
    'Support customization of the learning journey',
    'Enable credible pre–post impact measurement',
  ],
  section1: {
    title: 'Section 1 · Learner Details',
    fields: [
      { label: 'Learner Name', type: 'text' },
      { label: 'Manager Name', type: 'text' },
      { label: 'Department / Function', type: 'text' },
      {
        label: 'Duration of Working Together',
        type: 'choice',
        options: ['< 3 months', '3 - 6 months', '6 – 12 months', '12+ months'],
      },
      {
        label: 'Team Size Managed by Learner',
        type: 'choice',
        options: ['1–3', '4–6', '7–10', '10+'],
      },
    ],
  },
  capabilityScale: '1 = Rarely Observed · 2 = Sometimes · 3 = Often · 4 = Consistently',
  modules: [
    {
      name: 'Creating Constant Momentum',
      items: [
        'Translates business goals into clear team priorities and actions',
        'Tracks progress and ensures follow-through on deliverables',
        'Runs structured meetings that drive accountability',
      ],
      confidence:
        'How confident are you in this learner’s ability to drive alignment and execution momentum?',
    },
    {
      name: 'Impactful Leadership Conversations',
      items: [
        'Prepares for important conversations with clarity and intent',
        'Communicates feedback in a clear and constructive manner',
        'Handles difficult conversations effectively and timely',
      ],
      confidence:
        'How confident are you in this learner’s ability to handle leadership conversations effectively?',
    },
    {
      name: 'Influence Without Authority',
      items: [
        'Builds credibility and trust with stakeholders',
        'Influences decisions without relying on formal authority',
        'Manages resistance and aligns stakeholders effectively',
      ],
      confidence:
        'How confident are you in this learner’s ability to influence stakeholders?',
    },
    {
      name: 'Managing Priorities & Delegation',
      items: [
        'Prioritizes work based on business impact and urgency',
        'Delegates tasks with clear expectations and ownership',
        'Ensures ownership remains with the team (avoids reverse delegation)',
      ],
      confidence:
        'How confident are you in this learner’s ability to manage tasks and delegate effectively?',
    },
    {
      name: 'Empowerment & Managerial Mindset',
      items: [
        'Provides team members with clarity on decision-making boundaries',
        'Demonstrates focus on managing outcomes rather than doing tasks',
        'Builds ownership and accountability within the team',
      ],
      confidence:
        'How confident are you in this learner’s ability to empower the team and demonstrate the right managerial mindset?',
    },
  ],
  applied: [
    'The learner ensures alignment and clarity before initiating execution',
    'The learner addresses performance concerns proactively and constructively',
    'The learner adapts approach to influence stakeholders effectively',
    'The learner tends to take back tasks when the team struggles (reverse scored)',
    'The learner creates opportunities for team members to take ownership',
  ],
  reflection: [
    'What are the learner’s top 2 strengths as a manager?',
    'What are the key areas of improvement for this learner?',
    'Share one example where the learner could have handled a situation more effectively. What could they have done differently?',
  ],
  levels: [
    { level: 'Level 3 · High Effectiveness', desc: 'Strong, consistent demonstration of managerial behaviors', color: '#2DD4BF' },
    { level: 'Level 2 · Developing', desc: 'Inconsistent demonstration; needs improvement', color: '#FFB547' },
    { level: 'Level 1 · Emerging', desc: 'Limited observable capability', color: '#FB7185' },
  ],
};

function QuestionnaireView({ initialSelected = null, hideTabs = false } = {}) {
  const navigate = useNavigate();
  const { nm, intTxt, isDemo } = useNumberMask();
  // When mounted from the detail route, `initialSelected` ('learner' | 'manager') skips the picker.
  // When mounted from the Questionnaire dashboard tab, `selected` starts as null → picker is shown.
  const [selected] = useState(initialSelected);

  // Re-arm scroll-reveal when content swaps.
  useScrollReveal(null, [selected]);

  const qCard = {
    background: 'linear-gradient(180deg, #1A1A24 0%, #16161F 100%)',
    border: '1px solid #2A2A38',
    borderRadius: 14,
    padding: '1.2rem 1.4rem',
    boxShadow: '0 4px 18px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.2)',
    marginBottom: '1.25rem',
  };
  // (No sub-tabs — top-level navigation is via the picker cards / dedicated routes.)
  const subTabs = null;

  // ── Picker view: two cards that navigate to dedicated routes ──
  if (!hideTabs && !selected) {
    const pickerCard = (accent) => ({
      background: 'linear-gradient(180deg, #1A1A24 0%, #16161F 100%)',
      border: '1px solid ' + accent + '55',
      borderRadius: 16,
      padding: '1.6rem 1.6rem 1.5rem',
      boxShadow: '0 8px 28px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
      display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200,
    });
    const pickerBadge = (color) => ({
      display: 'inline-block',
      fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      color, background: color + '22', border: '1px solid ' + color + '55',
      padding: '4px 10px', borderRadius: 999, width: 'fit-content',
    });

    return (
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div
            className="animate-fade-in-up"
            style={pickerCard('#9B83FF')}
            onClick={() => navigate('/user/questionnaire/learner')}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#9B83FFaa'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#9B83FF55'; }}
          >
            <div style={pickerBadge('#9B83FF')}>Pre-Program</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F4F4F8', letterSpacing: '-0.01em' }}>
              Learner Questionnaire
            </div>
            <div style={{ fontSize: '0.84rem', color: '#B4B4C4', lineHeight: 1.55 }}>
              Self-assessment for learners across knowledge, applied judgement, and reflection — sourced from the NM Pre-Program Self-Assessment document.
            </div>
            <div style={{ marginTop: 'auto', fontSize: '0.74rem', color: '#9B83FF', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              View questionnaire →
            </div>
          </div>

          <div
            className="animate-fade-in-up"
            style={pickerCard('#00D4FF')}
            onClick={() => navigate('/user/questionnaire/manager')}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#00D4FFaa'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#00D4FF55'; }}
          >
            <div style={pickerBadge('#00D4FF')}>Pre-Program</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F4F4F8', letterSpacing: '-0.01em' }}>
              Manager Questionnaire
            </div>
            <div style={{ fontSize: '0.84rem', color: '#B4B4C4', lineHeight: 1.55 }}>
              Manager perspective on the learner's capability across the same competencies — sourced from the NM Pre-Program Manager Assessment document.
            </div>
            <div style={{ marginTop: 'auto', fontSize: '0.74rem', color: '#00D4FF', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              View questionnaire →
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Manager Questionnaire ──
  if (selected === 'manager') {
    const mgrModuleHead = {
      fontSize: '0.95rem',
      fontWeight: 700,
      color: '#F4F4F8',
      marginBottom: '0.5rem',
      letterSpacing: '-0.005em',
    };
    const mgrQNum = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 22, height: 22, borderRadius: 6,
      background: 'rgba(0,212,255,0.18)',
      color: '#5EE4FF',
      fontSize: 11, fontWeight: 700,
      marginRight: 8, flexShrink: 0,
    };
    const mgrConfBox = {
      marginTop: 12,
      padding: '10px 12px',
      background: 'rgba(0,212,255,0.06)',
      border: '1px solid rgba(0,212,255,0.25)',
      borderRadius: 8,
      fontSize: '0.78rem',
      color: '#B4B4C4',
    };
    const mgrConfLabel = { color: '#00D4FF', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'block' };
    const sectionBadgeMgr = (color) => ({
      display: 'inline-block',
      fontSize: '0.62rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color,
      background: color + '22',
      border: '1px solid ' + color + '55',
      padding: '4px 10px',
      borderRadius: 999,
      marginBottom: 10,
    });

    return (
      <div style={{ marginBottom: '2rem' }}>
        {subTabs}

        {/* Intro */}
        <div className="animate-fade-in-up" style={qCard}>
          <div style={sectionBadgeMgr('#00D4FF')}>Pre-Program Manager Assessment</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F4F4F8', marginBottom: 6 }}>
            N.E.W.S.® FTM Global Certificate Program
          </div>
          <div style={{ fontSize: '0.82rem', color: '#B4B4C4', lineHeight: 1.6, marginBottom: 12 }}>
            {MANAGER_QUESTIONNAIRE.intro}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#71717F', fontWeight: 600, marginBottom: 6 }}>Your input will:</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: '#B4B4C4', lineHeight: 1.7 }}>
            {MANAGER_QUESTIONNAIRE.uses.map((u) => <li key={u}>{u}</li>)}
          </ul>
        </div>

        {/* Section 1 - Learner Details */}
        <div className="animate-fade-in-up" style={qCard}>
          <div style={sectionBadgeMgr('#00D4FF')}>Section 1</div>
          <div style={mgrModuleHead}>Learner Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 10 }}>
            {MANAGER_QUESTIONNAIRE.section1.fields.map((f) => (
              <div key={f.label} style={{ padding: '10px 12px', background: '#14141C', border: '1px solid #2A2A38', borderRadius: 8 }}>
                <div style={{ fontSize: '0.7rem', color: '#71717F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{f.label}</div>
                {f.type === 'text' ? (
                  <div style={{ fontSize: '0.82rem', color: '#71717F', fontStyle: 'italic' }}>Free text</div>
                ) : (
                  <div style={{ fontSize: '0.76rem', color: '#B4B4C4', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {f.options.map((o) => (
                      <span key={o} style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(0,212,255,0.10)', border: '1px solid rgba(0,212,255,0.25)', color: '#5EE4FF', fontSize: '0.7rem', fontWeight: 600 }}>{o}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 2 - Observed Capability */}
        <div className="reveal" style={qCard}>
          <div style={sectionBadgeMgr('#00D4FF')}>Section 2</div>
          <div style={mgrModuleHead}>Observed Capability</div>
          <div style={{ fontSize: '0.76rem', color: '#B4B4C4', marginTop: 4 }}>
            <span style={{ color: '#5EE4FF', fontWeight: 600 }}>Rating scale:</span> {MANAGER_QUESTIONNAIRE.capabilityScale}
          </div>
        </div>

        {MANAGER_QUESTIONNAIRE.modules.map((mod, mi) => (
          <div key={mod.name} className="reveal" style={qCard}>
            <div style={mgrModuleHead}>{mod.name}</div>

            {mod.items.map((item, ii) => (
              <div key={ii} style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 0', borderTop: ii ? '1px solid #2A2A38' : 'none' }}>
                <span style={mgrQNum}>{ii + 1}</span>
                <div style={{ fontSize: '0.82rem', color: '#F4F4F8', lineHeight: 1.5, flex: 1 }}>{item}</div>
              </div>
            ))}

            <div style={mgrConfBox}>
              <span style={mgrConfLabel}>Confidence</span>
              {mod.confidence} <span style={{ color: '#71717F' }}>(1 = Not confident · 5 = Highly confident)</span>
            </div>
          </div>
        ))}

        {/* Section 3 - Applied Judgement */}
        <div className="reveal" style={qCard}>
          <div style={sectionBadgeMgr('#FFB547')}>Section 3</div>
          <div style={mgrModuleHead}>Applied Judgement</div>
          <div style={{ fontSize: '0.76rem', color: '#B4B4C4', marginBottom: 12 }}>
            <span style={{ color: '#FFCD7A', fontWeight: 600 }}>Scale:</span> 1 = Rarely · 2 = Sometimes · 3 = Often · 4 = Consistently
          </div>
          {MANAGER_QUESTIONNAIRE.applied.map((q, i) => {
            const reverse = /reverse/i.test(q);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 0', borderTop: i ? '1px solid #2A2A38' : 'none' }}>
                <span style={mgrQNum}>{i + 1}</span>
                <div style={{ fontSize: '0.82rem', color: '#F4F4F8', lineHeight: 1.5, flex: 1 }}>
                  {q.replace(/\s*\(reverse scored\)/i, '')}
                  {reverse && (
                    <span style={{
                      marginLeft: 8,
                      fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: '#FB7185', background: 'rgba(251,113,133,0.12)', border: '1px solid rgba(251,113,133,0.3)',
                      padding: '2px 8px', borderRadius: 999, verticalAlign: 'middle',
                    }}>Reverse Scored</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Section 4 - Qualitative Observation */}
        <div className="reveal" style={qCard}>
          <div style={sectionBadgeMgr('#00D4FF')}>Section 4</div>
          <div style={mgrModuleHead}>Qualitative Observation</div>
          {MANAGER_QUESTIONNAIRE.reflection.map((q, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 0', borderTop: i ? '1px solid #2A2A38' : 'none' }}>
              <span style={mgrQNum}>{i + 1}</span>
              <div style={{ fontSize: '0.82rem', color: '#F4F4F8', lineHeight: 1.55, flex: 1 }}>{q}</div>
            </div>
          ))}
        </div>

        {/* Performance levels */}
        <div className="reveal" style={qCard}>
          <div style={sectionBadgeMgr('#2DD4BF')}>Performance Levels</div>
          <div style={mgrModuleHead}>How responses are interpreted</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 10 }}>
            {MANAGER_QUESTIONNAIRE.levels.map((lvl) => (
              <div key={lvl.level} style={{
                padding: '12px 14px',
                background: lvl.color + '11',
                border: '1px solid ' + lvl.color + '44',
                borderRadius: 10,
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F4F4F8', marginBottom: 3 }}>{lvl.level}</div>
                <div style={{ fontSize: '0.74rem', color: '#B4B4C4', lineHeight: 1.5 }}>{lvl.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Learner Questionnaire (existing content) ──
  const moduleHead = {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#F4F4F8',
    marginBottom: '0.5rem',
    letterSpacing: '-0.005em',
  };
  const qNum = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22, height: 22, borderRadius: 6,
    background: 'rgba(124,92,255,0.18)',
    color: '#9B83FF',
    fontSize: 11, fontWeight: 700,
    marginRight: 8, flexShrink: 0,
  };
  const qText = { fontSize: '0.86rem', fontWeight: 600, color: '#F4F4F8', lineHeight: 1.5 };
  const optionRow = (isCorrect) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: '0.8rem',
    color: isCorrect ? '#5EEAD4' : '#B4B4C4',
    background: isCorrect ? 'rgba(45,212,191,0.08)' : 'transparent',
    border: isCorrect ? '1px solid rgba(45,212,191,0.3)' : '1px solid transparent',
    marginBottom: 4,
  });
  const dot = (isCorrect) => ({
    width: 14, height: 14, borderRadius: '50%',
    border: '1.5px solid ' + (isCorrect ? '#2DD4BF' : '#3A3A4A'),
    background: isCorrect ? '#2DD4BF' : 'transparent',
    flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  });
  const confBox = {
    marginTop: 12,
    padding: '10px 12px',
    background: 'rgba(0,212,255,0.06)',
    border: '1px solid rgba(0,212,255,0.25)',
    borderRadius: 8,
    fontSize: '0.78rem',
    color: '#B4B4C4',
  };
  const confLabel = { color: '#00D4FF', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'block' };
  const sectionBadge = (color) => ({
    display: 'inline-block',
    fontSize: '0.62rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color,
    background: color + '22',
    border: '1px solid ' + color + '55',
    padding: '4px 10px',
    borderRadius: 999,
    marginBottom: 10,
  });

  return (
    <div style={{ marginBottom: '2rem' }}>
      {subTabs}
      {/* Intro — visible immediately, no scroll-reveal */}
      <div className="animate-fade-in-up" style={qCard}>
        <div style={sectionBadge('#9B83FF')}>Pre-Program Self-Assessment</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F4F4F8', marginBottom: 6 }}>
          N.E.W.S.® FTM Global Certificate Program
        </div>
        <div style={{ fontSize: '0.82rem', color: '#B4B4C4', lineHeight: 1.6, marginBottom: 12 }}>
          {QUESTIONNAIRE.intro}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#71717F', fontWeight: 600, marginBottom: 6 }}>Your responses will be used to:</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: '#B4B4C4', lineHeight: 1.7 }}>
          {QUESTIONNAIRE.uses.map((u) => <li key={u}>{u}</li>)}
        </ul>
      </div>

      {/* Section 1 - Learner Details — also visible by default */}
      <div className="animate-fade-in-up" style={qCard}>
        <div style={sectionBadge('#9B83FF')}>Section 1</div>
        <div style={moduleHead}>Learner Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 10 }}>
          {QUESTIONNAIRE.section1.fields.map((f) => (
            <div key={f.label} style={{ padding: '10px 12px', background: '#14141C', border: '1px solid #2A2A38', borderRadius: 8 }}>
              <div style={{ fontSize: '0.7rem', color: '#71717F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{f.label}</div>
              {f.type === 'text' ? (
                <div style={{ fontSize: '0.82rem', color: '#71717F', fontStyle: 'italic' }}>Free text</div>
              ) : (
                <div style={{ fontSize: '0.76rem', color: '#B4B4C4', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {f.options.map((o) => (
                    <span key={o} style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(124,92,255,0.10)', border: '1px solid rgba(124,92,255,0.25)', color: '#9B83FF', fontSize: '0.7rem', fontWeight: 600 }}>{o}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 - Knowledge & Awareness */}
      <div className="reveal" style={{ ...qCard, padding: '1.2rem 1.4rem' }}>
        <div style={sectionBadge('#9B83FF')}>Section 2</div>
        <div style={moduleHead}>Knowledge & Awareness</div>
      </div>

      {QUESTIONNAIRE.modules.map((mod, mi) => (
        <div key={mod.name} className="reveal" style={qCard}>
          <div style={moduleHead}>{mod.name}</div>

          {mod.questions.map((q, qi) => (
            <div key={qi} style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={qNum}>{qi + 1}</span>
                <div style={qText}>{q.q}</div>
              </div>
              <div style={{ paddingLeft: 30 }}>
                {q.options.map((opt, oi) => {
                  const isCorrect = oi === q.correct;
                  return (
                    <div key={oi} style={optionRow(isCorrect)}>
                      <span style={dot(isCorrect)}>
                        {isCorrect && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4.2L3.2 5.8L6.5 2.2" stroke="#0A0A0F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span>{opt}</span>
                      {isCorrect && (
                        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700, color: '#2DD4BF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Best</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={confBox}>
            <span style={confLabel}>Confidence</span>
            {mod.confidence} <span style={{ color: '#71717F' }}>(1 = Not confident · 5 = Highly confident)</span>
          </div>
        </div>
      ))}

      {/* Section 3 - Applied Judgement */}
      <div className="reveal" style={qCard}>
        <div style={sectionBadge('#FFB547')}>Section 3</div>
        <div style={moduleHead}>Applied Judgement</div>
        <div style={{ fontSize: '0.76rem', color: '#B4B4C4', marginBottom: 12 }}>
          <span style={{ color: '#FFCD7A', fontWeight: 600 }}>Scale:</span> 1 = Rarely · 2 = Sometimes · 3 = Often · 4 = Consistently · 5 = Always
        </div>
        {QUESTIONNAIRE.applied.map((q, i) => {
          const reverse = /reverse/i.test(q);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 0', borderTop: i ? '1px solid #2A2A38' : 'none' }}>
              <span style={qNum}>{i + 1}</span>
              <div style={{ fontSize: '0.82rem', color: '#F4F4F8', lineHeight: 1.5, flex: 1 }}>
                {q.replace(/\s*\(reverse scored\)/i, '')}
                {reverse && (
                  <span style={{
                    marginLeft: 8,
                    fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: '#FB7185', background: 'rgba(251,113,133,0.12)', border: '1px solid rgba(251,113,133,0.3)',
                    padding: '2px 8px', borderRadius: 999, verticalAlign: 'middle',
                  }}>Reverse Scored</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Section 4 - Open Reflection */}
      <div className="reveal" style={qCard}>
        <div style={sectionBadge('#00D4FF')}>Section 4</div>
        <div style={moduleHead}>Open Reflection</div>
        {QUESTIONNAIRE.reflection.map((q, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 0', borderTop: i ? '1px solid #2A2A38' : 'none' }}>
            <span style={qNum}>{i + 1}</span>
            <div style={{ fontSize: '0.82rem', color: '#F4F4F8', lineHeight: 1.55, flex: 1 }}>{q}</div>
          </div>
        ))}
      </div>

      {/* Performance levels */}
      <div className="reveal" style={qCard}>
        <div style={sectionBadge('#2DD4BF')}>Performance Levels</div>
        <div style={moduleHead}>How responses are interpreted</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 10 }}>
          {QUESTIONNAIRE.levels.map((lvl) => (
            <div key={lvl.level} style={{
              padding: '12px 14px',
              background: lvl.color + '11',
              border: '1px solid ' + lvl.color + '44',
              borderRadius: 10,
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F4F4F8', marginBottom: 3 }}>{lvl.level}</div>
              <div style={{ fontSize: '0.74rem', color: '#B4B4C4', lineHeight: 1.5 }}>{lvl.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ MANAGER VIEW (scoring rubric) ═══════════════
   Recreates the manager dashboard from the revised scoring rubric:
   Section 2 modules /10, Section 3 applied-judgement /4 (Q4 reverse),
   manager confidence /5, strengths & improvements, key inferences. */
/* Rating-bucket colour set used by Section 2 donuts + the overall rollup tiles.
   Mirrors the screenshot palette: muted grey, blue, mid-green, dark-green. */
const RATING_COLORS = {
  Rarely:       '#A9B6BD',
  Sometimes:    '#3B82F6',
  Often:        '#10B981',
  Consistently: '#047857',
};
const RATING_ORDER = ['Rarely', 'Sometimes', 'Often', 'Consistently'];

function RatingBucketTile({ bucket }) {
  const color = RATING_COLORS[bucket.label.split(' ')[0]] || '#9B83FF';
  return (
    <div style={{
      background: '#14141C', border: '1px solid #2A2A38', borderRadius: 12,
      padding: '1rem 1.1rem', textAlign: 'center', flex: '1 1 0',
    }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1.1 }}>{bucket.count}</div>
      <div style={{ fontSize: '0.78rem', color: '#B4B4C4', marginTop: 8, fontWeight: 600 }}>
        {bucket.rating} — {bucket.label}
      </div>
      <div style={{ fontSize: '0.78rem', color, marginTop: 4, fontWeight: 600 }}>
        {nm(bucket.pct)}%
      </div>
    </div>
  );
}

function ManagerScoringView({ onExportPdf, pdfBusy }) {
  const { nm, intTxt, isDemo } = useNumberMask();
  const hdr = managerScoringHeader;
  const maxStrength    = Math.max(...managerStrengths.map(s => s.count));
  const maxImprovement = Math.max(...managerImprovements.map(s => s.count));

  // Colour rules
  const obsColor  = (v) => (v >= 7.5 ? '#2DD4BF' : v >= 7.0 ? '#60A5FA' : '#F59E0B');
  const confColor = (v) => (v >= 3.25 ? '#2DD4BF' : v >= 3.0 ? '#60A5FA' : '#F59E0B');
  const ajColor   = (v, rev) => rev ? '#FB7185' : (v >= 2.95 ? '#2DD4BF' : v >= 2.85 ? '#60A5FA' : '#F59E0B');

  const bar = (pct, color) => (
    <div style={{ position: 'relative', width: 140, height: 8, background: '#2A2A38', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, width: `${Math.max(0, Math.min(100, pct))}%`,
        background: color, borderRadius: 999, transition: 'width .35s ease',
      }} />
    </div>
  );

  const calcChip = (title, value, lines) => (
    <div style={{
      background: '#14141C', border: '1px solid #2A2A38', borderRadius: 12,
      padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F4F4F8' }}>
        {title} <span style={{ color: '#9B83FF' }}>{value}</span>
      </div>
      {lines.map((l, i) => (
        <div key={i} style={{ fontSize: '0.74rem', color: '#B4B4C4', lineHeight: 1.45 }}>{l}</div>
      ))}
    </div>
  );

  const statTile = (label, big, sub, color) => (
    <div style={{ ...card, padding: '1rem 1.1rem', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: '0.72rem', color: '#B4B4C4', marginBottom: 6, letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#F4F4F8', lineHeight: 1.1 }}>
        {big}
      </div>
      {sub && <div style={{ fontSize: '0.74rem', color: '#71717F', marginTop: 6 }}>{sub}</div>}
    </div>
  );

  return (
    <div id="manager-tab-root">
      {/* ── Header export buttons (hidden in PDF) ── */}
      <div data-pdf-hide="true" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: '1rem' }}>
        <button style={exportBtn} disabled={pdfBusy}
          onClick={() => onExportPdf && onExportPdf('manager-tab-root', 'New Manager Cohort Pre Journey Manager of the Learner Response Analysis', 'new-manager-cohort-manager-response-analysis.pdf')}
          onMouseEnter={e => { if (!pdfBusy) e.currentTarget.style.background = '#0A0A0F'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1A1A24'; }}>
          <Download size={14} /> {pdfBusy ? 'Generating…' : 'Export PDF'}
        </button>
      </div>
      <h2 style={sectionTitle}>
        Executive Summary
      </h2>
      {/* ── Summary tiles ── */}
      <div className="stagger" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.05rem', marginBottom: '2rem',
      }}>
        {statTile('Manager Responses', `${intTxt(managerScoringHeader.managerResponses)} responses`, `${intTxt(managerScoringHeader.uniqueLearners)} unique learners rated`, '#9B83FF')}
        {statTile('Observed Capability (S2)', <>{nm(managerScoringHeader.s2CohortAvg)}<span style={{ fontSize: '0.85rem', color: '#71717F' }}>/{managerScoringHeader.s2Max}</span></>, 'Cohort avg across 5 modules', '#2DD4BF')}
        {statTile('Applied Judgement (S3)', <>{nm(managerScoringHeader.s3CohortAvg)}<span style={{ fontSize: '0.85rem', color: '#71717F' }}>/{managerScoringHeader.s3Max}</span></>, 'Cohort avg across 5 behaviours', '#60A5FA')}
        {statTile('Manager Confidence', <>{nm(managerScoringHeader.managerConfidenceAvg, 2)}<span style={{ fontSize: '0.85rem', color: '#71717F' }}>/{managerScoringHeader.confidenceMax}</span></>, 'Avg across all modules', '#FFB547')}
      </div>

      {/* ── Key Inferences (moved here from bottom) ── */}
      <div className="reveal" style={{ ...card, marginBottom: '1.4rem' }}>
        <h2 style={sectionTitle}>Key Inferences</h2>
        {managerKeyInferences.map((k, i) => {
          const isAlert = k.kind === 'alert';
          const Icon = isAlert ? AlertCircle : Lightbulb;
          const color = isAlert ? '#FB7185' : '#FFCD7A';
          return (
            <div key={i} style={{
              display: 'flex', gap: 14, padding: '14px 0',
              borderTop: i ? '1px solid #1F1F2A' : 'none',
            }}>
              <div style={{
                width: 32, height: 32, flexShrink: 0,
                borderRadius: '50%', background: `${color}1A`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F4F4F8', marginBottom: 6 }}>{k.title}</div>
                <div style={{ fontSize: '0.95rem', color: '#B4B4C4', lineHeight: 1.6 }}>{k.body}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. Qualitative — What Managers See ── */}
      <div className="reveal" style={{ ...card, marginBottom: '1.4rem' }}>
        <h2 style={sectionTitle}>Qualitative — What Managers See</h2>
        <div style={{
          fontSize: '0.88rem', color: '#B4B4C4', lineHeight: 1.65, marginBottom: 18,
          padding: '0.85rem 1rem', background: '#14141C', border: '1px solid #2A2A38', borderRadius: 10,
        }}>
          <strong style={{ color: '#F4F4F8' }}>Inference note:</strong> The following themes are drawn from open-ended manager responses. These are not scores — they are observed patterns that validate and add texture to the quantitative data above.
        </div>
      </div>

      {/* ── Strengths & Improvements ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.05rem', marginBottom: '1.4rem' }}>
        <div style={card}>
          <h2 style={sectionTitle}>What managers cite as strengths <span style={{ fontSize: '0.78rem', color: '#71717F', fontWeight: 500, fontStyle: 'italic' }}>(Times cited)</span></h2>
          {managerStrengths.map((s) => (
            <div key={s.label} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center',
              padding: '0.7rem 0', borderTop: '1px solid #1F1F2A',
            }}>
              <span style={{ fontSize: '0.84rem', color: '#F4F4F8' }}>{s.label}</span>
              {bar((s.count / maxStrength) * 100, '#2DD4BF')}
              <span style={{ minWidth: 22, textAlign: 'right', fontWeight: 700, color: '#F4F4F8' }}>{s.count}</span>
            </div>
          ))}
        </div>
        <div style={card}>
          <h2 style={sectionTitle}>What managers flag as improvements <span style={{ fontSize: '0.78rem', color: '#71717F', fontWeight: 500, fontStyle: 'italic' }}>(Times cited)</span></h2>
          {managerImprovements.map((s) => {
            const color = s.count >= 5 ? '#FB7185' : s.count >= 3 ? '#FFB547' : '#9B83FF';
            return (
              <div key={s.label} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center',
                padding: '0.7rem 0', borderTop: '1px solid #1F1F2A',
              }}>
                <span style={{ fontSize: '0.84rem', color: '#F4F4F8' }}>{s.label}</span>
                {bar((s.count / maxImprovement) * 100, color)}
                <span style={{ minWidth: 22, textAlign: 'right', fontWeight: 700, color: '#F4F4F8' }}>{s.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Observed Capability vs Confidence of the managers ── */}
      {(() => {
        const rows = [
          { id: 'M1', name: 'Creating Constant Momentum',        observed: 6.5, confidence: 3.57 },
          { id: 'M2', name: 'Impactful Leadership Conversations', observed: 6.7, confidence: 3.57 },
          { id: 'M3', name: 'Influence Without Authority',        observed: 8.0, confidence: 3.86 },
          { id: 'M4', name: 'Managing Priorities & Delegation', observed: 7.7, confidence: 3.29 },
          { id: 'M5', name: 'Empowerment & Managerial Mindset',   observed: 7.5, confidence: 3.57 },
        ];
        return (
          <div className="reveal" style={{ ...card, marginBottom: '1.4rem' }}>
            <h2 style={sectionTitle}>Observed Capability vs Confidence of the managers</h2>
            <div style={{
              fontSize: '0.88rem', color: '#B4B4C4', lineHeight: 1.65, marginBottom: 18,
              padding: '0.85rem 1rem', background: '#14141C', border: '1px solid #2A2A38', borderRadius: 10,
            }}>
              <strong style={{ color: '#F4F4F8' }}>Inference note:</strong> The charts below show observed capability scores (out of 10) and manager confidence (out of 5) per module. These are two separate signals — the score reflects what managers observe as behaviour frequency; confidence reflects how ready they believe the learner is to apply it independently. Read them together.
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#14141C' }}>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left',   color: '#B4B4C4', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #2A2A38' }}>Module</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#2DD4BF', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #2A2A38' }}>Observed Score</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#60A5FA', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #2A2A38' }}>Manager Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} style={{ background: i % 2 ? '#14141C' : '#1A1A24' }}>
                      <td style={{ padding: '0.9rem 1rem', color: '#F4F4F8', borderBottom: '1px solid #2A2A38' }}>
                        <span style={{ fontWeight: 700, color: '#F4F4F8' }}>{r.name}</span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'center', borderBottom: '1px solid #2A2A38' }}>
                        <span style={{ fontWeight: 700, color: '#2DD4BF', fontSize: '0.95rem' }}>{nm(r.observed)}</span>
                        <span style={{ fontSize: '0.78rem', color: '#71717F', marginLeft: 4 }}>/ 10</span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'center', borderBottom: '1px solid #2A2A38' }}>
                        <span style={{ fontWeight: 700, color: '#60A5FA', fontSize: '0.95rem' }}>{nm(r.confidence, 2)}</span>
                        <span style={{ fontSize: '0.78rem', color: '#71717F', marginLeft: 4 }}>/ 5</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.1rem', marginTop: 22 }}>
          {managerSection2Distribution.map((mod) => {
            const moduleNum = mod.id.replace('M', '');
            const score = managerSection2Modules.find(x => x.id === mod.id) || { observed: 0, confidence: 0 };
            const observed   = score.observed;     // /10
            const confidence = score.confidence;   // /5
            const obsCol  = '#2DD4BF'; // Knowledge — teal (matches Learner scheme)
            const confCol = '#60A5FA'; // Confidence — blue (matches Manager scheme)

            // Concentric ring data — outer = Observed (filled vs remainder), inner = Confidence
            const obsData  = [{ name: 'Knowledge',  value: observed   }, { name: 'remO', value: 10 - observed   }];
            const confData = [{ name: 'Confidence', value: confidence }, { name: 'remC', value: 5  - confidence }];

            return (
              <div key={mod.id} style={{
                background: '#14141C', border: '1px solid #2A2A38', borderRadius: 12,
                padding: '1rem 1rem 0.9rem',
              }}>
                <div style={{ textAlign: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F4F4F8' }}>{mod.name}</div>
                </div>
                <div style={{ position: 'relative', width: '100%', height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      {/* Outer ring — Knowledge /10 */}
                      <Pie
                        data={obsData} dataKey="value"
                        cx="50%" cy="50%"
                        innerRadius={118} outerRadius={148}
                        startAngle={90} endAngle={-270}
                        stroke="#14141C" strokeWidth={2}
                        label={false} labelLine={false}
                        isAnimationActive={false}
                      >
                        <Cell fill={obsCol} />
                        <Cell fill="#2A2A38" />
                      </Pie>
                      {/* Inner ring — Confidence /5 */}
                      <Pie
                        data={confData} dataKey="value"
                        cx="50%" cy="50%"
                        innerRadius={78} outerRadius={108}
                        startAngle={90} endAngle={-270}
                        stroke="#14141C" strokeWidth={2}
                        label={false} labelLine={false}
                        isAnimationActive={false}
                      >
                        <Cell fill={confCol} />
                        <Cell fill="#22222D" />
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipContent} labelStyle={tooltipLabel} itemStyle={tooltipItem}
                        formatter={(v, n) => {
                          if (n === 'Knowledge')  return [`${v.toFixed(1)} / 10`, 'Knowledge'];
                          if (n === 'Confidence') return [`${v.toFixed(2)} / 5`, 'Manager Confidence'];
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none', flexDirection: 'column',
                    gap: 2,
                  }}>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: obsCol, lineHeight: 1 }}>
                      {nm(observed)}<span style={{ fontSize: '0.85rem', color: '#71717F', marginLeft: 2 }}>/10</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#71717F', letterSpacing: '0.04em', marginTop: 2 }}>Knowledge</div>
                    <div style={{ height: 1, width: 56, background: '#2A2A38', margin: '8px 0' }} />
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: confCol, lineHeight: 1 }}>
                      {nm(confidence, 2)}<span style={{ fontSize: '0.72rem', color: '#71717F', marginLeft: 2 }}>/5</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#71717F', letterSpacing: '0.04em', marginTop: 2 }}>Confidence</div>
                  </div>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'center', gap: 14,
                  marginTop: 10, fontSize: '0.7rem', color: '#B4B4C4',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: obsCol }} />
                    <span>Knowledge /10</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: confCol }} />
                    <span>Confidence /5</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
            <div style={{ fontSize: '0.72rem', color: '#71717F', marginTop: 14, lineHeight: 1.55 }}>
              Outer ring = Knowledge score on a /10 scale. Inner ring = Manager Confidence on a /5 scale. Behavior items rated 1=Rarely to 4=Consistently; confidence rated 1=Not confident to 5=Highly confident. Confidence is not included in the Section 2 score — it is a separate manager signal.
            </div>
          </div>
        );
      })()}

      {/* ── Applied Judgement — Sometimes-most vs Often-to-Consistently ── */}
      {(() => {
        const developRows = [
          { module: 'Creating Constant Momentum',         behaviour: 'Runs structured meetings that drive accountability', avg: 2.29, sometimes: 5, often: 2, consistently: 0 },
          { module: 'Creating Constant Momentum',         behaviour: 'Tracks progress and ensures follow-through',         avg: 2.57, sometimes: 4, often: 2, consistently: 1 },
          { module: 'Impactful Leadership Conversations', behaviour: 'Prepares for conversations with clarity and intent', avg: 2.57, sometimes: 3, often: 4, consistently: 0 },
          { module: 'Impactful Leadership Conversations', behaviour: 'Handles difficult conversations effectively',        avg: 2.57, sometimes: 4, often: 2, consistently: 1 },
          { module: 'Impactful Leadership Conversations', behaviour: 'Communicates feedback constructively',               avg: 2.86, sometimes: 2, often: 4, consistently: 1 },
          { module: 'Managing Priorities & Delegation',   behaviour: 'Ensures ownership stays with the team',              avg: 2.86, sometimes: 3, often: 2, consistently: 2 },
        ];
        const buildRows = [
          { module: 'Influence Without Authority',      behaviour: 'Builds credibility and trust with stakeholders', avg: 3.43, sometimes: 0, often: 4, consistently: 3 },
          { module: 'Managing Priorities & Delegation', behaviour: 'Prioritizes work based on impact and urgency',   avg: 3.43, sometimes: 0, often: 4, consistently: 3 },
          { module: 'Influence Without Authority',      behaviour: 'Influences decisions without formal authority',  avg: 3.00, sometimes: 0, often: 7, consistently: 0 },
          { module: 'Influence Without Authority',      behaviour: 'Manages resistance and aligns stakeholders',     avg: 3.14, sometimes: 0, often: 6, consistently: 1 },
        ];

        const thStyle = {
          padding: '0.6rem 0.8rem', textAlign: 'left', color: '#B4B4C4', fontWeight: 700,
          fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase',
          borderBottom: '1px solid #2A2A38', whiteSpace: 'nowrap',
        };
        const tdStyle = {
          padding: '0.75rem 0.8rem', color: '#F4F4F8', fontSize: '0.84rem',
          borderBottom: '1px solid #1F1F2A', verticalAlign: 'top',
        };
        const tdNumStyle = { ...tdStyle, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 700 };

        const renderTable = (heading, rows, avgColor) => (
          <div style={{ ...card, padding: '1.1rem 1.2rem' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#F4F4F8', marginBottom: 12 }}>{heading}</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Module</th>
                    <th style={thStyle}>Behaviour</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Avg</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Sometimes</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Often</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Consistently</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, color: '#B4B4C4' }}>{r.module}</td>
                      <td style={tdStyle}>{r.behaviour}</td>
                      <td style={{ ...tdNumStyle, color: avgColor }}>{nm(r.avg, 2)}</td>
                      <td style={tdNumStyle}>{r.sometimes}</td>
                      <td style={tdNumStyle}>{r.often}</td>
                      <td style={tdNumStyle}>{r.consistently}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

        return (
          <div className="reveal" style={{ marginBottom: '1.4rem' }}>
            <h2 style={sectionTitle}>
              Applied Judgement <span style={{ fontWeight: 500, color: '#B4B4C4', fontStyle: 'italic' }}>(How managers rate in-context behaviour, 1–4 scale)</span>
            </h2>
            <div style={{
              marginBottom: 14, padding: '0.85rem 1rem',
              background: '#14141C', border: '1px solid #2A2A38', borderRadius: 10,
              fontSize: '0.82rem', color: '#B4B4C4', lineHeight: 1.6,
            }}>
              <strong style={{ color: '#F4F4F8' }}>Inference note:</strong> This section moves beyond module skills to ask — do these learners exercise good judgement in real situations? Q4 is reverse-scored: a high score here is actually a concern.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))', gap: '1.05rem' }}>
              {renderTable('Behaviours rated "Sometimes" most — clearest development areas', developRows, '#FFB547')}
              {renderTable('Behaviours already showing "Often" to "Consistently" — build on these', buildRows, '#2DD4BF')}
            </div>
          </div>
        );
      })()}

    </div>
  );
}

/* ═══════════════ PARTICIPANT VIEW ═══════════════ */
function ParticipantView() {
  const { nm, intTxt, isDemo } = useNumberMask();
  const bandFor = (total75) => {
    if (total75 >= 75) return 'High Effectiveness';
    if (total75 >= 50) return 'Developing';
    return 'Emerging';
  };
  const bandColor = {
    'High Effectiveness': '#2DD4BF',
    'Developing': '#60A5FA',
    'Emerging': '#FB7185',
  };
  const bandPill = (band) => (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 999,
      background: bandColor[band] + '22', border: '1px solid ' + bandColor[band] + '55',
      color: bandColor[band], fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>{band}</span>
  );

  const colorS2 = (v) => v >= 40 ? '#2DD4BF' : v >= 30 ? '#60A5FA' : v >= 20 ? '#FFB547' : '#FB7185';
  const colorS3 = (v) => v >= 20 ? '#2DD4BF' : v >= 15 ? '#60A5FA' : v >= 10 ? '#FFB547' : '#FB7185';
  const colorTotal = (v) => v >= 60 ? '#2DD4BF' : v >= 45 ? '#60A5FA' : v >= 30 ? '#FFB547' : '#FB7185';
  const scoreCell = (v, color) => (
    <span style={{
      display: 'inline-block', minWidth: 44, padding: '2px 8px', borderRadius: 6,
      background: color + '18', color, fontWeight: 700, fontSize: '0.82rem', textAlign: 'center',
    }}>{v.toFixed(1)}</span>
  );

  const moduleNames = {
    cm: 'Creating Constant Momentum',
    il: 'Impactful Leadership Conversations',
    ia: 'Influence Without Authority',
    tm: 'Managing Priorities & Delegation',
    em: 'Empowerment & Managerial Mindset',
  };
  const mgrModuleNames = {
    cm: 'Creating Constant Momentum',
    il: 'Impactful Leadership Conversations',
    ia: 'Influence Without Authority',
    tm: 'Managing Priorities & Delegation',
    em: 'Empowerment & Managerial Mindset',
  };

  const learnerNameCounts = learnerData.reduce((acc, l) => {
    acc[l.name] = (acc[l.name] || 0) + 1;
    return acc;
  }, {});
  const managerLearnerNames = new Set(managerLearnerData.map(m => m.learner));

  const learnerRows = learnerData.map((l) => {
    const k = l.knowledge || {};
    const c = l.confidencePct || {};
    const moduleScores = ['cm', 'il', 'ia', 'tm', 'em'].map(code => {
      const know = k[code] ?? 0;
      const conf = c[code] ?? 0;
      const value = Math.round(((know + conf) / 2) * 10) / 10; // 1 dp
      return { code, name: moduleNames[code], value, knowledge: know, confidence: conf };
    });
    const s2Total = Math.round((moduleScores.reduce((a, m) => a + m.value, 0) / 500) * 50 * 10) / 10;
    const s3Total = Math.round(((l.appliedJudgement || 0) / 100) * 25 * 10) / 10;
    const total = Math.round((s2Total + s3Total) * 10) / 10;
    const max = Math.max(...moduleScores.map(m => m.value));
    const min = Math.min(...moduleScores.map(m => m.value));
    const strongest = (moduleScores.find(m => m.value === max) || {}).name || '';
    const weakest = (moduleScores.find(m => m.value === min) || {}).name || '';
    return {
      id: l.id,
      name: l.name,
      department: l.department,
      tenure: l.tenure,
      teamSize: l.teamSize,
      moduleScores,
      s2Total,
      s3Total,
      total,
      band: bandFor(total),
      strongest,
      weakest,
      q4Reverse: !!l.saQ4Reverse,
      strengths: l.strengths || '',
      challenges: l.challenges || '',
      managerAvailable: managerLearnerNames.has(l.name),
      duplicate: learnerNameCounts[l.name] > 1,
    };
  }).sort((a, b) => b.total - a.total);

  const managerRows = managerLearnerData.map((m) => {
    const ok = m.observedKnowledge || {};
    const oc = m.observedConfidence || {};
    const moduleScores = ['cm', 'il', 'ia', 'tm', 'em'].map(code => {
      const know = ok[code] ?? 0;
      const conf = oc[code] ?? 0;
      const value = Math.round(((know + conf) / 2) * 10) / 10;
      return { code, name: mgrModuleNames[code], value, knowledge: know, confidence: conf };
    });
    const s2Total = Math.round((moduleScores.reduce((a, mod) => a + mod.value, 0) / 500) * 50 * 10) / 10;
    const s3Total = Math.round(((m.appliedJudgement || 0) / 100) * 25 * 10) / 10;
    const total = Math.round((s2Total + s3Total) * 10) / 10;
    const max = Math.max(...moduleScores.map(x => x.value));
    const min = Math.min(...moduleScores.map(x => x.value));
    const strongest = (moduleScores.find(x => x.value === max) || {}).name || '';
    const weakest = (moduleScores.find(x => x.value === min) || {}).name || '';
    return {
      id: m.id,
      learner: m.learner,
      managerName: m.managerName,
      department: m.department,
      duration: m.duration,
      learnerTeam: m.learnerTeam,
      moduleScores,
      confidence: oc,
      s2Total,
      s3Total,
      total,
      band: bandFor(total),
      strongest,
      weakest,
    };
  }).sort((a, b) => b.total - a.total);

  const [lSearch, setLSearch] = useState('');
  const [lBand, setLBand] = useState('all');
  const [lTeam, setLTeam] = useState('all');

  const [mSearch, setMSearch] = useState('');
  const [mBand, setMBand] = useState('all');
  const [mDuration, setMDuration] = useState('all');

  const filteredLearners = learnerRows.filter(r => {
    if (lBand !== 'all' && r.band !== lBand) return false;
    if (lTeam !== 'all' && r.teamSize !== lTeam) return false;
    if (lSearch.trim()) {
      const q = lSearch.toLowerCase();
      const hay = [r.name, r.department, r.strengths, r.challenges].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filteredManagers = managerRows.filter(r => {
    if (mBand !== 'all' && r.band !== mBand) return false;
    if (mDuration !== 'all' && r.duration !== mDuration) return false;
    if (mSearch.trim()) {
      const q = mSearch.toLowerCase();
      const hay = [r.learner, r.managerName, r.department].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const inputStyle = {
    background: '#0F0F17', border: '1px solid #2A2A38', borderRadius: 8,
    padding: '7px 10px', color: '#F4F4F8', fontSize: '0.82rem', outline: 'none',
  };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };
  const labelStyle = { fontSize: '0.68rem', color: '#71717F', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4, display: 'block' };
  const th = { padding: '0.6rem 0.75rem', textAlign: 'left', color: '#7C5CFF', fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', borderBottom: '1px solid #2A2A38' };
  const td = { padding: '0.55rem 0.75rem', fontSize: '0.78rem', color: '#E4E4ED', verticalAlign: 'top', borderBottom: '1px solid #1F1F2A' };
  const wrapCard = {
    background: 'linear-gradient(180deg, #1A1A24 0%, #16161F 100%)',
    border: '1px solid #2A2A38', borderRadius: 14,
    padding: '1.2rem 1.4rem', marginBottom: '2rem',
    boxShadow: '0 4px 18px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.2)',
  };
  const sectionTitleStyle = sectionTitle;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ marginBottom: '1.5rem', fontSize: '0.84rem', color: '#B4B4C4', lineHeight: 1.55 }}>
        Section 4 (Open Reflection) is qualitative and has <strong style={{ color: '#FFCD7A' }}>no scoring rubric yet</strong> — all totals shown are out of <strong style={{ color: '#F4F4F8' }}>75</strong> (Section 2 + Section 3 only). Performance bands apply to the /75 totals as-is.
      </div>

      <h2 style={sectionTitleStyle}>Learner Participants — Self-Assessment</h2>
      <div style={wrapCard}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <span style={labelStyle}>Search</span>
            <input style={{ ...inputStyle, width: '100%' }} placeholder="Name, dept, strengths, challenges…"
              value={lSearch} onChange={(e) => setLSearch(e.target.value)} />
          </div>
          <div>
            <span style={labelStyle}>Band</span>
            <select style={{ ...selectStyle, width: '100%' }} value={lBand} onChange={(e) => setLBand(e.target.value)}>
              <option value="all">All bands</option>
              <option>High Effectiveness</option>
              <option>Developing</option>
              <option>Emerging</option>
            </select>
          </div>
          <div>
            <span style={labelStyle}>Team size</span>
            <select style={{ ...selectStyle, width: '100%' }} value={lTeam} onChange={(e) => setLTeam(e.target.value)}>
              <option value="all">All sizes</option>
              <option>1-3</option>
              <option>4-6</option>
              <option>7-10</option>
              <option>10+</option>
              <option>NA</option>
            </select>
          </div>
        </div>
        <div style={{ fontSize: '0.74rem', color: '#71717F', marginBottom: 10 }}>
          Showing <strong style={{ color: '#F4F4F8' }}>{filteredLearners.length}</strong> of {learnerRows.length} learners
        </div>

        {filteredLearners.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#B4B4C4', fontSize: '0.88rem' }}>
            No learners match the active filters. Try clearing one or more filter selections.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: 1700 }}>
              <thead>
                <tr style={{ background: '#14141C' }}>
                  <th style={th}>#</th>
                  <th style={th}>Learner</th>
                  <th style={th}>Department</th>
                  <th style={th}>Tenure</th>
                  <th style={th}>Team</th>
                  <th style={th}>Creating Constant Momentum</th>
                  <th style={th}>Impactful Leadership Conversations</th>
                  <th style={th}>Influence Without Authority</th>
                  <th style={th}>Managing Priorities & Delegation</th>
                  <th style={th}>Empowerment & Managerial Mindset</th>
                  <th style={th}>S2 /50</th>
                  <th style={th}>Strongest</th>
                  <th style={th}>Weakest</th>
                  <th style={th}>S3 /25</th>
                  <th style={th}>Q4 flag</th>
                  <th style={th}>Total /75</th>
                  <th style={th}>Band</th>
                  <th style={th}>Manager</th>
                  <th style={th}>Duplicated?</th>
                </tr>
              </thead>
              <tbody>
                {filteredLearners.map((r, idx) => (
                  <tr key={r.id} style={{ background: idx % 2 === 0 ? '#1A1A24' : '#14141C' }}>
                    <td style={{ ...td, color: '#71717F', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#F4F4F8' }}>{r.name}</td>
                    <td style={td}>{r.department}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.tenure}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{r.teamSize}</td>
                    {r.moduleScores.map(m => (
                      <td key={m.code} style={{ ...td, textAlign: 'center', color: '#B4B4C4', fontVariantNumeric: 'tabular-nums' }}>
                        {m.value}
                      </td>
                    ))}
                    <td style={{ ...td, textAlign: 'center' }}>{scoreCell(r.s2Total, colorS2(r.s2Total))}</td>
                    <td style={{ ...td, color: '#5EE4FF', fontSize: '0.74rem' }}>{r.strongest}</td>
                    <td style={{ ...td, color: '#FB7185', fontSize: '0.74rem' }}>{r.weakest}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{scoreCell(r.s3Total, colorS3(r.s3Total))}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {r.q4Reverse ? (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                          color: '#FB7185', background: 'rgba(251,113,133,0.12)', border: '1px solid rgba(251,113,133,0.3)',
                          padding: '2px 6px', borderRadius: 999, whiteSpace: 'nowrap',
                        }}>Reverse</span>
                      ) : <span style={{ color: '#71717F' }}>—</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {scoreCell(r.total, colorTotal(r.total))}
                    </td>
                    <td style={td}>{bandPill(r.band)}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                        color: r.managerAvailable ? '#2DD4BF' : '#71717F',
                        background: r.managerAvailable ? 'rgba(45,212,191,0.12)' : 'transparent',
                        border: '1px solid ' + (r.managerAvailable ? 'rgba(45,212,191,0.3)' : '#2A2A38'),
                      }}>{r.managerAvailable ? 'Yes' : 'No'}</span>
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {r.duplicate ? (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                          color: '#FFCD7A', background: 'rgba(255,181,71,0.12)', border: '1px solid rgba(255,181,71,0.3)',
                        }}>Dup</span>
                      ) : <span style={{ color: '#71717F' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 style={sectionTitleStyle}>Manager-Rated Learner Scores</h2>
      <div style={wrapCard}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <span style={labelStyle}>Search</span>
            <input style={{ ...inputStyle, width: '100%' }} placeholder="Learner, manager, dept…"
              value={mSearch} onChange={(e) => setMSearch(e.target.value)} />
          </div>
          <div>
            <span style={labelStyle}>Band</span>
            <select style={{ ...selectStyle, width: '100%' }} value={mBand} onChange={(e) => setMBand(e.target.value)}>
              <option value="all">All bands</option>
              <option>High Effectiveness</option>
              <option>Developing</option>
              <option>Emerging</option>
            </select>
          </div>
          <div>
            <span style={labelStyle}>Duration</span>
            <select style={{ ...selectStyle, width: '100%' }} value={mDuration} onChange={(e) => setMDuration(e.target.value)}>
              <option value="all">All durations</option>
              <option>3–6 months</option>
              <option>6–12 months</option>
              <option>12+ months</option>
              <option>{'> 12 months'}</option>
            </select>
          </div>
        </div>
        <div style={{ fontSize: '0.74rem', color: '#71717F', marginBottom: 10 }}>
          Showing <strong style={{ color: '#F4F4F8' }}>{filteredManagers.length}</strong> of {managerRows.length} responses
        </div>

        {filteredManagers.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#B4B4C4', fontSize: '0.88rem' }}>
            No manager-rated responses match the active filters. Try clearing one or more filter selections.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: 1500 }}>
              <thead>
                <tr style={{ background: '#14141C' }}>
                  <th style={th}>#</th>
                  <th style={th}>Learner</th>
                  <th style={th}>Manager</th>
                  <th style={th}>Department</th>
                  <th style={th}>Duration</th>
                  <th style={th}>Creating Constant Momentum</th>
                  <th style={th}>Impactful Leadership Conversations</th>
                  <th style={th}>Influence Without Authority</th>
                  <th style={th}>Managing Priorities & Delegation</th>
                  <th style={th}>Empowerment & Managerial Mindset</th>
                  <th style={th}>Confidence (M1·M2·M3·M4·M5)</th>
                  <th style={th}>S2 /50</th>
                  <th style={th}>S3 /25</th>
                  <th style={th}>Total /75</th>
                  <th style={th}>Band</th>
                </tr>
              </thead>
              <tbody>
                {filteredManagers.map((r, idx) => (
                  <tr key={r.id} style={{ background: idx % 2 === 0 ? '#1A1A24' : '#14141C' }}>
                    <td style={{ ...td, color: '#71717F', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#F4F4F8' }}>{r.learner}</td>
                    <td style={td}>{r.managerName}</td>
                    <td style={td}>{r.department}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.duration}</td>
                    {r.moduleScores.map(m => (
                      <td key={m.code} style={{ ...td, textAlign: 'center', color: '#B4B4C4', fontVariantNumeric: 'tabular-nums' }}>
                        {m.value}
                      </td>
                    ))}
                    <td style={{ ...td, fontSize: '0.74rem', color: '#71717F', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {['cm', 'il', 'ia', 'tm', 'em'].map(c => r.confidence[c] ?? '–').join(' · ')}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>{scoreCell(r.s2Total, colorS2(r.s2Total))}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{scoreCell(r.s3Total, colorS3(r.s3Total))}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {scoreCell(r.total, colorTotal(r.total))}
                    </td>
                    <td style={td}>{bandPill(r.band)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ MAIN COMPONENT ═══════════════ */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { id, kind } = useParams();
  const location = useLocation();
  const isUserView = location.pathname.startsWith('/user');
  const isQuestionnaireDetailRoute = location.pathname.includes('/questionnaire/');
  const phase = new URLSearchParams(location.search).get('phase') === 'post' ? 'post' : 'pre';
  const phaseMeta = phase === 'post'
    ? { label: 'Post-Program', color: '#00D4FF', bg: 'rgba(0,212,255,0.12)', border: 'rgba(0,212,255,0.35)' }
    : { label: 'Pre-Program', color: '#7C5CFF', bg: 'rgba(124,92,255,0.14)', border: 'rgba(124,92,255,0.35)' };
  const [sortField, setSortField] = useState('overall');
  const [sortAsc, setSortAsc] = useState(false);

  const assessment = publishedAssessments.find(a => String(a.id) === String(id)) || publishedAssessments[0];
  const isCombined = assessment.type === 'combined';

  // Map the numeric route param `id` → the userAssessments `ua1/ua2/...` id so we can look
  // up the per-user `allowedTabs` permission.
  const { auth } = useAuth();
  const { nm, intTxt, isDemo } = useNumberMask();

  const currentUserAssessment = userAssessments?.find?.(u => String(u.assessmentId) === String(id))
    || userAssessments?.[0];
  const userAssessmentId = currentUserAssessment?.id;
  const allowedTabsForAssessment = auth?.permissions?.allowedTabs?.[userAssessmentId] || null;
  const isTabAllowed = (key) => !allowedTabsForAssessment || allowedTabsForAssessment.includes(key);

  const [activeTab, setActiveTab] = useState(() => {
    const wanted = 'questionnaire';
    return (!allowedTabsForAssessment || allowedTabsForAssessment.includes(wanted))
      ? wanted
      : (allowedTabsForAssessment[0] || wanted);
  });
  // If the user lands on a tab they're not allowed to see (e.g., from a deep link), snap to
  // the first allowed tab.
  useEffect(() => {
    if (allowedTabsForAssessment && !allowedTabsForAssessment.includes(activeTab)) {
      setActiveTab(allowedTabsForAssessment[0] || 'questionnaire');
    }
  }, [allowedTabsForAssessment, activeTab]);

  const [pdfBusy, setPdfBusy] = useState(false);

  const handlePdfExport = async (rootId, title, filename) => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await exportTabRootToPdf({ rootId, title, filename });
    } finally {
      setPdfBusy(false);
    }
  };
  const isManagerView = activeTab === 'manager';
  const isCombinedView = activeTab === 'combined';
  const isPointsView = activeTab === 'points';
  const isQuestionnaireView = activeTab === 'questionnaire';

  // Re-arm scroll-reveal on tab switches (sections that mount fresh need observation).
  useScrollReveal(null, [activeTab, phase]);

  // Pick the active dataset based on assessment type. The two assessments share the same
  // chart shapes; only the underlying numbers and a few labels differ.
  const view = isManagerView
    ? {
        learners: managerLearnerData.map(r => ({ ...r, name: r.learner })),
        cohort: { ...cohortSummary, ...managerCohortSummary, totalRespondents: managerCohortSummary.totalRespondents, totalInvited: managerCohortSummary.totalInvited },
        moduleCohort: managerModuleCohort.map(m => ({ module: m.module, knowledge: m.observedKnowledge, confidence: m.managerConfidence, gap: m.gap })),
        applied: managerAppliedJudgementItems,
        tenureSeg: managerDurationSegmentation,
        teamSeg: managerTeamSegmentation,
        bands: managerBandDistribution,
        labels: {
          overallCardLabel: 'Overall Observed Capability (manager view)',
          knowledgeAxisLabel: 'Observed Knowledge %',
          confidenceAxisLabel: 'Manager Confidence %',
          appliedNote: '1–5 manager-observed behaviors. Item 4 is reverse-coded (manager perceives reverse-delegation tendency).',
          reverseFlagText: `% of cohort whose manager flagged reverse-delegation tendency on item 4`,
          tenureChartTitle: 'Cohort Score by Manager–Learner Working Duration',
          teamChartTitle: 'Cohort Score by Learner Team Size',
          appliedTitle: 'Applied Judgement — Manager-Observed Cohort Average',
          knowledgeVsConfidenceTitle: 'Observed Capability vs Manager Confidence — by Module',
          gapHelp: 'Positive gap = manager confidence exceeds observed capability. Negative = manager sees capability but lower confidence in consistency.',
          strongWeakTitle: 'Strongest Module & Development Area per Learner — Manager View',
        },
      }
    : {
        learners: learnerData,
        cohort: cohortSummary,
        moduleCohort,
        applied: appliedJudgementItems,
        tenureSeg: tenureSegmentation,
        teamSeg: teamSizeSegmentation,
        bands: bandDistribution,
        labels: {
          overallCardLabel: 'Overall Capability (cohort avg)',
          knowledgeAxisLabel: 'Knowledge %',
          confidenceAxisLabel: 'Confidence %',
          appliedNote: '1–5 self-rated behavioral items. Item 4 is reverse-coded (higher raw score = stronger reverse-delegation tendency).',
          reverseFlagText: `% of the cohort scored ≥4 on “I tend to take the task back when my team struggles”`,
          tenureChartTitle: 'Cohort Score by Tenure',
          teamChartTitle: 'Cohort Score by Team Size',
          appliedTitle: 'Applied Judgement — Cohort Average per Item',
          knowledgeVsConfidenceTitle: 'Knowledge vs Confidence — by Module',
          gapHelp: 'Positive gap (orange/red) = over-confident relative to knowledge. Negative (blue) = under-confident; coaching opportunity.',
          strongWeakTitle: 'Strongest & Weakest Module — per Learner',
        },
      };

  const backTarget = isUserView
    ? (isQuestionnaireView ? '/user/assessments' : `/user/phases/${id || assessment.id}`)
    : (assessment.clientId ? `/admin/clients/${assessment.clientId}` : '/admin/dashboard');
  const backLabel = isUserView
    ? 'Assessment'
    : (assessment.client || 'Clients');

  // Deduplicate by learner name — when the same name appears multiple times,
  // keep only the LAST occurrence (most recent submission overrides earlier ones).
  const dedupedLearners = (() => {
    const byName = new Map();
    view.learners.forEach((l) => {
      const key = (l.name || '').trim().toLowerCase();
      if (key) byName.set(key, l);
    });
    return Array.from(byName.values());
  })();

  const sorted = [...dedupedLearners].sort((a, b) =>
    sortAsc ? a[sortField] - b[sortField] : b[sortField] - a[sortField],
  );

  const handleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const exportLearnerTable = () => {
    exportToCSV('learner-responses.csv',
      ['#', 'Learner', 'Response', 'Completion'],
      dedupedLearners.map((l, i) => [i + 1, l.name, l.responseStatus || 'Submitted', l.completionDate || ''])
    );
  };

  const exportScoreTable = () => {
    exportToCSV('score-breakdown.csv',
      ['#', 'Learner', 'Email', 'Mng Self', 'Mng Teams', 'Mng Business', 'Overall (4-pt)', 'Overall (0-100)', 'Band'],
      dedupedLearners.map((l, i) => [i + 1, l.name, l.email, l.mngSelf, l.mngTeams, l.mngBusiness, l.overall, l.overall100, l.band])
    );
  };

  const exportSubSectionAverages = () => {
    exportToCSV('sub-section-averages.csv',
      ['Sub-Section', 'Average'],
      subSectionAverages.map(s => [s.name, s.average])
    );
  };

  // ── Dedicated questionnaire-detail route: /user/questionnaire/:kind ──
  // Renders ONLY the chosen questionnaire (learner | manager) on its own page.
  if (isQuestionnaireDetailRoute) {
    return (
      <div className="page-enter" style={{
        minHeight: '100vh',
        background: '#0A0A0F',
        backgroundImage:
          'radial-gradient(circle at 12% 8%, rgba(124,92,255,0.10) 0%, transparent 35%),' +
          'radial-gradient(circle at 88% 92%, rgba(0,212,255,0.08) 0%, transparent 35%)',
        backgroundAttachment: 'fixed',
        padding: '1.75rem',
        fontFamily: "'Poppins', system-ui, sans-serif",
        color: '#F4F4F8',
        fontSize: '0.875rem',
      }}>
        <div style={{ marginBottom: '1.4rem' }} className="animate-fade-in-down">
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', color: '#9B83FF',
              fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
              padding: 0,
            }}
          >
            <ArrowLeft size={18} /> Back
          </button>
        </div>
        <QuestionnaireView initialSelected={kind === 'manager' ? 'manager' : 'learner'} hideTabs />

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '1.5rem 0 0.5rem', fontSize: '0.9rem', color: '#FFFFFF' }}>
          {uiStrings.footer || `${uiStrings.platformName || 'Siksha Assessment Platform'} © ${uiStrings.copyrightYear || new Date().getFullYear()} · All rights reserved`}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{
      minHeight: '100vh',
      background: '#0A0A0F',
      backgroundImage:
        'radial-gradient(circle at 12% 8%, rgba(124,92,255,0.10) 0%, transparent 35%),' +
        'radial-gradient(circle at 88% 92%, rgba(0,212,255,0.08) 0%, transparent 35%)',
      backgroundAttachment: 'fixed',
      padding: '1.75rem',
      fontFamily: "'Poppins', system-ui, sans-serif",
      color: '#F4F4F8',
      fontSize: '0.875rem',
    }}>
      {/* PDF export progress bar — fixed strip at top of viewport */}
      {pdfBusy && (
        <div data-pdf-hide="true" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          height: 3, background: 'rgba(124,92,255,0.18)', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '40%',
            background: 'linear-gradient(90deg, transparent, #9B83FF, #00D4FF, transparent)',
            animation: 'pdfBarSlide 1.1s ease-in-out infinite',
          }} />
          <style>{`@keyframes pdfBarSlide{0%{left:-40%}100%{left:100%}}`}</style>
        </div>
      )}

      {/* Header with back navigation */}
      <div style={{ marginBottom: '2rem' }} className="animate-fade-in-down">
        <button
          onClick={() => navigate(backTarget)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#9B83FF', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: 12 }}
        >
          <ArrowLeft size={18} /> Back to {backLabel}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F4F4F8', margin: 0 }}>
            {currentUserAssessment?.title || assessment.title || 'Assessment Dashboard'}
          </h1>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 999,
            background: phaseMeta.bg, color: phaseMeta.color,
            border: `1px solid ${phaseMeta.border}`,
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {phaseMeta.label}
          </span>
        </div>
        <p style={{ color: '#B4B4C4', margin: '0.25rem 0 0' }}>
          {isDemo ? `Lorem Client · Lorem Cohort (Demo) · Published Lorem` : `${assessment.client} · ${cohortSummary.cohortName} · Published ${cohortSummary.publishedDate}`}
        </p>
      </div>

      {/* Tab strip */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem', borderBottom: '2px solid #2A2A38' }}>
        {[
          { key: 'questionnaire', label: 'Questionnaire' },
          { key: 'learner', label: 'Learner Response' },
          { key: 'manager', label: 'Manager Response' },
          { key: 'combined', label: 'Comparative Analysis' },
          { key: 'points', label: 'Participant View' },
        ].filter(t => isTabAllowed(t.key)).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.key ? '3px solid #F4F4F8' : '3px solid transparent',
              color: activeTab === t.key ? '#F4F4F8' : '#B4B4C4',
              cursor: 'pointer',
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Manager view — scoring-rubric dashboard */}
      {isManagerView && <ManagerScoringView onExportPdf={handlePdfExport} pdfBusy={pdfBusy} />}

      {isQuestionnaireView && <QuestionnaireView />}

      {isPointsView && <ParticipantView />}

      {isCombinedView && (() => {
        const bandColor = {
          'High Effectiveness': '#2DD4BF',
          'Developing': '#60A5FA',
          'Emerging': '#FFB547',
        };
        const bandPill = (band) => (
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: 999,
            background: bandColor[band] + '1f', color: bandColor[band],
            fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.01em',
          }}>{band}</span>
        );
        const arrowFor = (selfBand, mgrBand, delta) => {
          if (selfBand !== mgrBand) {
            return delta > 0
              ? { glyph: '↓', color: '#FB7185' }
              : { glyph: '↑', color: '#2DD4BF' };
          }
          return { glyph: '→', color: '#71717F' };
        };
        const deltaColor = (d) => {
          if (d < 0) return '#2DD4BF';
          if (d <= 5) return '#FFB547';
          return '#FB7185';
        };

        // ── 1. Band Comparison · 8 Matched Pairs ──
        const pairsReal = [
          { name: 'Jayraj Dangar',    selfBand: 'Developing',         selfScore: 62.0, mgrBand: 'Emerging',   mgrScore: 48.0, delta: +14.0, note: 'Band drops. Learner overestimates. Manager observed inability to hold end-to-end ownership without constant follow-up.' },
          { name: 'Jatin Suneja',     selfBand: 'Developing',         selfScore: 59.0, mgrBand: 'Developing', mgrScore: 59.6, delta: -0.6,  note: 'Same band, near-identical scores. Most aligned pair in the cohort. Self-perception well-calibrated.' },
          { name: 'Lohit Sanghoi',    selfBand: 'Developing',         selfScore: 56.0, mgrBand: 'Emerging',   mgrScore: 47.5, delta: +8.5,  note: 'Band drops. Manager flags communication not structured enough to demonstrate accountability upward.' },
          { name: 'Richa Jha',        selfBand: 'Developing',         selfScore: 63.0, mgrBand: 'Developing', mgrScore: 59.2, delta: +3.8,  note: 'Same band. Small gap. Manager noted confidence gap in client-facing situations not reflected in self-score.' },
          { name: 'Mithesh',          selfBand: 'High Effectiveness', selfScore: 75.0, mgrBand: 'Emerging',   mgrScore: 47.5, delta: +27.5, note: 'Largest gap. Two bands drop. Manager observes avoidance of ownership under pressure — opposite of self-reported strength.' },
          { name: 'Chirag Choksi',    selfBand: 'Emerging',           selfScore: 49.0, mgrBand: 'Developing', mgrScore: 68.7, delta: -19.7, note: 'Only inversion. Manager rates significantly higher. Learner underestimates own observable capability.' },
          { name: 'Fahadulla Khan',   selfBand: 'Developing',         selfScore: 63.0, mgrBand: 'Developing', mgrScore: 51.2, delta: +11.8, note: 'Same band, moderate gap. Manager flags structured communication and delegation as gaps not visible in self-rating.' },
          { name: 'Amrita Mukherjee', selfBand: 'Developing',         selfScore: 55.0, mgrBand: 'Developing', mgrScore: 50.4, delta: +4.6,  note: 'Same band, small gap. Broadly aligned. Manager\'s specific observation: pattern recognition vs individual fixes.' },
        ];
        // Mask names & notes when in demo mode so the comparative tab matches the other tabs.
        const pairs = isDemo
          ? pairsReal.map((p, i) => ({ ...p, name: `Lorem Ipsum ${i + 1}`, note: 'Lorem ipsum dolor sit amet consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' }))
          : pairsReal;

        // ── 2. Module gaps · cohort avg of 8 pairs (normalised 0-100) ──
        const moduleGapsReal = [
          { n: 1, name: 'Creating Constant Momentum',  L: 75.0, M: 55.6, gap: +19.4 },
          { n: 2, name: 'Impactful Leadership Conversations',    L: 71.9, M: 70.8, gap: +1.1  },
          { n: 3, name: 'Influence Without Authority',           L: 65.6, M: 69.5, gap: -3.9  },
          { n: 4, name: 'Managing Priorities & Delegation', L: 78.1, M: 65.3, gap: +12.8 },
          { n: 5, name: 'Empowerment & Managerial Mindset',      L: 75.0, M: 65.3, gap: +9.7  },
        ];
        const moduleGaps = isDemo
          ? moduleGapsReal.map((m, i) => ({ ...m, name: `Lorem Ipsum Module ${i + 1}` }))
          : moduleGapsReal;
        const radarData = moduleGaps.map((m) => ({
          module: m.name,
          fullName: m.name,
          Learner: m.L,
          Manager: m.M,
        }));

        // ── 4. Applied judgement (cohort avg, normalised 0-100) ──
        const ajDataReal = [
          { item: 'Goal cascading',           Learner: 77, Manager: 63 },
          { item: 'Difficult convos',         Learner: 80, Manager: 58 },
          { item: 'Delegation & trust',       Learner: 83, Manager: 67 },
          { item: 'Priority mgmt (reversed)', Learner: 75, Manager: 38 },
          { item: 'Autonomy & ownership',     Learner: 80, Manager: 63 },
        ];
        const ajData = isDemo
          ? ajDataReal.map((a, i) => ({ ...a, item: `Lorem ipsum ${i + 1}` }))
          : ajDataReal;

        const sectionTitleStyle = sectionTitle;
        const eyebrow = { fontSize: '0.72rem', fontWeight: 700, color: '#9B83FF', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 };

        const aligned = pairs.filter((p) => p.selfBand === p.mgrBand).length;
        const mismatched = pairs.length - aligned;

        return (
          <div id="combined-tab-root">
            {/* ── Export PDF button (hidden in PDF) ── */}
            <div data-pdf-hide="true" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: '1rem' }}>
              <button style={exportBtn} disabled={pdfBusy}
                onClick={() => handlePdfExport('combined-tab-root', 'New Manager Cohort Pre Journey Comparative Analysis', 'new-manager-cohort-comparative-analysis.pdf')}
                onMouseEnter={e => { if (!pdfBusy) e.currentTarget.style.background = '#0A0A0F'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#1A1A24'; }}>
                <Download size={14} /> {pdfBusy ? 'Generating…' : 'Export PDF'}
              </button>
            </div>
            {/* ── Executive Summary ── */}
            <h2 style={sectionTitle}>
              Executive Summary
            </h2>
            <div className="stagger" style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem', marginBottom: '2rem',
            }}>
              <div style={{ ...card, padding: '1.15rem 1.2rem' }}>
                <div style={{ fontSize: '0.74rem', color: '#B4B4C4', marginBottom: 8, fontWeight: 600 }}>Total responses received</div>
                <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#F4F4F8', lineHeight: 1.05, letterSpacing: '-0.02em' }}>{pairs.length}</div>
                <div style={{ fontSize: '0.72rem', color: '#71717F', marginTop: 8 }}>Matched learner ↔ manager pairs</div>
              </div>
              <div style={{ ...card, padding: '1.15rem 1.2rem' }}>
                <div style={{ fontSize: '0.74rem', color: '#B4B4C4', marginBottom: 8, fontWeight: 600 }}>Aligned with manager</div>
                <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#2DD4BF', lineHeight: 1.05, letterSpacing: '-0.02em' }}>{intTxt(aligned)}</div>
                <div style={{ fontSize: '0.72rem', color: '#71717F', marginTop: 8 }}>Same band on both sides</div>
              </div>
              <div style={{ ...card, padding: '1.15rem 1.2rem' }}>
                <div style={{ fontSize: '0.74rem', color: '#B4B4C4', marginBottom: 8, fontWeight: 600 }}>Mismatched with manager</div>
                <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#FB7185', lineHeight: 1.05, letterSpacing: '-0.02em' }}>{intTxt(mismatched)}</div>
                <div style={{ fontSize: '0.72rem', color: '#71717F', marginTop: 8 }}>Different band — over- or under-rate</div>
              </div>
            </div>

            {/* ─── 5. Key Inferences (moved up — sits right under Executive Summary) ─── */}
            <h2 style={{ ...sectionTitleStyle, marginTop: '1.25rem' }}>Key Inferences</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {(isDemo ? [
                {
                  accent: '#2DD4BF',
                  bg: 'rgba(45,212,191,0.10)',
                  border: 'rgba(45,212,191,0.30)',
                  title: 'Lorem ipsum dolor sit amet',
                  body: 'L: ##.# · M: ##.# · Gap: ##.#. Lorem ipsum dolor sit amet consectetur adipiscing elit, sed do eiusmod.',
                },
                {
                  accent: '#FFB547',
                  bg: 'rgba(255,181,71,0.10)',
                  border: 'rgba(255,181,71,0.30)',
                  title: 'Lorem ipsum consectetur',
                  body: 'L: ##.# · M: ##.# · Gap: ##.#. Tempor incididunt ut labore et dolore magna aliqua enim ad minim.',
                },
                {
                  accent: '#FB7185',
                  bg: 'rgba(251,113,133,0.10)',
                  border: 'rgba(251,113,133,0.30)',
                  title: 'Lorem largest gap — ipsum dolor',
                  body: 'L: ##.# · M: ##.# · Gap: ##.#. Veniam quis nostrud exercitation ullamco laboris nisi ut aliquip.',
                },
              ] : [
                {
                  accent: '#2DD4BF',
                  bg: 'rgba(45,212,191,0.10)',
                  border: 'rgba(45,212,191,0.30)',
                  title: 'Most aligned — Influence Without Authority',
                  body: 'L: 65.6 · M: 69.5 · Gap: −3.9. Only module where manager rates higher. Most credible shared baseline.',
                },
                {
                  accent: '#FFB547',
                  bg: 'rgba(255,181,71,0.10)',
                  border: 'rgba(255,181,71,0.30)',
                  title: 'Creating Constant Momentum',
                  body: 'L: 75.0 · M: 55.6 · Gap: +19.4. Learners rate follow-through highly; managers observe it least consistently.',
                },
                {
                  accent: '#FB7185',
                  bg: 'rgba(251,113,133,0.10)',
                  border: 'rgba(251,113,133,0.30)',
                  title: 'Largest gap — priority mgmt / reverse delegation',
                  body: 'L: 75.0 · M: 37.5 · Gap: +37.5. Learners feel most capable here. Managers most frequently observe the reverse.',
                },
              ]).map((c) => (
                <div key={c.title} style={{
                  background: c.bg, border: '1px solid ' + c.border, borderRadius: 14,
                  padding: '1.2rem 1.3rem',
                }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: c.accent, marginBottom: 8, lineHeight: 1.35 }}>{c.title}</div>
                  <div style={{ fontSize: '0.85rem', color: '#E4E4ED', lineHeight: 1.6 }}>{c.body}</div>
                </div>
              ))}
            </div>

            {/* ─── 3 & 4 side-by-side (moved up — follows Key Inferences) ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ marginBottom: '2rem' }}>
                <div className="reveal" style={{ ...card, height: '100%' }}>
                  <h2 style={sectionTitleStyle}>Cohort Capability Profile — All Five Modules</h2>
                  <div style={{ fontSize: '0.8rem', color: '#B4B4C4', marginBottom: 10 }}>Cohort avg of 8 pairs, normalised 0-100</div>
                  <div style={{ display: 'flex', gap: 18, fontSize: '0.78rem', color: '#B4B4C4', marginBottom: 4 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: '#2DD4BF' }} />Learner
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: '#60A5FA' }} />Manager
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData} outerRadius="70%" margin={{ top: 24, right: 130, bottom: 30, left: 130 }}>
                      <PolarGrid stroke="#2A2A38" />
                      <PolarAngleAxis dataKey="module" tick={{ fill: '#B4B4C4', fontSize: 11 }} tickLine={false} />
                      <PolarRadiusAxis angle={54} domain={[0, 100]} tickCount={5} tick={{ fill: '#71717F', fontSize: 10 }} stroke="#2A2A38" />
                      <Radar name="Learner" dataKey="Learner" stroke="#2DD4BF" fill="#2DD4BF" fillOpacity={0.30} />
                      <Radar name="Manager" dataKey="Manager" stroke="#60A5FA" fill="#60A5FA" fillOpacity={0.25} />
                      <Tooltip
                        contentStyle={{ background: '#14141C', border: '1px solid #2A2A38', borderRadius: 8, color: '#F4F4F8' }}
                        labelFormatter={(_, payload) => (payload && payload[0] && payload[0].payload.fullName) || ''}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <div className="reveal" style={{ ...card, height: '100%' }}>
                  <h2 style={sectionTitleStyle}>On-the-Job Behaviour Ratings — Learner vs. Manager</h2>
                  <div style={{ fontSize: '0.8rem', color: '#B4B4C4', marginBottom: 10 }}>Cohort avg, normalised 0-100. Q4 shown after reversing.</div>
                  <div style={{ display: 'flex', gap: 18, fontSize: '0.78rem', color: '#B4B4C4', marginBottom: 4 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: '#2DD4BF' }} />Learner
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: '#60A5FA' }} />Manager
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={ajData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: '#71717F', fontSize: 11 }} stroke="#2A2A38" />
                      <YAxis type="category" dataKey="item" width={150} tick={{ fill: '#B4B4C4', fontSize: 11 }} stroke="#2A2A38" />
                      <Tooltip contentStyle={{ background: '#14141C', border: '1px solid #2A2A38', borderRadius: 8, color: '#F4F4F8' }} />
                      <Bar dataKey="Learner" fill="#2DD4BF" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Manager" fill="#60A5FA" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ─── 2. Module gaps · cohort avg of 8 pairs ─── */}
            <div className="reveal" style={{ ...card, marginBottom: '2rem' }}>
              <h2 style={sectionTitleStyle}>Capability Gap Analysis by Module</h2>
              <div style={{ fontSize: '0.8rem', color: '#B4B4C4', marginBottom: 4 }}>Paired bars per module — L = learner self-rating · M = manager observation</div>
              <div style={{ fontSize: '0.8rem', color: '#B4B4C4', marginBottom: 12 }}>
                Learner 1-5 → (val−1)/4×100. Manager 1-4 → (val−1)/3×100. Gap = L − M.
              </div>
              <div style={{ display: 'flex', gap: 18, fontSize: '0.78rem', color: '#B4B4C4', marginBottom: 14 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: '#2DD4BF' }} />Learner (L)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: '#60A5FA' }} />Manager (M)
                </span>
              </div>
              {moduleGaps.map((m, i) => {
                const gapBg = m.gap >= 15 ? 'rgba(251,113,133,0.16)' : m.gap > 5 ? 'rgba(255,181,71,0.18)' : m.gap < 0 ? 'rgba(45,212,191,0.16)' : 'rgba(96,165,250,0.16)';
                const gapFg = m.gap >= 15 ? '#FB7185' : m.gap > 5 ? '#FFB547' : m.gap < 0 ? '#2DD4BF' : '#60A5FA';
                return (
                  <div key={m.n} style={{
                    display: 'grid', gridTemplateColumns: '200px 1fr 80px',
                    gap: 16, alignItems: 'center',
                    padding: '14px 0', borderTop: i ? '1px solid #2A2A38' : 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F4F4F8' }}>{m.name}</div>
                    </div>
                    <div>
                      {[
                        { key: 'L', value: m.L, color: '#2DD4BF' },
                        { key: 'M', value: m.M, color: '#60A5FA' },
                      ].map((row) => (
                        <div key={row.key} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 50px', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <div style={{ fontSize: '0.78rem', color: row.color, fontWeight: 700 }}>{row.key}</div>
                          <div style={{ height: 12, borderRadius: 999, background: '#23232E', overflow: 'hidden', position: 'relative' }}>
                            <div style={{ width: `${row.value}%`, height: '100%', background: row.color, borderRadius: 999 }} />
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#F4F4F8', fontWeight: 700, textAlign: 'right' }}>{nm(row.value)}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{
                      background: gapBg, color: gapFg,
                      padding: '6px 10px', borderRadius: 999,
                      fontSize: '0.85rem', fontWeight: 800, textAlign: 'center',
                    }}>
                      {isDemo ? '##.#' : `${m.gap > 0 ? '+' : ''}${m.gap.toFixed(1)}`}
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: '0.82rem', color: '#B4B4C4', marginTop: 16, lineHeight: 1.6 }}>
                {isDemo
                  ? 'Lorem ipsum dolor sit amet consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua, enim ad minim veniam quis nostrud exercitation.'
                  : 'Influence Without Authority is the only module where managers rate learners slightly higher (−3.9). Creating Constant Momentum has the largest positive gap (+19.4) — learners believe they drive momentum consistently; managers observe this least of all modules.'}
              </div>
            </div>

            {/* ─── 1. Perception vs Reality (moved to last section) ─── */}
            <div className="reveal" style={{ ...card, marginBottom: '2rem' }}>
              <h2 style={sectionTitleStyle}>Self-Assessment vs. Manager Observation — Performance Band Alignment</h2>
              <div style={{ fontSize: '0.8rem', color: '#B4B4C4', marginBottom: 4 }}>Learner self-assessment vs manager observation — band and score</div>
              <div style={{ fontSize: '0.8rem', color: '#B4B4C4', marginBottom: 18 }}>
                Scores /75 (S2 + S3, S4 excluded). <span style={{ color: '#FB7185' }}>↓</span> = manager rates lower · <span style={{ color: '#2DD4BF' }}>↑</span> = manager rates higher · <span style={{ color: '#71717F' }}>→</span> = same band
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#14141C' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left',   color: '#B4B4C4', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #2A2A38' }}>Learner</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#B4B4C4', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #2A2A38' }}>Self-assessed</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#B4B4C4', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #2A2A38', width: 60 }}></th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#B4B4C4', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #2A2A38' }}>Manager-observed</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#B4B4C4', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #2A2A38', width: 90 }}>Δ pts</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left',   color: '#B4B4C4', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #2A2A38' }}>What the shift means</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairs.map((p, i) => {
                      const a = arrowFor(p.selfBand, p.mgrBand, p.delta);
                      const dCol = deltaColor(p.delta);
                      return (
                        <tr key={p.name} style={{ background: i % 2 ? '#14141C' : '#1A1A24' }}>
                          <td style={{ padding: '1rem', color: '#F4F4F8', fontWeight: 700, borderBottom: '1px solid #2A2A38' }}>{p.name}</td>
                          <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #2A2A38' }}>
                            <div>{bandPill(p.selfBand)}</div>
                            <div style={{ fontSize: '0.78rem', color: '#71717F', marginTop: 6 }}>{nm(p.selfScore)}/75</div>
                          </td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: a.color, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1, borderBottom: '1px solid #2A2A38' }}>
                            {a.glyph}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #2A2A38' }}>
                            <div>{bandPill(p.mgrBand)}</div>
                            <div style={{ fontSize: '0.78rem', color: '#71717F', marginTop: 6 }}>{nm(p.mgrScore)}/75</div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: dCol, fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid #2A2A38' }}>
                            {isDemo ? '##.#' : `${p.delta > 0 ? '+' : ''}${p.delta.toFixed(1)}`}
                          </td>
                          <td style={{ padding: '1rem', color: '#B4B4C4', fontSize: '0.85rem', lineHeight: 1.55, borderBottom: '1px solid #2A2A38' }}>{p.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#B4B4C4', marginTop: 16, lineHeight: 1.6 }}>
                {isDemo
                  ? 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.'
                  : '6 of 8 learners rate themselves higher than their manager observes. 4 stay in the same band. Mithesh (+27.5) and Chirag Choksi (−19.7) are the two outliers in opposite directions.'}
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === 'learner' && (
      <div id="learner-tab-root">
      {/* ── Export buttons row (hidden in PDF) ── */}
      <div data-pdf-hide="true" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: '1rem' }}>
        <button style={exportBtn} disabled={pdfBusy}
          onClick={() => handlePdfExport('learner-tab-root', 'New Manager Cohort Pre Journey Learner Response Analysis', 'new-manager-cohort-learner-response-analysis.pdf')}
          onMouseEnter={e => { if (!pdfBusy) e.currentTarget.style.background = '#0A0A0F'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1A1A24'; }}>
          <Download size={14} /> {pdfBusy ? 'Generating…' : 'Export PDF'}
        </button>
      </div>
      {/* ── Row 0: Top Summary Boxes ── */}
      <h2 style={sectionTitle}>
        Executive Summary
      </h2>
      {(() => {
        const boxBase = { ...card, padding: '1.1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: 6 };
        const boxLabel = { fontSize: '0.66rem', fontWeight: 700, color: '#9B83FF', letterSpacing: '0.08em', textTransform: 'uppercase' };
        const boxTitle = { fontSize: '0.98rem', fontWeight: 800, color: '#F4F4F8', lineHeight: 1.25, letterSpacing: '-0.005em' };
        const boxLine  = { fontSize: '0.8rem', color: '#B4B4C4', lineHeight: 1.5 };
        const accentLine = (color) => ({ fontSize: '0.8rem', color, fontWeight: 700, lineHeight: 1.5 });
        const exec = deriveLearnerExecSummary();
        const deltaSign = exec.largestGap.delta > 0 ? '+' : '';
        return (
          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {/* Box 1 — Cohort Snapshot */}
            <div style={boxBase}>
              <div style={boxLabel}>Cohort Details</div>
              <div style={boxTitle}>{intTxt(exec.N)} respondents</div>
              <div style={boxLine}>{isDemo ? 'Lorem ipsum dolor sit' : exec.tenureLine}</div>
            </div>

            {/* Box 2 — Overall Score */}
            <div style={boxBase}>
              <div style={boxLabel}>Overall Score</div>
              <div style={boxLine}>Knowledge: <strong style={{ color: '#F4F4F8' }}>{nm(exec.s2OutOf50)}</strong> / 50</div>
              <div style={boxLine}>Applied Judgement: <strong style={{ color: '#F4F4F8' }}>{nm(exec.s3OutOf25)}</strong> / 25</div>
              <div style={{ ...accentLine('#2DD4BF'), marginTop: 2 }}>Total: {nm(exec.totalOutOf75)} / 75</div>
            </div>

            {/* Box 3 — Strongest Module */}
            <div style={boxBase}>
              <div style={boxLabel}>Strongest Module</div>
              <div style={boxTitle}>{exec.strongest.name}</div>
              <div style={accentLine('#2DD4BF')}>Knowledge: {nm(exec.strongest.knowledge5, 2)} / 5</div>
            </div>

            {/* Box 4 — Development Area */}
            <div style={boxBase}>
              <div style={boxLabel}>Development Area</div>
              <div style={boxTitle}>{exec.weakest.name}</div>
              <div style={accentLine('#FB7185')}>Knowledge: {nm(exec.weakest.knowledge5, 2)} / 5</div>
            </div>

            {/* Box 5 — Largest Knowledge→Confidence Gap */}
            <div style={boxBase}>
              <div style={boxLabel}>Largest Knowledge→Confidence Gap</div>
              <div style={boxTitle}>{exec.largestGap.name}</div>
              <div style={boxLine}>Knowledge: <strong style={{ color: '#F4F4F8' }}>{nm(exec.largestGap.knowledge5, 2)}</strong> · Confidence: <strong style={{ color: '#F4F4F8' }}>{nm(exec.largestGap.confidence5, 2)}</strong></div>
              <div style={accentLine('#FFB547')}>Δ {isDemo ? '##.##' : `${deltaSign}${exec.largestGap.delta.toFixed(2)}`}</div>
            </div>
          </div>
        );
      })()}

          {/* ── Key Inferences (learner-side) — mirrors Manager tab pattern ── */}
          <div className="reveal" style={{ ...card, marginBottom: '1.4rem' }}>
            <h2 style={sectionTitle}>Key Inferences</h2>
            {learnerKeyInferences.map((k, i) => {
              const isAlert = k.kind === 'alert';
              const Icon = isAlert ? AlertCircle : Lightbulb;
              const color = isAlert ? '#FB7185' : '#FFCD7A';
              return (
                <div key={i} style={{
                  display: 'flex', gap: 14, padding: '14px 0',
                  borderTop: i ? '1px solid #1F1F2A' : 'none',
                }}>
                  <div style={{
                    width: 32, height: 32, flexShrink: 0,
                    borderRadius: '50%', background: `${color}1A`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={18} color={color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F4F4F8', marginBottom: 6 }}>{k.title}</div>
                    <div style={{ fontSize: '0.95rem', color: '#B4B4C4', lineHeight: 1.6 }}>{k.body}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Overall Cohort — Section Averages ── */}
          {(() => {
            const exec = deriveLearnerExecSummary();
            const sections = [
              { label: 'Section 1', name: 'Learner Details',       score: 0,                max: 0,  color: '#9B83FF' },
              { label: 'Section 2', name: 'Knowledge & Awareness', score: exec.s2OutOf50,   max: 50, color: '#2DD4BF' },
              { label: 'Section 3', name: 'Applied Judgement',     score: exec.s3OutOf25,   max: 25, color: '#60A5FA' },
              { label: 'Section 4', name: 'Open Reflection',       score: 0,                max: 0,  color: '#00D4FF' },
            ];
            const bar = (score, max, color, pending) => {
              const pct = pending || score == null || !max ? 0 : Math.max(0, Math.min(100, (score / max) * 100));
              return (
                <div style={{ position: 'relative', height: 10, borderRadius: 999, background: '#23232E', overflow: 'hidden' }}>
                  {!pending && !!max && (
                    <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 999, transition: 'width 0.5s ease' }} />
                  )}
                </div>
              );
            };
            const scored = sections.filter(s => !s.pending && s.max > 0);
            const total = scored.reduce((acc, s) => acc + s.score, 0);
            const totalMax = scored.reduce((acc, s) => acc + s.max, 0);
            const totalPct = (total / totalMax) * 100;

            return (
              <div className="reveal" style={{ marginBottom: '2rem' }}>
                <h2 style={sectionTitle}>Overall Cohort — Section Averages</h2>
                <div style={{ ...card, padding: '1.5rem 1.6rem' }}>
                  {sections.map((s, i) => {
                    const isSection2 = s.label === 'Section 2';
                    return (
                    <div key={s.label} style={{ borderTop: i ? '1px solid #2A2A38' : 'none' }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '220px 1fr 110px',
                        gap: 20,
                        alignItems: 'center',
                        padding: '14px 0',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#F4F4F8' }}>{s.label}</div>
                          <div style={{ fontSize: '0.78rem', color: '#B4B4C4', marginTop: 2 }}>{s.name}</div>
                        </div>
                        {bar(s.score, s.max, s.color, s.pending)}
                        <div style={{ textAlign: 'right' }}>
                          {s.pending ? (
                            <>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: 999,
                                background: 'rgba(255,181,71,0.12)',
                                border: '1px solid rgba(255,181,71,0.35)',
                                color: '#FFCD7A',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                letterSpacing: '0.03em',
                              }}>Pending rubric</span>
                              <div style={{ fontSize: '0.72rem', color: '#71717F', marginTop: 4 }}>/ {s.max}</div>
                            </>
                          ) : s.max > 0 ? (
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F4F4F8' }}>
                              {nm(s.score)} <span style={{ fontSize: '0.78rem', color: '#71717F', fontWeight: 600 }}>/ {s.max}</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.78rem', color: '#71717F', fontWeight: 600 }}>—</div>
                          )}
                        </div>
                      </div>

                      {isSection2 && (() => {
                        const gapRows = moduleCohort.map((m, idx) => ({
                          n: idx + 1,
                          code: m.code || `m${idx + 1}`,
                          name: m.module,
                          k5: pctTo5(m.knowledge),
                          c5: pctTo5(m.confidence),
                          gap: pctTo5(m.confidence) - pctTo5(m.knowledge),
                        }));
                        return (
                          <div style={{
                            margin: '4px 0 14px',
                            padding: '14px 16px',
                            background: 'rgba(45,212,191,0.04)',
                            border: '1px solid #23232E',
                            borderRadius: 10,
                          }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9B83FF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                              Knowledge–Confidence Gap per Module
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#B4B4C4', marginBottom: 10 }}>
                              Knowledge score vs confidence rating — cohort averages
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                              {gapRows.map((r, idx) => {
                                const aligned = Math.abs(r.gap) < 0.15;
                                const over = r.gap >= 0.15;
                                const under = r.gap <= -0.15;
                                const barColor = under ? '#2DD4BF' : over ? '#FFB547' : '#38BDF8';
                                const tag = aligned ? { txt: '≈ Aligned', bg: 'rgba(45,212,191,0.12)', fg: '#2DD4BF', border: 'rgba(45,212,191,0.3)' }
                                  : over ? { txt: `C > K +${nm(r.gap, 2)}`, bg: 'rgba(255,181,71,0.14)', fg: '#FFB547', border: 'rgba(255,181,71,0.3)' }
                                  : { txt: `K > C ${nm(r.gap, 2)}`, bg: 'rgba(251,113,133,0.14)', fg: '#FB7185', border: 'rgba(251,113,133,0.3)' };
                                const subtitle = aligned ? '' : over ? 'overconfident' : 'underconfident';
                                return (
                                  <div key={r.code} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr auto', alignItems: 'center', gap: 16, padding: '0.75rem 0', borderTop: idx ? '1px solid #2A2A38' : 'none' }}>
                                    <div>
                                      <div style={{ fontWeight: 700, color: '#F4F4F8', fontSize: '0.84rem' }}>{r.name}</div>
                                      {subtitle && <div style={{ fontSize: '0.68rem', color: '#71717F', marginTop: 2 }}>{subtitle}</div>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ color: '#71717F', fontSize: '0.7rem', fontWeight: 700 }}>K</span>
                                      <div style={{ flex: 1, height: 8, background: '#0A0A0F', border: '1px solid #2A2A38', borderRadius: 999, position: 'relative' }}>
                                        <div style={{ width: `${(r.k5 / 5) * 100}%`, height: '100%', borderRadius: 999, background: barColor }} />
                                        <div style={{ position: 'absolute', left: `${(r.c5 / 5) * 100}%`, top: -2, bottom: -2, width: 2, background: '#F4F4F8', borderRadius: 2 }} title={`C = ${r.c5.toFixed(2)}`} />
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <span style={{ fontVariantNumeric: 'tabular-nums', color: aligned ? '#2DD4BF' : under ? '#FB7185' : '#9B83FF', fontSize: '0.74rem', fontWeight: 600 }}>
                                        K {nm(r.k5, 2)} · C {nm(r.c5, 2)}
                                      </span>
                                      <span style={{
                                        padding: '3px 10px', borderRadius: 999,
                                        fontSize: '0.66rem', fontWeight: 700,
                                        color: tag.fg, background: tag.bg, border: '1px solid ' + tag.border,
                                        whiteSpace: 'nowrap',
                                      }}>{tag.txt}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    );
                  })}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '220px 1fr 110px',
                    gap: 20,
                    alignItems: 'center',
                    marginTop: 12,
                    padding: '14px 16px',
                    background: 'rgba(45,212,191,0.06)',
                    border: '1px solid rgba(45,212,191,0.25)',
                    borderRadius: 10,
                  }}>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#F4F4F8' }}>Total (S2+S3)</div>
                      <div style={{ fontSize: '0.78rem', color: '#B4B4C4', marginTop: 2 }}>Out of {totalMax} scored</div>
                    </div>
                    <div style={{ position: 'relative', height: 10, borderRadius: 999, background: '#23232E', overflow: 'hidden' }}>
                      <div style={{ width: totalPct + '%', height: '100%', background: '#2DD4BF', borderRadius: 999, transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '1.05rem', fontWeight: 800, color: '#F4F4F8' }}>
                      {nm(total)} <span style={{ fontSize: '0.78rem', color: '#71717F', fontWeight: 600 }}>/ {totalMax}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Section 2 — Per-module gauge (Knowledge /10 outer + Confidence /5 inner) ── */}
          {(() => {
            const rows = moduleCohort.map((m, idx) => ({
              n: idx + 1,
              code: m.code || `m${idx + 1}`,
              name: m.module,
              knowledge10: pctTo10(m.knowledge),
              confidence5: pctTo5(m.confidence),
            }));
            const knowCol = () => '#2DD4BF'; // Knowledge — teal (fixed, matches Manager scheme)
            const confCol = () => '#60A5FA'; // Confidence — blue (fixed, matches Manager scheme)
            return (
              <div className="reveal" style={{ marginBottom: '2rem' }}>
                <h2 style={sectionTitle}>Knowledge vs Confidence</h2>
                <div style={{ ...card }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.1rem' }}>
                  {rows.map((r) => {
                    const knowledge  = r.knowledge10;
                    const confidence = r.confidence5;
                    const kCol = knowCol(knowledge);
                    const cCol = confCol(confidence);
                    const knowData = [{ name: 'Knowledge',  value: knowledge },  { name: 'remK', value: 10 - knowledge }];
                    const confData = [{ name: 'Confidence', value: confidence }, { name: 'remC', value: 5  - confidence }];
                    return (
                      <div key={r.code} style={{
                        background: '#14141C', border: '1px solid #2A2A38', borderRadius: 12,
                        padding: '1rem 1rem 0.9rem',
                      }}>
                        <div style={{ textAlign: 'center', marginBottom: 6 }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F4F4F8' }}>{r.name}</div>
                        </div>
                        <div style={{ position: 'relative', width: '100%', height: 320 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              {/* Outer ring — Knowledge /10 */}
                              <Pie
                                data={knowData} dataKey="value"
                                cx="50%" cy="50%"
                                innerRadius={118} outerRadius={148}
                                startAngle={90} endAngle={-270}
                                stroke="#14141C" strokeWidth={2}
                                label={false} labelLine={false}
                                isAnimationActive={false}
                              >
                                <Cell fill={kCol} />
                                <Cell fill="#2A2A38" />
                              </Pie>
                              {/* Inner ring — Confidence /5 */}
                              <Pie
                                data={confData} dataKey="value"
                                cx="50%" cy="50%"
                                innerRadius={78} outerRadius={108}
                                startAngle={90} endAngle={-270}
                                stroke="#14141C" strokeWidth={2}
                                label={false} labelLine={false}
                                isAnimationActive={false}
                              >
                                <Cell fill={cCol} />
                                <Cell fill="#22222D" />
                              </Pie>
                              <Tooltip
                                contentStyle={tooltipContent} labelStyle={tooltipLabel} itemStyle={tooltipItem}
                                formatter={(v, n) => {
                                  if (n === 'Knowledge')  return [`${v.toFixed(2)} / 10`, 'Knowledge'];
                                  if (n === 'Confidence') return [`${v.toFixed(2)} / 5`, 'Confidence'];
                                  return null;
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div style={{
                            position: 'absolute', inset: 0, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'none', flexDirection: 'column', gap: 2,
                          }}>
                            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: kCol, lineHeight: 1 }}>
                              {nm(knowledge, 2)}<span style={{ fontSize: '0.85rem', color: '#71717F', marginLeft: 2 }}>/10</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#71717F', letterSpacing: '0.04em', marginTop: 2 }}>Knowledge</div>
                            <div style={{ height: 1, width: 56, background: '#2A2A38', margin: '8px 0' }} />
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: cCol, lineHeight: 1 }}>
                              {nm(confidence, 2)}<span style={{ fontSize: '0.72rem', color: '#71717F', marginLeft: 2 }}>/5</span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#71717F', letterSpacing: '0.04em', marginTop: 2 }}>Confidence</div>
                          </div>
                        </div>
                        <div style={{
                          display: 'flex', justifyContent: 'center', gap: 14,
                          marginTop: 10, fontSize: '0.7rem', color: '#B4B4C4',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: kCol }} />
                            <span>Knowledge /10</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: cCol }} />
                            <span>Confidence /5</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#71717F', marginTop: 14, lineHeight: 1.55 }}>
                  Outer ring = Knowledge score on a /10 scale. Inner ring = self-rated Confidence on a /5 scale. Confidence is a separate signal and is not part of the Section 2 knowledge score.
                </div>
                </div>
              </div>
            );
          })()}

          {/* ── Strengths, Challenges & Narrative Patterns (unified) ── */}
          {(() => {
            const strRows = learnerStrengths;
            const chRows = learnerChallenges;
            const maxStr = Math.max(1, ...strRows.map((r) => r.count));
            const maxCh = Math.max(1, ...chRows.map((r) => r.count));
            const themeList = (rows, max, leftHeader, countHeader) => (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1.4fr 1fr auto', alignItems: 'center', gap: 14,
                  padding: '0 0 0.5rem', borderBottom: '1px solid #2A2A38',
                  fontSize: '0.68rem', fontWeight: 700, color: '#71717F', letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  <div>{leftHeader}</div>
                  <div>{countHeader}</div>
                  <div style={{ minWidth: 28, textAlign: 'right' }} />
                </div>
                {rows.map((r, i) => (
                  <div key={r.label} style={{
                    display: 'grid', gridTemplateColumns: '1.4fr 1fr auto', alignItems: 'center', gap: 14,
                    padding: '0.7rem 0', borderTop: i ? '1px solid #2A2A38' : 'none',
                  }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#F4F4F8', lineHeight: 1.35 }}>{r.label}</div>
                    <div style={{ height: 7, background: '#14141C', border: '1px solid #2A2A38', borderRadius: 999 }}>
                      <div style={{ width: `${(r.count / max) * 100}%`, height: '100%', borderRadius: 999, background: r.color }} />
                    </div>
                    <div style={{ minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#F4F4F8', fontWeight: 700, fontSize: '0.95rem' }}>{intTxt(r.count)}</div>
                  </div>
                ))}
              </div>
            );

            const total = cohortSummary.totalRespondents || learnerData.length || 0;
            const patterns = learnerNarrativePatterns;

            const patternCard = (p) => (
              <div key={p.title} style={{ ...card }}>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 18, alignItems: 'stretch' }}>
                  <div style={{
                    background: p.tone.bg,
                    border: '1px solid ' + p.tone.border,
                    borderRadius: 12,
                    padding: '18px 12px',
                    textAlign: 'center',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: 42, fontWeight: 800, color: p.tone.num, lineHeight: 1 }}>{intTxt(p.count)}</div>
                    <div style={{ fontSize: '0.78rem', color: p.tone.sub, marginTop: 6, fontWeight: 500 }}>of {total} learners</div>
                    <div style={{ fontSize: '1rem', color: p.tone.num, fontWeight: 700, marginTop: 2 }}>{intTxt(p.pct)}%</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F4F4F8' }}>{p.title}</div>
                    <div style={{ fontSize: '0.88rem', color: '#F4F4F8', lineHeight: 1.6 }}>
                      <span style={{ fontWeight: 700 }}>Pattern: </span>{p.pattern}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#F4F4F8', lineHeight: 1.6 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Programme implication:</div>
                      {p.implication}
                    </div>
                  </div>
                </div>
              </div>
            );

            return (
              <div className="reveal" style={{ marginBottom: '2rem' }}>
                <h2 style={sectionTitle}>
                  Strengths, Challenges & Narrative Patterns
                </h2>
                <div style={{
                  border: '1px solid #2A2A38',
                  borderRadius: 16,
                  padding: '1.25rem',
                  background: 'rgba(124,92,255,0.03)',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ ...card }}>
                      {themeList(strRows, maxStr, 'Top rated strengths', 'Times noted')}
                    </div>
                    <div style={{ ...card }}>
                      {themeList(chRows, maxCh, 'Top rated challenges', 'Times flagged')}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
                    {patterns.map(patternCard)}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Cohort Breakdown by Team Size Managed + Module-wise table (moved to bottom) ── */}
          {(() => {
            const groups = teamSizeBreakdown.map(g => ({
              label: g.label,
              n: g.n,
              avg: isDemo ? '##.#' : (g.avg75 != null ? g.avg75.toFixed(1) : '—'),
              color: g.color,
            }));
            // Build module rows for the table; cells come from teamSizeMatrix.modules[i].cells
            const modules = teamSizeMatrix.modules.map(m => ({
              n: m.n,
              name: m.name,
              v13: m.cells['1-3'] ?? 0,
              v46: m.cells['4-6'] ?? 0,
              v710: m.cells['7-10'] ?? 0,
            }));
            const pillBg = (v) => v >= 4.0 ? 'rgba(45,212,191,0.15)' : v >= 3.4 ? 'rgba(96,165,250,0.13)' : 'rgba(255,181,71,0.15)';
            const pillFg = (v) => v >= 4.0 ? '#2DD4BF' : v >= 3.4 ? '#60A5FA' : '#FFB547';
            const pill = (v) => (
              <span style={{
                display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                background: pillBg(v), color: pillFg(v),
                fontSize: '0.86rem', fontWeight: 700, minWidth: 56, textAlign: 'center',
              }}>{nm(v, 2)}</span>
            );
            return (
              <>
                {/* Breakdown cards */}
                <div className="reveal" style={{ ...card, marginBottom: '1.4rem' }}>
                  <h2 style={sectionTitle}>Team Size Vs Confidence</h2>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '0.9rem',
                  }}>
                    {groups.map((g) => (
                      <div key={g.label} style={{
                        background: '#14141C', border: `1px solid ${g.color}33`, borderRadius: 12,
                        padding: '1rem 1rem', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: g.color, lineHeight: 1 }}>{g.label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#B4B4C4', marginTop: 6 }}>
                          Number of participants: {intTxt(g.n)}
                        </div>
                        <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#F4F4F8', marginTop: 10, lineHeight: 1 }}>{g.avg}</div>
                        <div style={{ fontSize: '0.7rem', color: '#71717F', marginTop: 4 }}>avg score /75</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Module-wise table */}
                <div className="reveal" style={{ ...card, marginBottom: '2rem' }}>
                  <h2 style={sectionTitle}>Module-wise Scores per Team Size Group — Avg /5</h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ background: '#14141C' }}>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#B4B4C4', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #2A2A38' }}>Module</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#2DD4BF', fontWeight: 700, fontSize: '0.78rem', borderBottom: '1px solid #2A2A38' }}>1-3 team members (N={intTxt(teamSizeMatrix.groups?.['1-3'] || 0)})</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#60A5FA', fontWeight: 700, fontSize: '0.78rem', borderBottom: '1px solid #2A2A38' }}>4-6 team members (N={intTxt(teamSizeMatrix.groups?.['4-6'] || 0)})</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#FFB547', fontWeight: 700, fontSize: '0.78rem', borderBottom: '1px solid #2A2A38' }}>7-10 team members (N={intTxt(teamSizeMatrix.groups?.['7-10'] || 0)})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map((m, i) => (
                          <tr key={m.n} style={{ background: i % 2 ? '#14141C' : '#1A1A24' }}>
                            <td style={{ padding: '0.85rem 1rem', color: '#F4F4F8', borderBottom: '1px solid #2A2A38' }}>
                              <span style={{ fontWeight: 700, color: '#F4F4F8' }}>{m.name}</span>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center', borderBottom: '1px solid #2A2A38' }}>{pill(m.v13)}</td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center', borderBottom: '1px solid #2A2A38' }}>{pill(m.v46)}</td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center', borderBottom: '1px solid #2A2A38' }}>{pill(m.v710)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#B4B4C4', marginTop: 14, lineHeight: 1.6 }}>
                    {teamSizeNarrative}
                  </div>
                </div>
              </>
            );
          })()}

      </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '1.5rem 0 0.5rem', fontSize: '0.9rem', color: '#FFFFFF' }}>
        {uiStrings.footer || `${uiStrings.platformName || 'Siksha Assessment Platform'} © ${uiStrings.copyrightYear || new Date().getFullYear()} · All rights reserved`}
      </div>
    </div>
  );
}
