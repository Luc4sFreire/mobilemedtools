# Mobilemed Tools

Aplicação web de ferramentas internas para preparar assinaturas profissionais, gerar senhas e credenciais, e criar logos. O processamento acontece no navegador.

**Revisão:** 22/10/2026  
**Versão declarada pelo pacote:** Dev 1.1  
**Estado:** em desenvolvimento  
**Base desta revisão:** código-fonte deste repositório e validações locais descritas ao final.

## 1. Estado atual

O projeto é uma aplicação de página única construída com React 19 e Vite 8. No repositório não há API de aplicação, banco de dados, autenticação própria ou serviço de processamento. A interface, os algoritmos e a importação/exportação executam no navegador.

| Módulo | Estado observado | Entradas e resultados |
| --- | --- | --- |
| Gerador de assinatura | Implementado | PNG, JPEG, WebP, GIF, BMP ou AVIF; assinatura PNG composta com dados profissionais |
| Senhas — Padrão | Implementado | De 1 a 50 senhas por lote; apresentação e cópia |
| Senhas — Implantação | Implementado | Associação de e-mail, armazenamento local, atualização/remoção e exportação |
| Senhas — Avançado | Implementado | CSV/XLSX, revisão da coluna de e-mail, geração, classificação, cópia, salvamento seletivo e exportação |
| Gerador de logos | Implementado | Logo tipográfico ou tratamento de imagem; uso individual ou lote de até 50; PNG e ZIP |
| Testes de utilitários | Implementado | 185 testes automatizados passando nesta revisão |
| Testes ponta a ponta no navegador | Não identificados | Os testes não demonstram o fluxo integrado em navegadores reais nem avaliação visual ampla |

## 2. Resumo executivo

O sistema entrega três ferramentas independentes com uma característica comum: os arquivos e dados são transformados localmente. Isso reduz o envio de informações para servidores, mas não transforma a aplicação em um cofre de credenciais. Os modos Implantação e Avançado podem persistir e-mail e senha sem criptografia no localStorage do perfil do navegador; os downloads e a área de transferência também podem conter senhas legíveis.

Os principais pontos positivos são o uso de Web Crypto com rejeição de valores que causariam viés de módulo, limites de entrada explícitos, exportação tabular com proteção contra fórmulas CSV, validação do conteúdo atual da prévia antes do download e testes cobrindo 40 casos de utilitários.

O maior risco operacional é a persistência de credenciais em texto legível no navegador. Os principais riscos técnicos adicionais são o processamento síncrono de imagens na thread principal e a decodificação de imagens de logo antes da redução para 1.000 pixels por lado. A revisão também identificou limites de cobertura: os testes usam mocks e não substituem testes visuais e de integração em navegadores.

## 3. Escopo funcional

### 3.1 Gerador de assinatura

- Aceita PNG, JPEG, WebP, GIF, BMP e AVIF, até 12 MB e 12 megapixels. O algoritmo ainda aplica um teto interno de 36 megapixels para entrada e saída.
- Compõe transparência de origem sobre branco para analisar a imagem e corrigir iluminação.
- Corrige ruído impulsivo, amplia contraste, calcula Otsu e converte o traço em cobertura gradual. Espessura, suavização, cor da tinta e transparência são opções.
- Permite associar tipo profissional (CRM, CRMV ou CRO), nome, registro, RQE, especialidade e até cinco frases adicionais.
- Limites atuais: nome 100 caracteres; registro e RQE 40 cada; especialidade 80; cada frase 120.
- A área lógica da assinatura final é 420 × 120 px; o PNG é renderizado em 1260 × 360 px, com interpolação de alta qualidade.
- GIF animado é tratado como um quadro e exportado como PNG estático. O algoritmo não reconhece caligrafia, não verifica registros profissionais nem garante qualidade para toda imagem de entrada.

### 3.2 Gerador de senhas e credenciais

- Gera de 1 a 50 senhas. O trecho aleatório tem de 4 a 32 caracteres e começa em 8; o prefixo tem até 24 caracteres e vem como Mobile. O separador @ não conta como parte aleatória.
- Sempre exige ao menos uma maiúscula e um número. Minúsculas podem ser desativadas e os especiais disponíveis são !, @, #, $, &.
- O modo Implantação associa senha a e-mail e salva ou atualiza a credencial no armazenamento local. A chave é mobilemedtools.savedUsers.
- O modo Avançado importa somente CSV e XLSX, lê apenas a primeira aba XLSX, aceita até 10 MB e 10.000 linhas de dados, e examina até 100 colunas.
- O modo Avançado detecta cabeçalhos de e-mail ou sugere uma coluna pela frequência de endereços válidos nas primeiras 30 linhas de dados. A coluna pode ser corrigida manualmente.
- Endereços inválidos e todas as ocorrências duplicadas, comparadas sem diferenciar maiúsculas e minúsculas, não recebem senha e ficam fora dos arquivos exportados.
- Saídas de credenciais: XLSX, CSV ou Markdown. A aplicação protege células CSV contra fórmulas, mas esses arquivos ainda contêm credenciais legíveis.

