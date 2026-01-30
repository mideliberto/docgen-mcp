import { Document, Paragraph } from 'docx';
import {
  createDocument,
  createHeading,
  createBodyParagraph,
  createBulletPoint,
  createTextRun,
} from '../utils/docx-helpers.js';
import { FONTS } from '../styles.js';
import { OrgConfig } from '../config.js';

export interface MeetingNotesContent {
  meeting_date: string;
  attendees: string[];
  agenda?: string[];
  discussion_points: string[];
  decisions?: string[];
  action_items: { owner: string; task: string; due?: string }[];
  next_meeting?: string;
}

export function generateMeetingNotes(
  title: string,
  content: MeetingNotesContent,
  config: OrgConfig
): Document {
  const children: Paragraph[] = [
    new Paragraph({
      children: [
        createTextRun(title, {
          bold: true,
          size: FONTS.sizes.title,
        }),
      ],
      spacing: { after: 200 },
    }),
    createBodyParagraph(`Date: ${content.meeting_date}`),
    createBodyParagraph(`Attendees: ${content.attendees.join(', ')}`),
  ];

  if (content.agenda && content.agenda.length > 0) {
    children.push(createHeading('Agenda', 1));
    content.agenda.forEach((item) => {
      children.push(createBulletPoint(item));
    });
  }

  children.push(createHeading('Discussion', 1));
  content.discussion_points.forEach((point) => {
    children.push(createBulletPoint(point));
  });

  if (content.decisions && content.decisions.length > 0) {
    children.push(createHeading('Decisions', 1));
    content.decisions.forEach((decision) => {
      children.push(createBulletPoint(decision));
    });
  }

  children.push(createHeading('Action Items', 1));
  content.action_items.forEach((item) => {
    const dueText = item.due ? ` (Due: ${item.due})` : '';
    children.push(createBulletPoint(`${item.owner}: ${item.task}${dueText}`));
  });

  if (content.next_meeting) {
    children.push(
      createHeading('Next Meeting', 2),
      createBodyParagraph(content.next_meeting)
    );
  }

  return createDocument(children);
}
