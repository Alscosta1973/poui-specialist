/** true só quando já existia uma versão vista antes E ela mudou — na
 * primeira instalação (`lastSeenVersion` undefined) quem mostra algo é a
 * mensagem de boas-vindas, não o "o que há de novo". */
export function shouldShowWhatsNew(lastSeenVersion: string | undefined, currentVersion: string): boolean {
  return lastSeenVersion !== undefined && lastSeenVersion !== currentVersion;
}
