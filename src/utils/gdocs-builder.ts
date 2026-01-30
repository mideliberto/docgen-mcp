/**
 * Google Docs Builder - Request accumulator with index tracking
 *
 * Converts document elements to Google Docs API batchUpdate requests.
 * Maintains a running index as content is inserted sequentially.
 *
 * Usage:
 *   const builder = new GDocsBuilder();
 *   builder.insertHeading('Title', 1);
 *   builder.insertParagraph('Body text');
 *   builder.insertBulletList(['Item 1', 'Item 2']);
 *   const requests = builder.getRequests();
 */

import { COLORS, FONTS } from '../styles.js';

// Types for Google Docs API requests
export interface GDocsRequest {
  [key: string]: unknown;
}

export interface TextStyleOptions {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string; // Hex color without #
  backgroundColor?: string;
  fontSize?: number; // Points
  fontFamily?: string;
  link?: string;
}

export interface RunContent {
  text: string;
  style?: TextStyleOptions;
}

/**
 * Convert hex color (e.g., "1F4E79") to Google Docs RGB format
 */
export function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const clean = hex.replace('#', '');
  return {
    red: parseInt(clean.substring(0, 2), 16) / 255,
    green: parseInt(clean.substring(2, 4), 16) / 255,
    blue: parseInt(clean.substring(4, 6), 16) / 255,
  };
}

/**
 * Google Docs Builder
 *
 * Accumulates API requests while tracking document index.
 * Insert methods add content and styling requests, advancing the index.
 */
export class GDocsBuilder {
  private requests: GDocsRequest[] = [];
  private index: number = 1; // Google Docs starts at index 1

  /**
   * Get all accumulated requests
   */
  getRequests(): GDocsRequest[] {
    return this.requests;
  }

  /**
   * Get current document index
   */
  getIndex(): number {
    return this.index;
  }

  /**
   * Insert text at current index and advance
   * Returns the range [startIndex, endIndex] of inserted text (excluding newline)
   */
  private insertText(text: string): { start: number; end: number } {
    const start = this.index;
    this.requests.push({
      insertText: {
        location: { index: start },
        text: text,
      },
    });
    this.index += text.length;
    return { start, end: this.index };
  }

  /**
   * Apply paragraph style to a range
   */
  private applyParagraphStyle(
    startIndex: number,
    endIndex: number,
    style: Record<string, unknown>,
    fields: string
  ): void {
    this.requests.push({
      updateParagraphStyle: {
        range: { startIndex, endIndex },
        paragraphStyle: style,
        fields,
      },
    });
  }

  /**
   * Apply text style to a range
   */
  private applyTextStyle(
    startIndex: number,
    endIndex: number,
    style: Record<string, unknown>,
    fields: string
  ): void {
    this.requests.push({
      updateTextStyle: {
        range: { startIndex, endIndex },
        textStyle: style,
        fields,
      },
    });
  }

  /**
   * Build text style object and fields string from options
   */
  private buildTextStyle(options: TextStyleOptions): {
    style: Record<string, unknown>;
    fields: string[];
  } {
    const style: Record<string, unknown> = {};
    const fields: string[] = [];

    if (options.bold !== undefined) {
      style.bold = options.bold;
      fields.push('bold');
    }
    if (options.italic !== undefined) {
      style.italic = options.italic;
      fields.push('italic');
    }
    if (options.underline !== undefined) {
      style.underline = options.underline;
      fields.push('underline');
    }
    if (options.color) {
      style.foregroundColor = { color: { rgbColor: hexToRgb(options.color) } };
      fields.push('foregroundColor');
    }
    if (options.backgroundColor) {
      style.backgroundColor = { color: { rgbColor: hexToRgb(options.backgroundColor) } };
      fields.push('backgroundColor');
    }
    if (options.fontSize) {
      style.fontSize = { magnitude: options.fontSize, unit: 'PT' };
      fields.push('fontSize');
    }
    if (options.fontFamily) {
      style.weightedFontFamily = { fontFamily: options.fontFamily };
      fields.push('weightedFontFamily');
    }
    if (options.link) {
      style.link = { url: options.link };
      fields.push('link');
    }

    return { style, fields };
  }

  // =========================================================================
  // Public Insert Methods
  // =========================================================================

  /**
   * Insert a heading
   */
  insertHeading(text: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 1): void {
    const { start, end } = this.insertText(text + '\n');

    // Apply heading paragraph style
    const namedStyleType = `HEADING_${level}`;
    this.applyParagraphStyle(start, end, { namedStyleType }, 'namedStyleType');

    // Apply heading text color (exclude newline)
    this.applyTextStyle(
      start,
      end - 1,
      {
        foregroundColor: { color: { rgbColor: hexToRgb(COLORS.primary_dark) } },
        bold: true,
      },
      'foregroundColor,bold'
    );
  }

