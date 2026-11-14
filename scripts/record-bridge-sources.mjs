import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
const [bridgeRoot, piRoot, output] = process.argv.slice(2);
if (!bridgeRoot || !piRoot || !output) throw Error('Usage: record-bridge-sources ABSOLUTE_BRIDGE_ROOT ABSOLUTE_PI_PACKAGE_ROOT OUTPUT');
if (![bridgeRoot, piRoot].every(path.isAbsolute)) throw Error('Source roots must be absolute');
const roots = { bridge: bridgeRoot, pi: piRoot };
const files = {
  bridge: ['src/bridge.mjs', 'src/server.mjs', 'src/rpc.mjs', 'src/worker-prompt.mjs', 'src/worker-skill-loading.mjs', 'src/request-shape.mjs'],
  pi: ['package.json', 'dist/core/agent-session.js', 'dist/core/skills.js', 'dist/core/system-prompt.js', 'node_modules/@earendil-works/pi-ai/dist/api/openai-codex-responses.js'],
};
const sources = Object.entries(files).flatMap(([root, names]) => names.filter(name=>fs.existsSync(path.join(roots[root],name))).map(name => ({
  source: `${root}/${name}`, sha256: createHash('sha256').update(fs.readFileSync(path.join(roots[root], name))).digest('hex'),
})));
const invokedCli=JSON.parse(fs.readFileSync(path.join(bridgeRoot,'config.json'),'utf8')).piCli;
sources.push({source:'pi/invoked-cli',sha256:createHash('sha256').update(fs.readFileSync(invokedCli)).digest('hex')});
const agentRoot=process.env.PI_CODING_AGENT_DIR??path.join(homedir(),'.pi','agent');
for(const [label,file] of [['context-mode/pi/index.js','npm/node_modules/context-mode/pi/index.js'],['pi-caveman/extensions/caveman.ts','npm/node_modules/@vanillagreen/pi-caveman/extensions/caveman.ts'],['pi-caveman/extensions/prompt.ts','npm/node_modules/@vanillagreen/pi-caveman/extensions/prompt.ts']]){
  const target=path.join(agentRoot,file);
  if(fs.existsSync(target))sources.push({source:label,sha256:createHash('sha256').update(fs.readFileSync(target)).digest('hex')});
}
fs.writeFileSync(output, JSON.stringify({ pi_version: JSON.parse(fs.readFileSync(path.join(piRoot, 'package.json'))).version, sources }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ files: sources.length }));
