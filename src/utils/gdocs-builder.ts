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
  strikethrough?: boolean;
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
// Header/Footer configuration
export interface HeaderFooterConfig {
  text?: string;
  includePageNumber?: boolean;
  alignment?: 'left' | 'center' | 'right';
}

// Multi-phase request structure
export interface PhaseRequests {
  mainRequests: GDocsRequest[];
  phase1Requests: GDocsRequest[];
  hasHeader: boolean;
  hasFooter: boolean;
  headerConfig?: HeaderFooterConfig;
  footerConfig?: HeaderFooterConfig;
}

export class GDocsBuilder {
  private requests: GDocsRequest[] = [];
  private index: number = 1; // Google Docs starts at index 1

  // Header/Footer tracking
  private headerConfig?: HeaderFooterConfig;
  private footerConfig?: HeaderFooterConfig;

  /**
   * Set header configuration (will be created in phase 1)
   */
  setHeader(config: HeaderFooterConfig): void {
    this.headerConfig = config;
  }

  /**
   * Set footer configuration (will be created in phase 1)
   */
  setFooter(config: HeaderFooterConfig): void {
    this.footerConfig = config;
  }

  /**
   * Get all accumulated requests (main content only)
   */
  getRequests(): GDocsRequest[] {
    return this.requests;
  }

