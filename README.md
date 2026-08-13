# RecarregaAi!

**Versão atual: 2.5.0**

O RecarregaAi! é uma extensão para Google Chrome que recarrega a página escolhida em intervalos definidos pelo usuário e, quando necessário, limpa dados temporários do site de forma controlada.

O repositório reúne dois produtos independentes:

- `extension/`: extensão instalada no Chrome;
- `site/`: site público de apresentação do RecarregaAi!.

## Funcionalidades

- Limpeza de cache HTTP com recarga imediata.
- Timers independentes por guia.
- Intervalos prontos de 1, 3, 5, 10 e 30 minutos.
- Intervalo personalizado em minutos.
- Contagem regressiva no popup e no ícone da extensão.
- Pausa automática durante digitação e reprodução de mídia.
- Pausa, retomada e remoção do timer pelo popup.
- Início automático em sites cadastrados.
- Histórico local de ações.
- Importação e exportação de configurações.
- Temas claro e escuro.
- Atalhos de teclado configuráveis.
- Modo debug com exportação local de diagnóstico.
- Interface em português, inglês, espanhol, francês, alemão, italiano, indonésio e turco.

## Atualizações recentes

- Intervalo personalizado limitado a no máximo 1440 minutos.
- Presets rápidos de 1, 3, 5, 10 e 30 minutos.
- Popup com status explícito de intervalo, próximo reload e tipo de limpeza.
- Limpeza padrão restrita ao cache HTTP.
- Limpeza de Cache Storage e service workers disponível somente como opção avançada.
- Exportação local de diagnóstico visível apenas quando o modo debug está ativo.
- Textos de privacidade e justificativas de permissões revisados para envio à Chrome Web Store.

## Extensão

Os arquivos que o Chrome utiliza ficam exclusivamente em `extension/`.

### Instalação para desenvolvimento

1. Abra `chrome://extensions/` no Chrome.
2. Ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta `extension/` deste projeto.

Na primeira instalação, o Chrome abre `onboarding.html`. Essa tela apresenta os passos essenciais para fixar o ícone, escolher uma guia e iniciar o primeiro timer. Ela não funciona como site de divulgação.

### Permissões

O manifesto solicita somente as permissões necessárias ao funcionamento principal:

- `activeTab`: acesso temporário à guia escolhida pelo usuário;
- `alarms`: restauração e execução dos timers;
- `browsingData`: limpeza do cache HTTP do endereço aberto; Cache Storage e service workers são limpos somente quando a opção avançada estiver ativa;
- `scripting`: detecção de digitação e mídia na guia controlada;
- `storage`: preferências, timers e histórico local.

Os acessos a endereços HTTP e HTTPS são opcionais. Eles são solicitados apenas quando o usuário cadastra um site automático ou decide tornar um timer persistente naquele domínio.

## Site público

O conteúdo de apresentação fica em `site/` e pode ser ligado ao site da Olinbyte Digital. Ele não é incluído no pacote enviado à Chrome Web Store.

O site publicado oferece:

- apresentação da extensão;
- funcionalidades e casos de uso;
- perguntas frequentes;
- links de contato e da Olinbyte Digital;
- página pública de privacidade;
- página pública de feedback de desinstalação.

As páginas `privacy.html` e `uninstall.html` pertencem funcionalmente à extensão e, por isso, são mantidas em `extension/public/`. Durante a montagem do site, elas são copiadas para a raiz pública, preservando estes endereços:

- `https://recarregaai.pages.dev/privacy.html`
- `https://recarregaai.pages.dev/uninstall.html`

### Gerar o site

```bash
npm run build:site
```

O resultado é criado em `dist/site/`. O processo reúne o site de apresentação e somente os recursos necessários às páginas públicas da extensão.

## Estrutura

