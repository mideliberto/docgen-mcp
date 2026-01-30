/**
 * Google Docs Helpers - High-level functions matching docx-helpers.ts pattern
 *
 * These functions mirror the docx-helpers API but work with GDocsBuilder
 * to produce Google Docs API requests instead of docx objects.
 *
 * Usage:
 *   const builder = new GDocsBuilder();
 *   createGDocsHeading(builder, 'Title', 1);
 *   createGDocsBodyParagraph(builder, 'Body text');
 *   createGDocsBulletList(builder, ['Item 1', 'Item 2']);
 *   const requests = builder.getRequests();
 */

import { GDocsBuilder, RunContent, hexToRgb } from './gdocs-builder.js';
import { COLORS, FONTS } from '../styles.js';

// ============================================================================
// Text Helpers
// ============================================================================

/**
 * Create a heading in the document
 */
export function createGDocsHeading(
  builder: GDocsBuilder,
  text: string,
  level: 1 | 2 | 3 = 1
): void {
  builder.insertHeading(text, level);
}

/**
 * Create a body paragraph
 */
export function createGDocsBodyParagraph(
  builder: GDocsBuilder,
  text: string,
  options: { bold?: boolean; italic?: boolean } = {}
): void {
  if (options.bold || options.italic) {
    builder.insertFormattedParagraph([
      {
        text,
        style: {
          bold: options.bold,
          italic: options.italic,
        },
      },
    ]);
  } else {
    builder.insertParagraph(text);
  }
}

/**
 * Create a bullet point (single item)
 */
export function createGDocsBulletPoint(
  builder: GDocsBuilder,
  text: string
): void {
  builder.insertBulletList([{ text, level: 0 }]);
}

/**
 * Create a bullet list from array of strings
 */
export function createGDocsBulletList(
  builder: GDocsBuilder,
  items: string[]
): void {
  builder.insertBulletList(items.map((text) => ({ text, level: 0 })));
}

/**
 * Create a numbered list from array of strings
 */
export function createGDocsNumberedList(
  builder: GDocsBuilder,
  items: string[]
): void {
  builder.insertNumberedList(items.map((text) => ({ text, level: 0 })));
}

// ============================================================================
// Table Helpers
// ============================================================================

/**
 * Create a simple table with headers and data rows
 */
export function createGDocsSimpleTable(
  builder: GDocsBuilder,
  headers: string[],
  rows: string[][]
): void {
  builder.insertTable(headers, rows, {
    headerBold: true,
    headerBackground: COLORS.header_cell,
  });
}

// ============================================================================
// Document Structure Helpers
// ============================================================================

/**
 * Create title page elements
 */
export function createGDocsTitlePage(
  builder: GDocsBuilder,
  title: string,
  subtitle?: string,
  date?: string
): void {
  // Title - large, centered, with spacing
  builder.insertFormattedParagraph([
    {
      text: title,
      style: {
        bold: true,
        fontSize: FONTS.sizes.title_hero / 2, // Convert from half-points
        color: COLORS.primary_dark,
      },
    },
  ]);

  if (subtitle) {
    builder.insertFormattedParagraph([
      {
        text: subtitle,
        style: {
          fontSize: FONTS.sizes.title_small / 2,
          color: COLORS.text_muted,
        },
      },
    ]);
  }

  if (date) {
    builder.insertFormattedParagraph([
      {
        text: date,
        style: {
          fontSize: FONTS.sizes.body / 2,
          color: COLORS.text_light,
        },
      },
    ]);
  }

  // Add some spacing after title block
  builder.insertParagraph('');
}

/**
 * Create a callout box
 */
export function createGDocsCallout(
  builder: GDocsBuilder,
  content: string,
  style: 'info' | 'warning' | 'critical' | 'success' = 'info'
): void {
  builder.insertCallout(content, style);
}

/**
 * Create a code block
 */
export function createGDocsCodeBlock(
  builder: GDocsBuilder,
  content: string
): void {
  builder.insertCodeBlock(content);
}

/**
 * Create a page break
 */
export function createGDocsPageBreak(builder: GDocsBuilder): void {
  builder.insertPageBreak();
}

/**
 * Create a horizontal rule
 */
export function createGDocsHorizontalRule(builder: GDocsBuilder): void {
  builder.insertHorizontalRule();
}

// ============================================================================
// Document Creation
// ============================================================================

/**
 * Finalize document and get all requests
 * Adds document-level styling and returns the request array
 */
export function finalizeGDocsDocument(builder: GDocsBuilder): unknown[] {
  builder.insertDocumentStyle();
  return builder.getRequests();
}