### 3.3 Gerador de logos

- Modo tipográfico: nome completo ou abreviação, até quatro linhas, uma de cinco paletas, fundo comum ou configurado por item.
- Modo de imagem: PNG, JPEG, WebP ou BMP de até 12 MB por arquivo. Remove o fundo conectado à borda, centraliza o conteúdo visível e permite fundo transparente ou preenchido.
- Limite de 50 entradas por lote; PNG individual de 200 × 200 px e download ZIP para lotes.
- A remoção automática depende das cores encontradas junto às bordas e da conectividade. Pode remover parte de um símbolo que toque o fundo ou conservar áreas que não estejam conectadas à borda.

## 4. Arquitetura e fluxo de execução

~~~text
src/main.jsx → src/App.jsx → navegação e seleção de um espaço de trabalho
                                  ├─ components/SignatureWorkspace.jsx
                                  │    └─ src/hooks/useSignature.js
                                  │         ├─ src/utils/processImage.js
                                  │         └─ src/utils/composeSignature.js
                                  ├─ components/PasswordWorkspace.jsx
                                  │    ├─ PasswordDefault.jsx
                                  │    ├─ PasswordImplantacao.jsx
                                  │    └─ PasswordAvancado.jsx
                                  │         ├─ src/hooks/usePassword.js
                                  │         ├─ src/utils/passwordGenerator.js
                                  │         └─ src/utils/credentialFiles.js
                                  └─ components/LogoWorkspace.jsx
                                       └─ src/utils/logoGenerator.js
~~~

| Local | Responsabilidade |
| --- | --- |
| components/ | Telas, componentes visuais e navegação entre ferramentas |
| src/hooks/ | Estado, coordenação de operações, validação e notificações |
| src/utils/ | Processamento de imagens, geração de senha/logo e arquivos de credenciais |
| src/style/ e components/ui/style/ | Estilos globais, de módulo e de componentes |
| tests/ | Testes automatizados com mocks de APIs do navegador |
| docs/ | Documentação técnica, diagnóstico e modelo de changelog |

As imagens da assinatura e os logos são tratados com Canvas/Canvas 2D. A API Web Crypto gera caracteres de senha. A dependência XLSX é importada sob demanda nos fluxos de planilha. O código do produto não envia entradas a um backend.

## 5. Funcionamento técnico e teoria dos algoritmos

### 5.1 Segmentação e tratamento da assinatura

A documentação detalhada, incluindo os critérios numéricos e as limitações de cada etapa, está em [Diagnóstico teórico do algoritmo de imagem](diagnostico-algoritmo-imagem.md). Em síntese:

1. A entrada RGBA é lida do Canvas. Pixels transparentes são compostos sobre branco para que valores RGB ocultos não sejam confundidos com tinta.
2. Uma cópia reduzida da imagem estima o campo de iluminação do papel; esse campo é ampliado e usado para normalizar cada canal de cor.
3. A imagem corrigida é convertida em luminância, com pesos perceptuais para vermelho, verde e azul. Picos impulsivos sem apoio tonal dos oito vizinhos são corrigidos; em uma faixa de densidade de ruído, usa-se uma mediana direcional.
4. Um histograma e uma transformação linear por percentis ampliam o intervalo tonal. Otsu escolhe um corte que maximiza a variância entre as duas classes tonais.
5. Em vez de eliminar tudo por um corte binário, dois limites derivados de Otsu definem tinta opaca, transição e fundo. A curva smootherstep suaviza a transição quando habilitada.
6. Tons de cinza são redimensionados antes da cobertura, e a espessura opcional aplica dilatação ou erosão à cobertura antialiasada.
7. A cobertura torna-se alfa transparente ou é composta sobre branco. A tinta é preta ou recebe a cor média dos pixels de tinta forte.

O método é heurístico: combina estimativa global de fundo, estatística do histograma e regras locais de ruído. Não é OCR nem um classificador treinado; não há promessa de segmentação correta para qualquer caligrafia, papel ou fotografia.

### 5.2 Composição da assinatura

