/**
 * Configuração dos números de destino para envio de relatórios
 * Formato: número com código do país (55) + DDD + número
 */
const DESTINATARIOS_RELATORIOS = [
  '5511952722428'   // 11 95272-2428
];

/**
 * Formata um número para o formato JID do WhatsApp
 * @param {string} numero - Número no formato 5511999999999
 * @returns {string} JID formatado
 */
function formatarJID(numero) {
  if (!numero) return null;
  
  // Remove caracteres não numéricos
  const numeroLimpo = numero.replace(/\D/g, '');
  
  // Se já tem @, retorna como está
  if (numeroLimpo.includes('@')) {
    return numeroLimpo;
  }
  
  // Formata para JID
  return `${numeroLimpo}@s.whatsapp.net`;
}

module.exports = {
  DESTINATARIOS_RELATORIOS,
  formatarJID
};

