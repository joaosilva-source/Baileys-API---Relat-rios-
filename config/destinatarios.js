/**
 * Configuração dos números de destino para envio de relatórios
 * Formato: número com código do país (55) + DDD + número
 */
const DESTINATARIOS_RELATORIOS = [
  '5511989890668',  // 11989890668
  '5511953281313',  // 11953281313
  '5511996332143'   // 11996332143
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

