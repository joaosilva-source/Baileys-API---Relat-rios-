# Instruções de Deploy no Render

## Configuração no Render

### 1. Conectar o Repositório
- Acesse [Render Dashboard](https://dashboard.render.com)
- Clique em "New" → "Web Service"
- Conecte o repositório: `https://github.com/joaosilva-source/Baileys-API---Relat-rios-`
- Selecione a branch `main`

### 2. Configurações do Serviço

**Nome do Serviço:**
```
relatorios-ligacoes-api
```

**Ambiente:**
```
Node
```

**Build Command:**
```
npm install
```

**Start Command:**
```
npm start
```

**Plano:**
- Escolha o plano apropriado (Free tier funciona, mas pode ter limitações de tempo de inatividade)

### 3. Variáveis de Ambiente

**NÃO é necessário configurar variáveis de ambiente** - o código já está preparado para usar as variáveis padrão do Render.

O Render automaticamente fornece:
- `PORT` - Porta do servidor (gerenciado automaticamente)
- `RENDER_EXTERNAL_URL` - URL externa do serviço (usado nos logs)

### 4. Primeira Execução

Após o deploy:
1. Acesse os **Logs** do serviço no Render
2. Você verá um **QR Code** no terminal
3. Escaneie o QR Code com o WhatsApp:
   - Abra o WhatsApp no celular
   - Vá em **Configurações** → **Aparelhos conectados** → **Conectar um aparelho**
   - Escaneie o QR Code exibido nos logs

### 5. Verificar Status

Após conectar, você verá nos logs:
```
WHATSAPP CONECTADO! API PRONTA!
API ONLINE: https://seu-servico.onrender.com/enviar-relatorio
```

### 6. Testar a API

**Verificar Status:**
```
GET https://seu-servico.onrender.com/status
```

**Enviar Relatório para Todos os Destinatários:**
```
POST https://seu-servico.onrender.com/enviar-relatorio-todos
Content-Type: application/json

{
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
      }
    ]
  }
}
```

## Números de Destino Configurados

Os relatórios serão enviados automaticamente para:
- 5511989890668 (11989890668)
- 5511953281313 (11953281313)
- 5511996332143 (11996332143)

Para alterar os números, edite o arquivo `config/destinatarios.js` e faça um novo deploy.

## Observações Importantes

1. **Persistência de Autenticação**: A pasta `auth/` é criada automaticamente e armazena as credenciais do WhatsApp. No Render, isso é persistido no disco.

2. **Reinicializações**: Se o serviço reiniciar, o WhatsApp tentará reconectar automaticamente usando as credenciais salvas.

3. **Logout**: Se você deslogar manualmente do WhatsApp, será necessário escanear o QR Code novamente.

4. **Plano Free**: O plano gratuito do Render coloca o serviço em "sleep" após 15 minutos de inatividade. Para produção, considere um plano pago.

## Troubleshooting

**Problema: QR Code não aparece**
- Verifique os logs do Render
- Certifique-se de que o serviço está rodando

**Problema: WhatsApp desconecta frequentemente**
- Verifique a conexão de rede
- No plano free, o serviço pode entrar em sleep - faça uma requisição para "acordar"

**Problema: Mensagens não são enviadas**
- Verifique o status: `GET /status`
- Verifique se o WhatsApp está conectado
- Verifique os logs para erros específicos

