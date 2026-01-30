import { Document } from 'docx';
import {
  createDocument,
  createTitlePage,
  createHeading,
  createBodyParagraph,
  createBulletPoint,
} from '../utils/docx-helpers.js';
import { OrgConfig } from '../config.js';

export interface BriefContent {
  executive_summary: string;
  background?: string;
  recommendation: string;
  rationale?: string[];
  next_steps: string[];
  timeline?: string;
}

export function generateBrief(
  title: string,
  content: BriefContent,
  config: OrgConfig
): Document {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const children = [
    ...createTitlePage(title, config.organization.name, date),

    createHeading('Executive Summary', 1),
    createBodyParagraph(content.executive_summary),
  ];

  if (content.background) {
    children.push(
      createHeading('Background', 1),
      createBodyParagraph(content.background)
    );
  }

  children.push(
    createHeading('Recommendation', 1),
    createBodyParagraph(content.recommendation)
  );

  if (content.rationale && content.rationale.length > 0) {
    children.push(createHeading('Rationale', 2));
    content.rationale.forEach((point) => {
      children.push(createBulletPoint(point));
    });
  }

  children.push(createHeading('Next Steps', 1));
  content.next_steps.forEach((step) => {
    children.push(createBulletPoint(step));
  });

  if (content.timeline) {
    children.push(
      createHeading('Timeline', 2),
      createBodyParagraph(content.timeline)
    );
  }

  return createDocument(children);
}
