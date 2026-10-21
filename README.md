<div align="center">

# 🩺 MobilemedTools

**Ferramentas de apoio à equipe Mobilemed, executadas no navegador.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![Licença](https://img.shields.io/github/license/Luc4sFreire/mobilemedtools)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)

</div>

## Sobre

O MobilemedTools é uma aplicação web em desenvolvimento. O estado atual contém um gerador de imagem de assinatura profissional e um gerador de senhas com fluxos Padrão, Implantação e Avançado.

A aplicação é uma SPA React/Vite. O processamento de imagens e a geração de senhas ocorrem no navegador; o código atual não faz chamadas a uma API de aplicação. No modo Implantação, os usuários salvos ficam no armazenamento local do navegador, conforme a nota de privacidade abaixo.

## Funcionalidades

### Gerador de assinatura

- Recebe imagens PNG, JPEG, WebP, GIF, BMP ou AVIF com limite de 12 MB e 12 megapixels. Um GIF animado é processado como imagem estática; o PNG de saída não preserva animação.
- Corrige variações de iluminação, realça o contraste e segmenta os traços manuscritos.
- Permite ajustar escala, espessura, cor da tinta, suavização e transparência.
- Compõe os dados de médico (CRM), veterinário (CRMV) ou dentista (CRO) com nome, registro, RQE, especialidade e até cinco frases adicionais.
- Exibe a prévia em 420 × 120 px e gera o PNG final em 1260 × 360 px (resolução 3×). O download é liberado quando a prévia corresponde às opções e aos dados atuais.

### Gerador de senhas

- Gera de 1 a 50 senhas por vez. A parte aleatória inicia com 8 caracteres e pode ter de 4 a 32; o prefixo `mobile` vem preenchido por padrão e não entra nessa contagem.
- Garante ao menos uma letra maiúscula e um número; minúsculas podem ser desativadas e caracteres especiais podem ser ativados.
- Usa a API Web Crypto do navegador para sortear os caracteres e embaralhá-los.
- O modo Padrão mostra e permite copiar as senhas geradas.
- O modo Implantação associa e-mails às senhas, salva usuários localmente, permite excluir registros e copiar/exportar listas de credenciais ou mensagens.
- O modo Avançado importa a primeira aba de arquivos CSV ou XLSX (até 10 MB e 10.000 linhas), identifica ou permite selecionar a coluna de e-mail, gera senhas para endereços válidos e únicos e sinaliza todas as ocorrências duplicadas sem diferenciar maiúsculas de minúsculas.
- No modo Avançado, cada senha pode ser copiada ou salva na lista local de usuários; a lista válida pode ser copiada em lote ou baixada como XLSX, CSV ou Markdown. E-mails duplicados e inválidos são excluídos dos downloads.

## Privacidade e armazenamento

- As imagens e os dados profissionais da assinatura são usados em memória no navegador. O código da aplicação não os envia a um servidor nem grava esses dados em armazenamento persistente.
- Senhas geradas no modo Padrão permanecem no estado da tela enquanto a ferramenta está montada.
- O modo Implantação grava e-mail e senha em texto legível no localStorage do navegador, sob a chave mobilemedtools.savedUsers. Esses dados permanecem no perfil local até serem removidos e não são criptografados. O acesso ao perfil do navegador ou a um script executado na mesma origem pode expô-los.
- No modo Avançado, os dados importados e as senhas permanecem em memória enquanto a tela está montada. Ao escolher “Salvar usuário”, e-mail e senha passam ao mesmo localStorage em texto legível usado pelo modo Implantação. Os arquivos exportados contêm credenciais em texto legível; copiar credenciais envia o conteúdo à área de transferência do dispositivo.

Use o armazenamento de credenciais somente em um ambiente apropriado para esses dados. A documentação completa descreve limitações e recomendações de evolução.

## Estado dos módulos

| Módulo ou recurso | Estado | Observação |
| --- | --- | --- |
| Gerador de assinatura | Implementado | Pré-processamento, formulário, prévia e PNG final |
| Senhas — modo Padrão | Implementado | Geração e cópia de senhas |
| Senhas — modo Implantação | Implementado | Associação a e-mail, persistência local, exclusão e exportação |
| Senhas — modo Avançado | Implementado | Importação CSV/XLSX, validação e duplicatas de e-mail, cópia, gravação local seletiva e exportação XLSX/CSV/MD |
| Criação de logos | Não presente no código atual | Existia como ideia na documentação do Notion |
| Testes automatizados | Configurados | Mais de 200 cenários para senhas, credenciais e imagens (`npm test`) |

## Primeiros passos

### Requisitos

- Node.js 20.19+ ou 22.12+ (requisito do Vite instalado no projeto)
- npm

### Instalação e execução

    git clone https://github.com/Luc4sFreire/mobilemedtools.git
    cd mobilemedtools
    npm install
    npm run dev

O Vite inicia em http://localhost:3000.

### Scripts

| Comando | Descrição |
| --- | --- |
| npm run dev | Inicia o servidor Vite para desenvolvimento |
| npm run build | Gera os arquivos de produção em dist/ |
| npm run preview | Serve localmente o build de produção |
| npm run lint | Executa o ESLint |
| npm test | Executa os testes automatizados com o runner nativo do Node.js |

Os cenários e suas explicações estão em [docs/cenarios-testes.md](docs/cenarios-testes.md).

## Como usar

### Assinatura

1. Selecione uma imagem válida.
2. Escolha a categoria profissional e informe nome e registro.
3. Ative e preencha RQE, especialidade ou frases adicionais conforme necessário.
4. Ajuste os controles da imagem e confira a prévia.
5. Baixe o PNG quando o processamento e a composição terminarem.

Uma foto bem iluminada, em papel claro e sem sombras fortes tende a facilitar a segmentação. O algoritmo não reconhece escrita nem valida registros profissionais.

### Senhas

1. Abra Senha no menu.
2. Escolha Padrão, Implantação ou Avançado.
3. Ajuste tamanho, quantidade, prefixo e grupos de caracteres.
4. Gere as senhas. No modo Implantação, informe um e-mail para associar e salvar cada usuário. No modo Avançado, envie um CSV ou XLSX com os e-mails e revise a coluna identificada antes de exportar.

O prefixo é fixo e previsível; ele não faz parte dos caracteres aleatórios e reduz a imprevisibilidade total da senha. A opção de exportação de credenciais deve ser tratada com o mesmo cuidado que qualquer arquivo contendo senhas.

## Funcionamento do algoritmo de imagem

O fluxo em alto nível é:

    Imagem RGBA
      → composição de transparência sobre branco
      → estimativa e correção de iluminação
      → tons de cinza e supressão de pontos isolados
      → contraste por percentis e limiar de Otsu
      → cobertura de opacidade gradual para preservar traços claros
      → redimensionamento de alta qualidade e espessura opcional
      → suavização, cor e remoção do fundo
      → assinatura PNG
      → composição lógica de 420 × 120 px renderizada como PNG de 1260 × 360 px

A documentação principal contém a explicação teórica e o fluxo detalhado, preparada para substituir o conteúdo da página principal do Notion. O diagnóstico específico do processador, incluindo as medições registradas, está em docs/diagnostico-algoritmo-imagem.md.

## Arquitetura

    .
    ├── components/
    │   ├── SignatureWorkspace.jsx
    │   ├── PasswordWorkspace.jsx
    │   ├── subcomponents/
    │   │   ├── PasswordDefault.jsx
    │   │   ├── PasswordImplantacao.jsx
    │   │   └── PasswordAvancado.jsx
    │   └── ui/
    ├── hooks/
    │   ├── useSignature.js
    │   └── usePassword.js
    ├── utils/
    │   ├── credentialFiles.js
    │   ├── passwordGenerator.js
    │   ├── processImage.js
    │   └── composeSignature.js
    ├── src/
    │   ├── App.jsx
    │   └── main.jsx
    ├── docs/
    │   ├── documentacao-principal.md
    │   ├── diagnostico-algoritmo-imagem.md
    │   └── modelo-changelog.md
    ├── CHANGELOG.md
    └── README.md

- components contém as telas e componentes reutilizáveis.
- hooks concentra estado, validação e regras de interface.
- utils contém o gerador comum de senhas, os fluxos de leitura/exportação de credenciais, o processador de imagem e o compositor do PNG.
- src monta a aplicação e alterna entre os módulos.

## Tecnologias

- React 19 e React DOM
- Vite 8
- SheetJS XLSX 0.20.3 para leitura e exportação de planilhas (carregado sob demanda)
- JavaScript ES Modules e Canvas API
- Web Crypto API para sorteio de senhas
- ESLint com plugins para React Hooks e React Refresh
- Destino de hospedagem citado no projeto: Vercel

## Documentação e changelog

- [Documentação principal proposta para o Notion](docs/documentacao-principal.md)
- [Diagnóstico detalhado do algoritmo de imagem](docs/diagnostico-algoritmo-imagem.md)
- [Modelo reutilizável de changelog](docs/modelo-changelog.md)
- [Changelog do projeto](CHANGELOG.md)

A página do Notion não foi alterada. O primeiro arquivo é uma proposta em Markdown pronta para revisão e cópia.

## Contribuindo

Sugestões e correções são bem-vindas. Abra uma issue ou envie um pull request:

1. Faça um fork do projeto.
2. Crie uma branch, por exemplo feature/minha-feature.
3. Faça o commit da alteração.
4. Envie a branch e abra um Pull Request.
5. Antes de enviar, execute npm run lint e npm run build.

## Licença

Distribuído sob a licença MIT. Consulte LICENSE.

---

Feito por [Pedro Freire](https://github.com/Luc4sFreire)
