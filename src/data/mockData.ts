import { DocumentItem, RequirementItem, OnboardingPlan, ValidationItem } from '../types';

export const mockDocuments: DocumentItem[] = [
  {
    id: 'DOC-001',
    title: 'Company Infrastructure & Cloud Security Standards',
    category: 'Architecture',
    version: '3.2',
    uploadedAt: 'Apr 20, 2026',
    status: 'Approved',
    fileSize: '4.2 MB',
    chunksCount: 28,
    chunkCount: 28,
    tags: ['aws', 'terraform', 'iam', 'soc2']
  },
  {
    id: 'DOC-002',
    title: 'Kubernetes Cluster Setup & Ingress Controller Guide',
    category: 'DevOps',
    version: '1.8',
    uploadedAt: 'Apr 18, 2026',
    status: 'Approved',
    fileSize: '3.1 MB',
    chunksCount: 19,
    chunkCount: 19,
    tags: ['k8s', 'istio', 'ingress', 'rbac']
  },
  {
    id: 'DOC-003',
    title: 'SRE Incident Management & PagerDuty Runbooks',
    category: 'Security',
    version: '2.1',
    uploadedAt: 'Apr 15, 2026',
    status: 'Approved',
    fileSize: '2.4 MB',
    chunksCount: 14,
    chunkCount: 14,
    tags: ['sre', 'incident-response', 'slo', 'sli']
  },
  {
    id: 'DOC-004',
    title: 'Production CI/CD Deployment with GitHub Actions & ArgoCD',
    category: 'DevOps',
    version: '2.4',
    uploadedAt: 'Apr 12, 2026',
    status: 'Approved',
    fileSize: '5.6 MB',
    chunksCount: 32,
    chunkCount: 32,
    tags: ['gitops', 'argocd', 'actions', 'helm']
  },
  {
    id: 'DOC-005',
    title: 'Data Platform Kafka & ClickHouse Architecture',
    category: 'Data',
    version: '1.2',
    uploadedAt: 'Apr 10, 2026',
    status: 'Approved',
    fileSize: '6.8 MB',
    chunksCount: 36,
    chunkCount: 36,
    tags: ['kafka', 'streaming', 'clickhouse']
  },
  {
    id: 'DOC-006',
    title: 'Global Employee Information Security & Privacy Policy',
    category: 'Company Policy',
    version: '4.0',
    uploadedAt: 'Apr 02, 2026',
    status: 'Approved',
    fileSize: '1.5 MB',
    chunksCount: 12,
    chunkCount: 12,
    tags: ['gdpr', 'hipaa', 'compliance']
  }
];

export const mockRequirements: RequirementItem[] = [
  {
    id: 'REQ-001',
    role: 'Senior Cloud Infrastructure Engineer',
    category: 'Architecture',
    title: 'AWS Multi-Account VPC & Terraform Module Deployment',
    description: 'Must design and deploy repeatable terraform modules for VPC peering, private subnets, and transit gateways.',
    priority: 'P1',
    mandatory: true,
    sourceDocId: 'DOC-001',
    sourceDoc: 'DOC-001'
  },
  {
    id: 'REQ-002',
    role: 'Senior Cloud Infrastructure Engineer',
    category: 'Security',
    title: 'IAM Least-Privilege Role Boundaries & KMS Key Rotation',
    description: 'Ensure all IAM policies have explicit permission boundaries and encryption keys rotate every 365 days.',
    priority: 'P1',
    mandatory: true,
    sourceDocId: 'DOC-001',
    sourceDoc: 'DOC-001'
  },
  {
    id: 'REQ-003',
    role: 'Senior Cloud Infrastructure Engineer',
    category: 'Operations',
    title: 'Kubernetes RBAC, Pod Security & Istio MTLS Rules',
    description: 'Enforce strict mutual TLS across all microservice service-to-service communication.',
    priority: 'P2',
    mandatory: true,
    sourceDocId: 'DOC-002',
    sourceDoc: 'DOC-002'
  },
  {
    id: 'REQ-004',
    role: 'Senior Cloud Infrastructure Engineer',
    category: 'Operations',
    title: 'SRE On-Call Observability with Prometheus & Alertmanager',
    description: 'Configure Golden Signals alerting thresholds and synthetic uptime monitoring probes.',
    priority: 'P2',
    mandatory: false,
    sourceDocId: 'DOC-003',
    sourceDoc: 'DOC-003'
  },
  {
    id: 'REQ-005',
    role: 'DevOps Engineer',
    category: 'Tooling',
    title: 'ArgoCD GitOps Sync & Canary Deployment Verification',
    description: 'Automate rollback pipelines triggered by Prometheus HTTP 5xx error rate anomalies.',
    priority: 'P1',
    mandatory: true,
    sourceDocId: 'DOC-004',
    sourceDoc: 'DOC-004'
  },
  {
    id: 'REQ-006',
    role: 'Data Platform Engineer',
    category: 'Architecture',
    title: 'Kafka Partition Rebalancing & Schema Registry Enforcement',
    description: 'Implement Avro schema validation on all real-time event streaming pipelines.',
    priority: 'P2',
    mandatory: true,
    sourceDocId: 'DOC-005',
    sourceDoc: 'DOC-005'
  },
  {
    id: 'REQ-007',
    role: 'Product Manager',
    category: 'Compliance',
    title: 'SOC-2 & GDPR Compliance Data Access Lifecycle',
    description: 'Review access requests and ensure audit log retention policies comply with regulatory standards.',
    priority: 'P3',
    mandatory: true,
    sourceDocId: 'DOC-006',
    sourceDoc: 'DOC-006'
  }
];

