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

export interface ProposalContent {
  executive_summary: string;
  problem_statement: string;
  proposed_solution: string;
  scope: string[];
  deliverables: string[];
  timeline_phases?: { phase: string; duration: string; description: string }[];
  investment?: { item: string; amount: string }[];
  assumptions?: string[];
  next_steps: string[];
}

export function generateProposal(
  title: string,
  content: ProposalContent,
  config: OrgConfig
): Document {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const children: (Paragraph | Table)[] = [
    ...createTitlePage(title, config.organization.name, date),

    createHeading('Executive Summary', 1),
    createBodyParagraph(content.executive_summary),

    createHeading('Problem Statement', 1),
    createBodyParagraph(content.problem_statement),

    createHeading('Proposed Solution', 1),
    createBodyParagraph(content.proposed_solution),

    createHeading('Scope', 1),
  ];

  content.scope.forEach((item) => {
    children.push(createBulletPoint(item));
  });

  children.push(createHeading('Deliverables', 1));
  content.deliverables.forEach((item) => {
    children.push(createBulletPoint(item));
  });

  if (content.timeline_phases && content.timeline_phases.length > 0) {
    children.push(createHeading('Timeline', 1));
    children.push(
      createSimpleTable(
        ['Phase', 'Duration', 'Description'],
        content.timeline_phases.map((p) => [p.phase, p.duration, p.description])
      )
    );
  }

  if (content.investment && content.investment.length > 0) {
    children.push(createHeading('Investment', 1));
    children.push(
      createSimpleTable(
        ['Item', 'Amount'],
        content.investment.map((i) => [i.item, i.amount])
      )
    );
  }

  if (content.assumptions && content.assumptions.length > 0) {
    children.push(createHeading('Assumptions', 1));
    content.assumptions.forEach((item) => {
      children.push(createBulletPoint(item));
    });
  }

  children.push(createHeading('Next Steps', 1));
  content.next_steps.forEach((step) => {
    children.push(createBulletPoint(step));
  });

  return createDocument(children);
}
