import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface OrgConfig {
  organization: { name: string; abbreviation: string; tagline?: string };
  identity: { author: string; title: string; email: string };
  paths: { templates: string; shared: string; output: string };
  metadata: { company: string; confidentiality: string };
}

export function loadConfig(context: 'tma' | 'pwp'): OrgConfig {
  const configPath = join(__dirname, '..', 'config', `${context}.yaml`);
  return parse(readFileSync(configPath, 'utf-8'));
}
