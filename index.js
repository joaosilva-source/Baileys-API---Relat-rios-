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

async function connect() {
  if (reconnecting) return;
  reconnecting = true;
  isConnected = false;

  const { state, saveCreds } = await useMultiFileAuthState('auth');
  
  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\nESCANEIE O QR CODE AGORA:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      isConnected = true;
      reconnecting = false;
      console.log('\nWHATSAPP CONECTADO! API PRONTA!');
      const url = process.env.RENDER_EXTERNAL_URL || `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
      console.log(`API ONLINE: ${url}/enviar-relatorio`);
    }

    if (connection === 'close') {
      isConnected = false;
      const status = lastDisconnect?.error?.output?.statusCode;
      if (status === DisconnectReason.loggedOut) {
        console.log('DESLOGADO → Apagando auth...');
        fs.rmSync('auth', { recursive: true, force: true });
      }
      console.log(`DESCONECTADO (${status || 'desconhecido'}) → Reconectando em 2s...`);
      setTimeout(() => {
        reconnecting = false;
        connect();
      }, 2000);
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

connect();

// Rota principal
app.get('/', (req, res) => {
  const url = process.env.RENDER_EXTERNAL_URL || `https://${req.headers.host}`;
  res.send(`API de Relatórios de Ligações - ONLINE\n\nPOST: ${url}/enviar-relatorio\nStatus: ${isConnected ? 'CONECTADO' : 'Desconectado'}`);
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
    status: isConnected ? 'ONLINE' : 'OFFLINE'
  });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
