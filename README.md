# MobilemedTools

Aplicação web desenvolvida em **React + Vite** para criação de assinaturas profissionais em formato PNG.

A ferramenta permite processar uma ou duas imagens, compor a assinatura com identificação profissional e baixar o resultado como PNG de 840 x 400 px. O conteúdo fica centralizado em uma área de 420 x 200 px.

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
Informar CRM/CRMV/CRO e estado
       ↓
Visualizar assinatura
       ↓
Gerar imagem PNG
       ↓
Download da assinatura
```

---

## ✨ Funcionalidades

* Upload e processamento local de uma ou duas imagens;
* Conversão dos pixels visíveis para preto puro e limpeza opcional de pixels quase transparentes;
* Recorte automático do conteúdo visível com margem de 15 px;
* Remoção de fundo com sensibilidade por imagem;
* Ajuste de contraste e nitidez e preset local de limpeza avançada;
* Prévia atualizada conforme os ajustes e os dados profissionais mudam;
* Posicionamento das assinaturas por arraste, com desfazer/refazer e atalhos de teclado;
* Segunda imagem opcional ou modo de modelo sem identificação profissional;
* Formatos padrão e compacto para CRM, CRMV, CRO e RQE;
* RQE e frases adicionais opcionais;
* Escolha de fonte e espaçamento entre imagem e texto;
* Exportação e download automáticos em PNG de 840 x 400 px;
* Processamento feito no navegador, sem envio das imagens a um servidor.

Os ajustes de imagem começam desativados. Contraste 200 é neutro, nitidez 0 não altera a imagem e o preset avançado começa desativado. Cada ajuste ativo reprocessa o arquivo original. O preset aplica contraste 400, nitidez 15, threshold 160 e conversão para preto; enquanto estiver ativo, os controles manuais de contraste e nitidez ficam desabilitados.

### Controles de imagem

| Controle | Padrão | Efeito |
| --- | --- | --- |
| Converter para preto puro | Desativado | Define os canais RGB dos pixels visíveis como 0, sem alterar o alpha. |
| Limpar pixels fracos | Desativado | Torna transparente qualquer pixel com alpha menor que 15. |
| Crop automático | Desativado | Recorta os pixels transparentes ao redor do conteúdo e deixa 15 px de margem. |
| Remover fundo | Inativo | Estima o tom de fundo dominante por luminância e torna tons semelhantes transparentes. |
| Sensibilidade do fundo | Automática | Mostra um slider de 0 a 100 para cada imagem quando a remoção está ativa. |
| Contraste | 200 | Ajuste manual; o valor 200 é tratado como neutro pelo fluxo atual. |
| Nitidez | 0 | Ajuste manual aplicado com uma máscara de nitidez em Canvas. |
| Preset avançado | Inativo | Reforça alpha e aplica contraste 400, nitidez 15, threshold 160 e preto puro. |

Os controles de preto, limpeza, recorte, contraste, nitidez e preset são compartilhados pelas imagens carregadas. A sensibilidade para remoção de fundo é independente para cada imagem. **Restaurar ajustes** retorna as opções aos padrões acima.

### Identificação profissional

O tipo profissional seleciona o rótulo CRM, CRMV ou CRO. Para o registro, os botões **Padrão** e **Compacto** alteram o exemplo do campo e a apresentação na assinatura. Por exemplo, `12345/SP` no padrão gera `CRM: 12345/SP`; `RS 45534` no compacto gera `CRM/RS 45534`.

O RQE permanece opcional: só é exibido o campo quando **Adicionar RQE** está marcado, e o texto só entra na assinatura quando há um valor preenchido. Os botões **Padrão** e **Compacto** controlam sua apresentação; por exemplo, `40499/SP` gera `RQE: 40499/SP` no padrão e `RS 40499` gera `RQE/RS 40499` no compacto. Os placeholders mostram exemplos de acordo com a opção selecionada.

### Fluxos de uso

1. Selecione a imagem principal e informe nome, categoria profissional e registro.
2. Ajuste os filtros; a prévia é recalculada a partir do arquivo original, não da imagem já processada.
3. Opcionalmente habilite RQE, frases, registro compacto, fonte e espaçamento.
4. Para duas assinaturas, habilite a segunda, carregue outra imagem e preencha seus dados ou marque “Usar como modelo pronto”.
5. Arraste os cartões na prévia para posicioná-los e baixe o PNG.

No modo modelo, a segunda imagem é exportada sem nome ou registro. Em modo normal, nome e registro são necessários para cada perfil antes de baixar.

Os sliders oferecem contraste de 0 a 400, nitidez de 0 a 15 e espaçamento de 0 a 30 px. O histórico registra até vinte movimentos de posição; `Ctrl/Cmd+Z` desfaz e `Ctrl/Cmd+Y` ou `Ctrl/Cmd+Shift+Z` refaz. Os atalhos não interceptam digitação em campos de texto.

O upload aceita arquivos com MIME `image/*`. A decodificação depende do suporte do navegador a `createImageBitmap` ou `Image.decode`; não há limite explícito de tamanho. O download exige a imagem principal e, quando a segunda assinatura está habilitada, também a segunda imagem. Nome e registro são obrigatórios; RQE não é.

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
│   │   ├── index.css
│   │   └── preview.css
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

Controla até dois arquivos e imagens derivados, thresholds por imagem, ajustes, perfis profissionais, frases, posições, histórico, estados de carregamento/erro e a referência da composição exportada. Um efeito reprocessa os arquivos originais quando uma dependência muda e ignora resultados obsoletos. O hook valida os campos necessários e gera o PNG de 840 x 400 px.

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
7. O resultado é serializado como PNG em Data URL; a prévia usa essa imagem e `html-to-image` gera o arquivo final branco de 840 x 400 px, com conteúdo central de 420 x 200 px.

O crop calcula os limites de todos os pixels visíveis. Um elemento isolado ou ruído acima do limiar alpha pode, portanto, aumentar a área recortada.

A remoção estima o tom de fundo dominante da imagem e funciona melhor quando sua luminância difere da tinta. Sombras fortes ou partes da assinatura com tom semelhante ao fundo podem exigir ajuste manual. Fundos fotográficos complexos exigem segmentação mais avançada, por exemplo, um modelo dedicado de remoção de fundo.

O algoritmo usa luminância global, não segmentação semântica. Pixels da tinta com tom semelhante ao fundo também podem ficar transparentes; fundos fotográficos, sombras e gradientes podem não ser removidos de forma limpa.

#### `src/components/ImageUploader.jsx`

Apresenta o seletor de arquivos e o nome selecionado. Não processa a imagem: encaminha o evento recebido por props.

#### `src/components/ImageAdjustments.jsx`

Descreve checkboxes e sliders controlados pelo hook. Ao ativar a remoção de fundo, exibe um controle de sensibilidade de 0 a 100 por imagem; o preset avançado desabilita os sliders manuais de contraste e nitidez.

#### `src/components/DoctorForm.jsx`

Exibe os campos controlados de cada profissional. Os botões **Padrão** e **Compacto** atualizam o placeholder e a apresentação do CRM/CRMV/CRO. O RQE tem seus próprios botões de formato e permanece opcional.

#### `src/components/SignaturePreview.jsx`

Monta uma ou duas imagens e seus textos em cartões posicionáveis por pointer events. A referência do elemento de saída permite exportar a composição; o quadriculado do preview fica fora do PNG.

#### `src/main.jsx`

Cria a raiz React no elemento `#root` definido em `index.html` e monta `App`.

#### `src/style/index.css` e `src/style/preview.css`

`index.css` contém os estilos globais, controles e layout responsivo. `preview.css`, importado pelo componente `SignaturePreview`, contém os estilos específicos da composição e do quadro quadriculado.

#### `index.html`, `vite.config.js` e `eslint.config.js`

O HTML define metadados e a raiz React; a configuração do Vite habilita React e usa a porta 3000; o ESLint combina regras de JavaScript, React Hooks e React Refresh.

O fluxo de atualização e exportação pode ser resumido assim:

```text
Upload ou mudança de checkbox
          ↓
useSignatureEditor observa arquivo/opções
          ↓
processSignatureImage processa o arquivo original no Canvas
          ↓
SignaturePreview recebe a nova imagem
          ↓
Composição limitada a 420 x 200 px
          ↓
html-to-image exporta o PNG de 840 x 400 px
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
* [x] Fonte, espaçamento, arraste, undo e redo da composição
* [x] Exportação de PNG 840 x 400 px com conteúdo em área de 420 x 200 px
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

### Ajuste de conteúdo extenso

Quando imagem e textos excedem o quadro de 420 x 200 px, a exportação reduz a escala do cartão para mantê-los dentro da área. Textos muito longos podem, portanto, aparecer menores no PNG.

### Desempenho e acessibilidade

O processamento de pixels roda na thread principal e não há limite de tamanho/dimensões para os arquivos. Imagens grandes podem deixar a página lenta. O input de arquivo é visualmente oculto, mas o estilo de foco atual não evidencia o foco no controle visível de upload.

> Converter para preto atua sobre pixels não transparentes. Isso não remove um fundo branco ou colorido que já esteja opaco; esse caso exige uma etapa própria de remoção de fundo.

## 📝 Changelog

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
