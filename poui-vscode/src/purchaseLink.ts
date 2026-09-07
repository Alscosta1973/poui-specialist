// Sem checkout automatizado ainda (Asaas não implementado — ver backlog
// de monetização), então o CTA de compra vira um e-mail pré-preenchido
// pro autor. Mesmo endereço já usado em LICENSE pra licenciamento comercial.
export const PURCHASE_EMAIL = 'andre.andrelscosta@gmail.com';

export function buildPurchaseMailto(): string {
  const subject = encodeURIComponent('Licença PO-UI Specialist');
  const body = encodeURIComponent(
    'Olá, quero adquirir uma licença do PO-UI Specialist para VS Code.',
  );
  return `mailto:${PURCHASE_EMAIL}?subject=${subject}&body=${body}`;
}
