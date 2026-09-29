# MobilemedTools

Aplicação web desenvolvida em **React + Vite** para criação de assinaturas profissionais em formato PNG.

A ferramenta permite selecionar uma imagem, ajustar seus pixels com opções independentes, informar os dados profissionais, visualizar o resultado atualizado e baixar a assinatura como PNG transparente em alta resolução.

---

## 📋 Sobre o projeto

O **MobilemedTools** foi desenvolvido como uma ferramenta frontend para facilitar a criação de assinaturas utilizadas em documentos profissionais, como laudos, receitas e outros documentos que necessitem da identificação visual de um profissional.

O processo é realizado diretamente no navegador, sem necessidade de um backend para processamento das informações.

### Fluxo principal

```text
Selecionar imagem
       ↓
Informar nome do profissional
       ↓
Informar CRM e estado
       ↓
Visualizar assinatura
       ↓
Gerar imagem PNG
       ↓
Download da assinatura
```

---

## ✨ Funcionalidades

* Seleção de imagem através do computador;
* Conversão opcional dos pixels visíveis para preto puro (RGB 0, 0, 0);
* Remoção opcional de pixels quase transparentes (alpha menor que 15);
* Recorte automático opcional com margem transparente de 15 px;
* Remoção opcional de fundo com threshold automático e sensibilidade ajustável por imagem;
* Ajuste manual de contraste e nitidez, além de preset local de limpeza avançada;
* Atualização da pré-visualização em tempo real ao alternar os ajustes;
* Uma ou duas assinaturas, com escalas e posições independentes;
* Arraste na prévia com undo/redo e atalhos Ctrl/Cmd+Z e Ctrl/Cmd+Y;
* Modo para usar a segunda imagem como modelo pronto;
* Registro em formato padrão ou compacto para CRM, CRMV e CRO;
* Inclusão opcional de RQE e frases adicionais;
* Seleção de fonte e espaçamento entre imagem e texto;
* Restauração dos ajustes de imagem aos valores iniciais;
* Geração da assinatura em formato PNG;
* Download automático da imagem gerada;
* Geração do PNG em resolução ampliada para melhorar a qualidade da imagem;
* Processamento realizado no navegador.

Os ajustes de preto, limpeza de pixels e recorte começam habilitados; remoção de fundo e preset avançado começam desligados. Contraste 200% é neutro e nitidez 0 não altera a imagem. O preset reproduz contraste 400%, nitidez 15, threshold 160 e preto puro em Canvas; enquanto está ativo, os sliders manuais ficam desabilitados. Cada alteração reprocessa os arquivos originais e atualiza a prévia.

### Controles de imagem

| Controle | Padrão | Efeito |
| --- | --- | --- |
| Converter para preto puro | Ativo | Define os canais RGB dos pixels visíveis como 0, sem alterar o alpha. |
| Limpar pixels fracos | Ativo | Torna transparente qualquer pixel com alpha menor que 15. |
| Crop automático | Ativo | Recorta pixels transparentes ao redor do conteúdo e deixa 15 px de margem. |
| Remover fundo | Inativo | Estima o tom de fundo dominante por luminância e torna tons semelhantes transparentes. |
| Sensibilidade do fundo | Automática | Mostra um slider de 0 a 100 por imagem quando a remoção está ativa. |
| Contraste | 200 | Ajuste manual; o valor 200 é tratado como neutro pelo fluxo atual. |
| Nitidez | 0 | Ajuste manual aplicado com uma máscara de nitidez em Canvas. |
| Preset avançado | Inativo | Reforça alpha e aplica contraste 400, nitidez 15, threshold 160 e preto puro. |

Os controles compartilhados de preto, limpeza, recorte, contraste, nitidez e preset afetam as imagens carregadas. A sensibilidade para remover o fundo é independente para cada imagem. O botão **Restaurar ajustes** retorna as opções aos padrões acima.

### Fluxos de uso

1. Selecione a imagem principal e informe nome, categoria profissional e registro.
2. Ajuste os filtros; a prévia é recalculada a partir do arquivo original, não da imagem já processada.
3. Opcionalmente habilite RQE, frases, registro compacto, fonte e espaçamento.
4. Para duas assinaturas, habilite a segunda, carregue outra imagem e preencha seus dados ou marque “Usar como modelo pronto”.
5. Arraste os cartões na prévia, ajuste seus tamanhos e baixe o PNG.

No modo modelo, a segunda imagem é exportada sem nome ou registro. Em modo normal, nome e registro são necessários para cada perfil antes de baixar.

Os sliders oferecem contraste de 0 a 400, nitidez de 0 a 15, tamanho de 50% a 150% e espaçamento de 0 a 30 px. O histórico registra até vinte movimentos de posição; `Ctrl/Cmd+Z` desfaz e `Ctrl/Cmd+Y` ou `Ctrl/Cmd+Shift+Z` refaz. Os atalhos não interceptam digitação em campos de texto.

