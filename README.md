# MobilemedTools

Aplicação web em React + Vite para criação de assinaturas profissionais em PNG e navegação para futuras extensões.

Versão atual: 1.2.1

---

## Diagnóstico do sistema

O projeto está estruturado como um frontend leve, sem backend, em que a lógica principal da assinatura é gerenciada por hook centralizado e processada no navegador.

### Estado atual dos módulos

| Módulo | Status | Observação |
| --- | --- | --- |
| Assinatura | ✅ Ativo | Fluxo principal implementado, com upload, ajustes, prévia e exportação em PNG. |
| Senhas | ⚠️ Em desenvolvimento | Permite selecionar `.xlsx` e ler a primeira planilha no navegador; os valores são inspecionados no console, sem tabela, mapeamento de dados ou fluxo de senhas. |
| Logos | 🟡 Planejado | A opção de navegação exibe apenas um placeholder, sem ferramentas ou processamento de logos. |

### Arquitetura funcional

- A interface principal em `App.jsx` alterna entre o editor de assinatura, a leitura experimental de planilhas e o placeholder de Logos.
- `SignatureWorkspace` e `useSignatureEditor` concentram a lógica da assinatura, incluindo upload, ajustes de imagem, dados do profissional, arraste e exportação.
- `processSignatureImage` gera uma imagem derivada do arquivo original, preservando o arquivo original para reprocessamentos e evitando perda cumulativa.
- A área de tela exposta ao usuário é limitadora ao compor a assinatura em um card de preview; a exportação converte essa composição em PNG em 840 x 400 px.
- `useExcel` carrega arquivos `.xlsx` com ExcelJS no navegador e disponibiliza a primeira planilha; a integração ainda não apresenta nem transforma os dados na interface.

### Diagnóstico atual

- A leitura ExcelJS usa `arrayBuffer()` e `workbook.xlsx.load()`; o módulo Senhas continua experimental até haver apresentação, mapeamento e uso dos dados.
- O módulo Logos permanece como placeholder.

---

## Funcionalidades principais da assinatura

- Upload local de uma ou duas imagens;
- Conversão para preto puro e limpeza de pixels quase transparentes;
- Crop automático com margem de 15 px;
- Remoção de fundo com sensibilidade por imagem;
- Ajuste de contraste, nitidez e preset de limpeza avançada;
- Prévia reativa em tempo real;
- Arraste com histórico de desfazer e refazer;
- Segunda assinatura opcional ou modo de modelo sem dados profissionais;
- CRM / CRMV / CRO e RQE com formatos padrão ou compacto;
- Frases adicionais opcionais;
- Escolha de fonte e espaçamento entre imagem e texto;
- Exportação em PNG com fundo transparente e composição final em 840 x 400 px.

### Fluxo de uso da assinatura

1. Carregue a imagem principal.
2. Informe o nome e o registro do profissional.
3. Ajuste os filtros visuais e acompanhe a prévia.
4. Opcionalmente habilite a segunda assinatura ou o modelo pronto.
5. Posicione os cartões na prévia.
6. Baixe o PNG final.

---

## Pré-requisitos

- Node.js
- npm

```bash
node --version
npm --version
```

---

## Instalação

```bash
git clone <URL_DO_REPOSITORIO>
cd mobilemedtools
npm install
```

---

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

---

## Estrutura relevante do projeto

```text
mobilemedtools/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── components/
│   │   ├── DoctorForm.jsx
│   │   ├── ImageAdjustments.jsx
│   │   ├── ImageUploader.jsx
│   │   ├── PasswordWorkspace.jsx
│   │   ├── SignaturePreview.jsx
│   │   └── SignatureWorkspace.jsx
│   ├── hooks/
│   │   ├── useExcel.js
│   │   └── useSignatureEditor.js
│   ├── style/
│   │   ├── index.css
│   │   └── preview.css
│   └── utils/
│       └── processSignatureImage.js
├── eslint.config.js
├── index.html
├── package.json
├── README.md
├── vite.config.js
└── LICENSE
```