  /**
   * Insert a plain paragraph
   */
  insertParagraph(text: string): void {
    this.insertText(text + '\n');
  }

  /**
   * Insert a paragraph with mixed formatting (runs)
   */
  insertFormattedParagraph(runs: RunContent[]): void {
    const paraStart = this.index;

    for (const run of runs) {
      const { start, end } = this.insertText(run.text);

      if (run.style) {
        const { style, fields } = this.buildTextStyle(run.style);
        if (fields.length > 0) {
          this.applyTextStyle(start, end, style, fields.join(','));
        }
      }
    }

    // Add paragraph-ending newline
    this.insertText('\n');
  }

  /**
   * Insert a bullet list
   */
  insertBulletList(items: Array<{ text: string; level?: number }>): void {
    const listStart = this.index;

    // Insert all items with tab prefixes for nesting
    for (const item of items) {
      const level = item.level ?? 0;
      const prefix = '\t'.repeat(level);
      this.insertText(prefix + item.text + '\n');
    }

    const listEnd = this.index;

    // Apply bullet formatting to entire range
    this.requests.push({
      createParagraphBullets: {
        range: { startIndex: listStart, endIndex: listEnd },
        bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
      },
    });
  }

  /**
   * Insert a numbered list
   */
  insertNumberedList(items: Array<{ text: string; level?: number }>): void {
    const listStart = this.index;

    for (const item of items) {
      const level = item.level ?? 0;
      const prefix = '\t'.repeat(level);
      this.insertText(prefix + item.text + '\n');
    }

    const listEnd = this.index;

    this.requests.push({
      createParagraphBullets: {
        range: { startIndex: listStart, endIndex: listEnd },
        bulletPreset: 'NUMBERED_DECIMAL_ALPHA_ROMAN',
      },
    });
  }

  /**
   * Insert a callout box (simulated with indentation and left border)
   */
  insertCallout(
    content: string,
    style: 'info' | 'warning' | 'critical' | 'success' = 'info'
  ): void {
    const { start, end } = this.insertText(content + '\n');

    // Map callout style to colors
    const colorMap: Record<string, { border: string; text: string }> = {
      info: { border: COLORS.info_border, text: COLORS.info_text },
      warning: { border: COLORS.high_border, text: COLORS.high_text },
      critical: { border: COLORS.critical_border, text: COLORS.critical_text },
      success: { border: COLORS.low_border, text: COLORS.low_text },
    };

    const colors = colorMap[style] ?? colorMap.info;

    // Apply indentation and left border
    this.applyParagraphStyle(
      start,
      end,
      {
        indentStart: { magnitude: 36, unit: 'PT' },
        indentEnd: { magnitude: 36, unit: 'PT' },
        borderLeft: {
          color: { color: { rgbColor: hexToRgb(colors.border) } },
          width: { magnitude: 3, unit: 'PT' },
          padding: { magnitude: 12, unit: 'PT' },
          dashStyle: 'SOLID',
        },
      },
      'indentStart,indentEnd,borderLeft'
    );

    // Apply text color (exclude newline)
    this.applyTextStyle(
      start,
      end - 1,
      { foregroundColor: { color: { rgbColor: hexToRgb(colors.text) } } },
      'foregroundColor'
    );
  }

  /**
   * Insert a code block (monospace font with background)
   */
  insertCodeBlock(content: string): void {
    const { start, end } = this.insertText(content + '\n');

    // Apply monospace font and background (exclude newline for background)
    this.applyTextStyle(
      start,
      end - 1,
      {
        weightedFontFamily: { fontFamily: 'Consolas' },
        fontSize: { magnitude: 10, unit: 'PT' },
        backgroundColor: { color: { rgbColor: hexToRgb(COLORS.code_block) } },
      },
      'weightedFontFamily,fontSize,backgroundColor'
    );
  }

  /**
   * Insert a page break
   */
  insertPageBreak(): void {
    this.requests.push({
      insertPageBreak: {
        location: { index: this.index },
      },
    });
    this.index += 1;
  }

  /**
   * Insert a horizontal rule (simulated with bordered paragraph)
   */
  insertHorizontalRule(): void {
    const { start, end } = this.insertText('\n');

    this.applyParagraphStyle(
      start,
      end,
      {
        borderBottom: {
          color: { color: { rgbColor: hexToRgb(COLORS.border) } },
          width: { magnitude: 1, unit: 'PT' },
          padding: { magnitude: 8, unit: 'PT' },
          dashStyle: 'SOLID',
        },
        spaceBelow: { magnitude: 12, unit: 'PT' },
      },
      'borderBottom,spaceBelow'
    );
  }

