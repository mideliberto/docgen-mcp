import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ITableCellOptions,
  ITableRowOptions,
  IParagraphOptions,
} from 'docx';
import { COLORS, FONTS, PAGE, TABLE } from '../styles.js';

// Text helpers
export function createTextRun(
  text: string,
  options: {
    bold?: boolean;
    italic?: boolean;
    size?: number;
    color?: string;
    font?: string;
  } = {}
): TextRun {
  return new TextRun({
    text,
    bold: options.bold,
    italics: options.italic,
    size: options.size ?? FONTS.sizes.body,
    color: options.color ?? COLORS.text_body,
    font: options.font ?? FONTS.family,
  });
}

// Paragraph helpers
export function createHeading(
  text: string,
  level: 1 | 2 | 3 = 1
): Paragraph {
  const sizeMap = {
    1: FONTS.sizes.heading1,
    2: FONTS.sizes.heading2,
    3: FONTS.sizes.heading3,
  };
  const headingMap = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
  };

  return new Paragraph({
    children: [
      createTextRun(text, {
        bold: true,
        size: sizeMap[level],
        color: COLORS.primary_dark,
      }),
    ],
    heading: headingMap[level],
    spacing: { before: 240, after: 120 },
  });
}

export function createBodyParagraph(
  text: string,
  options: { bold?: boolean; italic?: boolean } = {}
): Paragraph {
  return new Paragraph({
    children: [createTextRun(text, options)],
    spacing: { after: 120 },
  });
}

export function createBulletPoint(text: string): Paragraph {
  return new Paragraph({
    children: [createTextRun(text)],
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}

// Table helpers
export function createTableCell(
  content: string | Paragraph[],
  options: {
    width?: number;
    shading?: string;
    bold?: boolean;
    alignment?: typeof AlignmentType[keyof typeof AlignmentType];
  } = {}
): TableCell {
  const children = typeof content === 'string'
    ? [new Paragraph({
        children: [createTextRun(content, { bold: options.bold })],
        alignment: options.alignment,
      })]
    : content;

  return new TableCell({
    children,
    width: options.width ? { size: options.width, type: WidthType.DXA } : undefined,
    shading: options.shading ? { fill: options.shading } : undefined,
    margins: TABLE.cell_margin,
  });
}

export function createTableRow(
  cells: TableCell[],
  options: { isHeader?: boolean } = {}
): TableRow {
  return new TableRow({
    children: cells,
    tableHeader: options.isHeader,
  });
}

export function createSimpleTable(
  headers: string[],
  rows: string[][],
  columnWidths?: number[]
): Table {
  const widths = columnWidths ?? headers.map(() => Math.floor(PAGE.content_width / headers.length));

  const headerRow = createTableRow(
    headers.map((h, i) =>
      createTableCell(h, {
        width: widths[i],
        shading: COLORS.header_cell,
        bold: true,
      })
    ),
    { isHeader: true }
  );

  const dataRows = rows.map((row, rowIndex) =>
    createTableRow(
      row.map((cell, i) =>
        createTableCell(cell, {
          width: widths[i],
          shading: rowIndex % 2 === 1 ? COLORS.alt_row : undefined,
        })
      )
    )
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: PAGE.content_width, type: WidthType.DXA },
  });
}

// Document helpers
export function createDocument(children: (Paragraph | Table)[]): Document {
  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE.width, height: PAGE.height },
            margin: PAGE.margin,
          },
        },
        children,
      },
    ],
  });
}

// Title page helper
export function createTitlePage(
  title: string,
  subtitle?: string,
  date?: string
): Paragraph[] {
  const elements: Paragraph[] = [
    new Paragraph({
      children: [
        createTextRun(title, {
          bold: true,
          size: FONTS.sizes.title_hero,
          color: COLORS.primary_dark,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 400 },
    }),
  ];

  if (subtitle) {
    elements.push(
      new Paragraph({
        children: [
          createTextRun(subtitle, {
            size: FONTS.sizes.title_small,
            color: COLORS.text_muted,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  if (date) {
    elements.push(
      new Paragraph({
        children: [
          createTextRun(date, {
            size: FONTS.sizes.body,
            color: COLORS.text_light,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      })
    );
  }

  return elements;
}
