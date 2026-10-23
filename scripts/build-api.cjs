const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

fs.mkdirSync('server/dist', { recursive: true });
for (const name of ['simulation', 'simulationEvaluation', 'risk']) {
  const source = fs.readFileSync(path.join('src/lib', name + '.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText.replace(/require\("\.\/(simulation|risk)"\)/g, 'require("./$1.cjs")');
  fs.writeFileSync(path.join('server/dist', name + '.cjs'), compiled);
}
process.stdout.write('DRIFTVEIL API engine compiled.\n');
