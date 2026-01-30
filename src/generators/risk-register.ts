import { Document, Paragraph, Table } from 'docx';
import {
  createDocument,
  createTitlePage,
  createHeading,
  createBodyParagraph,
  createTableCell,
  createTableRow,
} from '../utils/docx-helpers.js';
import { COLORS, PAGE } from '../styles.js';
import { OrgConfig } from '../config.js';

export interface RiskRegisterContent {
  overview: string;
  risks: {
    id: string;
    title: string;
    description: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    severity: 'low' | 'medium' | 'high' | 'critical';
    owner: string;
    mitigation: string;
    status: 'open' | 'mitigating' | 'closed';
  }[];
}

export function generateRiskRegister(
  title: string,
  content: RiskRegisterContent,
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

  const colWidths = [600, 1500, 2500, 900, 900, 900, 1100, 900];

  const headerRow = createTableRow(
    ['ID', 'Title', 'Description', 'Likelihood', 'Impact', 'Severity', 'Owner', 'Status'].map(
      (h, i) => createTableCell(h, { width: colWidths[i], shading: COLORS.header_cell, bold: true })
    ),
    { isHeader: true }
  );

  const dataRows = content.risks.map((risk) =>
    createTableRow([
      createTableCell(risk.id, { width: colWidths[0] }),
      createTableCell(risk.title, { width: colWidths[1] }),
      createTableCell(risk.description, { width: colWidths[2] }),
      createTableCell(risk.likelihood, { width: colWidths[3] }),
      createTableCell(risk.impact, { width: colWidths[4] }),
      createTableCell(risk.severity.toUpperCase(), {
        width: colWidths[5],
        shading: severityColors[risk.severity],
      }),
      createTableCell(risk.owner, { width: colWidths[6] }),
      createTableCell(risk.status, { width: colWidths[7] }),
    ])
  );

  const riskTable = new Table({
    rows: [headerRow, ...dataRows],
    width: { size: PAGE.content_width, type: 'dxa' as const },
  });

  const children: (Paragraph | Table)[] = [
    ...createTitlePage(title, config.organization.name, date),

    createHeading('Overview', 1),
    createBodyParagraph(content.overview),

    createHeading('Risk Register', 1),
    riskTable,
  ];

  return createDocument(children);
}
