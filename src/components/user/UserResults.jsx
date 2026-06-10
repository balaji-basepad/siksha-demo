import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  assessmentQuestions, openEndedQuestions, scaleLabels,
  subSectionAverages, bandDefinitions, learnerData,
} from '../../data/assessmentData';

// Simulate user data using learner #3 (Prasanna)
const userData = learnerData[2];

const s = {
  container: { maxWidth: 900, margin: '0 auto', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#B4B4C4', fontSize: 14, cursor: 'pointer', marginBottom: 20, padding: 0 },
  title: { fontSize: 26, fontWeight: 800, color: '#7C5CFF', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#B4B4C4', marginBottom: 32 },
  // Score circle
  scoreCircleWrap: { display: 'flex', justifyContent: 'center', marginBottom: 36 },
  scoreCircle: {
    width: 180, height: 180, borderRadius: '50%',
    background: 'linear-gradient(135deg, #7C5CFF, #00D4FF)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 12px 40px rgba(79,70,229,0.3)',
  },
  scoreValue: { fontSize: 48, fontWeight: 800, color: '#FFFFFF', lineHeight: 1 },
  scoreLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  scoreMax: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  // Section cards
  sectionGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 },
  sectionCard: (color) => ({
    background: '#1A1A24', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    padding: '24px 20px', borderTop: `4px solid ${color}`, textAlign: 'center',
  }),
  sectionCardTitle: { fontSize: 14, fontWeight: 600, color: '#B4B4C4', marginBottom: 8 },
  sectionCardScore: { fontSize: 32, fontWeight: 800, color: '#7C5CFF' },
  sectionCardMax: { fontSize: 13, color: '#71717F' },
  // Band
  bandCard: { background: '#1A1A24', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', padding: '24px 28px', marginBottom: 28 },
  bandTitle: { fontSize: 17, fontWeight: 700, color: '#7C5CFF', marginBottom: 12 },
  bandIndicator: (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 12,
    background: color + '18', color, fontSize: 16, fontWeight: 700, marginBottom: 12,
  }),
  bandDesc: { fontSize: 14, color: '#B4B4C4', lineHeight: 1.6 },
  // Charts
  chartCard: { background: '#1A1A24', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', padding: '24px 28px', marginBottom: 28 },
  chartTitle: { fontSize: 17, fontWeight: 700, color: '#7C5CFF', marginBottom: 16 },
  chartRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 },
  // Accordion
  accordion: { background: '#1A1A24', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: 28, overflow: 'hidden' },
  accordionHeader: (open) => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 24px', cursor: 'pointer', borderBottom: open ? '1px solid #1A1A24' : 'none',
  }),
  accordionTitle: { fontSize: 16, fontWeight: 700, color: '#7C5CFF' },
  accordionBody: { padding: '16px 24px' },
  responseItem: { padding: '12px 0', borderBottom: '1px solid #1A1A24' },
  responseQ: { fontSize: 14, color: '#B4B4C4', marginBottom: 4 },
  responseA: { fontSize: 15, fontWeight: 600, color: '#7C5CFF' },
};

// Build sub-section chart data
const subSecChartData = subSectionAverages.map(s => ({ name: s.name.replace(/ & .*/, ''), score: s.average }));

// Radar data (simulated personal scores based on userData)
const radarData = [
  { subject: 'Self-Awareness', A: 3.83 },
  { subject: 'Motivation', A: 3.67 },
  { subject: 'Team Leadership', A: 3.50 },
  { subject: 'Collaboration', A: 3.83 },
  { subject: 'Feedback', A: 3.67 },
  { subject: 'Stakeholder', A: 3.50 },
  { subject: 'Trust', A: 3.83 },
  { subject: 'Change', A: 3.83 },
];

// Simulated answers for display
const sampleScaleAnswers = {};
assessmentQuestions.forEach((q, i) => { sampleScaleAnswers[q.id] = Math.min(4, Math.max(1, Math.round(3.5 + (i % 3 === 0 ? 0.5 : i % 3 === 1 ? -0.5 : 0)))); });

