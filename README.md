<div align="center">

# 🩺 MobilemedTools

**Ferramentas para assinaturas profissionais e geração de senhas, direto no navegador.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Versão](https://img.shields.io/badge/vers%C3%A3o-1.1.0-blue)
![Licença](https://img.shields.io/github/license/Luc4sFreire/mobilemedtools)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)

</div>

## Sobre

O **MobilemedTools** reúne ferramentas de apoio ao trabalho da equipe Mobilemed. A versão **1.1** oferece um gerador de assinaturas profissionais e um gerador de senhas, executados no navegador.

> 🔒 **Privacidade:** o processamento das imagens e a geração das senhas acontecem localmente no navegador. As imagens selecionadas não são enviadas a um servidor nem armazenadas pela aplicação.

## Funcionalidades

- **Assinaturas:** selecione uma foto, remova o fundo e ajuste iluminação, escala, espessura, cor e suavização. Inclua nome, registro profissional (CRM/CRMV/CRO), RQE, especialidade e frases extras; a saída é um PNG de **420 × 120 px**.
- **Senhas:** gere de 1 a 50 senhas com prefixo configurável, comprimento do sufixo, letras maiúsculas e caracteres especiais. Copie cada resultado pela interface.

## Estado dos módulos

| Módulo | Estado | Descrição |
| --- | --- | --- |
| Gerador de assinaturas | ✅ Implementado | Processamento local de imagem, dados profissionais, prévia e download em PNG |
| Gerador de senhas — Padrão | ✅ Implementado | Prefixo, quantidade, comprimento, opções de caracteres e cópia |
| Gerador de senhas — Implantação | ⚠️ Em desenvolvimento | Atualmente reproduz o comportamento do modo Padrão |
| Gerador de senhas — Avançado | 🚧 Planejado | A opção aparece no menu, mas a geração ainda não foi implementada |

> **Nota sobre senhas:** o gerador atual usa `Math.random()`, que não é uma fonte criptograficamente segura. Não use as senhas produzidas para contas ou sistemas que exijam credenciais de alta segurança.

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

No gerador de senhas, o modo **Padrão** permite definir prefixo, quantidade, tamanho do sufixo após `@`, uso de caracteres especiais e letras maiúsculas. As senhas são geradas quando você aciona **Gerar Novas Senhas** e podem ser copiadas individualmente.

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

> Ainda não há suíte de testes automatizados configurada. O projeto não define script de testes.

## Como usar

### Gerar uma assinatura

1. Clique em **Selecionar Imagem da Assinatura** e escolha a foto.
2. Escolha o tipo de profissional e preencha nome e registro.
3. Em **Configurações Avançadas**, ative RQE, especialidade ou frases adicionais, se precisar.
4. Em **Personalização da Imagem**, ajuste escala, espessura, cor e transparência. Use **Restaurar padrão** para voltar às opções iniciais.
5. Confira a **Prévia final** e faça o download do PNG.

### Gerar senhas

1. Selecione **Senha** no menu e mantenha o modo **Padrão**.
2. Ajuste o prefixo, a quantidade, o comprimento do sufixo e as opções de caracteres.
3. Clique em **Gerar Novas Senhas** e use o botão de cópia ao lado do resultado desejado.

💡 **Dica:** fotografe a assinatura em papel branco, com boa luz e sem dobras para obter o melhor resultado.

## Estrutura do projeto

```text
.
├── components/
│   ├── SignatureWorkspace.jsx   # Interface do módulo de assinatura
│   ├── Header.jsx               # Navegação entre módulos
│   ├── PasswordWorkspace.jsx    # Interface do módulo de senhas
│   ├── subcomponents/           # Modos do gerador de senhas
│   └── ui/                      # Componentes reutilizáveis
├── hooks/
│   ├── useSignature.js          # Estado, validação e fluxo de processamento
│   └── usePassword.js           # Configuração e geração de senhas
├── utils/
│   ├── processImage.js          # Algoritmo de segmentação no canvas
│   └── composeSignature.js      # Composição final (texto + assinatura) em 420 × 120 px
├── style/
│   ├── index.css                # Estilos globais e variáveis visuais
│   ├── signature.css            # Estilos da interface de assinatura
│   └── password.css             # Estilos da interface de senhas
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
- Web Crypto API não é usada atualmente pelo gerador de senhas; veja a nota de segurança acima
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