O compositor mede o texto com Canvas, quebra linhas por largura e reserva margens de 10 px na área lógica de 420 × 120 px. Nome tem peso visual maior. Tenta a fonte padrão, reduz a escala tipográfica para 45% quando necessário e informa erro quando o texto ainda excede a área; não corta silenciosamente o conteúdo. Mantém uma área mínima de 18 px de altura para o traço, centraliza a assinatura preservando sua proporção e produz PNG com escala 3×.

A escala da assinatura é limitada a 50%–200% da escala máxima que cabe na área restante. O download só é liberado quando o arquivo processado, as opções e os campos confirmados correspondem à prévia atual. A aplicação invalida operações antigas quando uma nova revisão da fonte/opções começa e revoga as URLs temporárias na desmontagem.

### 5.3 Geração de senhas

O conjunto de caracteres ativo é formado por maiúsculas, números, minúsculas opcionais e especiais opcionais. O algoritmo sorteia primeiro um caractere de cada grupo obrigatório/selecionado e preenche as posições restantes a partir da união dos grupos. Em seguida, embaralha a lista com Fisher–Yates.

Para escolher um índice de tamanho m, Web Crypto fornece um inteiro de 32 bits. O gerador define o maior múltiplo de m abaixo de 2³², rejeita valores fora desse intervalo e só então calcula o resto por m. A rejeição evita que alguns índices apareçam com mais frequência por causa do módulo.

O prefixo é previsível e anexado ao texto antes de @; ele não aumenta a entropia do trecho aleatório. Como há seleção obrigatória de grupos e composição por etapas, não se deve presumir que todas as strings válidas tenham uma distribuição uniforme entre si. Para senhas usadas em ambiente real, prefira um gerenciador/cofre apropriado, políticas operacionais de entrega e um canal seguro; a aplicação não foi projetada para armazenar segredos de produção.

### 5.4 Importação, validação e exportação de credenciais

CSV/XLSX vira uma matriz de linhas e células. A primeira linha com cabeçalho reconhecido dentro das primeiras 20 linhas é usada como cabeçalho; sem cabeçalho identificado, tenta-se detectar uma coluna de e-mail pelas primeiras 30 linhas. A tela permite alterar a coluna sugerida. Uma expressão regular básica faz a validação sintática; não confirma a existência da caixa postal.

Cada endereço válido é normalizado para minúsculas apenas na comparação de duplicatas. Todas as linhas de um endereço repetido são classificadas como duplicadas. Apenas e-mails válidos e únicos recebem senha. XLSX é escrito pela biblioteca XLSX; CSV escapa aspas e acrescenta apóstrofo antes de valores que planilhas poderiam interpretar como fórmula; Markdown escapa pipes e quebras de linha. A proteção de CSV reduz risco de injeção de fórmulas, mas não torna o arquivo confidencial.

### 5.5 Criação de logos

No modo tipográfico, nomes são quebrados por palavras e centralizados em uma tela quadrada. Abreviações usam até quatro iniciais (ou duas letras para um nome de uma palavra). A fonte começa em 17 px e pode descer até 11 px para caber. Os resultados são imagens PNG quadradas de 200 px.

No modo automático, o navegador decodifica a imagem, reduz o lado maior para no máximo 1.000 px, amostra cores opacas distribuídas nas bordas e calcula a distância RGB de cada pixel à cor de borda mais próxima pela norma máxima dos canais. Uma busca em largura de quatro vizinhos parte da borda e percorre regiões com cor semelhante. Distância abaixo da tolerância remove alfa; uma faixa adicional de 24 níveis atenua alfa gradualmente. Se pelo menos três dos oito pontos de amostragem de borda já forem transparentes, a remoção de fundo é ignorada. O conteúdo com alfa acima de 8 é delimitado, ajustado a uma área útil de 168 × 168 px e centralizado.

O ZIP é montado no navegador sem compressão, com CRC-32, cabeçalhos locais, diretório central e nomes numerados. Em lotes grandes, o uso de memória inclui os PNGs de origem e de saída, os arrays temporários e o ZIP final.

## 6. Privacidade e segurança

| Dado | Processamento e retenção observados |
| --- | --- |
| Imagens de assinatura | Em memória e URLs temporárias do navegador; o código não as persiste em storage da aplicação nem as envia a API própria |
| Dados profissionais | Estado da interface e composição local; não são enviados a API própria |
| Senha no modo Padrão | Estado da tela enquanto o componente estiver montado |
| Credenciais nos modos Implantação/Avançado | E-mail e senha gravados em texto legível no localStorage, chave mobilemedtools.savedUsers |
| Arquivos e área de transferência | XLSX/CSV/Markdown e texto copiado podem conter segredos legíveis; permanecem sob controle do navegador e do destinatário |

