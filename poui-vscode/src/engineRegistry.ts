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
  }
}
