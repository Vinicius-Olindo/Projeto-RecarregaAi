# Backend de feedback - RecarregaAi! 2.3.9

Este endpoint envia o feedback diretamente para
`olinbytedigital@gmail.com` usando o Google Apps Script. O navegador publica o
formulário em um iframe invisível e recebe a confirmação somente depois que o
`MailApp.sendEmail` termina sem erro.

## Publicação

1. Acesse `https://script.google.com/` com a conta da Olinbyte Digital.
2. Crie um novo projeto chamado `RecarregaAi Feedback`.
3. Substitua o conteúdo de `Code.gs` pelo arquivo desta pasta.
4. Clique em `Implantar > Nova implantação`.
5. Escolha o tipo `Aplicativo da Web`.
6. Em `Executar como`, selecione `Eu`.
7. Em `Quem pode acessar`, selecione `Qualquer pessoa`.
8. Autorize o envio de e-mails e conclua a implantação.
9. Copie a URL terminada em `/exec`.
10. Preencha `feedbackBackendUrl` em `extension/js/modules/config.js` com essa URL.

Sempre que `Code.gs` for alterado, crie uma nova versão da implantação sem
trocar a URL pública configurada no projeto.

## Proteções

- validação e limite de tamanho dos campos;
- validação do tempo de permanência na página;
- campo honeypot;
- limite global por minuto e por dia;
- contenção de conteúdo idêntico repetido;
- bloqueio de envios duplicados;
- escape do HTML do e-mail;
- resposta correlacionada ao identificador único da submissão;
- confirmação enviada apenas para a origem oficial do Cloudflare Pages ou para
  uma origem válida da extensão (`chrome-extension://`).

Os limites protegem a cota do Gmail e reduzem abuso automatizado. Para um
volume público elevado ou ataques direcionados, o próximo passo recomendado
é usar um endpoint próprio com Cloudflare Turnstile.