export const mockPlans: OnboardingPlan[] = [
  {
    id: 'PLAN-101',
    employeeName: 'Alice Johnson',
    roleTitle: 'Senior Cloud Infrastructure Engineer',
    department: 'Platform Infrastructure',
    targetCompletion: '30 Days',
    status: 'In Progress',
    progress: 65,
    validationScore: 98,
    modules: [
      {
        id: 'MOD-01',
        title: 'Cloud Architecture & Terraform Foundations',
        description: 'Master VPC peering, modular infrastructure as code, and state management.',
        estimatedHours: 6,
        status: 'Completed',
        sourceCitations: ['DOC-001 / Section 3.2', 'DOC-001 / Section 4.1'],
        sourceSection: 'DOC-001 / Section 3.2',
        tasks: [
          { id: 'TSK-101', title: 'Review AWS Multi-Account VPC Blueprint', description: 'Study DOC-001 section on Transit Gateways', type: 'Reading', estimatedMinutes: 45, completed: true, docCitation: 'DOC-001' },
          { id: 'TSK-102', title: 'Initialize Terraform Remote State in S3', description: 'Configure state locking with DynamoDB table', type: 'Exercise', estimatedMinutes: 60, completed: true, docCitation: 'DOC-001' },
          { id: 'TSK-103', title: 'IAM Boundary Policy Hands-On Lab', description: 'Deploy test permission boundary role', type: 'Exercise', estimatedMinutes: 90, completed: true, docCitation: 'DOC-001' },
          { id: 'TSK-104', title: 'Terraform Module Code Review', description: 'Submit PR for peer review', type: 'Sign-off', estimatedMinutes: 30, completed: true, docCitation: 'DOC-001' }
        ]
      },
      {
        id: 'MOD-02',
        title: 'Kubernetes Security & RBAC Configuration',
        description: 'Cluster hardening, Pod Security Standards, and Istio Service Mesh.',
        estimatedHours: 8,
        status: 'In Progress',
        sourceCitations: ['DOC-002 / Appendix A', 'DOC-002 / Section 2.4'],
        sourceSection: 'DOC-002 / Appendix A',
        tasks: [
          { id: 'TSK-201', title: 'Deploy Test K8s Cluster via EKS', description: 'Provision cluster with terraform eks module', type: 'Exercise', estimatedMinutes: 90, completed: true, docCitation: 'DOC-002' },
          { id: 'TSK-202', title: 'Configure ClusterRole & Namespace RoleBindings', description: 'Enforce principle of least privilege', type: 'Exercise', estimatedMinutes: 60, completed: true, docCitation: 'DOC-002' },
          { id: 'TSK-203', title: 'Enable Istio STRICT Mutual TLS', description: 'Verify mTLS traffic between frontend and backend pods', type: 'Exercise', estimatedMinutes: 75, completed: true, docCitation: 'DOC-002' },
          { id: 'TSK-204', title: 'Audit Pod Security Admission Labels', description: 'Test baseline and restricted pod security standards', type: 'Exercise', estimatedMinutes: 45, completed: false, docCitation: 'DOC-002' },
          { id: 'TSK-205', title: 'Module 02 Assessment Quiz', description: 'Take 5-question interactive validation test', type: 'Quiz', estimatedMinutes: 15, completed: false, docCitation: 'DOC-002' }
        ]
      },
      {
        id: 'MOD-03',
        title: 'Incident Response & SRE Observability',
        description: 'Prometheus metrics, Alertmanager routing, and PagerDuty escalations.',
        estimatedHours: 5,
        status: 'Not Started',
        sourceCitations: ['DOC-003 / Section 1.4'],
        sourceSection: 'DOC-003 / Section 1.4',
        tasks: [
          { id: 'TSK-301', title: 'Setup Prometheus Scrape Target for Core APIs', description: 'Configure 15s scrape interval and relabel configs', type: 'Exercise', estimatedMinutes: 60, completed: false, docCitation: 'DOC-003' },
          { id: 'TSK-302', title: 'Draft Alertmanager High-Error-Rate Route', description: 'Send high-severity alerts to #infra-oncall Slack channel', type: 'Exercise', estimatedMinutes: 45, completed: false, docCitation: 'DOC-003' },
          { id: 'TSK-303', title: 'Simulate Mock Production Incident & Post-Mortem', description: 'Walk through DOC-003 Sev-1 runbook procedure', type: 'Assessment', estimatedMinutes: 120, completed: false, docCitation: 'DOC-003' }
        ]
      },
      {
        id: 'MOD-04',
        title: 'Production Deployment Pipeline & CI/CD',
        description: 'ArgoCD sync policies, automated canary testing, and container signing.',
        estimatedHours: 5,
        status: 'Not Started',
        sourceCitations: ['DOC-004 / Section 8.1'],
        sourceSection: 'DOC-004 / Section 8.1',
        tasks: [
          { id: 'TSK-401', title: 'Create ArgoCD Application Manifest', description: 'Connect GitHub repository to production cluster', type: 'Exercise', estimatedMinutes: 60, completed: false, docCitation: 'DOC-004' },
          { id: 'TSK-402', title: 'Run End-to-End Canary Deployment Rollout', description: 'Verify automated rollback triggers on health check fail', type: 'Exercise', estimatedMinutes: 90, completed: false, docCitation: 'DOC-004' },
          { id: 'TSK-403', title: 'Manager Sign-Off & Final Certification', description: 'Executive review with John Doe', type: 'Sign-off', estimatedMinutes: 30, completed: false, docCitation: 'DOC-004' }
        ]
      }
    ]
  },
  {
    id: 'PLAN-102',
    employeeName: 'Marcus Vance',
    roleTitle: 'DevOps Engineer',
    department: 'Release Engineering',
    targetCompletion: '14 Days',
    status: 'Approved',
    progress: 100,
    validationScore: 99,
    modules: []
  },
  {
    id: 'PLAN-103',
    employeeName: 'Elena Rostova',
    roleTitle: 'Data Platform Engineer',
    department: 'Data Infrastructure',
    targetCompletion: '30 Days',
    status: 'Pending Review',
    progress: 40,
    validationScore: 94,
    modules: []
  }
];

