import type { CalibratedConfig } from '../schema/calibrated-config.js';
import type { Selection } from '../selection/select.js';
import { byKind } from './helpers.js';

const MARKETPLACE = 'avani';
const MARKETPLACE_REPO = 'tejans24/avani-calibration-engine';

/**
 * Build .claude/settings.json.
 *
 * Declares the Avani marketplace + the selected plugins (so anyone who opens
 * the repo is prompted to install them), project-scoped file-read denials
 * scaled by sensitivity, and a Stop hook for the project's own checks. Deep
 * behavior/hooks come from the enabled plugins, not from here.
 */
export function buildSettings(config: CalibratedConfig, selection: Selection): Record<string, unknown> {
  const plugins = byKind(selection, 'plugin');

  const deny = ['Read(./.env)', 'Read(./.env.*)', 'Read(./secrets/**)'];
  if (config.dials.sensitivity === 'high' || config.dials.sensitivity === 'protected') {
    deny.push('Read(./**/*.pem)', 'Read(./**/*.key)');
  }

  const enabledPlugins: Record<string, boolean> = {};
  for (const p of plugins) enabledPlugins[`${p}@${MARKETPLACE}`] = true;

  const settings: Record<string, unknown> = {
    extraKnownMarketplaces: {
      [MARKETPLACE]: { source: { source: 'github', repo: MARKETPLACE_REPO } },
    },
    enabledPlugins,
    permissions: { deny },
  };

  if (config.dials.sensitivity !== 'low') {
    settings['hooks'] = {
      Stop: [{ hooks: [{ type: 'command', command: 'npm run typecheck && npm run lint' }] }],
    };
  }

  return settings;
}