  /**
   * Insert document-level styling (margins, etc.)
   * Call this FIRST before any content
   */
  insertDocumentStyle(): void {
    this.requests.unshift({
      updateDocumentStyle: {
        documentStyle: {
          marginTop: { magnitude: 72, unit: 'PT' },
          marginBottom: { magnitude: 72, unit: 'PT' },
          marginLeft: { magnitude: 72, unit: 'PT' },
          marginRight: { magnitude: 72, unit: 'PT' },
        },
        fields: 'marginTop,marginBottom,marginLeft,marginRight',
      },
    });
  }

  // =========================================================================
  // Table Methods (Phase 2 - more complex index tracking)
  // =========================================================================

  /**
   * Insert a simple table with headers and rows
   *
   * Note: Table index calculation is complex. The table structure itself
   * consumes indices: 3 + rows * (cols * 2 + 1)
   * Cell content is inserted separately and shifts indices.
   */
  insertTable(
    headers: string[],
    rows: string[][],
    options: {
      headerBold?: boolean;
      headerBackground?: string;
    } = {}
  ): void {
    const numCols = headers.length;
    const numRows = rows.length + 1; // +1 for header row
    const tableStart = this.index;

    // Insert table structure
    this.requests.push({
      insertTable: {
        rows: numRows,
        columns: numCols,
        location: { index: tableStart },
      },
    });

    // Table structure size: 3 + rows * (cols * 2 + 1)
    const structureSize = 3 + numRows * (numCols * 2 + 1);

    // Build all cell data
    const allRows = [headers, ...rows];
    const cellData: Array<{
      row: number;
      col: number;
      text: string;
      isHeader: boolean;
    }> = [];

    for (let r = 0; r < allRows.length; r++) {
      for (let c = 0; c < numCols; c++) {
        const text = allRows[r][c] ?? '';
        if (text) {
          cellData.push({
            row: r,
            col: c,
            text,
            isHeader: r === 0,
          });
        }
      }
    }

    // Calculate base index for each cell
    // Cell (r, c) base index = tableStart + 4 + r * (numCols * 2 + 1) + c * 2
    const cellInserts: GDocsRequest[] = [];
    const cellFormats: GDocsRequest[] = [];

    for (let i = 0; i < cellData.length; i++) {
      const cell = cellData[i];
      const baseIndex =
        tableStart + 4 + cell.row * (numCols * 2 + 1) + cell.col * 2;

      // Insert text
      cellInserts.push({
        insertText: {
          location: { index: baseIndex },
          text: cell.text,
        },
      });

      // Calculate format index (accounts for prior cell content)
      const priorContent = cellData
        .slice(0, i)
        .reduce((sum, c) => sum + c.text.length, 0);
      const formatIndex = baseIndex + priorContent;

      // Header styling
      if (cell.isHeader && options.headerBold !== false) {
        cellFormats.push({
          updateTextStyle: {
            range: {
              startIndex: formatIndex,
              endIndex: formatIndex + cell.text.length,
            },
            textStyle: { bold: true },
            fields: 'bold',
          },
        });
      }
    }

    // Add cell inserts in REVERSE order (to preserve indices)
    this.requests.push(...cellInserts.reverse());

    // Add cell formats
    this.requests.push(...cellFormats);

    // Header row background
    if (options.headerBackground !== undefined || true) {
      const bgColor = options.headerBackground ?? COLORS.header_cell;
      this.requests.push({
        updateTableCellStyle: {
          tableRange: {
            tableCellLocation: {
              tableStartLocation: { index: tableStart },
              rowIndex: 0,
              columnIndex: 0,
            },
            rowSpan: 1,
            columnSpan: numCols,
          },
          tableCellStyle: {
            backgroundColor: { color: { rgbColor: hexToRgb(bgColor) } },
          },
          fields: 'backgroundColor',
        },
      });
    }

    // Border styling for all cells
    const border = {
      color: { color: { rgbColor: hexToRgb(COLORS.border) } },
      width: { magnitude: 0.5, unit: 'PT' },
      dashStyle: 'SOLID',
    };

    this.requests.push({
      updateTableCellStyle: {
        tableRange: {
          tableCellLocation: {
            tableStartLocation: { index: tableStart },
            rowIndex: 0,
            columnIndex: 0,
          },
          rowSpan: numRows,
          columnSpan: numCols,
        },
        tableCellStyle: {
          borderLeft: border,
          borderRight: border,
          borderTop: border,
          borderBottom: border,
          paddingTop: { magnitude: 6, unit: 'PT' },
          paddingBottom: { magnitude: 6, unit: 'PT' },
          paddingLeft: { magnitude: 8, unit: 'PT' },
          paddingRight: { magnitude: 8, unit: 'PT' },
        },
        fields:
          'borderLeft,borderRight,borderTop,borderBottom,paddingTop,paddingBottom,paddingLeft,paddingRight',
      },
    });

    // Update index past table
    const totalCellContent = cellData.reduce((sum, c) => sum + c.text.length, 0);
    this.index = tableStart + structureSize + totalCellContent;

    // Add newline after table
    this.insertText('\n');
  }
}