export const mockValidationItems: ValidationItem[] = [
  {
    id: 'VAL-001',
    requirementId: 'REQ-001',
    title: 'AWS Multi-Account VPC Peering',
    aiGeneratedContent: 'Curriculum includes 4 hands-on terraform modules covering transit gateway and CIDR subnets.',
    pythonRuleEngineStatus: 'Match',
    confidenceScore: 99.2,
    ruleCitation: 'DOC-001:Sec3.2',
    status: 'Verified'
  },
  {
    id: 'VAL-002',
    requirementId: 'REQ-002',
    title: 'IAM Least-Privilege & KMS Key Rotation',
    aiGeneratedContent: 'Configures boundary policy and automated 365-day KMS key rotation.',
    pythonRuleEngineStatus: 'Match',
    confidenceScore: 98.6,
    ruleCitation: 'DOC-001:Sec4.1',
    status: 'Verified'
  },
  {
    id: 'VAL-003',
    requirementId: 'REQ-003',
    title: 'Kubernetes RBAC & Istio Mutual TLS',
    aiGeneratedContent: 'Includes STRICT mTLS exercise and namespace-bound RoleBinding tests.',
    pythonRuleEngineStatus: 'Match',
    confidenceScore: 97.4,
    ruleCitation: 'DOC-002:AppA',
    status: 'Verified'
  },
  {
    id: 'VAL-004',
    requirementId: 'REQ-004',
    title: 'SRE Observability with Prometheus & Alertmanager',
    aiGeneratedContent: 'Prometheus scrapers mapped; Alertmanager routing requires optional PagerDuty webhook token.',
    pythonRuleEngineStatus: 'Discrepancy',
    confidenceScore: 88.0,
    ruleCitation: 'DOC-003:Sec1.4',
    status: 'Flagged'
  }
];