### Observações importantes

- A assinatura é a funcionalidade principal e está pronta para uso direto no navegador.
- O módulo de senhas lê somente arquivos `.xlsx` e a primeira planilha; os valores ainda não são apresentados em uma interface nem usados em um fluxo de negócio.
- O módulo de logos ainda está ausente do fluxo funcional real e deve ser implementado como recurso separado.

---

## Tecnologias

- React 19
- React DOM 19
- Vite 8
- JavaScript
- CSS
- html-to-image
- ESLint com React Hooks e React Refresh

---

## Limitações conhecidas

- O módulo de senhas ainda não realiza mapeamento de dados de negócio nem exportação final.
- O menu de logos foi preparado visualmente, mas não há UI ou comportamento funcional correspondente.
- A qualidade da remoção de fundo depende da uniformidade do fundo da imagem e da sensibilidade ajustada pelo usuário.

## ▶️ Executando em desenvolvimento

Para iniciar o servidor de desenvolvimento, configurado na porta 3000:

```bash
npm run dev
```

A aplicação será disponibilizada, por padrão, em:

```text
http://localhost:3000
```

O Vite também poderá apresentar no terminal a URL disponível para acesso.

---

## 🏗️ Build de produção

Para gerar a versão de produção:

```bash
npm run build
```

Os arquivos compilados serão gerados no diretório:

```text
dist/
```

---

## 🔎 Visualização do build

Após gerar o build, é possível executar uma prévia da aplicação com:

```bash
npm run preview
```

---

## 🧹 Lint

Para verificar problemas de qualidade e possíveis erros no código:

```bash
npm run lint
```

O projeto utiliza ESLint com configurações voltadas para JavaScript, React Hooks e React Refresh.

No estado atual não existe comando `npm test` nem suíte automatizada. `npm run lint` e `npm run build` verificam sintaxe/regras estáticas e compilação, mas não substituem testes de upload, processamento de pixels, drag ou download.

---

## 🖼️ Prévia e exportação

O preview representa uma área de conteúdo com proporção 21:10 e até 420 x 200 px. Em telas menores, reduz proporcionalmente. As imagens preservam sua proporção com `object-fit: contain`, e os cartões ficam limitados à área de conteúdo.

O download usa `html-to-image` e gera um PNG com dimensões exatas de **840 x 400 pixels** (`pixelRatio: 1`). A composição fica centralizada e limitada a **420 x 200 pixels**; quando necessário, a escala dos cartões é reduzida para acomodar imagem e textos. O fundo exportado é branco. O quadriculado da interface só indica a área do preview.

---

## 📥 Formato do arquivo

O resultado é exportado no formato:

```text
PNG
```

O nome do arquivo segue o padrão:

```text
Assinatura-NOME_DO_PROFISSIONAL.png
```

Por exemplo:

```text
Assinatura-Dr. João Silva.png
```

As dimensões do arquivo baixado são fixas, independentemente da densidade de pixels do monitor. A área ocupada pela composição corresponde a 420 x 200 pixels no centro do PNG.

---

## 🔐 Privacidade e processamento

A aplicação atualmente possui arquitetura exclusivamente frontend.

A imagem selecionada é processada localmente com `createImageBitmap` e Canvas. A prévia resultante é usada pela interface e pelo gerador de PNG.

Não existe, na implementação atual, uma API ou servidor responsável por armazenar ou processar os arquivos enviados.

> O comportamento de armazenamento e transmissão de dados também dependerá de futuras integrações adicionadas ao projeto.

---

## 🧩 Arquitetura

A interface, o estado do editor e a transformação de pixels são separados:

```text
┌───────────────────────────────┐
│          Browser              │
│                               │
│  ┌──────────────────────────┐ │
│  │ App + componentes visuais│ │
│  └────────────┬─────────────┘ │
│               │               │
│               ▼               │
│      useSignatureEditor       │
│        ┌──────┴──────┐        │
│        ▼             ▼        │
│  Canvas/imagem   html-to-image│
│        └──────┬──────┘        │
│               ▼               │
│            PNG                │
└───────────────────────────────┘
```

