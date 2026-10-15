# MobilemedTools

Aplicação em desenvolvimento para reunir ferramentas de apoio ao trabalho da equipe Mobilemed. O módulo atual coleta dados profissionais e processa localmente uma imagem de assinatura para exibir uma prévia.

## Estado dos módulos

| Módulo | Estado | O que está disponível |
| --- | --- | --- |
| Dados profissionais | Implementado | Formulário para profissional, registro CRM/CRMV/CRO, formato do registro, RQE, especialidade e frases adicionais. |
| Pré-processamento de imagem | Implementado | A imagem selecionada é processada localmente no navegador. É possível personalizar escala (50% a 200%), espessura, transparência, cor da tinta e suavização; a prévia é reprocessada a cada alteração. |
| Ajustes avançados de segmentação | Em desenvolvimento | Iluminação, limiares e remoção de manchas usam as configurações internas do algoritmo. |
| Montagem e download da assinatura final | Implementado | O preview é recomposto automaticamente em 420 × 120 px com os dados e formatos selecionados; é possível baixar o resultado como PNG. |

O processamento e a composição ocorrem localmente no navegador; a imagem não é enviada nem persistida. A assinatura manuscrita aparece acima dos dados profissionais na imagem final, que sempre tem exatamente 420 × 120 pixels. O tamanho da assinatura se ajusta automaticamente ao espaço restante conforme o texto é incluído; o controle de escala personaliza seu tamanho dentro desse espaço. Quando o texto excede o espaço disponível mesmo no tamanho mínimo, a interface informa que é necessário reduzir as frases.

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
