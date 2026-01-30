/**
 * Brief Generator - Google Docs Output
 *
 * Same input schema as brief.ts, outputs Google Docs API requests
 * instead of docx Document object.
 */

import { GDocsBuilder } from '../utils/gdocs-builder.js';
import {
  createGDocsTitlePage,
  createGDocsHeading,
  createGDocsBodyParagraph,
  createGDocsBulletList,
  finalizeGDocsDocument,
} from '../utils/gdocs-helpers.js';
import { OrgConfig } from '../config.js';

export interface BriefContent {
  executive_summary: string;
  background?: string;
  recommendation: string;
  rationale?: string[];
  next_steps: string[];
  timeline?: string;
}

export function generateBriefGDocs(
  title: string,
  content: BriefContent,
  config: OrgConfig
): unknown[] {
  const builder = new GDocsBuilder();

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Title page
  createGDocsTitlePage(builder, title, config.organization.name, date);

  // Executive Summary
  createGDocsHeading(builder, 'Executive Summary', 1);
  createGDocsBodyParagraph(builder, content.executive_summary);

  // Background (optional)
  if (content.background) {
    createGDocsHeading(builder, 'Background', 1);
    createGDocsBodyParagraph(builder, content.background);
  }

  // Recommendation
  createGDocsHeading(builder, 'Recommendation', 1);
  createGDocsBodyParagraph(builder, content.recommendation);

  // Rationale (optional)
  if (content.rationale && content.rationale.length > 0) {
    createGDocsHeading(builder, 'Rationale', 2);
    createGDocsBulletList(builder, content.rationale);
  }

  // Next Steps
  createGDocsHeading(builder, 'Next Steps', 1);
  createGDocsBulletList(builder, content.next_steps);

  // Timeline (optional)
  if (content.timeline) {
    createGDocsHeading(builder, 'Timeline', 2);
    createGDocsBodyParagraph(builder, content.timeline);
  }

  return finalizeGDocsDocument(builder);
}
