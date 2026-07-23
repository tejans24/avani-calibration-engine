import type { CalibratedConfig } from '../schema/calibrated-config.js';
import type { Selection } from '../selection/select.js';
import { byKind } from './helpers.js';

/**
 * Build .mcp.json — MCP servers matching the selected stack. Placed at the
 * project root with the `mcpServers` key (verified). Server selection is
 * derived from patterns/runtime so it tracks the calibration.
 */
export function buildMcpConfig(config: CalibratedConfig, selection: Selection): Record<string, unknown> {
  const patterns = new Set(byKind(selection, 'pattern'));
  const mcpServers: Record<string, unknown> = {};

  if (patterns.has('prisma-postgis')) {
    mcpServers['postgres'] = {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres', '${DATABASE_URL}'],
    };
  }
  if (config.dials.runtime === 'ts-nextjs') {
    mcpServers['playwright'] = { command: 'npx', args: ['-y', '@playwright/mcp@latest'] };
  }

  return { mcpServers };
}
