/**
 * Section Builder - Converts structured sections to GDocsBuilder calls
 *
 * This is the bridge between the structured Section[] input and the GDocsBuilder.
 * NO MARKDOWN PARSING. Just maps structured data to builder method calls.
 */

import { GDocsBuilder, RunContent, TextStyleOptions } from './gdocs-builder.js';
import {
  Section,
  ParagraphContent,
  TextRun,
  ListItem,
  TableRow,
  TableCell,
  ImageSection,
} from '../types/sections.js';
import { uploadImageToDrive } from '../auth/google-auth.js';

/**
 * Convert ParagraphContent to RunContent[]
 */
function toRuns(content: ParagraphContent): RunContent[] {
  if (typeof content === 'string') {
    return [{ text: content }];
  }

  return content.map((run: TextRun) => {
    const style: TextStyleOptions = {};

    if (run.bold) style.bold = true;
    if (run.italic) style.italic = true;
    if (run.underline) style.underline = true;
    if (run.strikethrough) style.strikethrough = true;
    if (run.link) style.link = run.link;
    if (run.color) style.color = run.color;
    if (run.backgroundColor) style.backgroundColor = run.backgroundColor;
    if (run.fontSize) style.fontSize = run.fontSize;
    if (run.code) style.fontFamily = 'Consolas';

    return {
      text: run.text,
      style: Object.keys(style).length > 0 ? style : undefined,
    };
  });
}

/**
 * Normalize list items to ListItem format
 */
function normalizeListItems(items: (string | ListItem)[]): ListItem[] {
  return items.map((item) => {
    if (typeof item === 'string') {
      return { content: item, level: 0 };
    }
    return { ...item, level: item.level ?? 0 };
  });
}

/**
 * Build a Google Doc from structured sections
 */
export async function buildFromSections(
  builder: GDocsBuilder,
  title: string,
  sections: Section[]
): Promise<void> {
  // Insert title
  builder.insertHeading(title, 1);

  for (const section of sections) {
    switch (section.type) {
      case 'heading':
        builder.insertHeading(section.text, section.level);
        break;

      case 'paragraph': {
        const runs = toRuns(section.content);
        // Map alignment to Google Docs API format
        const alignmentMap: Record<string, 'START' | 'CENTER' | 'END' | 'JUSTIFIED'> = {
          left: 'START',
          center: 'CENTER',
          right: 'END',
          justified: 'JUSTIFIED',
        };
        const options = {
          alignment: section.alignment ? alignmentMap[section.alignment] : undefined,
          spaceBefore: section.spaceBefore,
          spaceAfter: section.spaceAfter,
          lineSpacing: section.lineSpacing,
        };

        if (runs.length === 1 && !runs[0].style) {
          builder.insertParagraph(runs[0].text, options);
        } else {
          builder.insertFormattedParagraph(runs, options);
        }
        break;
      }

      case 'bullet_list': {
        const items = normalizeListItems(section.items);
        builder.insertBulletList(
          items.map((item) => {
            // For now, flatten to plain text. TODO: support formatted list items
            const text =
              typeof item.content === 'string'
                ? item.content
                : item.content.map((r) => r.text).join('');
            return { text, level: item.level ?? 0 };
          })
        );
        break;
      }

      case 'numbered_list': {
        const items = normalizeListItems(section.items);
        builder.insertNumberedList(
          items.map((item) => {
            const text =
              typeof item.content === 'string'
                ? item.content
                : item.content.map((r) => r.text).join('');
            return { text, level: item.level ?? 0 };
          }),
          {
            listStyle: section.listStyle,
          }
        );
        break;
      }

      case 'table': {
        // Pass rich cell data through to preserve backgroundColor, bold, alignment
        // Support both 'text' (simple) and 'content' (typed) properties
        const rows = section.rows.map((row: TableRow) =>
          row.map((cell: TableCell | string | { text?: string; backgroundColor?: string; bold?: boolean; alignment?: 'left' | 'center' | 'right' }) => {
            if (typeof cell === 'string') {
              return cell;
            }
            // Handle both 'text' shorthand and 'content' typed property
            let text: string;
            if ('text' in cell && typeof cell.text === 'string') {
              text = cell.text;
            } else if ('content' in cell) {
              const content = (cell as TableCell).content;
              text = typeof content === 'string'
                ? content
                : content.map((r) => r.text).join('');
            } else {
              text = '';
            }
            return {
              text,
              backgroundColor: cell.backgroundColor,
              bold: cell.bold,
              alignment: (cell as any).alignment,
            };
          })
        );
        builder.insertTable(section.headers, rows, {
          columnWidths: section.columnWidths,
        });
        break;
      }

      case 'callout':
        const calloutText =
          typeof section.content === 'string'
            ? section.content
            : section.content.map((r) => r.text).join('');
        builder.insertCallout(calloutText, section.style);
        break;

      case 'code_block':
        builder.insertCodeBlock(section.content);
        break;

      case 'horizontal_rule':
        builder.insertHorizontalRule();
        break;

      case 'page_break':
        builder.insertPageBreak();
        break;

      case 'image': {
        const imgSection = section as ImageSection;
        let imageUrl: string | undefined = imgSection.url;

        // Upload local file to Drive if filePath is provided
        if (!imageUrl && imgSection.filePath) {
          try {
            imageUrl = await uploadImageToDrive(imgSection.filePath);
          } catch (err) {
            console.error(`Failed to upload image ${imgSection.filePath}:`, err);
          }
        }

        if (imageUrl) {
          builder.insertImage(imageUrl, {
            width: imgSection.width,
            height: imgSection.height,
            alignment: imgSection.alignment,
          });
        }
        break;
      }

      default:
        // Handle aliases and unknown types
        const sectionType = (section as any).type;
        if (sectionType === 'code') {
          builder.insertCodeBlock((section as any).content);
        } else {
          console.error(`Unknown section type: ${sectionType}`);
        }
    }
  }

  // Apply document-level styling
  builder.insertDocumentStyle();
}
