#!/usr/bin/env tsx
const SUBCOMMANDS = ['init', 'calibrate', 'generate', 'retro'] as const;
type Subcommand = (typeof SUBCOMMANDS)[number];

const USAGE = `avani calibration engine (v0.3 scaffold — engine not implemented yet)

Usage: calibrate <subcommand>

  init       Start intake for a new project
  calibrate  Intake -> dials + plugin/blueprint selection
  generate   Stamp blueprints + emit artifacts to ./.staging/
  retro      Compare engine decisions vs. overrides

Exit codes: 0 success, 1 validation failure, 2 review rejected
`;

export function run(argv: string[]): number {
  const cmd = argv[0];
  if (cmd === undefined || cmd === '--help' || cmd === '-h') {
    console.log(USAGE);
    return 0;
  }
  if (!SUBCOMMANDS.includes(cmd as Subcommand)) {
    console.error(`Unknown subcommand: ${cmd}\n\n${USAGE}`);
    return 1;
  }
  console.log(`'${cmd}' is not implemented yet — see SPEC.md §10 for the roadmap.`);
  return 0;
}

if (process.argv[1]?.endsWith('calibrate.ts')) {
  process.exit(run(process.argv.slice(2)));
}