const sectionColors = ['#F4F4F8', '#2DD4BF', '#FFB547'];

export default function UserResults() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [openSections, setOpenSections] = useState({});

  const toggleAccordion = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const band = userData.band;
  const bandInfo = bandDefinitions[band];

  return (
    <div style={s.container}>
      <button style={s.backBtn} onClick={() => navigate('/user/assessments')}><ArrowLeft size={16} /> Back to Assessments</button>
      <div style={s.title}>Your Assessment Results</div>
      <div style={s.subtitle}>Here is a summary of your performance across all sections.</div>

      {/* Overall Score */}
      <div style={s.scoreCircleWrap}>
        <div style={s.scoreCircle}>
          <div style={s.scoreValue}>{userData.overall.toFixed(2)}</div>
          <div style={s.scoreLabel}>Overall Score</div>
          <div style={s.scoreMax}>out of 4.00</div>
        </div>
      </div>

      {/* Section Breakdown */}
      <div style={s.sectionGrid}>
        {[
          { title: 'Managing Self', score: userData.mngSelf, color: sectionColors[0] },
          { title: 'Managing Teams', score: userData.mngTeams, color: sectionColors[1] },
          { title: 'Managing Business', score: userData.mngBusiness, color: sectionColors[2] },
        ].map(sec => (
          <div key={sec.title} style={s.sectionCard(sec.color)}>
            <div style={s.sectionCardTitle}>{sec.title}</div>
            <div style={s.sectionCardScore}>{sec.score.toFixed(2)}</div>
            <div style={s.sectionCardMax}>/ 4.00</div>
          </div>
        ))}
      </div>

      {/* Band Indicator */}
      <div style={s.bandCard}>
        <div style={s.bandTitle}>Your Performance Band</div>
        <div style={s.bandIndicator(bandInfo.color)}>{band} ({bandInfo.range})</div>
        <div style={s.bandDesc}>{bandInfo.description}</div>
      </div>

      {/* Charts */}
      <div style={s.chartRow}>
        <div style={s.chartCard}>
          <div style={s.chartTitle}>Sub-section Scores</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subSecChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A24" />
              <XAxis type="number" domain={[0, 4]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="score" name="Score" radius={[0, 8, 8, 0]} fill="#F4F4F8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={s.chartCard}>
          <div style={s.chartTitle}>Leadership Profile</div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#2A2A38" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#B4B4C4' }} />
              <PolarRadiusAxis domain={[0, 4]} tick={{ fontSize: 10 }} />
              <Radar name="Score" dataKey="A" stroke="#F4F4F8" fill="#F4F4F8" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Responses Accordion */}
      <div style={{ fontSize: 20, fontWeight: 700, color: '#7C5CFF', marginBottom: 16 }}>Your Responses</div>
      {['Managing Self', 'Managing Teams', 'Managing Business'].map((sectionName, sIdx) => {
        const sectionQs = assessmentQuestions.filter(q => q.section === sectionName);
        const openQs = openEndedQuestions[sectionName] || [];
        const isOpen = openSections[sectionName];
        return (
          <div key={sectionName} style={s.accordion}>
            <div style={s.accordionHeader(isOpen)} onClick={() => toggleAccordion(sectionName)}>
              <div style={s.accordionTitle}>{sectionName}</div>
              {isOpen ? <ChevronUp size={18} color="#B4B4C4" /> : <ChevronDown size={18} color="#B4B4C4" />}
            </div>
            {isOpen && (
              <div style={s.accordionBody}>
                {sectionQs.map(q => (
                  <div key={q.id} style={s.responseItem}>
                    <div style={s.responseQ}>{q.text}</div>
                    <div style={s.responseA}>
                      {sampleScaleAnswers[q.id]} - {scaleLabels[sampleScaleAnswers[q.id]]}
                    </div>
                  </div>
                ))}
                {openQs.map((text, idx) => (
                  <div key={idx} style={s.responseItem}>
                    <div style={s.responseQ}>{text}</div>
                    <div style={{ ...s.responseA, fontStyle: 'italic', color: '#B4B4C4' }}>
                      (Open-ended response recorded)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
