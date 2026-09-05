import { EngineAdapter, EngineId } from './engineTypes';
import { claudeAdapter } from './claudeAdapter';
import { codexAdapter } from './codexAdapter';
import { geminiAdapter } from './geminiAdapter';

export function getEngineAdapter(id: EngineId): EngineAdapter {
  switch (id) {
    case 'claude':
      return claudeAdapter;
    case 'codex':
      return codexAdapter;
    case 'gemini':
      return geminiAdapter;
    default:
      // Fallback seguro para um EngineId inválido em runtime (ex.: usuário
      // editou .vscode/settings.json à mão com um valor fora do enum do
      // schema, que só é validado no editor, não em runtime). Mantém
      // getEngineAdapter como uma função total, sem lançar exceção — o
      // default documentado de poui.aiEngine é 'claude'.
      return claudeAdapter;
  }
}