```text
RecarregaAI-/
|-- extension/
|   |-- manifest.json
|   |-- popup.html
|   |-- options.html
|   |-- onboarding.html
|   |-- public/
|   |   |-- privacy.html
|   |   `-- uninstall.html
|   |-- css/
|   |-- js/
|   |   |-- popup/
|   |   |-- options/
|   |   `-- modules/
|   `-- assets/
|       `-- icons/
|-- site/
|   |-- index.html
|   |-- css/
|   |-- js/
|   |   `-- modules/
|   `-- assets/
|       `-- icons/
|-- backend/
|   `-- google-apps-script/
|-- scripts/
|-- tests/
|-- .github/
|   `-- workflows/
|-- package.json
`-- README.md
```

## Feedback de desinstalação

O Chrome abre a URL pública configurada em `extension/js/modules/config.js` após a remoção da extensão. O formulário envia o feedback ao endpoint do Google Apps Script, que deve encaminhar a mensagem para `olinbytedigital@gmail.com`.

O código do serviço está em `backend/google-apps-script/`. O endpoint publicado precisa permanecer configurado em `feedbackBackendUrl` antes do empacotamento.

## Qualidade

Instale as dependências sem executar scripts de terceiros:

```bash
npm ci --ignore-scripts
```

Execute todas as validações:

```bash
npm run check
```

O comando verifica sintaxe, manifesto, arquivos referenciados, permissões aprovadas, sincronização de versão e regras do ESLint.

## Empacotamento

Para gerar o arquivo enviado à Chrome Web Store:

```bash
npm run zip
```

O pacote é criado em `dist/recarregaai.zip`, com `manifest.json` na raiz e sem arquivos do site, backend, documentação ou desenvolvimento.

## Validação automática

O workflow `.github/workflows/validate.yml` valida o projeto, audita as
dependências, gera o site e empacota a extensão em cada alteração da branch
principal e em pull requests.

## Publicação no Cloudflare Pages

O site público é publicado pelo Cloudflare Pages a partir deste repositório:

- comando de build: `npm run build:site`;
- diretório de saída: `dist/site`;
- endereço principal: [recarregaai.pages.dev](https://recarregaai.pages.dev/).

O arquivo `site/_headers` define as políticas de segurança aplicadas pelo
Cloudflare. O GitHub Actions continua responsável apenas pela validação e pelo
artefato de teste; ele não publica o site.

## Configuração da loja

Quando a extensão estiver publicada, informe a URL da Chrome Web Store em `chromeWebStoreUrl` nos arquivos de configuração do site e da extensão. Enquanto o campo estiver vazio, os botões de instalação do site permanecem ocultos.

### Checklist da Chrome Web Store

Use `dist/recarregaai.zip` como pacote de envio. O ZIP contém somente os
arquivos executados pela extensão, com `manifest.json` na raiz.

No painel da loja, use estas informações:

- propósito único: **recarregar a página escolhida automaticamente no intervalo definido pelo usuário e limpar dados temporários do site quando solicitado**;
- política de privacidade:
  `https://recarregaai.pages.dev/privacy.html`;
- página do produto: `https://recarregaai.pages.dev/`;
- suporte: `olinbytedigital@gmail.com`;
- justificativas das permissões: use as descrições da seção
  [Permissões](#permissões).

Antes de enviar para análise, adicione no painel:

- pelo menos uma captura atual da extensão em `1280x800` ou `640x400`,
  mostrando status, intervalo, próximo reload e tipo de limpeza;
- imagem promocional pequena em `440x280`;
- descrições curta e completa coerentes com o propósito único, explicando que
  Cache Storage/service workers são uma opção avançada;
- declarações de privacidade iguais ao conteúdo da política pública.

O ícone obrigatório de `128x128` já está no pacote. Não inclua capturas,
documentação, backend ou arquivos do site dentro do ZIP da extensão.

## Versionamento

Toda alteração entregue incrementa a versão do projeto e mantém os arquivos sincronizados no formato numérico `x.y.z`. Ao chegar a uma versão como `2.5.0`, a próxima será `2.6.0`.

## Contato

- E-mail: [olinbytedigital@gmail.com](mailto:olinbytedigital@gmail.com)
- Site: [Olinbyte Digital](https://olinbytedigital.pages.dev/)
