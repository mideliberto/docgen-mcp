/**
 * Structured Section Types for Google Docs Generation
 *
 * These types define the structured input format for document generation.
 * NO MARKDOWN PARSING. All formatting is explicit in the data structure.
 */

/**
 * Text run with explicit styling
 */
export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean; // Monospace font
  link?: string;
  color?: string; // Hex color without #
  backgroundColor?: string; // Hex color without # (highlight)
  fontSize?: number; // Points
}

/**
 * A paragraph can be plain text or an array of styled runs
 */
export type ParagraphContent = string | TextRun[];

/**
 * List item with optional nesting and formatting
 */
export interface ListItem {
  content: ParagraphContent;
  level?: number; // 0-based nesting level
}

/**
 * Table cell content
 */
export interface TableCell {
  content: ParagraphContent;
  bold?: boolean;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Table row
 */
export type TableRow = TableCell[] | string[];

// ============================================================================
// Section Types
// ============================================================================

export interface HeadingSection {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

export interface ParagraphSection {
  type: 'paragraph';
  content: ParagraphContent;
  alignment?: 'left' | 'center' | 'right' | 'justified';
  spaceBefore?: number; // points
  spaceAfter?: number; // points
  lineSpacing?: number; // percentage: 100 = single, 150 = 1.5, 200 = double
}

export interface BulletListSection {
  type: 'bullet_list';
  items: (string | ListItem)[];
}

export interface NumberedListSection {
  type: 'numbered_list';
  items: (string | ListItem)[];
  listStyle?: 'decimal' | 'legal' | 'decimal_nested' | 'upper_alpha' | 'upper_roman';
}

export interface TableSection {
  type: 'table';
  headers: string[];
  rows: TableRow[];
  columnWidths?: number[]; // Percentages, e.g., [30, 50, 20] = 30%, 50%, 20%
}

export interface CalloutSection {
  type: 'callout';
  style: 'info' | 'warning' | 'critical' | 'success';
  content: ParagraphContent;
}

export interface CodeBlockSection {
  type: 'code_block';
  content: string;
  language?: string; // For future syntax highlighting
}

export interface HorizontalRuleSection {
  type: 'horizontal_rule';
}

export interface PageBreakSection {
  type: 'page_break';
}

export interface ImageSection {
  type: 'image';
  url?: string; // Public URL
  filePath?: string; // Local file path (will be uploaded to Drive)
  width?: number; // Points
  height?: number; // Points
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Union of all section types
 */
export type Section =
  | HeadingSection
  | ParagraphSection
  | BulletListSection
  | NumberedListSection
  | TableSection
  | CalloutSection
  | CodeBlockSection
  | HorizontalRuleSection
  | PageBreakSection
  | ImageSection;

/**
 * Header/Footer configuration
 */
export interface HeaderFooterOptions {
  text?: string;
  includePageNumber?: boolean;
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Document input schema
 */
export interface DocumentInput {
  title: string;
  sections: Section[];
  config: 'tma' | 'pwp';
  folderId?: string;
  header?: HeaderFooterOptions;
  footer?: HeaderFooterOptions;
}
