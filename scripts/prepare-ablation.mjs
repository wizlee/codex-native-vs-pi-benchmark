import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { makeSchedule } from './benchmark.mjs';

export const controllerContract = '\nCONTROLLER WAIT CONTRACT: For active Pi workers use pi_wait if exposed, with all remaining IDs and waitMs 60000. Forward dialogs normally; never answer them. If pi_wait unavailable, record that limitation and use pi_status. Keep all other task and skill requirements above unchanged.';
const [directory, variant, bridgeRoot] = process.argv.slice(2);
if (!directory || !['controller', 'skills', 'corrected', 'final', 'provider', 'conditional'].includes(variant) || !bridgeRoot) throw Error('Usage: prepare-ablation DIRECTORY controller|skills|corrected|final|provider|conditional ABSOLUTE_BRIDGE_ROOT');
if (!path.isAbsolute(bridgeRoot)) throw Error('Bridge root must be absolute');
fs.mkdirSync(directory, { recursive: true });
const all = makeSchedule('pilot', 20261112, 'controlled');
const ids = ['controller','final','provider','conditional'].includes(variant)
  ? ['controlled-T02-r1-pi', 'controlled-T02-r1-native', 'controlled-T05-r1-native', 'controlled-T05-r1-pi']
  : ['controlled-T02-r1-native', 'controlled-T02-r1-pi', 'controlled-T05-r1-pi', 'controlled-T05-r1-native'];
const schedule = { ...all, runs: ids.map((id, index) => ({ ...all.runs.find(run => run.run_id === id), order: index + 1 })) };
fs.writeFileSync(path.join(directory, 'schedule.json'), JSON.stringify(schedule, null, 2) + '\n', { flag: 'wx' });
for (const run of schedule.runs) {
  const packet = JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('./prepare-live.mjs', import.meta.url)), run.run_id, '--matched-workers'], { encoding: 'utf8' }));
  packet.prompt += controllerContract;
  packet.run = run;
  packet.directoryName = `${variant}-ablation-${run.task.toLowerCase()}-${run.arm}-20261114`;
  fs.writeFileSync(path.join(directory, `${run.run_id}.packet.json`), JSON.stringify(packet, null, 2) + '\n', { flag: 'wx' });
}
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const source = Object.fromEntries(['src/bridge.mjs', 'src/server.mjs', 'src/rpc.mjs', 'src/worker-prompt.mjs', 'src/worker-skill-loading.mjs', 'src/request-shape.mjs'].filter(file=>fs.existsSync(path.join(bridgeRoot,file))).map(file => [file, hash(path.join(bridgeRoot, file))]));
fs.writeFileSync(path.join(directory, 'source-fingerprints.json'), JSON.stringify({ variant, sha256: source }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ variant, trials: schedule.runs.length, order: ids }));