  /**
   * Get structured phase requests for multi-phase document creation
   *
   * Phase 1: Create headers, footers (get IDs from response)
   * Main: Insert all content
   * Phase 2: Populate headers/footers using IDs from phase 1
   */
  getPhaseRequests(): PhaseRequests {
    const phase1Requests: GDocsRequest[] = [];

    // Add header creation if configured
    if (this.headerConfig) {
      phase1Requests.push({
        createHeader: {
          type: 'DEFAULT',
          sectionBreakLocation: { index: 0 },
        },
      });
    }

    // Add footer creation if configured
    if (this.footerConfig) {
      phase1Requests.push({
        createFooter: {
          type: 'DEFAULT',
          sectionBreakLocation: { index: 0 },
        },
      });
    }

    return {
      mainRequests: this.requests,
      phase1Requests,
      hasHeader: !!this.headerConfig,
      hasFooter: !!this.footerConfig,
      headerConfig: this.headerConfig,
      footerConfig: this.footerConfig,
    };
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
   * Reset text styling to defaults
   *
   * CRITICAL: Google Docs API inherits styles from the insertion point.
   * Without explicit resets, styled text bleeds into subsequent content.
   * This resets ALL inheritable text properties to prevent any bleeding.
   */
  private resetTextStyle(startIndex: number, endIndex: number): void {
    this.requests.push({
      updateTextStyle: {
        range: { startIndex, endIndex },
        textStyle: {
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          foregroundColor: { color: { rgbColor: { red: 0, green: 0, blue: 0 } } },
          backgroundColor: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } }, // White = no highlight
          weightedFontFamily: { fontFamily: 'Arial' },
          fontSize: { magnitude: 11, unit: 'PT' },
          link: null,
          baselineOffset: 'NONE',
        },
        fields: 'bold,italic,underline,strikethrough,foregroundColor,backgroundColor,weightedFontFamily,fontSize,link,baselineOffset',
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
    if (options.strikethrough !== undefined) {
      style.strikethrough = options.strikethrough;
      fields.push('strikethrough');
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

    // Apply heading text color (exclude newline from styling)
    this.applyTextStyle(
      start,
      end - 1,
      {
        foregroundColor: { color: { rgbColor: hexToRgb(COLORS.primary_dark) } },
        bold: true,
      },
      'foregroundColor,bold'
    );

    // Reset newline to prevent style bleeding to next element
    this.resetTextStyle(end - 1, end);
  }

  /**
   * Insert a plain paragraph
   */
  insertParagraph(
    text: string,
    options?: {
      alignment?: 'START' | 'CENTER' | 'END' | 'JUSTIFIED';
      spaceBefore?: number;
      spaceAfter?: number;
      lineSpacing?: number;
    }
  ): void {
    const { start, end } = this.insertText(text + '\n');
    // Reset styles INCLUDING newline to prevent inheritance
    this.resetTextStyle(start, end);

    // Apply paragraph styling (alignment, spacing)
    this.applyParagraphOptions(start, end, options);
  }

  /**
   * Insert a paragraph with mixed formatting (runs)
   */
  insertFormattedParagraph(
    runs: RunContent[],
    options?: {
      alignment?: 'START' | 'CENTER' | 'END' | 'JUSTIFIED';
      spaceBefore?: number;
      spaceAfter?: number;
      lineSpacing?: number;
    }
  ): void {
    const paraStart = this.index;

    // Track all run positions for reset-then-style approach
    const runPositions: Array<{ start: number; end: number; style?: Record<string, unknown>; fields?: string }> = [];

    // Insert all text first
    for (const run of runs) {
      const { start, end } = this.insertText(run.text);
      if (run.style) {
        const { style, fields } = this.buildTextStyle(run.style);
        runPositions.push({ start, end, style, fields: fields.join(',') });
      } else {
        runPositions.push({ start, end });
      }
    }

    // Add paragraph-ending newline
    const { start: nlStart, end: nlEnd } = this.insertText('\n');

    // Reset ENTIRE paragraph to defaults first (prevents style bleeding between runs)
    this.resetTextStyle(paraStart, this.index);

    // Now apply explicit styles on top of reset defaults
    for (const pos of runPositions) {
      if (pos.style && pos.fields) {
        this.applyTextStyle(pos.start, pos.end, pos.style, pos.fields);
      }
    }

    // Apply paragraph styling (alignment, spacing)
    this.applyParagraphOptions(paraStart, this.index, options);
  }

  /**
   * Apply paragraph options (alignment, spacing) to a range
   */
  private applyParagraphOptions(
    start: number,
    end: number,
    options?: {
      alignment?: 'START' | 'CENTER' | 'END' | 'JUSTIFIED';
      spaceBefore?: number;
      spaceAfter?: number;
      lineSpacing?: number;
    }
  ): void {
    if (!options) return;

    const style: Record<string, unknown> = {};
    const fields: string[] = [];

    if (options.alignment) {
      style.alignment = options.alignment;
      fields.push('alignment');
    }
    if (options.spaceBefore !== undefined) {
      style.spaceAbove = { magnitude: options.spaceBefore, unit: 'PT' };
      fields.push('spaceAbove');
    }
    if (options.spaceAfter !== undefined) {
      style.spaceBelow = { magnitude: options.spaceAfter, unit: 'PT' };
      fields.push('spaceBelow');
    }
    if (options.lineSpacing !== undefined) {
      style.lineSpacing = options.lineSpacing;
      fields.push('lineSpacing');
    }

    if (fields.length > 0) {
      this.applyParagraphStyle(start, end, style, fields.join(','));
    }
  }

  /**
   * Insert a bullet list
   */
  insertBulletList(items: Array<{ text: string; level?: number }>): void {
    const listStart = this.index;
    let totalTabs = 0; // Track tabs for index adjustment

    // Insert all items with tab prefixes for nesting
    for (const item of items) {
      const level = item.level ?? 0;
      const prefix = '\t'.repeat(level);
      totalTabs += level; // Count tabs
      this.insertText(prefix + item.text + '\n');
    }

    const listEnd = this.index;

    // Reset styles INCLUDING newline to prevent inheritance
    this.resetTextStyle(listStart, listEnd);

    // Apply bullet formatting to entire range
    this.requests.push({
      createParagraphBullets: {
        range: { startIndex: listStart, endIndex: listEnd },
        bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
      },
    });

    // GOOGLE DOCS API QUIRK: createParagraphBullets consumes tab characters.
    // Tabs are needed for nesting depth but don't persist in final document.
    // Adjust index to account for removed tabs. See DOCGEN-GOOGLEDOCS-SPEC 8.4.
    this.index -= totalTabs;
  }

  /**
   * Insert a numbered list
   *
   * Available listStyle options:
   * - 'decimal' (default): 1, a, i
   * - 'legal': 1, a, i (same as decimal - Google Docs API doesn't support 1, A, a)
   * - 'decimal_nested': 1., 1.1., 1.1.1.
   * - 'upper_alpha': A, a, i
   * - 'upper_roman': I, A, 1
   */
  insertNumberedList(
    items: Array<{ text: string; level?: number }>,
    options: {
      listStyle?: 'decimal' | 'legal' | 'decimal_nested' | 'upper_alpha' | 'upper_roman';
    } = {}
  ): void {
    const listStart = this.index;
    let totalTabs = 0; // Track tabs for index adjustment

    for (const item of items) {
      const level = item.level ?? 0;
      const prefix = '\t'.repeat(level);
      totalTabs += level; // Count tabs
      this.insertText(prefix + item.text + '\n');
    }

    const listEnd = this.index;

    // Reset styles INCLUDING newline to prevent inheritance
    this.resetTextStyle(listStart, listEnd);

    // Map listStyle to Google Docs bullet preset
    const presetMap: Record<string, string> = {
      decimal: 'NUMBERED_DECIMAL_ALPHA_ROMAN',
      legal: 'NUMBERED_DECIMAL_ALPHA_ROMAN', // Best available - no true 1, A, a support
      decimal_nested: 'NUMBERED_DECIMAL_NESTED',
      upper_alpha: 'NUMBERED_UPPERALPHA_ALPHA_ROMAN',
      upper_roman: 'NUMBERED_UPPERROMAN_UPPERALPHA_DECIMAL',
    };
    const bulletPreset = presetMap[options.listStyle ?? 'decimal'] ?? 'NUMBERED_DECIMAL_ALPHA_ROMAN';

    // Log warning for unsupported features
    if (options.listStyle === 'legal') {
      console.warn('insertNumberedList: legal style (1, A, a) not available in Google Docs API, using decimal (1, a, i)');
    }

    this.requests.push({
      createParagraphBullets: {
        range: { startIndex: listStart, endIndex: listEnd },
        bulletPreset,
      },
    });

    // GOOGLE DOCS API QUIRK: createParagraphBullets consumes tab characters.
    // Tabs are needed for nesting depth but don't persist in final document.
    // Adjust index to account for removed tabs. See DOCGEN-GOOGLEDOCS-SPEC 8.4.
    this.index -= totalTabs;
  }

  /**
   * Insert a callout box (single-cell table with colored background)
   */
  insertCallout(
    content: string,
    style: 'info' | 'warning' | 'critical' | 'success' = 'info'
  ): void {
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
      info: { bg: COLORS.info_bg, border: COLORS.info_border, text: COLORS.info_text },
      warning: { bg: COLORS.high_bg, border: COLORS.high_border, text: COLORS.high_text },
      critical: { bg: COLORS.critical_bg, border: COLORS.critical_border, text: COLORS.critical_text },
      success: { bg: COLORS.low_bg, border: COLORS.low_border, text: COLORS.low_text },
    };
    const colors = colorMap[style] ?? colorMap.info;

    const tableStart = this.index;

    // Insert single-cell table
    this.requests.push({
      insertTable: {
        rows: 1,
        columns: 1,
        location: { index: tableStart },
      },
    });

    // Style cell background and borders BEFORE inserting content (matches regular table pattern)
    // tableStartLocation: +1 offset for phantom newline in blank docs
    this.requests.push({
      updateTableCellStyle: {
        tableRange: {
          tableCellLocation: {
            tableStartLocation: { index: tableStart + 1 },
            rowIndex: 0,
            columnIndex: 0,
          },
          rowSpan: 1,
          columnSpan: 1,
        },
        tableCellStyle: {
          backgroundColor: { color: { rgbColor: hexToRgb(colors.bg) } },
          borderLeft: {
            color: { color: { rgbColor: hexToRgb(colors.border) } },
            width: { magnitude: 4, unit: 'PT' },
            dashStyle: 'SOLID',
          },
          borderTop: { color: { color: { rgbColor: hexToRgb(colors.bg) } }, width: { magnitude: 0, unit: 'PT' }, dashStyle: 'SOLID' },
          borderBottom: { color: { color: { rgbColor: hexToRgb(colors.bg) } }, width: { magnitude: 0, unit: 'PT' }, dashStyle: 'SOLID' },
          borderRight: { color: { color: { rgbColor: hexToRgb(colors.bg) } }, width: { magnitude: 0, unit: 'PT' }, dashStyle: 'SOLID' },
          paddingTop: { magnitude: 10, unit: 'PT' },
          paddingBottom: { magnitude: 10, unit: 'PT' },
          paddingLeft: { magnitude: 12, unit: 'PT' },
          paddingRight: { magnitude: 12, unit: 'PT' },
        },
        fields: 'backgroundColor,borderLeft,borderTop,borderBottom,borderRight,paddingTop,paddingBottom,paddingLeft,paddingRight',
      },
    });

    // Table structure: 3 + 1 row * (1 col * 2 + 1) = 3 + 3 = 6
    // Cell content starts at tableStart + 4
    const cellContentIndex = tableStart + 4;

    // Insert content into cell
    this.requests.push({
      insertText: {
        location: { index: cellContentIndex },
        text: content,
      },
    });

    // Style text color (index accounts for prior content insertions)
    this.requests.push({
      updateTextStyle: {
        range: {
          startIndex: cellContentIndex,
          endIndex: cellContentIndex + content.length,
        },
        textStyle: {
          foregroundColor: { color: { rgbColor: hexToRgb(colors.text) } },
        },
        fields: 'foregroundColor',
      },
    });

    // Update index: tableStart + table structure (6) + content length
    this.index = tableStart + 6 + content.length;

    // Add newline after table
    this.insertText('\n');
  }

  /**
   * Insert a code block (table-based with proper styling)
   *
   * Uses single-cell table for proper boxed appearance:
   * - Light gray background (#F5F5F5)
   * - Thin black border (1pt) on all sides
   * - Courier New, 10pt, black text
   * - Single line spacing
   * - 8pt vertical padding, 10pt horizontal padding
   */
  insertCodeBlock(content: string): void {
    const tableStart = this.index;
    const bgColor = 'F5F5F5';
    const borderColor = '000000';

    // Insert single-cell table
    this.requests.push({
      insertTable: {
        rows: 1,
        columns: 1,
        location: { index: tableStart },
      },
    });

    // Style cell: background, borders, padding
    const border = {
      color: { color: { rgbColor: hexToRgb(borderColor) } },
      width: { magnitude: 1, unit: 'PT' },
      dashStyle: 'SOLID',
    };

    this.requests.push({
      updateTableCellStyle: {
        tableRange: {
          tableCellLocation: {
            tableStartLocation: { index: tableStart + 1 },
            rowIndex: 0,
            columnIndex: 0,
          },
          rowSpan: 1,
          columnSpan: 1,
        },
        tableCellStyle: {
          backgroundColor: { color: { rgbColor: hexToRgb(bgColor) } },
          borderLeft: border,
          borderRight: border,
          borderTop: border,
          borderBottom: border,
          paddingTop: { magnitude: 8, unit: 'PT' },
          paddingBottom: { magnitude: 8, unit: 'PT' },
          paddingLeft: { magnitude: 10, unit: 'PT' },
          paddingRight: { magnitude: 10, unit: 'PT' },
        },
        fields: 'backgroundColor,borderLeft,borderRight,borderTop,borderBottom,paddingTop,paddingBottom,paddingLeft,paddingRight',
      },
    });

    // Table structure: 3 + 1 row * (1 col * 2 + 1) = 3 + 3 = 6
    // Cell content starts at tableStart + 4
    const cellContentIndex = tableStart + 4;

    // Insert code content into cell
    this.requests.push({
      insertText: {
        location: { index: cellContentIndex },
        text: content,
      },
    });

    // Style text: Courier New, 10pt, black
    this.requests.push({
      updateTextStyle: {
        range: {
          startIndex: cellContentIndex,
          endIndex: cellContentIndex + content.length,
        },
        textStyle: {
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          foregroundColor: { color: { rgbColor: { red: 0, green: 0, blue: 0 } } },
          weightedFontFamily: { fontFamily: 'Courier New' },
          fontSize: { magnitude: 10, unit: 'PT' },
        },
        fields: 'bold,italic,underline,strikethrough,foregroundColor,weightedFontFamily,fontSize',
      },
    });

    // Apply single line spacing to code content
    this.requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: cellContentIndex,
          endIndex: cellContentIndex + content.length,
        },
        paragraphStyle: {
          lineSpacing: 100,
          spaceAbove: { magnitude: 0, unit: 'PT' },
          spaceBelow: { magnitude: 0, unit: 'PT' },
        },
        fields: 'lineSpacing,spaceAbove,spaceBelow',
      },
    });

    // Update index: tableStart + table structure (6) + content length
    this.index = tableStart + 6 + content.length;

    // Add newline after table
    this.insertText('\n');
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
   * Insert an inline image from URL
   *
   * Note: URL must be publicly accessible.
   * Base64 images are not directly supported by the API.
   */
  insertImage(
    url: string,
    options?: {
      width?: number; // Points
      height?: number; // Points
      alignment?: 'left' | 'center' | 'right';
    }
  ): void {
    const imageStart = this.index;

    const insertRequest: GDocsRequest = {
      insertInlineImage: {
        location: { index: this.index },
        uri: url,
      },
    };

    // Add size if specified
    if (options?.width || options?.height) {
      (insertRequest.insertInlineImage as any).objectSize = {};
      if (options.width) {
        (insertRequest.insertInlineImage as any).objectSize.width = {
          magnitude: options.width,
          unit: 'PT',
        };
      }
      if (options.height) {
        (insertRequest.insertInlineImage as any).objectSize.height = {
          magnitude: options.height,
          unit: 'PT',
        };
      }
    }

    this.requests.push(insertRequest);
    this.index += 1; // Inline image takes 1 index position

    // Handle alignment by wrapping in a paragraph with alignment
    if (options?.alignment && options.alignment !== 'left') {
      const alignmentMap: Record<string, string> = {
        center: 'CENTER',
        right: 'END',
      };
      this.requests.push({
        updateParagraphStyle: {
          range: { startIndex: imageStart, endIndex: this.index },
          paragraphStyle: { alignment: alignmentMap[options.alignment] },
          fields: 'alignment',
        },
      });
    }

    // Add newline after image
    this.insertText('\n');
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
   * Cell data for rich table cells
   */
  private normalizeCellData(
    cell: string | { text?: string; content?: string; backgroundColor?: string; bold?: boolean; alignment?: 'left' | 'center' | 'right' }
  ): { text: string; backgroundColor?: string; bold?: boolean; alignment?: 'left' | 'center' | 'right' } {
    if (typeof cell === 'string') {
      return { text: cell };
    }
    // Support both 'text' and 'content' for flexibility
    const text = cell.text ?? cell.content ?? '';
    return {
      text: typeof text === 'string' ? text : '',
      backgroundColor: cell.backgroundColor,
      bold: cell.bold,
      alignment: cell.alignment,
    };
  }

  /**
   * Insert a simple table with headers and rows
   *
   * Note: Table index calculation is complex. The table structure itself
   * consumes indices: 3 + rows * (cols * 2 + 1)
   * Cell content is inserted separately and shifts indices.
   *
   * Rows can be string[] or TableCell[] for per-cell styling.
   */
  insertTable(
    headers: string[],
    rows: Array<Array<string | { text?: string; content?: string; backgroundColor?: string; bold?: boolean; alignment?: 'left' | 'center' | 'right' }>>,
    options: {
      headerBold?: boolean;
      headerBackground?: string;
      columnWidths?: number[]; // Percentages, e.g., [30, 50, 20]
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

    // Build all cell data with rich formatting
    // Normalize all cells to consistent shape
    type NormalizedCell = { text: string; backgroundColor?: string; bold?: boolean; alignment?: 'left' | 'center' | 'right' };
    const allRows: NormalizedCell[][] = [
      headers.map((h): NormalizedCell => ({ text: h })),
      ...rows.map((row) => row.map((cell) => this.normalizeCellData(cell))),
    ];
    const cellData: Array<{
      row: number;
      col: number;
      text: string;
      isHeader: boolean;
      backgroundColor?: string;
      bold?: boolean;
      alignment?: 'left' | 'center' | 'right';
    }> = [];

    for (let r = 0; r < allRows.length; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = allRows[r][c] ?? { text: '' };
        if (cell.text) {
          cellData.push({
            row: r,
            col: c,
            text: cell.text,
            isHeader: r === 0,
            backgroundColor: cell.backgroundColor,
            bold: cell.bold,
            alignment: cell.alignment,
          });
        }
      }
    }

    // Calculate base index for each cell
    // Cell (r, c) base index = tableStart + 4 + r * (numCols * 2 + 1) + c * 2
    const cellInserts: GDocsRequest[] = [];
    const cellFormats: GDocsRequest[] = [];

    // Track cell resets separately (applied before formatting)
    const cellResets: GDocsRequest[] = [];

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

      // Reset ALL cell text to defaults first (prevents style bleeding)
      cellResets.push({
        updateTextStyle: {
          range: {
            startIndex: formatIndex,
            endIndex: formatIndex + cell.text.length,
          },
          textStyle: {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            foregroundColor: { color: { rgbColor: { red: 0, green: 0, blue: 0 } } },
            backgroundColor: null,
            weightedFontFamily: { fontFamily: 'Arial' },
            fontSize: { magnitude: 11, unit: 'PT' },
            link: null,
            baselineOffset: 'NONE',
          },
          fields: 'bold,italic,underline,strikethrough,foregroundColor,backgroundColor,weightedFontFamily,fontSize,link,baselineOffset',
        },
      });

      // Header styling (applied after reset)
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

      // Per-cell bold from TableCell
      if (cell.bold && !cell.isHeader) {
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

      // Per-cell alignment
      if (cell.alignment) {
        const alignmentMap: Record<string, string> = {
          left: 'START',
          center: 'CENTER',
          right: 'END',
        };
        cellFormats.push({
          updateParagraphStyle: {
            range: {
              startIndex: formatIndex,
              endIndex: formatIndex + cell.text.length,
            },
            paragraphStyle: { alignment: alignmentMap[cell.alignment] },
            fields: 'alignment',
          },
        });
      }
    }

    // Per-cell background colors (applied before cell content inserts, after borders)
    const cellBackgrounds: GDocsRequest[] = [];
    for (const cell of cellData) {
      if (cell.backgroundColor && !cell.isHeader) {
        cellBackgrounds.push({
          updateTableCellStyle: {
            tableRange: {
              tableCellLocation: {
                tableStartLocation: { index: tableStart + 1 },
                rowIndex: cell.row,
                columnIndex: cell.col,
              },
              rowSpan: 1,
              columnSpan: 1,
            },
            tableCellStyle: {
              backgroundColor: { color: { rgbColor: hexToRgb(cell.backgroundColor) } },
            },
            fields: 'backgroundColor',
          },
        });
      }
    }

    // Header row background (must come before cell content inserts)
    {
      const bgColor = options.headerBackground ?? COLORS.header_cell;
      this.requests.push({
        updateTableCellStyle: {
          tableRange: {
            tableCellLocation: {
              // +1 offset: blank Google Docs have a protected trailing newline at index 1-2.
              // Our insertions push it forward, so tables land at tableStart + 1.
              tableStartLocation: { index: tableStart + 1 },
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

    // Border styling for all cells (must come before cell content inserts)
    const border = {
      color: { color: { rgbColor: hexToRgb(COLORS.border) } },
      width: { magnitude: 0.5, unit: 'PT' },
      dashStyle: 'SOLID',
    };

    this.requests.push({
      updateTableCellStyle: {
        tableRange: {
          tableCellLocation: {
            // +1 offset: blank Google Docs have a protected trailing newline at index 1-2.
            // Our insertions push it forward, so tables land at tableStart + 1.
            tableStartLocation: { index: tableStart + 1 },
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

    // Apply column widths if specified
    if (options.columnWidths && options.columnWidths.length === numCols) {
      // Page width: 8.5" = 612pt, minus 72pt margins = 468pt content width
      const PAGE_CONTENT_WIDTH_PT = 468;

      for (let col = 0; col < numCols; col++) {
        const widthPt = (PAGE_CONTENT_WIDTH_PT * options.columnWidths[col]) / 100;
        this.requests.push({
          updateTableColumnProperties: {
            tableStartLocation: { index: tableStart + 1 },
            columnIndices: [col],
            tableColumnProperties: {
              widthType: 'FIXED_WIDTH',
              width: { magnitude: widthPt, unit: 'PT' },
            },
            fields: 'widthType,width',
          },
        });
      }
    }

    // Add per-cell backgrounds (before cell content inserts)
    this.requests.push(...cellBackgrounds);

    // Add cell inserts in REVERSE order (to preserve indices)
    this.requests.push(...cellInserts.reverse());

    // Add cell resets first (clears inherited styles)
    this.requests.push(...cellResets);

    // Add cell formats (e.g., header bold, per-cell bold) on top of resets
    this.requests.push(...cellFormats);

    // Update index past table
    const totalCellContent = cellData.reduce((sum, c) => sum + c.text.length, 0);
    this.index = tableStart + structureSize + totalCellContent;

    // Add newline after table
    this.insertText('\n');
  }
}
