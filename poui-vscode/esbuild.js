// Empacota src/extension.ts (+ tudo que ele importa) num único
// out/extension.js — roda DEPOIS do `tsc -p ./` no script "compile".
// `tsc` continua responsável pela checagem de tipos e por emitir
// out/test/**, o esbuild só sobrescreve o out/extension.js final com a
// versão empacotada (menos arquivos no .vsix, ativação mais rápida).
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    outfile: 'out/extension.js',
    external: ['vscode'],
    sourcemap: !production,
    minify: production,
    logLevel: 'info',
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
