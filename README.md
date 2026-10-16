<div align="center">

# 🩺 MobilemedTools

**Gere assinaturas médicas padronizadas a partir de uma foto da sua assinatura manuscrita, direto no navegador.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Licença](https://img.shields.io/github/license/Luc4sFreire/mobilemedtools)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)

</div>

## Sobre

O **MobilemedTools** reúne ferramentas de apoio ao trabalho da equipe Mobilemed. O módulo atual transforma uma foto ou digitalização de uma assinatura em um PNG limpo, com fundo branco ou transparente, e o compõe com os dados profissionais (nome, CRM/CRMV/CRO, RQE, especialidade e frases extras) em uma imagem final de **420 × 120 px**.

> 🔒 **Privacidade:** todo o processamento e a composição acontecem localmente no navegador. A imagem não é enviada a nenhum servidor nem armazenada.

## Funcionalidades

- 📁 Seleção de qualquer imagem (`image/*`) com a assinatura manuscrita
- 🧹 Remoção automática de fundo e correção de iluminação, mesmo em fotos com sombras
- 🎛️ Ajustes com prévia imediata: escala (50% a 200%), espessura do traço (-10 a +10), cor da tinta (preto puro ou cor original), suavização das bordas e fundo transparente
- 👨‍⚕️ Três tipos de profissional: **CRM** (médico), **CRMV** (veterinário) e **CRO** (dentista)
- 🏷️ Dois formatos de registro: padrão (`CRM: 12345`) e compacto com estado (`CRM/SP 12345`)
- ➕ Campos opcionais: RQE, especialidade e quantas frases adicionais forem necessárias
- 📐 Saída com dimensões fixas (420 × 120 px), com o texto ajustado automaticamente ao espaço disponível
- ⬇️ Download em PNG (`Assinatura-<nome>.png`)

## Estado dos módulos

| Módulo | Estado | Descrição |
| --- | --- | --- |
| Dados profissionais | ✅ Implementado | Nome, tipo e número de registro, RQE, especialidade e frases extras |
| Pré-processamento da imagem | ✅ Implementado | Segmentação da tinta no `canvas`, com prévia atualizada a cada ajuste |
| Montagem e download | ✅ Implementado | Composição em 420 × 120 px e exportação em PNG |

## Como funciona

```text
Imagem original
   │
   ▼
Correção de iluminação ──► Tons de cinza ──► Ajuste de contraste (percentis)
   │
   ▼
Limiar de Otsu + histerese (tinta "certa" e "provável")
   │
   ▼
Fechamento de lacunas ──► Remoção de manchas ──► Espessura (dilatar/erodir)
   │
   ▼
Suavização das bordas ──► Aplicação da cor/transparência
   │
   ▼
Composição com os dados profissionais (canvas 420 × 120 px)
   │
   ▼
Download no formato PNG.
```

A assinatura aparece acima dos dados profissionais. Ela se ajusta ao espaço que sobra conforme o texto cresce; se o texto não couber nem na escala mínima, a interface pede que você reduza as frases.

## Primeiros passos

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão LTS recente) e npm

### Instalação e execução

```bash
git clone https://github.com/Luc4sFreire/mobilemedtools.git
cd mobilemedtools
npm install
npm run dev
```

A aplicação abre em `http://localhost:3000`.

### Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Vite, porta 3000) |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve localmente o build de produção |
| `npm run lint` | Executa o ESLint |

> Ainda não há suíte de testes automatizados configurada.

## Como usar

1. Clique em **Selecionar Imagem da Assinatura** e escolha a foto.
2. Escolha o tipo de profissional e preencha nome e registro.
3. Em **Configurações Avançadas**, ative RQE, especialidade ou frases adicionais, se precisar.
4. Em **Personalização da Imagem**, ajuste escala, espessura, cor e transparência até ficar satisfeito. Use o botão de redefinir para voltar aos padrões.
5. Confira a **Prévia final** e faça o download do PNG.

💡 **Dica:** fotografe a assinatura em papel branco, com boa luz e sem dobras para obter o melhor resultado.

## Estrutura do projeto

```text
.
├── components/
│   └── SignatureWorkspace.jsx   # Interface do módulo de assinatura
├── hooks/
│   └── useSignature.js          # Estado, validação e fluxo de processamento
├── utils/
│   ├── processImage.js          # Algoritmo de segmentação no canvas
│   └── composeSignature.js      # Composição final (texto + assinatura) em 420 × 120 px
├── style/
│   ├── index.css                # Estilos globais e variáveis visuais
│   └── signature.css            # Estilos da interface de assinatura
├── src/
│   ├── App.jsx                  # Composição da aplicação
│   └── main.jsx                 # Ponto de entrada
├── assets/                      # Ícones
├── index.html
└── vite.config.js
```

## Tecnologias

- [React 19](https://react.dev/)
- [Vite 8](https://vite.dev/)
- JavaScript (ES Modules) e Canvas API, sem bibliotecas de processamento de imagem
- ESLint com plugins de React Hooks e React Refresh
- Hospedagem na [Vercel](https://vercel.com/)

## Contribuindo

Sugestões e correções são bem-vindas. Abra uma [issue](https://github.com/Luc4sFreire/mobilemedtools/issues) ou envie um pull request:

1. Faça um fork do projeto
2. Crie uma branch (`git checkout -b feature/minha-feature`)
3. Faça o commit (`git commit -m "feat: minha feature"`)
4. Envie a branch (`git push origin feature/minha-feature`)
5. Abra um Pull Request

Antes de enviar, rode `npm run lint` e `npm run build`.

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).

---

Feito por [Pedro Freire](https://github.com/Luc4sFreire)