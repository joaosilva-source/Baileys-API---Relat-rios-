/**
 * Exemplo de uso da API de Relatórios de Ligações
 * 
 * Este arquivo demonstra como fazer requisições para a API
 * Execute: node exemplo-uso.js
 */

const exemploRelatorio = {
  ligacoesRecebidas: 150,
  ligacoesAtendidas: 120,
  ligacoesAbandonadas: 30,
  periodo: "Manhã",
  data: new Date().toLocaleDateString('pt-BR'),
  filas: [
    {
      momento: "09:30",
      quantidadePessoas: 5
    },
    {
      momento: "10:15",
      quantidadePessoas: 8
    },
    {
      momento: "11:00",
      quantidadePessoas: 3
    }
  ]
};

// Exemplo de requisição usando fetch (Node.js 18+)
async function enviarRelatorioExemplo() {
  const API_URL = process.env.API_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${API_URL}/enviar-relatorio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        numero: '5511999999999', // Substitua pelo número de destino
        dadosRelatorio: exemploRelatorio
      })
    });

    const resultado = await response.json();
    console.log('Resultado:', resultado);
  } catch (error) {
    console.error('Erro ao enviar relatório:', error);
  }
}

// Exemplo de estrutura de dados que virá do CSV (futuro)
const exemploDadosCSV = {
  // Estrutura esperada dos dados processados do CSV da 55bpx
  ligacoesRecebidas: 0,
  ligacoesAtendidas: 0,
  ligacoesAbandonadas: 0,
  periodo: "", // "Manhã" ou "Tarde"
  data: "",
  filas: [] // Array de { momento: "HH:MM", quantidadePessoas: number }
};

console.log('Exemplo de estrutura de relatório:');
console.log(JSON.stringify(exemploRelatorio, null, 2));

console.log('\nPara enviar o relatório, descomente a linha abaixo e ajuste o número:');
console.log('// enviarRelatorioExemplo();');

