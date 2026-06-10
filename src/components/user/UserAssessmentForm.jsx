import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronRight, Edit3 } from 'lucide-react';
import { assessmentQuestions, openEndedQuestions, scaleLabels, sections } from '../../data/assessmentData';

const sectionNames = ['Managing Self', 'Managing Teams', 'Managing Business'];
const stepLabels = [...sectionNames, 'Review & Submit'];

const styles = {
  container: { maxWidth: 820, margin: '0 auto', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' },
  stepper: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 36, gap: 0 },
  stepWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: (active, completed) => ({
    width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 15, fontWeight: 600, color: '#FFFFFF', zIndex: 1,
    background: completed ? '#2DD4BF' : active ? '#F4F4F8' : '#2A2A38', transition: 'all 0.3s',
  }),
  stepLabel: (active) => ({
    marginTop: 8, fontSize: 12, fontWeight: active ? 700 : 400,
    color: active ? '#F4F4F8' : '#B4B4C4', textAlign: 'center', maxWidth: 100,
  }),
  stepLine: (completed) => ({
    position: 'absolute', top: 20, left: 'calc(50% + 20px)', right: 'calc(-50% + 20px)',
    height: 3, background: completed ? '#2DD4BF' : '#2A2A38', zIndex: 0,
  }),
  card: { background: '#1A1A24', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', padding: '28px 28px', marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: 700, color: '#7C5CFF', marginBottom: 4 },
  sectionDesc: { fontSize: 14, color: '#B4B4C4', marginBottom: 24 },
  questionCard: { border: '1px solid #2A2A38', borderRadius: 14, padding: '20px 24px', marginBottom: 16, background: '#14141C' },
  questionNum: { fontSize: 12, fontWeight: 700, color: '#F4F4F8', marginBottom: 6 },
  questionText: { fontSize: 15, fontWeight: 500, color: '#7C5CFF', marginBottom: 14, lineHeight: 1.5 },
  scaleRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  scalePill: (selected) => ({
    padding: '10px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
    border: selected ? '2px solid #F4F4F8' : '2px solid #2A2A38',
    background: selected ? 'linear-gradient(135deg, #7C5CFF, #00D4FF)' : '#1A1A24',
    color: selected ? '#1A1A24' : '#F4F4F8',
    transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90,
  }),
  scaleNum: { fontSize: 18, fontWeight: 700 },
  scaleLabel: { fontSize: 11, fontWeight: 400, marginTop: 2 },
  textarea: { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #2A2A38', fontSize: 15, outline: 'none', boxSizing: 'border-box', minHeight: 100, resize: 'vertical', fontFamily: 'inherit' },
  progressWrap: { marginBottom: 24 },
  progressLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#B4B4C4', marginBottom: 6 },
  progressBar: { width: '100%', height: 6, borderRadius: 8, background: '#14141C', border: '1px solid #2A2A38' },
  progressFill: (pct) => ({
    height: '100%', borderRadius: 8, width: `${pct}%`,
    background: 'linear-gradient(90deg, #7C5CFF, #00D4FF)', transition: 'width 0.4s',
  }),
  navRow: { display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  btnPrimary: { padding: '12px 32px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7C5CFF,#00D4FF)', color: '#FFFFFF', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '12px 32px', borderRadius: 10, border: '1.5px solid #2A2A38', background: '#1A1A24', color: '#F4F4F8', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  btnSubmit: { padding: '14px 40px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#2DD4BF,#2DD4BF)', color: '#FFFFFF', fontSize: 16, fontWeight: 700, cursor: 'pointer' },
  // Review
  reviewSection: { marginBottom: 24 },
  reviewSectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewSectionTitle: { fontSize: 17, fontWeight: 700, color: '#7C5CFF' },
  editBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: '1px solid #2A2A38', background: '#1A1A24', color: '#F4F4F8', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  reviewItem: { padding: '10px 0', borderBottom: '1px solid #1A1A24', fontSize: 14 },
  reviewQ: { color: '#B4B4C4', marginBottom: 4 },
  reviewA: { color: '#7C5CFF', fontWeight: 600 },
  // Success
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modal: { background: '#1A1A24', borderRadius: 20, padding: '48px 40px', textAlign: 'center', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' },
  successIcon: { width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#2DD4BF,#5EEAD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
};

export default function UserAssessmentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Answers state: keyed by question id
  const [scaleAnswers, setScaleAnswers] = useState({});
  const [openAnswers, setOpenAnswers] = useState({});

  // Get questions per section
  const getScaleQs = (section) => assessmentQuestions.filter(q => q.section === section);
  const getOpenQs = (section) => openEndedQuestions[section] || [];

  const setScale = (qId, val) => setScaleAnswers(prev => ({ ...prev, [qId]: val }));
  const setOpen = (key, val) => setOpenAnswers(prev => ({ ...prev, [key]: val }));

  const goNext = () => setCurrentStep(s => Math.min(s + 1, 3));
  const goBack = () => setCurrentStep(s => Math.max(s - 1, 0));

  const handleSubmit = () => setShowSuccess(true);

  const renderStepper = () => (
    <div style={styles.stepper}>
      {stepLabels.map((label, i) => (
        <div key={i} style={styles.stepWrapper}>
          {i < stepLabels.length - 1 && <div style={styles.stepLine(i < currentStep)} />}
          <div style={styles.stepCircle(i === currentStep, i < currentStep)}>
            {i < currentStep ? <Check size={18} /> : i + 1}
          </div>
          <div style={styles.stepLabel(i === currentStep)}>{label}</div>
        </div>
      ))}
    </div>
  );

  const renderSectionStep = (sectionIdx) => {
    const sectionName = sectionNames[sectionIdx];
    const sectionInfo = sections[sectionIdx];
    const scaleQs = getScaleQs(sectionName);
    const openQs = getOpenQs(sectionName);
    const totalQs = scaleQs.length + openQs.length;
    const answeredScale = scaleQs.filter(q => scaleAnswers[q.id] !== undefined).length;
    const answeredOpen = openQs.filter((_, i) => openAnswers[`${sectionName}-${i}`]?.trim()).length;
    const answered = answeredScale + answeredOpen;
    const pct = totalQs > 0 ? Math.round((answered / totalQs) * 100) : 0;

    return (
      <div>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>{sectionName}</div>
          <div style={styles.sectionDesc}>{sectionInfo?.description || ''}</div>

          <div style={styles.progressWrap}>
            <div style={styles.progressLabel}>
              <span>{answered} of {totalQs} questions answered</span>
              <span>{pct}%</span>
            </div>
            <div style={styles.progressBar}><div style={styles.progressFill(pct)} /></div>
          </div>

          {scaleQs.map((q, idx) => (
            <div key={q.id} style={styles.questionCard}>
              <div style={styles.questionNum}>Q{idx + 1} {q.subSection && <span style={{ color: '#71717F', fontWeight: 400 }}>| {q.subSection}</span>}</div>
              <div style={styles.questionText}>{q.text}</div>
              <div style={styles.scaleRow}>
                {[1, 2, 3, 4].map(val => (
                  <div key={val} style={styles.scalePill(scaleAnswers[q.id] === val)} onClick={() => setScale(q.id, val)}>
                    <div style={styles.scaleNum}>{val}</div>
                    <div style={styles.scaleLabel}>{scaleLabels[val]}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {openQs.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F4F4F8', marginBottom: 12 }}>Open-Ended Questions</div>
              {openQs.map((text, idx) => (
                <div key={idx} style={styles.questionCard}>
                  <div style={styles.questionText}>{text}</div>
                  <textarea
                    style={styles.textarea}
                    placeholder="Type your response..."
                    value={openAnswers[`${sectionName}-${idx}`] || ''}
                    onChange={e => setOpen(`${sectionName}-${idx}`, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReview = () => (
    <div style={styles.card}>
      <div style={styles.sectionTitle}>Review & Submit</div>
      <div style={styles.sectionDesc}>Review your responses before submitting. You can edit any section.</div>

      {sectionNames.map((sectionName, sIdx) => {
        const scaleQs = getScaleQs(sectionName);
        const openQs = getOpenQs(sectionName);
        return (
          <div key={sectionName} style={styles.reviewSection}>
            <div style={styles.reviewSectionHeader}>
              <div style={styles.reviewSectionTitle}>{sectionName}</div>
              <button style={styles.editBtn} onClick={() => setCurrentStep(sIdx)}><Edit3 size={14} /> Edit</button>
            </div>
            {scaleQs.map(q => (
              <div key={q.id} style={styles.reviewItem}>
                <div style={styles.reviewQ}>{q.text}</div>
                <div style={styles.reviewA}>
                  {scaleAnswers[q.id] ? `${scaleAnswers[q.id]} - ${scaleLabels[scaleAnswers[q.id]]}` : <span style={{ color: '#FB7185' }}>Not answered</span>}
                </div>
              </div>
            ))}
            {openQs.map((text, idx) => (
              <div key={idx} style={styles.reviewItem}>
                <div style={styles.reviewQ}>{text}</div>
                <div style={styles.reviewA}>
                  {openAnswers[`${sectionName}-${idx}`]?.trim() || <span style={{ color: '#FB7185' }}>Not answered</span>}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <button style={styles.btnSubmit} onClick={handleSubmit}>Submit Assessment</button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#7C5CFF', marginBottom: 4 }}>Assessment</div>
      <div style={{ fontSize: 14, color: '#B4B4C4', marginBottom: 28 }}>Complete all sections and submit your responses.</div>
      {renderStepper()}
      {currentStep < 3 ? renderSectionStep(currentStep) : renderReview()}
      <div style={styles.navRow}>
        <button style={styles.btnSecondary} onClick={goBack} disabled={currentStep === 0}>Back</button>
        {currentStep < 3 && <button style={styles.btnPrimary} onClick={goNext}>Next <ChevronRight size={16} style={{ verticalAlign: 'middle' }} /></button>}
      </div>

      {showSuccess && (
        <div style={styles.overlay} onClick={() => { setShowSuccess(false); navigate(`/user/results/${id}`); }}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.successIcon}><Check size={36} color="#1A1A24" /></div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#7C5CFF', marginBottom: 8 }}>Assessment Submitted!</div>
            <div style={{ fontSize: 14, color: '#B4B4C4', marginBottom: 24 }}>Thank you for completing the assessment. Your responses have been recorded.</div>
            <button style={styles.btnPrimary} onClick={() => navigate(`/user/results/${id}`)}>View My Results</button>
          </div>
        </div>
      )}
    </div>
  );
}