**Risco prioritário:** localStorage não criptografa credenciais e está acessível a scripts executados na mesma origem e a quem tiver acesso ao perfil local. A proteção contra fechamento acidental ou acesso casual não substitui controle de acesso, criptografia de servidor, armazenamento de segredos ou gestão de ciclo de vida. Não use esta persistência como cofre de credenciais de produção.

Próximos passos de segurança: retirar senhas persistentes do armazenamento local ou substituir por integração de backend com autenticação e autorização; definir política de retenção e remoção; evitar exportação em massa sem necessidade; rever fluxo e permissões de acesso; testar mensagens de falha de persistência e recuperação do navegador.

## 7. Diagnóstico do sistema

### Pontos fortes observados

- Operações de imagem e planilha são feitas localmente; o módulo de planilhas é carregado apenas quando necessário.
- Entradas têm limites de bytes, pixels, linhas e itens em lote.
- A seleção aleatória segura usa Web Crypto e rejeição para evitar viés de módulo.
- O download da assinatura depende de prévia atualizada; o código libera URLs temporárias.
- O importador classifica duplicatas em todas as ocorrências e o exportador CSV protege células iniciadas com caracteres de fórmula.
- A suíte cobre os algoritmos e casos de erro dos principais utilitários.

### Achados e prioridade

| Prioridade | Achado | Consequência e recomendação |
| --- | --- | --- |
| Alta | Credenciais são persistidas sem criptografia no localStorage | Evitar dados reais sensíveis; substituir o armazenamento por solução apropriada com controle de acesso e retenção |
| Média | Processamento da assinatura percorre arrays de pixels de forma síncrona na thread principal | Imagens grandes podem congelar a interface; considerar Web Worker/OffscreenCanvas ou progresso/cancelamento |
| Média | Logos são decodificados antes da redução do lado para 1.000 px e o limite de entrada é por bytes | Imagens muito comprimidas com dimensões extremas podem consumir memória na decodificação; validar dimensões cedo e limitar pixels/dimensões |
| Média | Os testes de utilitários usam mocks de Canvas, DOM e Web Crypto | Acrescentar testes de integração e E2E em navegador, incluindo acessibilidade e amostras visuais |
| Baixa | O campo version do pacote é Dev 1.1, fora do formato SemVer | Padronizar versionamento antes de publicar releases ou depender de automação que valide versão |
| Baixa | A remoção de fundo de logo depende da conectividade e de amostras de borda | Manter controle de tolerância e validar imagens com objeto encostado na borda, fundos graduais e regiões isoladas |

O diagnóstico é baseado na implementação e nos testes desta cópia do repositório. Ele não certifica implantação, configuração de hospedagem, dados reais de produção nem desempenho em todos os dispositivos.

## 8. Execução e validação

Requisitos documentados: Node.js 20.19+ ou 22.12+ e npm.

~~~text
npm install
npm run dev
npm run lint
npm test
npm run build
~~~

Validação realizada em 22/10/2026:

- Build de produção: aprovado; Vite transformou 45 módulos. O bundle XLSX separado tem aproximadamente 492 kB antes de gzip e 160 kB gzip.
- ESLint: aprovado sem erros.
- Testes automatizados: 185 passaram, 0 falharam.
- Auditoria offline de dependências: 0 vulnerabilidades encontradas nos metadados disponíveis localmente. Isso não verifica dados novos do registro de pacotes.
- A validação não inclui teste E2E em navegador nem comparação visual em um conjunto amplo de assinaturas e logos.

## 9. Manutenção e histórico

Registre cada mudança relevante em [CHANGELOG.md](../CHANGELOG.md), seguindo o [Modelo de changelog](modelo-changelog.md). Atualize limites, formatos e esta documentação junto com o comportamento do código. Para alterações em segurança, persistência, formatos de importação ou algoritmo de imagem, inclua testes de regressão e registre as limitações e a validação aplicada.

## 10. Referências no repositório

- [README](../README.md) — apresentação, instalação, funcionalidades e uso.
- [Diagnóstico teórico do algoritmo de imagem](diagnostico-algoritmo-imagem.md) — etapas, fundamentos, equações e limitações.
- [Modelo de changelog](modelo-changelog.md) — estrutura para releases e versões em desenvolvimento.
- [Changelog](../CHANGELOG.md) — registro das alterações conhecidas do projeto.
