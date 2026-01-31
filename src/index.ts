#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Packer } from 'docx';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { loadConfig } from './config.js';
import {
  generateBrief,
  generateMemo,
  generateProposal,
  generateMeetingNotes,
  generateProjectSummary,
  generateAssessment,
  generateRiskRegister,
  generateRunbook,
} from './generators/index.js';
import { GDocsBuilder } from './utils/gdocs-builder.js';
import { buildFromSections } from './utils/section-builder.js';
import { getDocsService, getDriveService, hasStoredCredentials } from './auth/google-auth.js';
import { Section } from './types/sections.js';

const server = new Server(
  {
    name: 'docgen-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const DOC_TYPES = [
  'brief',
  'memo',
  'proposal',
  'meeting_notes',
  'project_summary',
  'assessment',
  'risk_register',
  'runbook',
] as const;

type DocType = (typeof DOC_TYPES)[number];

const DOC_SCHEMAS: Record<DocType, object> = {
  brief: {
    type: 'object',
    properties: {
      executive_summary: { type: 'string', description: 'Brief overview of the topic and recommendation' },
      background: { type: 'string', description: 'Context and background information (optional)' },
      recommendation: { type: 'string', description: 'The primary recommendation' },
      rationale: { type: 'array', items: { type: 'string' }, description: 'Supporting reasons (optional)' },
      next_steps: { type: 'array', items: { type: 'string' }, description: 'Action items to proceed' },
      timeline: { type: 'string', description: 'Expected timeline (optional)' },
    },
    required: ['executive_summary', 'recommendation', 'next_steps'],
  },
  memo: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient(s)' },
      from: { type: 'string', description: 'Sender (defaults to config author)' },
      subject: { type: 'string', description: 'Subject line' },
      body: { type: 'string', description: 'Main content (use \\n\\n for paragraphs)' },
      action_items: { type: 'array', items: { type: 'string' }, description: 'Action items (optional)' },
    },
    required: ['to', 'subject', 'body'],
  },
  proposal: {
    type: 'object',
    properties: {
      executive_summary: { type: 'string' },
      problem_statement: { type: 'string' },
      proposed_solution: { type: 'string' },
      scope: { type: 'array', items: { type: 'string' } },
      deliverables: { type: 'array', items: { type: 'string' } },
      timeline_phases: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            phase: { type: 'string' },
            duration: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
      investment: {
        type: 'array',
        items: {
          type: 'object',
          properties: { item: { type: 'string' }, amount: { type: 'string' } },
        },
      },
      assumptions: { type: 'array', items: { type: 'string' } },
      next_steps: { type: 'array', items: { type: 'string' } },
    },
    required: ['executive_summary', 'problem_statement', 'proposed_solution', 'scope', 'deliverables', 'next_steps'],
  },
  meeting_notes: {
    type: 'object',
    properties: {
      meeting_date: { type: 'string' },
      attendees: { type: 'array', items: { type: 'string' } },
      agenda: { type: 'array', items: { type: 'string' } },
      discussion_points: { type: 'array', items: { type: 'string' } },
      decisions: { type: 'array', items: { type: 'string' } },
      action_items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            task: { type: 'string' },
            due: { type: 'string' },
          },
          required: ['owner', 'task'],
        },
      },
      next_meeting: { type: 'string' },
    },
    required: ['meeting_date', 'attendees', 'discussion_points', 'action_items'],
  },
  project_summary: {
    type: 'object',
    properties: {
      overview: { type: 'string' },
      objectives: { type: 'array', items: { type: 'string' } },
      status: { type: 'string', enum: ['on_track', 'at_risk', 'delayed', 'completed'] },
      status_summary: { type: 'string' },
      accomplishments: { type: 'array', items: { type: 'string' } },
      upcoming_milestones: {
        type: 'array',
        items: {
          type: 'object',
          properties: { milestone: { type: 'string' }, date: { type: 'string' } },
        },
      },
      risks: {
        type: 'array',
        items: {
          type: 'object',
          properties: { risk: { type: 'string' }, mitigation: { type: 'string' } },
        },
      },
      blockers: { type: 'array', items: { type: 'string' } },
      next_steps: { type: 'array', items: { type: 'string' } },
    },
    required: ['overview', 'objectives', 'status', 'status_summary', 'accomplishments', 'next_steps'],
  },
  assessment: {
    type: 'object',
    properties: {
      executive_summary: { type: 'string' },
      scope: { type: 'string' },
      methodology: { type: 'string' },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            title: { type: 'string' },
            description: { type: 'string' },
            recommendation: { type: 'string' },
          },
          required: ['severity', 'title', 'description', 'recommendation'],
        },
      },
      summary_by_severity: {
        type: 'array',
        items: {
          type: 'object',
          properties: { severity: { type: 'string' }, count: { type: 'number' } },
        },
      },
      recommendations: { type: 'array', items: { type: 'string' } },
      next_steps: { type: 'array', items: { type: 'string' } },
    },
    required: ['executive_summary', 'scope', 'methodology', 'findings', 'recommendations', 'next_steps'],
  },
  risk_register: {
    type: 'object',
    properties: {
      overview: { type: 'string' },
      risks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            likelihood: { type: 'string', enum: ['low', 'medium', 'high'] },
            impact: { type: 'string', enum: ['low', 'medium', 'high'] },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            owner: { type: 'string' },
            mitigation: { type: 'string' },
            status: { type: 'string', enum: ['open', 'mitigating', 'closed'] },
          },
          required: ['id', 'title', 'description', 'likelihood', 'impact', 'severity', 'owner', 'mitigation', 'status'],
        },
      },
    },
    required: ['overview', 'risks'],
  },
  runbook: {
    type: 'object',
    properties: {
      purpose: { type: 'string' },
      scope: { type: 'string' },
      prerequisites: { type: 'array', items: { type: 'string' } },
      procedures: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            steps: { type: 'array', items: { type: 'string' } },
          },
          required: ['title', 'steps'],
        },
      },
      troubleshooting: {
        type: 'array',
        items: {
          type: 'object',
          properties: { issue: { type: 'string' }, resolution: { type: 'string' } },
        },
      },
      contacts: {
        type: 'array',
        items: {
          type: 'object',
          properties: { role: { type: 'string' }, name: { type: 'string' }, contact: { type: 'string' } },
        },
      },
      revision_history: {
        type: 'array',
        items: {
          type: 'object',
          properties: { date: { type: 'string' }, version: { type: 'string' }, changes: { type: 'string' } },
        },
      },
    },
    required: ['purpose', 'scope', 'procedures'],
  },
};

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'generate_document',
      description: 'Generate a professional Word document',
      inputSchema: {
        type: 'object',
        properties: {
          doc_type: {
            type: 'string',
            enum: DOC_TYPES,
            description: 'Type of document to generate',
          },
          context: {
            type: 'string',
            enum: ['tma', 'pwp'],
            description: 'TMA consulting or PWP internal',
          },
          title: { type: 'string', description: 'Document title' },
          content: {
            type: 'object',
            description: 'Document-specific content (use get_template_schema to see required fields)',
          },
          filename: {
            type: 'string',
            description: 'Output filename without extension (optional)',
          },
        },
        required: ['doc_type', 'context', 'title', 'content'],
      },
    },
    {
      name: 'list_document_types',
      description: 'List available document types and their purposes',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_template_schema',
      description: 'Get the required content structure for a document type',
      inputSchema: {
        type: 'object',
        properties: {
          doc_type: {
            type: 'string',
            enum: DOC_TYPES,
            description: 'Document type to get schema for',
          },
        },
        required: ['doc_type'],
      },
    },
    {
      name: 'create_google_doc',
      description: 'Create a Google Doc from structured sections. NO MARKDOWN - use explicit formatting in section data.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Document title' },
          sections: {
            type: 'array',
            description: 'Array of structured sections (heading, paragraph, bullet_list, numbered_list, table, callout, code_block, horizontal_rule, page_break, image)',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['heading', 'paragraph', 'bullet_list', 'numbered_list', 'table', 'callout', 'code_block', 'horizontal_rule', 'page_break', 'image'],
                },
              },
              required: ['type'],
            },
          },
          config: {
            type: 'string',
            enum: ['tma', 'pwp'],
            description: 'Organization context (TMA consulting or PWP internal)',
          },
          folder_id: {
            type: 'string',
            description: 'Google Drive folder ID to create the doc in (optional)',
          },
          header: {
            type: 'object',
            description: 'Document header configuration',
            properties: {
              text: { type: 'string', description: 'Header text' },
              includePageNumber: { type: 'boolean', description: 'Include page number' },
              alignment: { type: 'string', enum: ['left', 'center', 'right'] },
            },
          },
          footer: {
            type: 'object',
            description: 'Document footer configuration',
            properties: {
              text: { type: 'string', description: 'Footer text' },
              includePageNumber: { type: 'boolean', description: 'Include page number' },
              alignment: { type: 'string', enum: ['left', 'center', 'right'] },
            },
          },
        },
        required: ['title', 'sections', 'config'],
      },
    },
    {
      name: 'get_section_schema',
      description: 'Get the schema for structured document sections (for create_google_doc)',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'list_document_types') {
    const types = {
      brief: 'Executive brief with recommendation and next steps',
      memo: 'Internal memorandum with action items',
      proposal: 'Project or service proposal with scope, timeline, and investment',
      meeting_notes: 'Meeting summary with attendees, discussion, and action items',
      project_summary: 'Project status report with accomplishments, risks, and milestones',
      assessment: 'IT assessment with findings by severity and recommendations',
      risk_register: 'Risk tracking table with likelihood, impact, and mitigation',
      runbook: 'Operational procedure documentation',
    };
    return { content: [{ type: 'text', text: JSON.stringify(types, null, 2) }] };
  }

  if (name === 'get_template_schema') {
    const docType = args?.doc_type as DocType;
    if (!DOC_TYPES.includes(docType)) {
      return { content: [{ type: 'text', text: `Unknown doc_type: ${docType}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(DOC_SCHEMAS[docType], null, 2) }] };
  }

  if (name === 'get_section_schema') {
    const schema = {
      section_types: {
        heading: {
          type: 'heading',
          level: '1-6',
          text: 'string',
        },
        paragraph: {
          type: 'paragraph',
          content: 'string OR array of TextRun',
        },
        bullet_list: {
          type: 'bullet_list',
          items: 'array of string OR ListItem { content, level? }',
        },
        numbered_list: {
          type: 'numbered_list',
          items: 'array of string OR ListItem { content, level? }',
        },
        table: {
          type: 'table',
          headers: 'string[]',
          rows: 'string[][] OR TableCell[][]',
        },
        callout: {
          type: 'callout',
          style: 'info | warning | critical | success',
          content: 'string OR TextRun[]',
        },
        code_block: {
          type: 'code_block',
          content: 'string',
        },
        horizontal_rule: { type: 'horizontal_rule' },
        page_break: { type: 'page_break' },
      },
      text_run: {
        text: 'string (required)',
        bold: 'boolean',
        italic: 'boolean',
        underline: 'boolean',
        strikethrough: 'boolean',
        code: 'boolean (monospace)',
        link: 'string (URL)',
        color: 'string (hex without #)',
        fontSize: 'number (points)',
      },
      example: {
        title: 'My Document',
        sections: [
          { type: 'heading', level: 2, text: 'Introduction' },
          {
            type: 'paragraph',
            content: [
              { text: 'This is ' },
              { text: 'bold', bold: true },
              { text: ' and ' },
              { text: 'italic', italic: true },
              { text: ' text.' },
            ],
          },
          { type: 'bullet_list', items: ['Item 1', 'Item 2', 'Item 3'] },
        ],
        config: 'pwp',
      },
    };
    return { content: [{ type: 'text', text: JSON.stringify(schema, null, 2) }] };
  }

  if (name === 'create_google_doc') {
    const { title, sections, config, folder_id, header, footer } = args as {
      title: string;
      sections: Section[];
      config: 'tma' | 'pwp';
      folder_id?: string;
      header?: { text?: string; includePageNumber?: boolean; alignment?: 'left' | 'center' | 'right' };
      footer?: { text?: string; includePageNumber?: boolean; alignment?: 'left' | 'center' | 'right' };
    };

    try {
      // Check for credentials
      if (!hasStoredCredentials()) {
        return {
          content: [{
            type: 'text',
            text: 'Not authenticated with Google. Run the MCP server interactively to complete OAuth flow.',
          }],
          isError: true,
        };
      }

      // Build the document using GDocsBuilder
      const builder = new GDocsBuilder();

      // Configure header/footer if provided
      if (header) {
        builder.setHeader(header);
      }
      if (footer) {
        builder.setFooter(footer);
      }

      await buildFromSections(builder, title, sections);

      // Get phase requests for multi-phase approach
      const phaseData = builder.getPhaseRequests();

      // Create blank Google Doc
      const driveService = await getDriveService();
      const docsService = await getDocsService();

      const fileMetadata: { name: string; mimeType: string; parents?: string[] } = {
        name: title,
        mimeType: 'application/vnd.google-apps.document',
      };

      if (folder_id) {
        fileMetadata.parents = [folder_id];
      }

      const file = await driveService.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, webViewLink',
      });

      const docId = file.data.id!;

      // === PHASE 1: Create headers, footers (get IDs from response) ===
      let phase1Response: any = null;
      if (phaseData.phase1Requests.length > 0) {
        phase1Response = await docsService.documents.batchUpdate({
          documentId: docId,
          requestBody: { requests: phaseData.phase1Requests as any },
        });
      }

      // === MAIN PHASE: Insert all content ===
      if (phaseData.mainRequests.length > 0) {
        // Split requests: everything except updateTableCellStyle first
        const structureRequests = phaseData.mainRequests.filter((r: any) => !r.updateTableCellStyle);
        const cellStyleRequests = phaseData.mainRequests.filter((r: any) => r.updateTableCellStyle);

        if (structureRequests.length > 0) {
          await docsService.documents.batchUpdate({
            documentId: docId,
            requestBody: { requests: structureRequests as any },
          });
        }

        if (cellStyleRequests.length > 0) {
          await docsService.documents.batchUpdate({
            documentId: docId,
            requestBody: { requests: cellStyleRequests as any },
          });
        }
      }

      // === PHASE 2: Populate headers/footers using IDs from phase 1 ===
      // NOTE: Bookmarks and page numbers (AutoText) are NOT supported by REST API
      if (phase1Response && phase1Response.data.replies) {
        const phase2Requests: any[] = [];
        const replies = phase1Response.data.replies;

        // Find header/footer IDs and populate them
        let headerIdx = 0;
        let footerIdx = phaseData.hasHeader ? 1 : 0;

        if (phaseData.hasHeader && phaseData.headerConfig) {
          const headerReply = replies[headerIdx];
          if (headerReply?.createHeader?.headerId) {
            const headerId = headerReply.createHeader.headerId;
            const cfg = phaseData.headerConfig;

            // Build header content
            let headerText = cfg.text || '';

            // Note: includePageNumber not supported - add placeholder text
            if (cfg.includePageNumber) {
              headerText += headerText ? ' [Page #]' : '[Page #]';
              console.warn('Page numbers (AutoText) not supported by REST API - using placeholder');
            }

            if (headerText) {
              phase2Requests.push({
                insertText: {
                  location: { segmentId: headerId, index: 0 },
                  text: headerText,
                },
              });

              // Apply alignment
              if (cfg.alignment) {
                const alignmentMap: Record<string, string> = {
                  left: 'START',
                  center: 'CENTER',
                  right: 'END',
                };
                phase2Requests.push({
                  updateParagraphStyle: {
                    range: { segmentId: headerId, startIndex: 0, endIndex: headerText.length },
                    paragraphStyle: { alignment: alignmentMap[cfg.alignment] },
                    fields: 'alignment',
                  },
                });
              }
            }
          }
        }

        if (phaseData.hasFooter && phaseData.footerConfig) {
          const footerReply = replies[footerIdx];
          if (footerReply?.createFooter?.footerId) {
            const footerId = footerReply.createFooter.footerId;
            const cfg = phaseData.footerConfig;

            let footerText = cfg.text || '';

            // Note: includePageNumber not supported - add placeholder text
            if (cfg.includePageNumber) {
              footerText += '[Page #]';
              console.warn('Page numbers (AutoText) not supported by REST API - using placeholder');
            }

            if (footerText) {
              phase2Requests.push({
                insertText: {
                  location: { segmentId: footerId, index: 0 },
                  text: footerText,
                },
              });

              // Apply alignment
              if (cfg.alignment) {
                const alignmentMap: Record<string, string> = {
                  left: 'START',
                  center: 'CENTER',
                  right: 'END',
                };
                phase2Requests.push({
                  updateParagraphStyle: {
                    range: { segmentId: footerId, startIndex: 0, endIndex: footerText.length },
                    paragraphStyle: { alignment: alignmentMap[cfg.alignment] },
                    fields: 'alignment',
                  },
                });
              }
            }
          }
        }

        // Execute phase 2
        if (phase2Requests.length > 0) {
          await docsService.documents.batchUpdate({
            documentId: docId,
            requestBody: { requests: phase2Requests as any },
          });
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id: docId,
            name: file.data.name,
            webViewLink: file.data.webViewLink,
          }, null, 2),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error creating Google Doc: ${message}` }],
        isError: true,
      };
    }
  }

  if (name === 'generate_document') {
    const { doc_type, context, title, content, filename } = args as {
      doc_type: DocType;
      context: 'tma' | 'pwp';
      title: string;
      content: Record<string, unknown>;
      filename?: string;
    };

    if (!DOC_TYPES.includes(doc_type)) {
      return { content: [{ type: 'text', text: `Unknown doc_type: ${doc_type}` }], isError: true };
    }

    const config = loadConfig(context);
    let doc;

    switch (doc_type) {
      case 'brief':
        doc = generateBrief(title, content as any, config);
        break;
      case 'memo':
        doc = generateMemo(title, content as any, config);
        break;
      case 'proposal':
        doc = generateProposal(title, content as any, config);
        break;
      case 'meeting_notes':
        doc = generateMeetingNotes(title, content as any, config);
        break;
      case 'project_summary':
        doc = generateProjectSummary(title, content as any, config);
        break;
      case 'assessment':
        doc = generateAssessment(title, content as any, config);
        break;
      case 'risk_register':
        doc = generateRiskRegister(title, content as any, config);
        break;
      case 'runbook':
        doc = generateRunbook(title, content as any, config);
        break;
    }

    const buffer = await Packer.toBuffer(doc);
    const outputFilename = filename ?? `docgen-${Date.now()}`;
    const tempPath = join(tmpdir(), `${outputFilename}.docx`);
    writeFileSync(tempPath, buffer);

    return { content: [{ type: 'text', text: `Generated: ${tempPath}` }] };
  }

  return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DocGen MCP server running on stdio');
}

main().catch(console.error);
