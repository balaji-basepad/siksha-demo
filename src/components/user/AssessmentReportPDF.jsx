import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';

// Map of which PDF to show per assessment id + phase.
// Drop the file into /public and reference it by its served path.
const PDF_MAP = {
  tm: {
    pre: { src: '/arcesium-pre-journey-assessment.pdf', title: 'Tenured Managers · Pre-Journey Assessment Analysis' },
  },
};

const s = {
  page: {
    minHeight: '100vh',
    background: '#0A0A0F',
    backgroundImage:
      'radial-gradient(circle at 12% 8%, rgba(124,92,255,0.10) 0%, transparent 35%),' +
      'radial-gradient(circle at 88% 92%, rgba(0,212,255,0.08) 0%, transparent 35%)',
    backgroundAttachment: 'fixed',
    padding: '1.75rem',
    fontFamily: "'Poppins', system-ui, sans-serif",
    color: '#F4F4F8',
  },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 12, marginBottom: 16,
  },
  left: { display: 'flex', flexDirection: 'column', gap: 6 },
  backLink: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    color: '#9B83FF', fontSize: 13, fontWeight: 500, textDecoration: 'none',
  },
  title: { fontSize: 18, fontWeight: 700, color: '#F4F4F8', letterSpacing: '-0.01em' },
  subtitle: { fontSize: 12.5, color: '#B4B4C4' },

  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 8,
    border: '1px solid #2A2A38', background: '#1A1A24',
    color: '#F4F4F8', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', textDecoration: 'none',
    fontFamily: "'Poppins', system-ui, sans-serif",
  },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #7C5CFF, #00D4FF)',
    color: '#FFFFFF', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', textDecoration: 'none',
    boxShadow: '0 2px 12px rgba(124,92,255,0.4)',
    fontFamily: "'Poppins', system-ui, sans-serif",
  },

  viewer: {
    background: '#1A1A24',
    border: '1px solid #2A2A38',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
    height: 'calc(100vh - 160px)',
    minHeight: 520,
  },
  iframe: {
    width: '100%', height: '100%',
    border: 'none', display: 'block',
    background: '#1A1A24',
  },
  missing: {
    height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center',
  },
  missingTitle: { fontSize: 16, fontWeight: 700, color: '#F4F4F8', marginBottom: 6 },
  missingDesc: { fontSize: 13, color: '#B4B4C4', maxWidth: 520 },
};

export default function AssessmentReportPDF() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const phase = new URLSearchParams(location.search).get('phase') === 'post' ? 'post' : 'pre';

  const entry = PDF_MAP[id]?.[phase];
  const backTarget = `/user/phases/${id}`;

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div style={s.left}>
          <Link to={backTarget} style={s.backLink}>
            <ArrowLeft size={14} /> Back to Assessment
          </Link>
          <div style={s.title}>{entry?.title || 'Pre-Program Report'}</div>
          <div style={s.subtitle}>Embedded PDF view · use the toolbar inside the viewer to navigate pages</div>
        </div>

        {entry?.src && (
          <div style={s.actions}>
            <a href={entry.src} download style={s.btnPrimary}>
              <Download size={13} /> Download
            </a>
          </div>
        )}
      </div>

      <div style={s.viewer}>
        {entry?.src ? (
          <iframe
            src={`${entry.src}#view=FitH`}
            title={entry.title}
            style={s.iframe}
          />
        ) : (
          <div style={s.missing}>
            <div style={s.missingTitle}>PDF not configured</div>
            <div style={s.missingDesc}>
              No PDF has been mapped for this assessment + phase. Drop the file into
              the <code>public/</code> folder and add an entry to <code>PDF_MAP</code>
              in <code>AssessmentReportPDF.jsx</code>.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
