import JSZip from 'jszip';
import { readFileSync } from 'fs';

export async function fillTemplate(
  templatePath: string,
  replacements: Record<string, string>
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(readFileSync(templatePath));

  let xml = await zip.file('word/document.xml')!.async('string');

  for (const [placeholder, value] of Object.entries(replacements)) {
    // Handle both [PLACEHOLDER] and {{placeholder}} styles
    xml = xml.replaceAll(`[${placeholder}]`, escapeXml(value));
    xml = xml.replaceAll(`{{${placeholder}}}`, escapeXml(value));
  }

  zip.file('word/document.xml', xml);
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
