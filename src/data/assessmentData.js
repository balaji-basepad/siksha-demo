// Standalone demo build — all data is loaded from the local snapshot.json captured from
// the live backend. No API calls are made.

import snapshot from './snapshot.json';

export const DATA_KEYS = Object.keys(snapshot);

// Re-export each snapshot key as a named export so component imports stay identical to
// the main frontend.
export const bandDefinitions = snapshot.bandDefinitions || {};
export const modules = snapshot.modules || [];
export const assessmentQuestions = snapshot.assessmentQuestions || [];
export const openEndedQuestions = snapshot.openEndedQuestions || {};
export const learnerData = snapshot.learnerData || [];
export const managerRatings = snapshot.managerRatings || {};
export const subSectionAverages = snapshot.subSectionAverages || [];
export const questionAverages = snapshot.questionAverages || [];
export const moduleCohort = snapshot.moduleCohort || [];
export const appliedJudgementItems = snapshot.appliedJudgementItems || [];
export const tenureSegmentation = snapshot.tenureSegmentation || [];
export const teamSizeSegmentation = snapshot.teamSizeSegmentation || [];
export const qualitativeThemes = snapshot.qualitativeThemes || {};
export const cohortSummary = snapshot.cohortSummary || {};
export const bandDistribution = snapshot.bandDistribution || [];
export const prePostComparison = snapshot.prePostComparison ?? null;
export const publishedAssessments = snapshot.publishedAssessments || [];
export const clients = snapshot.clients || [];
export const scaleLabels = snapshot.scaleLabels || {};
export const sections = snapshot.sections || [];
export const userAssessments = snapshot.userAssessments || [];
export const managerAssessmentQuestions = snapshot.managerAssessmentQuestions || [];
export const managerOpenEndedQuestions = snapshot.managerOpenEndedQuestions || {};
export const managerLearnerData = snapshot.managerLearnerData || [];
export const managerModuleCohort = snapshot.managerModuleCohort || [];
export const managerAppliedJudgementItems = snapshot.managerAppliedJudgementItems || [];
export const managerDurationSegmentation = snapshot.managerDurationSegmentation || [];
export const managerTeamSegmentation = snapshot.managerTeamSegmentation || [];
export const managerQualitativeThemes = snapshot.managerQualitativeThemes || {};
export const managerCohortSummary = snapshot.managerCohortSummary || {};
export const managerBandDistribution = snapshot.managerBandDistribution || [];
export const combinedLearnerData = snapshot.combinedLearnerData || [];
export const combinedModuleGap = snapshot.combinedModuleGap || [];
export const calibrationPriorities = snapshot.calibrationPriorities || [];
export const confidenceAlignment = snapshot.confidenceAlignment || [];
export const bandComparison = snapshot.bandComparison || [];
export const combinedCohortSummary = snapshot.combinedCohortSummary || {};
export const managerScoringHeader = snapshot.managerScoringHeader || {};
export const managerSection2Modules = snapshot.managerSection2Modules || [];
export const managerSection2Distribution = snapshot.managerSection2Distribution || [];
export const managerSection3Items = snapshot.managerSection3Items || [];
export const managerSection2Overall = snapshot.managerSection2Overall || {};
export const managerSection3Overall = snapshot.managerSection3Overall || {};
export const managerStrengths = snapshot.managerStrengths || [];
export const managerImprovements = snapshot.managerImprovements || [];
export const learnerKeyInferences = snapshot.learnerKeyInferences || [];
export const managerKeyInferences = snapshot.managerKeyInferences || [];
export const uiStrings = snapshot.uiStrings || {};
export const learnerStrengths = snapshot.learnerStrengths || [];
export const learnerChallenges = snapshot.learnerChallenges || [];
export const learnerNarrativePatterns = snapshot.learnerNarrativePatterns || [];
export const teamSizeBreakdown = snapshot.teamSizeBreakdown || [];
export const teamSizeMatrix = snapshot.teamSizeMatrix || { modules: [], groups: {} };
export const teamSizeNarrative = snapshot.teamSizeNarrative || '';

// No-op for compatibility with the live frontend's DataGate which calls hydrate(payload).
export function hydrate() {}
