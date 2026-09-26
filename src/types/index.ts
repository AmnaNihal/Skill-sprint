export type NavigationTab =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'employees'
  | 'documents'
  | 'matrix'
  | 'generatePlan'
  | 'planDetails'
  | 'validation'
  | 'reviews'
  | 'learnerDashboard'
  | 'reports';

export type NavView = NavigationTab;

export type UserRole = 'admin' | 'learner' | 'manager';

export type PipelineStep =
  | 'Validation'
  | 'Parsing'
  | 'Metadata Extraction'
  | 'Chunking'
  | 'Versioning'
  | 'Approved Repository';

export type DocumentCategory =
  | 'Architecture'
  | 'Security'
  | 'DevOps'
  | 'Data'
  | 'Company Policy';

export type RequirementCategory =
  | 'Architecture'
  | 'Security'
  | 'Operations'
  | 'Compliance'
  | 'Tooling'
  | 'Domain Knowledge';

export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'High' | 'Medium' | 'Low';

export interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  version: string;
  uploadedAt: string;
  status: 'Approved' | 'Processing' | 'Draft' | 'Quarantined';
  fileSize: string;
  chunksCount: number;
  chunkCount?: number;
  tags: string[];
}

export interface RequirementItem {
  id: string;
  role: string;
  category: RequirementCategory;
  title: string;
  description: string;
  priority: PriorityLevel;
  mandatory: boolean;
  sourceDocId: string;
  sourceDoc?: string;
}

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  type: string;
  estimatedMinutes: number;
  completed: boolean;
  docCitation?: string;
}

export interface PlanModule {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  status: 'Completed' | 'In Progress' | 'Not Started';
  sourceCitations: string[];
  sourceSection?: string;
  tasks: PlanTask[];
}

export interface OnboardingPlan {
  id: string;
  employeeName: string;
  roleTitle: string;
  department: string;
  targetCompletion: string;
  status: 'In Progress' | 'Approved' | 'Pending Review' | 'Completed';
  progress: number;
  validationScore: number;
  modules: PlanModule[];
}

export interface ValidationItem {
  id: string;
  requirementId: string;
  title: string;
  aiGeneratedContent: string;
  pythonRuleEngineStatus: 'Match' | 'Discrepancy' | 'Missing Ref';
  confidenceScore: number;
  ruleCitation: string;
  status: 'Verified' | 'Flagged' | 'Under Review';
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
