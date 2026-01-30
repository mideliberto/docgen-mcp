export const COLORS = {
  // Primary
  primary_dark: "1F4E79",
  primary_alt: "2F5496",
  primary_accent: "D6E3F0",

  // Neutral
  white: "FFFFFF",
  black: "000000",
  border: "CCCCCC",
  header_cell: "D9D9D9",
  alt_row: "F2F2F2",
  code_block: "F5F5F5",

  // Text
  text_body: "666666",
  text_muted: "888888",
  text_light: "999999",

  // Severity
  critical_fill: "CC0000",
  critical_bg: "FDECEA",
  critical_border: "EA4335",
  critical_text: "B71C1C",

  high_fill: "FF8C00",
  high_bg: "FEF7E0",
  high_border: "F9AB00",
  high_text: "E65100",

  medium_fill: "FFD700",
  medium_bg: "FEF7E0",
  medium_border: "F9AB00",

  low_fill: "228B22",
  low_bg: "E8F4EA",
  low_border: "34A853",
  low_text: "1B5E20",

  // Callouts
  info_bg: "D6E3F0",
  info_border: "1F4E79",
  info_text: "1F4E79",
} as const;

export const FONTS = {
  family: "Arial",
  sizes: {
    title_hero: 56,   // 28pt
    title: 48,        // 24pt
    title_small: 40,  // 20pt
    heading1: 32,     // 16pt
    heading2: 28,     // 14pt
    heading3: 24,     // 12pt
    body: 22,         // 11pt
    body_small: 20,   // 10pt
    caption: 18,      // 9pt
  }
} as const;

export const PAGE = {
  width: 12240,
  height: 15840,
  margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
  content_width: 9360,
} as const;

export const TABLE = {
  border: { style: "single" as const, size: 1, color: COLORS.border },
  cell_margin: { top: 80, bottom: 80, left: 120, right: 120 },
} as const;
