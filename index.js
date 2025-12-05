const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const { formatarRelatorio } = require('./utils/formatador');
const { DESTINATARIOS_RELATORIOS, formatarJID } = require('./config/destinatarios');

const app = express();
app.use(express.json());

let sock = null;
let isConnected = false;
let reconnecting = false;
let reconnectAttempts = 0;
let keepAliveInterval = null;
let healthCheckInterval = null;
let currentQR = null;

async function connect() {
  if (reconnecting) return;
  reconnecting = true;
  isConnected = false;

  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    
    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000, // Keep-alive a cada 30 segundos
      markOnlineOnConnect: true,
      printQRInTerminal: false, // Geramos manualmente para melhor controle
      browser: ['Relatorios API', 'Chrome', '1.0.0'],
      getMessage: async (key) => {
        return {
          conversation: 'Mensagem não disponível'
        };
      }
    });

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = qr;
        console.log('\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📱 ESCANEIE O QR CODE AGORA COM SEU WHATSAPP!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('\n');
        
        // Gerar QR Code no terminal (tentativa com tamanho maior para melhor visualização)
        try {
          qrcode.generate(qr, { small: false });
        } catch (error) {
          // Se falhar, tentar com small
          qrcode.generate(qr, { small: true });
        }
        
        console.log('\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('💡 DICA: Acesse /qr no navegador para ver o QR Code');
        console.log('═══════════════════════════════════════════════════════');
        console.log('\n');
        reconnectAttempts = 0; // Reset ao mostrar QR
      }

      if (connection === 'open') {
        isConnected = true;
        reconnecting = false;
        reconnectAttempts = 0;
        console.log('\nWHATSAPP CONECTADO! API PRONTA!');
        const url = process.env.RENDER_EXTERNAL_URL || `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
        console.log(`API ONLINE: ${url}/enviar-relatorio`);
        
        // Iniciar keep-alive
        iniciarKeepAlive();
      }

      if (connection === 'close') {
        isConnected = false;
        pararKeepAlive();
        
        const status = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = status !== DisconnectReason.loggedOut;
        
        if (status === DisconnectReason.loggedOut) {
          console.log('DESLOGADO → Apagando auth...');
          fs.rmSync('auth', { recursive: true, force: true });
          reconnectAttempts = 0;
        } else {
          // Retry exponencial: 2s, 4s, 8s, 16s, max 30s
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectAttempts++;
          console.log(`DESCONECTADO (${status || 'desconhecido'}) → Reconectando em ${delay/1000}s... (tentativa ${reconnectAttempts})`);
          
          if (shouldReconnect) {
            setTimeout(() => {
              reconnecting = false;
              connect();
            }, delay);
          }
        }
      }

      // Detectar conexão instável
      if (connection === 'connecting') {
        console.log('Conectando ao WhatsApp...');
      }
    });

    sock.ev.on('creds.update', saveCreds);
    
    // Listener para erros
    sock.ev.on('messages.upsert', () => {
      // Manter conexão ativa ao receber mensagens
    });
    
  } catch (error) {
    console.error('Erro ao conectar:', error);
    reconnecting = false;
    setTimeout(() => connect(), 5000);
  }
}

// Função para manter conexão ativa
function iniciarKeepAlive() {
  pararKeepAlive(); // Limpar intervalo anterior se existir
  
  keepAliveInterval = setInterval(async () => {
    if (sock && isConnected) {
      try {
        // Enviar ping para manter conexão viva
        await sock.sendPresenceUpdate('available');
        console.log('[KEEP-ALIVE] Conexão mantida ativa');
      } catch (error) {
        console.log('[KEEP-ALIVE] Erro:', error.message);
        // Se houver erro, tentar reconectar
        if (error.message.includes('close') || error.message.includes('disconnect')) {
          isConnected = false;
          connect();
        }
      }
    }
  }, 30000); // A cada 30 segundos
}

function pararKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

connect();

// Rota principal
app.get('/', (req, res) => {
  const url = process.env.RENDER_EXTERNAL_URL || `https://${req.headers.host}`;
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>API de Relatórios de Ligações</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
        .online { background: #d4edda; color: #155724; }
        .offline { background: #f8d7da; color: #721c24; }
        .qr-link { display: block; margin: 20px 0; padding: 15px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; text-align: center; }
        .qr-link:hover { background: #0056b3; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📊 API de Relatórios de Ligações</h1>
        <div class="status ${isConnected ? 'online' : 'offline'}">
          Status: ${isConnected ? '🟢 CONECTADO' : '🔴 DESCONECTADO'}
        </div>
        ${currentQR && !isConnected ? '<a href="/qr" class="qr-link">📱 Ver QR Code para Conectar</a>' : ''}
        <h2>Endpoints:</h2>
        <ul>
          <li><strong>GET</strong> /status - Status da conexão</li>
          <li><strong>GET</strong> /qr - Ver QR Code (se disponível)</li>
          <li><strong>POST</strong> /enviar-relatorio - Enviar relatório</li>
          <li><strong>POST</strong> /enviar-relatorio-todos - Enviar para todos</li>
        </ul>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

// Rota para exibir QR Code
app.get('/qr', (req, res) => {
  if (!currentQR) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code não disponível</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          .message { background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px auto; max-width: 500px; }
        </style>
      </head>
      <body>
        <div class="message">
          <h2>QR Code não disponível</h2>
          <p>O QR Code só aparece quando o WhatsApp precisa ser conectado.</p>
          <p>Status: ${isConnected ? '✅ Já está conectado!' : '⏳ Aguardando QR Code...'}</p>
          <p><a href="/">← Voltar</a></p>
        </div>
      </body>
      </html>
    `);
  }

  // Usar API externa para gerar QR Code como imagem
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(currentQR)}`;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR Code WhatsApp</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          padding: 20px; 
          background: #f5f5f5; 
          text-align: center;
        }
        .container { 
          max-width: 500px; 
          margin: 0 auto; 
          background: white; 
          padding: 30px; 
          border-radius: 10px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .qr-code { 
          background: white; 
          padding: 20px; 
          margin: 20px 0; 
          border: 2px solid #ddd;
          border-radius: 5px;
        }
        .qr-code img {
          max-width: 100%;
          height: auto;
        }
        .instructions {
          background: #e7f3ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          text-align: left;
        }
        .instructions ol {
          margin: 10px 0;
          padding-left: 20px;
        }
        .back-link {
          display: inline-block;
          margin-top: 20px;
          padding: 10px 20px;
          background: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 5px;
        }
        .back-link:hover {
          background: #0056b3;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📱 Escaneie o QR Code</h1>
        <div class="qr-code">
          <img src="${qrImageUrl}" alt="QR Code WhatsApp" />
        </div>
        <div class="instructions">
          <h3>Como conectar:</h3>
          <ol>
            <li>Abra o WhatsApp no seu celular</li>
            <li>Vá em <strong>Configurações</strong> → <strong>Aparelhos conectados</strong></li>
            <li>Toque em <strong>Conectar um aparelho</strong></li>
            <li>Escaneie o QR Code acima</li>
          </ol>
        </div>
        <p><strong>Status:</strong> ${isConnected ? '✅ Conectado' : '⏳ Aguardando conexão...'}</p>
        <a href="/" class="back-link">← Voltar</a>
      </div>
    </body>
    </html>
  `);
});

// Endpoint para enviar relatório de ligações
app.post('/enviar-relatorio', async (req, res) => {
  const { jid, numero, dadosRelatorio } = req.body;
  const destino = jid || numero;

  if (!isConnected || !sock) {
    return res.status(503).json({ erro: 'WhatsApp desconectado' });
  }

  if (!dadosRelatorio) {
    return res.status(400).json({ erro: 'Dados do relatório são obrigatórios' });
  }

  try {
    let destinatario = destino;

    if (!destinatario.includes('@')) {
      destinatario = destinatario.includes('-')
        ? `${destinatario}@g.us`
        : `${destinatario}@s.whatsapp.net`;
    }

    // Formatar o relatório
    const mensagemFormatada = formatarRelatorio(dadosRelatorio);

    await sock.sendMessage(destinatario, { text: mensagemFormatada });
    console.log('[SUCESSO] Relatório enviado!');
    res.json({ sucesso: true, mensagem: 'Relatório enviado com sucesso!' });
  } catch (e) {
    console.log('[FALHA]', e);
    res.status(500).json({ erro: 'Erro ao enviar relatório: ' + e.message });
  }
});

// Endpoint para enviar mensagem simples (teste)
app.post('/enviar', async (req, res) => {
  const { jid, numero, mensagem } = req.body;
  const destino = jid || numero;

  if (!isConnected || !sock) {
    return res.status(503).json({ erro: 'WhatsApp desconectado' });
  }

  if (!mensagem) {
    return res.status(400).json({ erro: 'Mensagem é obrigatória' });
  }

  try {
    let destinatario = destino;

    if (!destinatario.includes('@')) {
      destinatario = destinatario.includes('-')
        ? `${destinatario}@g.us`
        : `${destinatario}@s.whatsapp.net`;
    }

    await sock.sendMessage(destinatario, { text: mensagem });
    console.log('[SUCESSO] Mensagem enviada!');
    res.json({ sucesso: true, mensagem: 'Mensagem enviada com sucesso!' });
  } catch (e) {
    console.log('[FALHA]', e);
    res.status(500).json({ erro: 'Erro ao enviar mensagem: ' + e.message });
  }
});

// Endpoint para listar grupos
app.get('/grupos', async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(503).json({ erro: 'WhatsApp desconectado' });
  }

  try {
    const grupos = await sock.groupFetchAllParticipating();
    const lista = Object.values(grupos).map(g => ({
      nome: g.subject,
      id: g.id
    }));

    res.json(lista);
  } catch (e) {
    res.status(500).json({ erro: 'Erro: ' + e.message });
  }
});

// Endpoint para verificar status da conexão
app.get('/status', (req, res) => {
  res.json({
    conectado: isConnected,
    status: isConnected ? 'ONLINE' : 'OFFLINE',
    tentativasReconexao: reconnectAttempts
  });
});

// Health check endpoint para o Render (mantém serviço ativo)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    whatsapp: isConnected ? 'conectado' : 'desconectado',
    uptime: process.uptime()
  });
});

// Endpoint para forçar reconexão
app.post('/reconnect', async (req, res) => {
  if (sock) {
    try {
      await sock.end();
    } catch (e) {
      console.log('Erro ao encerrar conexão:', e);
    }
  }
  
  reconnecting = false;
  reconnectAttempts = 0;
  isConnected = false;
  pararKeepAlive();
  
  setTimeout(() => {
    connect();
    res.json({ mensagem: 'Reconexão iniciada' });
  }, 1000);
});

// Endpoint para enviar relatório para todos os destinatários configurados
app.post('/enviar-relatorio-todos', async (req, res) => {
  const { dadosRelatorio } = req.body;

  if (!isConnected || !sock) {
    return res.status(503).json({ erro: 'WhatsApp desconectado' });
  }

  if (!dadosRelatorio) {
    return res.status(400).json({ erro: 'Dados do relatório são obrigatórios' });
  }

  try {
    // Formatar o relatório uma vez
    const mensagemFormatada = formatarRelatorio(dadosRelatorio);
    
    const resultados = [];
    const erros = [];

    // Enviar para cada destinatário
    for (const numero of DESTINATARIOS_RELATORIOS) {
      try {
        const destinatario = formatarJID(numero);
        await sock.sendMessage(destinatario, { text: mensagemFormatada });
        resultados.push({ numero, status: 'enviado' });
        console.log(`[SUCESSO] Relatório enviado para ${numero}`);
      } catch (e) {
        erros.push({ numero, erro: e.message });
        console.log(`[FALHA] Erro ao enviar para ${numero}:`, e.message);
      }
    }

    res.json({
      sucesso: true,
      mensagem: `Relatório enviado para ${resultados.length} destinatário(s)`,
      resultados,
      erros: erros.length > 0 ? erros : undefined
    });
  } catch (e) {
    console.log('[FALHA]', e);
    res.status(500).json({ erro: 'Erro ao enviar relatórios: ' + e.message });
  }
});

// Iniciar health check automático (mantém serviço ativo no Render)
function iniciarHealthCheck() {
  const url = process.env.RENDER_EXTERNAL_URL || process.env.RENDER_EXTERNAL_HOSTNAME;
  
  if (url && !url.includes('localhost')) {
    healthCheckInterval = setInterval(() => {
      try {
        const http = require('http');
        const https = require('https');
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: '/health',
          method: 'GET',
          headers: { 'User-Agent': 'Render-Health-Check' },
          timeout: 5000
        };
        
        const req = client.request(options, (res) => {
          console.log('[HEALTH-CHECK] Serviço mantido ativo - Status:', res.statusCode);
          res.on('data', () => {}); // Consumir resposta
        });
        
        req.on('error', (error) => {
          console.log('[HEALTH-CHECK] Erro:', error.message);
        });
        
        req.on('timeout', () => {
          req.destroy();
        });
        
        req.end();
      } catch (error) {
        console.log('[HEALTH-CHECK] Erro:', error.message);
      }
    }, 60000); // A cada 1 minuto
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  iniciarHealthCheck();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, encerrando...');
  pararKeepAlive();
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  if (sock) {
    sock.end();
  }
  process.exit(0);
});
