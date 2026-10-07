# MobilemedTools

Aplicação em desenvolvimento para reunir ferramentas de apoio ao trabalho da equipe Mobilemed. A interface atual oferece o formulário básico de preparação de dados de assinatura profissional.

## Estado dos módulos

| Módulo | Estado | O que está disponível |
| --- | --- | --- |
| Assinatura | Em desenvolvimento | Seleção e prévia local de uma imagem, dados do profissional, registro CRM/CRMV/CRO, formatos de registro, RQE, especialidade e frases adicionais. |
| Geração, processamento e download de imagem | Não implementados | O formulário ainda não gera ou transforma um arquivo final de assinatura. |

A seleção da imagem é feita localmente no navegador. Não há processamento ou persistência de imagem nesta versão.

## Estrutura

```text
components/
  SignatureWorkspace.jsx     # Interface do módulo de assinatura
hooks/
  useSignature.js            # Estado e interações do formulário
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

## Versão - 0.1
