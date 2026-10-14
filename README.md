# MobilemedTools

Aplicação em desenvolvimento para reunir ferramentas de apoio ao trabalho da equipe Mobilemed. O módulo atual coleta dados profissionais e processa localmente uma imagem de assinatura para exibir uma prévia.

## Estado dos módulos

| Módulo | Estado | O que está disponível |
| --- | --- | --- |
| Dados profissionais | Em desenvolvimento | Formulário para profissional, registro CRM/CRMV/CRO, formato do registro, RQE, especialidade e frases adicionais. |
| Pré-processamento de imagem | Parcialmente implementado | A imagem selecionada é processada no navegador para gerar uma prévia PNG. O algoritmo ajusta iluminação e contraste, segmenta a tinta, remove pequenas manchas e suaviza as bordas. |
| Filtros escolhidos pelo usuário | Em desenvolvimento | A seleção dos filtros é mantida no hook, mas ainda não altera o processamento da imagem. |
| Montagem e download da assinatura final | Não implementados | Os dados profissionais ainda não são compostos sobre a imagem e não há opção para baixar uma assinatura final. |

O processamento ocorre localmente no navegador; a imagem não é enviada nem persistida. A prévia mostra o PNG processado, mas o algoritmo ainda usa as próprias configurações internas e não aplica as opções de filtro do formulário.

## Estrutura

```text
components/
  SignatureWorkspace.jsx     # Interface do módulo de assinatura
hooks/
  useSignature.js            # Estado, validação e fluxo de processamento do formulário
utils/
  processImage.js            # Algoritmo de pré-processamento no canvas
style/
  index.css                  # Estilos globais e variáveis visuais
  signature.css              # Estilos da interface de assinatura
src/
  App.jsx                    # Composição da aplicação React
  main.jsx                   # Ponto de entrada
vite.config.js               # Servidor de desenvolvimento
```

## Requisitos

- Node.js e npm

## Executar a interface

Na raiz do projeto:

```powershell
npm install
npm run dev
```

O Vite inicia a interface em `http://localhost:3000`.

## Verificações

```powershell
npm run lint
npm run build
```

Não há suíte de testes automatizados configurada no momento.

## Versão do pacote

A versão definida em `package.json` é `0.3.0`.
