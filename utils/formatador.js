/**
 * Formata os dados do relatório de ligações em uma mensagem legível para WhatsApp
 * @param {Object} dadosRelatorio - Dados do relatório
 * @param {number} dadosRelatorio.ligacoesRecebidas - Número de ligações recebidas
 * @param {number} dadosRelatorio.ligacoesAtendidas - Número de ligações atendidas
 * @param {number} dadosRelatorio.ligacoesAbandonadas - Número de ligações abandonadas
 * @param {Array} dadosRelatorio.filas - Array de objetos com informações sobre filas
 * @param {string} dadosRelatorio.filas[].momento - Momento/horário da fila
 * @param {number} dadosRelatorio.filas[].quantidadePessoas - Quantidade de pessoas na fila
 * @param {string} dadosRelatorio.periodo - Período do relatório (ex: "Manhã" ou "Tarde")
 * @param {string} dadosRelatorio.data - Data do relatório
 * @returns {string} Mensagem formatada
 */
function formatarRelatorio(dadosRelatorio) {
  const {
    ligacoesRecebidas = 0,
    ligacoesAtendidas = 0,
    ligacoesAbandonadas = 0,
    filas = [],
    periodo = '',
    data = new Date().toLocaleDateString('pt-BR')
  } = dadosRelatorio;

  let mensagem = `📊 *RELATÓRIO DE LIGAÇÕES*\n\n`;
  
  if (periodo) {
    mensagem += `📅 *Período:* ${periodo}\n`;
  }
  mensagem += `📆 *Data:* ${data}\n\n`;
  
  mensagem += `📞 *ESTATÍSTICAS DE LIGAÇÕES*\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `✅ Recebidas: *${ligacoesRecebidas}*\n`;
  mensagem += `📞 Atendidas: *${ligacoesAtendidas}*\n`;
  mensagem += `❌ Abandonadas: *${ligacoesAbandonadas}*\n\n`;

  // Calcular taxa de atendimento e abandono
  if (ligacoesRecebidas > 0) {
    const taxaAtendimento = ((ligacoesAtendidas / ligacoesRecebidas) * 100).toFixed(1);
    const taxaAbandono = ((ligacoesAbandonadas / ligacoesRecebidas) * 100).toFixed(1);
    
    mensagem += `📈 *INDICADORES*\n`;
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `📊 Taxa de Atendimento: *${taxaAtendimento}%*\n`;
    mensagem += `⚠️ Taxa de Abandono: *${taxaAbandono}%*\n\n`;
  }

  // Informações sobre filas
  if (filas && filas.length > 0) {
    mensagem += `👥 *HISTÓRICO DE FILAS*\n`;
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    
    filas.forEach((fila, index) => {
      const momento = fila.momento || 'N/A';
      const quantidade = fila.quantidadePessoas || 0;
      mensagem += `${index + 1}. 🕐 ${momento} - *${quantidade}* pessoa${quantidade !== 1 ? 's' : ''}\n`;
    });
    
    mensagem += `\n`;
  }

  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `_Relatório gerado automaticamente_`;

  return mensagem;
}

module.exports = {
  formatarRelatorio
};

