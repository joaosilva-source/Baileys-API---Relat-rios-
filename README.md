# API de Relatórios de Ligações via WhatsApp

API para envio automático de relatórios de ligações via WhatsApp usando Baileys.

## Funcionalidades

- ✅ Conexão com WhatsApp via Baileys
- ✅ Envio de relatórios formatados de ligações
- ✅ Suporte para envio a números individuais e grupos
- ✅ Formatação automática de estatísticas e indicadores
- ✅ Histórico de filas com horários e quantidade de pessoas

## Estrutura do Projeto

```
.
├── index.js              # Servidor principal e rotas
├── package.json          # Dependências
├── utils/
│   └── formatador.js     # Função para formatar relatórios
└── auth/                 # Pasta de autenticação do Baileys (gerada automaticamente)
```

## Instalação

```bash
npm install
```

## Uso

### Iniciar o servidor

```bash
npm start
```

Na primeira execução, será exibido um QR Code no terminal. Escaneie com o WhatsApp para conectar.

### Endpoints

#### POST `/enviar-relatorio`

Envia um relatório formatado de ligações.

**Body:**
```json
{
  "jid": "5511999999999@s.whatsapp.net",
  "numero": "5511999999999",
  "dadosRelatorio": {
    "ligacoesRecebidas": 150,
    "ligacoesAtendidas": 120,
    "ligacoesAbandonadas": 30,
    "periodo": "Manhã",
    "data": "15/01/2025",
    "filas": [
      {
        "momento": "09:30",
        "quantidadePessoas": 5
      },
      {
        "momento": "10:15",
        "quantidadePessoas": 8
      }
    ]
  }
}
```

#### POST `/enviar`

Envia uma mensagem simples (para testes).

**Body:**
```json
{
  "numero": "5511999999999",
  "mensagem": "Teste de mensagem"
}
```

#### GET `/status`

Verifica o status da conexão com WhatsApp.

#### GET `/grupos`

Lista todos os grupos do WhatsApp conectado.

## Estrutura dos Dados do Relatório

```javascript
{
  ligacoesRecebidas: number,    // Total de ligações recebidas
  ligacoesAtendidas: number,    // Total de ligações atendidas
  ligacoesAbandonadas: number,  // Total de ligações abandonadas
  periodo: string,              // "Manhã" ou "Tarde"
  data: string,                 // Data no formato "DD/MM/AAAA"
  filas: [                      // Array de informações sobre filas
    {
      momento: string,           // Horário (ex: "09:30")
      quantidadePessoas: number  // Quantidade de pessoas na fila
    }
  ]
}
```

## Próximos Passos

- [ ] Integração com API da 55bpx para buscar dados CSV
- [ ] Processamento automático de arquivos CSV
- [ ] Agendamento de envios (duas vezes ao dia)
- [ ] Armazenamento de histórico de relatórios

## Variáveis de Ambiente

- `PORT`: Porta do servidor (padrão: 3000)
- `RENDER_EXTERNAL_URL`: URL externa (para deploy no Render)

