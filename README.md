# MobilemedTools

Aplicação web desenvolvida em **React + Vite** para criação de assinaturas profissionais em formato PNG.

A ferramenta permite inserir uma imagem, informar o nome do profissional e seu CRM, visualizar o resultado e realizar o download da assinatura como uma imagem PNG em alta resolução.

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
* Pré-visualização da imagem selecionada;
* Inserção do nome do profissional;
* Inserção do CRM e estado;
* Visualização da assinatura em tempo real;
* Geração da assinatura em formato PNG;
* Download automático da imagem gerada;
* Geração do PNG em resolução ampliada para melhorar a qualidade da imagem;
* Processamento realizado no navegador.

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
│   ├── style/
│   │   └── index.css
│   │
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

Contém a implementação principal da aplicação.

É responsável por:

* controlar os dados preenchidos pelo usuário;
* receber a imagem selecionada;
* converter a imagem para Data URL;
* exibir a pré-visualização;
* montar a assinatura;
* converter a assinatura para PNG;
* iniciar o download do arquivo.

#### `src/main.jsx`

É o ponto de entrada da aplicação React.

Responsável por montar o componente principal `App` no elemento `root` do HTML.

#### `src/style/index.css`

Contém os estilos da aplicação.

#### `vite.config.js`

Contém a configuração do Vite.

O servidor de desenvolvimento está configurado para utilizar a porta:

```text
3000
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

---

## 🖼️ Geração da assinatura

A geração da imagem é realizada através da biblioteca `html-to-image`.

O componente que representa a assinatura é convertido para PNG utilizando uma escala de renderização superior à resolução CSS original.

Atualmente, a aplicação utiliza:

```text
pixelRatio: 2
```

Isso permite gerar uma imagem com maior definição, especialmente quando a assinatura será utilizada em documentos ou impressões.

O fundo da imagem gerada também é definido como branco para evitar problemas de transparência em aplicações que não lidam adequadamente com imagens transparentes.

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

A imagem selecionada pelo usuário é carregada utilizando a API `FileReader` do navegador e convertida para uma **Data URL** para utilização na própria aplicação.

Não existe, na implementação atual, uma API ou servidor responsável por armazenar ou processar os arquivos enviados.

> O comportamento de armazenamento e transmissão de dados também dependerá de futuras integrações adicionadas ao projeto.

---

## 🧩 Arquitetura atual

A aplicação possui uma arquitetura simples:

```text
┌─────────────────────────────┐
│          Browser            │
│                             │
│  ┌───────────────────────┐  │
│  │       React App       │  │
│  │                       │  │
│  │  Upload da imagem     │  │
│  │  Dados profissionais  │  │
│  │  Pré-visualização     │  │
│  │  Geração do PNG       │  │
│  └───────────┬───────────┘  │
│              │              │
│              ▼              │
│       html-to-image         │
│              │              │
│              ▼              │
│        Arquivo PNG         │
└─────────────────────────────┘
```

Não há banco de dados ou backend implementado na versão atual.

---

## 📌 Estado atual do projeto

### Implementado

* [x] Estrutura React + Vite
* [x] Upload de imagem
* [x] Conversão da imagem para Data URL
* [x] Campo para nome do profissional
* [x] Campo para CRM
* [x] Pré-visualização
* [x] Geração de PNG
* [x] Download automático
* [x] Configuração de ESLint
* [x] Build de produção

### Possíveis evoluções

* [ ] Melhorar o layout e a experiência de utilização;
* [ ] Permitir posicionamento e redimensionamento dos elementos;
* [ ] Adicionar diferentes modelos de assinatura;
* [ ] Permitir personalização de fontes e tamanhos;
* [ ] Permitir ajuste das dimensões da assinatura;
* [ ] Adicionar opção de exportação em outros formatos;
* [ ] Adicionar validação dos campos;
* [ ] Adicionar histórico de assinaturas;
* [ ] Criar componentes React reutilizáveis;
* [ ] Adicionar testes automatizados;
* [ ] Implementar responsividade para dispositivos móveis;
* [ ] Adicionar suporte a diferentes modelos de documentos.

---

## 📜 Licença

Este projeto está disponível sob a licença **MIT**.

Consulte o arquivo [`LICENSE`](./LICENSE) para obter os termos completos da licença.

---

## 👨‍💻 Autor

**Lucas Freire**

Projeto desenvolvido em 2026.
