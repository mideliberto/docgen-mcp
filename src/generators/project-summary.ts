import { Document, Paragraph, Table } from 'docx';
import {
  createDocument,
  createTitlePage,
  createHeading,
  createBodyParagraph,
  createBulletPoint,
  createSimpleTable,
} from '../utils/docx-helpers.js';
import { OrgConfig } from '../config.js';

export interface ProjectSummaryContent {
  overview: string;
  objectives: string[];
  status: 'on_track' | 'at_risk' | 'delayed' | 'completed';
  status_summary: string;
  accomplishments: string[];
  upcoming_milestones?: { milestone: string; date: string }[];
  risks?: { risk: string; mitigation: string }[];
  blockers?: string[];
  next_steps: string[];
}

export function generateProjectSummary(
  title: string,
  content: ProjectSummaryContent,
  config: OrgConfig
): Document {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const statusDisplay = {
    on_track: 'On Track',
    at_risk: 'At Risk',
    delayed: 'Delayed',
    completed: 'Completed',
  };

  const children: (Paragraph | Table)[] = [
    ...createTitlePage(title, config.organization.name, date),

    createHeading('Overview', 1),
    createBodyParagraph(content.overview),

    createHeading('Objectives', 1),
  ];

  content.objectives.forEach((obj) => {
    children.push(createBulletPoint(obj));
  });

  children.push(
    createHeading('Status', 1),
    createBodyParagraph(`Status: ${statusDisplay[content.status]}`),
    createBodyParagraph(content.status_summary)
  );

  children.push(createHeading('Accomplishments', 1));
  content.accomplishments.forEach((item) => {
    children.push(createBulletPoint(item));
  });

  if (content.upcoming_milestones && content.upcoming_milestones.length > 0) {
    children.push(createHeading('Upcoming Milestones', 1));
    children.push(
      createSimpleTable(
        ['Milestone', 'Target Date'],
        content.upcoming_milestones.map((m) => [m.milestone, m.date])
      )
    );
  }

  if (content.risks && content.risks.length > 0) {
    children.push(createHeading('Risks', 1));
    children.push(
      createSimpleTable(
        ['Risk', 'Mitigation'],
        content.risks.map((r) => [r.risk, r.mitigation])
      )
    );
  }

  if (content.blockers && content.blockers.length > 0) {
    children.push(createHeading('Blockers', 1));
    content.blockers.forEach((item) => {
      children.push(createBulletPoint(item));
    });
  }

  children.push(createHeading('Next Steps', 1));
  content.next_steps.forEach((step) => {
    children.push(createBulletPoint(step));
  });

  return createDocument(children);
}