O upload aceita arquivos com MIME `image/*`. A decodificação efetiva depende do suporte do navegador a `createImageBitmap` ou `Image.decode`; não há limite explícito de tamanho no código. O botão de download exige a imagem principal e, se a segunda assinatura estiver habilitada, a segunda imagem. Nome e registro são validados ao solicitar o download.

---

## 🛠️ Tecnologias utilizadas

### Frontend

* **React 19**
* **React DOM 19**
* **Vite 8**
* **JavaScript**
* **CSS**

### Bibliotecas

* **html-to-image** — utilizada para converter o componente HTML da assinatura em uma imagem PNG.

### Qualidade de código

* **ESLint**
* **eslint-plugin-react-hooks**
* **eslint-plugin-react-refresh**

---

## 📁 Estrutura do projeto

```text
mobilemedtools/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── DoctorForm.jsx
│   │   ├── ImageAdjustments.jsx
│   │   ├── ImageUploader.jsx
│   │   └── SignaturePreview.jsx
│   ├── hooks/
│   │   └── useSignatureEditor.js
│   ├── style/
│   │   └── index.css
│   ├── utils/
│   │   └── processSignatureImage.js
│   ├── App.jsx
│   └── main.jsx
│
├── .gitignore
├── eslint.config.js
├── index.html
├── LICENSE
├── package.json
├── package-lock.json
├── README.md
└── vite.config.js
```

### Principais arquivos

#### `src/App.jsx`

Compõe a interface. Encaminha ao hook os valores e eventos usados pelos componentes de upload, ajustes, formulário e pré-visualização.

#### `src/hooks/useSignatureEditor.js`

Controla até dois arquivos e imagens derivados, thresholds por imagem, ajustes, perfis profissionais, frases, escalas, posições, histórico, estados de carregamento/erro e a referência da composição exportada. Um efeito reprocessa os arquivos originais quando uma dependência muda e ignora resultados obsoletos. O hook valida os campos necessários e gera o PNG transparente.

#### `src/utils/processSignatureImage.js`

Decodifica a imagem com `createImageBitmap` e, para formatos incompatíveis como SVG em alguns navegadores, usa `Image.decode` como fallback. Depois copia os pixels para Canvas e aplica as opções selecionadas. A remoção de fundo estima a luminância dominante pelo histograma, sugere um limiar automático e permite ajustá-lo pelo slider; pixels próximos do fundo ficam transparentes e a transição recebe suavização. Pixels abaixo do limite alpha 15 são descartados quando a limpeza está ativa; os pixels visíveis podem ser pintados de preto; e o recorte mede a área não transparente e acrescenta 15 px de margem. Devolve a imagem processada como PNG em Data URL.

O pipeline também oferece contraste, nitidez e preset local equivalente ao antigo bloco “Python”. O preset executa no Canvas do navegador, sem chamar um processo ou backend Python.

O utilitário retorna um objeto com a Data URL da imagem processada e o limiar sugerido para remoção de fundo.

#### Ordem do processamento

1. O arquivo é decodificado com `createImageBitmap`; se o navegador não aceitar o formato, o utilitário tenta `Image.decode`.
2. A imagem é desenhada em Canvas e seus pixels RGBA são lidos.
3. Se ativada, a remoção estima o fundo pelo histograma de luminância BT.601, sugere um threshold e suaviza o alpha próximo da transição tonal.
4. O preset pode reforçar pixels semi-transparentes; em seguida, contraste e nitidez são aplicados.
5. O preset remove pixels com luminância a partir de 160; a limpeza opcional remove pixels com alpha abaixo de 15.
6. Os pixels restantes podem ser convertidos para preto e o crop calcula a caixa delimitadora da área visível.
7. O resultado é serializado como PNG em Data URL; a prévia usa essa imagem e `html-to-image` gera o arquivo final.

O crop calcula os limites de todos os pixels visíveis. Um elemento isolado ou ruído acima do limiar alpha pode, portanto, aumentar a área recortada.

A remoção estima o tom de fundo dominante da imagem e funciona melhor quando sua luminância difere da tinta. Sombras fortes ou partes da assinatura com tom semelhante ao fundo podem exigir ajuste manual. Fundos fotográficos complexos exigem segmentação mais avançada, por exemplo, um modelo dedicado de remoção de fundo.

O algoritmo usa luminância global, não segmentação semântica. Pixels da tinta com tom semelhante ao fundo também podem ficar transparentes; fundos fotográficos, sombras e gradientes podem não ser removidos de forma limpa.

#### `src/components/ImageUploader.jsx`

Apresenta o seletor de arquivos e o nome selecionado. Não processa a imagem: encaminha o evento recebido por props.

#### `src/components/ImageAdjustments.jsx`

Descreve checkboxes e sliders controlados pelo hook. Ao ativar a remoção de fundo, exibe um controle de sensibilidade de 0 a 100 por imagem; o preset avançado desabilita os sliders manuais de contraste e nitidez.

#### `src/components/DoctorForm.jsx`

Exibe campos controlados para cada profissional: nome, CRM/CRMV/CRO, formato compacto e campos opcionais de RQE.

#### `src/components/SignaturePreview.jsx`