Não há banco de dados ou backend implementado na versão atual.

---

## 📌 Estado atual do projeto

### Implementado

* [x] Estrutura React + Vite
* [x] Upload de uma ou duas imagens
* [x] Ajustes de imagem, preset e prévia ao vivo
* [x] CRM/CRMV/CRO, registro compacto, RQE e frases adicionais
* [x] Modelo pronto para a segunda imagem
* [x] Fonte, espaçamento, arraste, undo e redo da composição
* [x] Exportação de PNG 840 x 400 px com conteúdo em área de 420 x 200 px
* [x] Configuração de ESLint
* [x] Build de produção

### Possíveis evoluções

* [ ] Implementar apresentação, mapeamento e processamento dos dados importados no módulo Senhas.
* [ ] Criar o fluxo funcional do módulo Logos.
* [ ] Adicionar testes automatizados para os fluxos principais.

## Problemas conhecidos

### Contraste pode saltar perto do neutro

O controle exibe 200 como neutro, mas o processador só ignora exatamente esse valor. Em valores próximos, a fórmula aplica um fator próximo de 2, podendo causar uma mudança brusca ao mover o slider um ponto. Até corrigir o mapeamento, ajuste o contraste com cautela.

### Ajuste de conteúdo extenso

Quando imagem e textos excedem o quadro de 420 x 200 px, a exportação reduz a escala do cartão para mantê-los dentro da área. Textos muito longos podem, portanto, aparecer menores no PNG.

### Desempenho e acessibilidade

O processamento de pixels roda na thread principal e não há limite de tamanho/dimensões para os arquivos. Imagens grandes podem deixar a página lenta. O input de arquivo é visualmente oculto, mas o estilo de foco atual não evidencia o foco no controle visível de upload.

### Navegação Senhas e Logos

**Senhas** permite selecionar e ler a primeira planilha de arquivos `.xlsx`, mas os valores só são inspecionados no console; não há tabela, mapeamento ou operação de negócio. **Logos** continua como placeholder. A assinatura é o único módulo com fluxo completo de interface e exportação.

> Converter para preto atua sobre pixels não transparentes. Isso não remove um fundo branco ou colorido que já esteja opaco; esse caso exige uma etapa própria de remoção de fundo.

## 📝 Changelog

### [1.2.1] - 2026-10-01

#### Corrigido

* Leitura de arquivos `.xlsx` no navegador com ExcelJS usando `arrayBuffer()` e `workbook.xlsx.load()`.
* Armazenamento da primeira planilha carregada no estado do hook `useExcel`.

#### Documentação

* Atualizado o diagnóstico dos módulos e removido o alerta obsoleto de reprocessamento contínuo da remoção de fundo.
* Registradas as limitações atuais da leitura de planilhas e as próximas evoluções dos módulos.

### [1.1.2] - 2026-09-30

#### Adicionado

* Paleta em tons suaves de azul aplicada à interface e à prévia.
* Opções de navegação no cabeçalho para Assinatura, Senhas e Logos.

#### Atualizado

* Versão do projeto e lockfile para `1.1.2`.

### [1.1.1] - 2026-09-30

#### Adicionado

* Preview responsivo com estilos próprios em `src/style/preview.css`.
* Seletores **Padrão** e **Compacto** para CRM, CRMV, CRO e RQE, com placeholders atualizados conforme o formato.
* Seleção de formato do RQE independente da opção **Adicionar RQE**, que continua controlando sua inclusão na assinatura.

#### Alterado

* Exportação em PNG com dimensões fixas de 840 x 400 px e fundo branco.
* Conteúdo central limitado a 420 x 200 px, com redução automática para acomodar imagem e textos.

---

## 📜 Licença

Este projeto está disponível sob a licença **MIT**.

Consulte o arquivo [`LICENSE`](./LICENSE) para obter os termos completos da licença.

---

## 👨‍💻 Autor

**Lucas Freire**

Projeto desenvolvido em 2026.
