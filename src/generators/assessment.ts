import { Document, Paragraph, Table } from 'docx';
import {
  createDocument,
  createTitlePage,
  createHeading,
  createBodyParagraph,
  createBulletPoint,
  createSimpleTable,
  createTableCell,
  createTableRow,
} from '../utils/docx-helpers.js';
import { COLORS } from '../styles.js';
import { OrgConfig } from '../config.js';

export interface AssessmentContent {
  executive_summary: string;
  scope: string;
  methodology: string;
  findings: {
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    recommendation: string;
  }[];
  summary_by_severity?: { severity: string; count: number }[];
  recommendations: string[];
  next_steps: string[];
}

export function generateAssessment(
  title: string,
  content: AssessmentContent,
  config: OrgConfig
): Document {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const severityColors: Record<string, string> = {
    critical: COLORS.critical_bg,
    high: COLORS.high_bg,
    medium: COLORS.medium_bg,
    low: COLORS.low_bg,
  };

  const children: (Paragraph | Table)[] = [
    ...createTitlePage(title, config.organization.name, date),

    createHeading('Executive Summary', 1),
    createBodyParagraph(content.executive_summary),

    createHeading('Scope', 1),
    createBodyParagraph(content.scope),

    createHeading('Methodology', 1),
    createBodyParagraph(content.methodology),
  ];

  if (content.summary_by_severity && content.summary_by_severity.length > 0) {
    children.push(createHeading('Findings Summary', 1));
    children.push(
      createSimpleTable(
        ['Severity', 'Count'],
        content.summary_by_severity.map((s) => [s.severity, s.count.toString()])
      )
    );
  }

  children.push(createHeading('Detailed Findings', 1));

  content.findings.forEach((finding, index) => {
    children.push(createHeading(`${index + 1}. ${finding.title}`, 2));
    children.push(createBodyParagraph(`Severity: ${finding.severity.toUpperCase()}`));
    children.push(createBodyParagraph(finding.description));
    children.push(createHeading('Recommendation', 3));
    children.push(createBodyParagraph(finding.recommendation));
  });

  children.push(createHeading('Recommendations', 1));
  content.recommendations.forEach((rec) => {
    children.push(createBulletPoint(rec));
  });

  children.push(createHeading('Next Steps', 1));
  content.next_steps.forEach((step) => {
    children.push(createBulletPoint(step));
  });

  return createDocument(children);
}
