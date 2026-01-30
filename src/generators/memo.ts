import { Document, Paragraph, TextRun } from 'docx';
import {
  createDocument,
  createHeading,
  createBodyParagraph,
  createBulletPoint,
  createTextRun,
} from '../utils/docx-helpers.js';
import { COLORS, FONTS } from '../styles.js';
import { OrgConfig } from '../config.js';

export interface MemoContent {
  to: string;
  from?: string;
  subject: string;
  body: string;
  action_items?: string[];
}

export function generateMemo(
  title: string,
  content: MemoContent,
  config: OrgConfig
): Document {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const fromName = content.from ?? config.identity.author;

  const headerFields = [
    { label: 'TO:', value: content.to },
    { label: 'FROM:', value: fromName },
    { label: 'DATE:', value: date },
    { label: 'RE:', value: content.subject },
  ];

  const children: (Paragraph)[] = [
    new Paragraph({
      children: [
        createTextRun('MEMORANDUM', {
          bold: true,
          size: FONTS.sizes.title,
          color: COLORS.primary_dark,
        }),
      ],
      spacing: { after: 400 },
    }),
  ];

  headerFields.forEach(({ label, value }) => {
    children.push(
      new Paragraph({
        children: [
          createTextRun(label, { bold: true, size: FONTS.sizes.body }),
          createTextRun(`\t${value}`, { size: FONTS.sizes.body }),
        ],
        spacing: { after: 60 },
      })
    );
  });

  // Horizontal rule simulation
  children.push(
    new Paragraph({
      children: [createTextRun('─'.repeat(80), { color: COLORS.border })],
      spacing: { before: 200, after: 200 },
    })
  );

  // Body
  const paragraphs = content.body.split('\n\n');
  paragraphs.forEach((para) => {
    children.push(createBodyParagraph(para.trim()));
  });

  // Action items
  if (content.action_items && content.action_items.length > 0) {
    children.push(createHeading('Action Items', 2));
    content.action_items.forEach((item) => {
      children.push(createBulletPoint(item));
    });
  }

  return createDocument(children);
}