Monta uma ou duas imagens e seus textos em cartões posicionáveis por pointer events. A referência no elemento de saída permite exportar exatamente a composição. O quadriculado de transparência fica fora do elemento capturado.

#### `src/main.jsx`

Cria a raiz React no elemento `#root` definido em `index.html` e monta `App`.

#### `src/style/index.css`

Define tokens de cor, layout dos painéis, controles, prévia quadriculada e regras responsivas para telas móveis.

#### `index.html`, `vite.config.js` e `eslint.config.js`

O HTML define metadados e a raiz React; a configuração do Vite habilita React e usa a porta 3000; o ESLint combina regras de JavaScript, React Hooks e React Refresh.

O fluxo de atualização pode ser resumido assim:

```text
Upload ou mudança de checkbox
          ↓
useSignatureEditor observa arquivo/opções
          ↓
processSignatureImage processa o arquivo original no Canvas
          ↓
SignaturePreview recebe a nova imagem
          ↓
html-to-image exporta a composição para PNG
```

---

## ⚙️ Pré-requisitos

Antes de executar o projeto, é necessário possuir:

* **Node.js**
* **npm**

Para verificar as instalações:

```bash
node --version
npm --version
```

---

## 🚀 Instalação

Clone o repositório:

```bash
git clone <URL_DO_REPOSITORIO>
```

Entre na pasta do projeto:

```bash
cd mobilemedtools
```

Instale as dependências:

```bash
npm install
```

---

## ▶️ Executando em desenvolvimento

Para iniciar o servidor de desenvolvimento:

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

## 🖼️ Geração da assinatura

A geração da imagem é realizada através da biblioteca `html-to-image`.

O componente que representa a assinatura é convertido para PNG utilizando uma escala de renderização superior à resolução CSS original.

Atualmente, a aplicação utiliza:

```text
pixelRatio: 2
```

Isso permite gerar uma imagem com maior definição, especialmente quando a assinatura será utilizada em documentos ou impressões. A exportação mantém o fundo transparente, e o padrão quadriculado mostrado na tela serve apenas para indicar essa transparência.

Para aplicações que exigem fundo branco, o PNG pode ser colocado sobre uma página ou documento branco após o download.

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
┌─────────────────────────────┐
│          Browser            │
│                             │
│  ┌─────────────────────────┐  │
│  │ App + componentes visuais│  │
│  └────────────┬────────────┘  │
│               │               │
│               ▼               │
│      useSignatureEditor       │
│        ┌──────┴──────┐        │
│        ▼             ▼        │
│  Canvas/imagem   html-to-image│
│        └──────┬──────┘        │
│               ▼               │
│            PNG                 │
└─────────────────────────────┘
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
* [x] Escala, fonte, espaçamento, arraste, undo e redo da composição
* [x] Geração e download de PNG transparente
* [x] Configuração de ESLint
* [x] Build de produção

### Possíveis evoluções

* [ ] Melhorar o layout e a experiência de utilização;
* [ ] Adicionar opção de exportação em outros formatos;
* [ ] Adicionar histórico de assinaturas;
* [ ] Adicionar testes automatizados;
* [ ] Adicionar suporte a diferentes modelos de documentos.

## Problemas conhecidos

### Remoção de fundo pode entrar em reprocessamento contínuo

O efeito que processa imagens depende de `backgroundThresholds`. Ao terminar uma remoção, ele cria um novo array de thresholds mesmo quando os valores não mudaram; como a referência do array muda, o efeito pode disparar novamente sem parar. O resultado observado foi milhares de decodificações por segundo e a interface ficando sem resposta.

**Workaround até a correção:** mantenha **Remover fundo** desativado. Evite ativá-lo em uma sessão com imagens importantes até que o estado seja atualizado somente quando um threshold realmente mudar.

### Contraste pode saltar perto do neutro

O controle exibe 200 como neutro, mas o processador só ignora exatamente esse valor. Em valores próximos, a fórmula aplica um fator próximo de 2, podendo causar uma mudança brusca ao mover o slider um ponto. Até corrigir o mapeamento, ajuste o contraste com cautela.

### Escala e limites do arraste

O cálculo dos limites usa dimensões sem transformação CSS, enquanto o cartão pode estar ampliado. Em escalas acima de 100%, conteúdo posicionado perto da borda pode ser recortado na prévia/exportação.

### Desempenho e acessibilidade

O processamento de pixels roda na thread principal e não há limite de tamanho/dimensões para os arquivos. Imagens grandes podem deixar a página lenta. O input de arquivo é visualmente oculto, mas o estilo de foco atual não evidencia o foco no controle visível de upload.

> Converter para preto atua sobre pixels não transparentes. Isso não remove um fundo branco ou colorido que já esteja opaco; esse caso exige uma etapa própria de remoção de fundo.

---

## 📜 Licença

Este projeto está disponível sob a licença **MIT**.

Consulte o arquivo [`LICENSE`](./LICENSE) para obter os termos completos da licença.

---

## 👨‍💻 Autor

**Lucas Freire**

Projeto desenvolvido em 2026.
