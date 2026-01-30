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

export interface RunbookContent {
  purpose: string;
  scope: string;
  prerequisites?: string[];
  procedures: {
    title: string;
    steps: string[];
  }[];
  troubleshooting?: { issue: string; resolution: string }[];
  contacts?: { role: string; name: string; contact: string }[];
  revision_history?: { date: string; version: string; changes: string }[];
}

export function generateRunbook(
  title: string,
  content: RunbookContent,
  config: OrgConfig
): Document {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const children: (Paragraph | Table)[] = [
    ...createTitlePage(title, config.organization.name, date),

    createHeading('Purpose', 1),
    createBodyParagraph(content.purpose),

    createHeading('Scope', 1),
    createBodyParagraph(content.scope),
  ];

  if (content.prerequisites && content.prerequisites.length > 0) {
    children.push(createHeading('Prerequisites', 1));
    content.prerequisites.forEach((prereq) => {
      children.push(createBulletPoint(prereq));
    });
  }

  children.push(createHeading('Procedures', 1));
  content.procedures.forEach((proc, index) => {
    children.push(createHeading(`${index + 1}. ${proc.title}`, 2));
    proc.steps.forEach((step, stepIndex) => {
      children.push(createBodyParagraph(`${stepIndex + 1}. ${step}`));
    });
  });

  if (content.troubleshooting && content.troubleshooting.length > 0) {
    children.push(createHeading('Troubleshooting', 1));
    children.push(
      createSimpleTable(
        ['Issue', 'Resolution'],
        content.troubleshooting.map((t) => [t.issue, t.resolution])
      )
    );
  }

  if (content.contacts && content.contacts.length > 0) {
    children.push(createHeading('Contacts', 1));
    children.push(
      createSimpleTable(
        ['Role', 'Name', 'Contact'],
        content.contacts.map((c) => [c.role, c.name, c.contact])
      )
    );
  }

  if (content.revision_history && content.revision_history.length > 0) {
    children.push(createHeading('Revision History', 1));
    children.push(
      createSimpleTable(
        ['Date', 'Version', 'Changes'],
        content.revision_history.map((r) => [r.date, r.version, r.changes])
      )
    );
  }

  return createDocument(children);
}
