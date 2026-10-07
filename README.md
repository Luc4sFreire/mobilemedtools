# MobilemedTools

Aplicação em desenvolvimento para reunir ferramentas de apoio ao trabalho da equipe Mobilemed. A interface atual oferece o formulário básico de preparação de dados de assinatura profissional.

## Estado dos módulos

| Módulo | Estado | O que está disponível |
| --- | --- | --- |
| Assinatura | Em desenvolvimento | Seleção e prévia local de uma imagem, dados do profissional, registro CRM/CRMV/CRO, formatos de registro, RQE, especialidade e frases adicionais. |
| API Python | Não implementada | A rota `POST /api/image` responde HTTP 501. |
| Geração, processamento e download de imagem | Não implementados | O formulário ainda não gera ou transforma um arquivo final de assinatura. |

A seleção da imagem é feita localmente no navegador. Não há processamento ou persistência de imagem nesta versão.

## Estrutura

```text
backend/
  main.py                    # Endpoint Flask provisório
  requirements.txt           # Dependências Python da API
components/
  SignatureWorkspace.jsx     # Interface do módulo de assinatura
hooks/
  useSignature.js            # Estado e interações do formulário
style/
  index.css                  # Estilos globais e variáveis visuais
  signature.css              # Estilos da interface de assinatura
utils/
  api.js                     # Cliente HTTP para a futura API de imagem
src/
  App.jsx                    # Composição da aplicação React
  main.jsx                   # Ponto de entrada
vite.config.js               # Servidor de desenvolvimento e proxy /api
```

## Requisitos

- Node.js e npm
- Python e pip, somente para executar a API provisória

## Executar a interface

Na raiz do projeto:

```powershell
npm install
npm run dev
```

O Vite inicia a interface em `http://localhost:3000`.

## Executar a API provisória

Em outro terminal:

```powershell
python -m pip install -r backend/requirements.txt
python backend/main.py
```

A API fica disponível em `http://127.0.0.1:5000`. A rota `POST /api/image` responde HTTP 501 enquanto o processamento não for implementado. O cliente em `utils/api.js` existe para a integração futura e não é usado pelo formulário atual.

## Verificações

```powershell
npm run lint
npm run build
```

Não há suíte de testes automatizados configurada no momento.

## Versão - 0.1
