# Changelog

Este arquivo registra alterações relevantes para quem usa ou mantém o MobilemedTools. O guia para novas entradas está em [docs/modelo-changelog.md](docs/modelo-changelog.md).

## Não lançado

**Status:** em desenvolvimento
**Compatibilidade:** aplicação web executada no navegador; não há serviço ou API de aplicação no repositório.
**Resumo:** consolidação dos geradores de assinatura e senhas, incluindo importação em lote, detecção de e-mails duplicados e exportação de credenciais.

### Adicionado

- Modo Padrão do gerador de senhas, com geração em lote, comprimento aleatório configurável, prefixo opcional e seleção de grupos de caracteres.
- Modo Implantação, com associação de senha a e-mail, lista de usuários salvos e cópia/exportação de credenciais e mensagens.
- Modo Avançado, com importação de CSV/XLSX, detecção de e-mails duplicados e inválidos, cópia, gravação seletiva na lista local, além de exportação XLSX/CSV/MD.
- Fluxo comum de geração de senhas com Web Crypto para os três modos.
- SheetJS 0.20.3 distribuído pelo endereço oficial do projeto e carregado sob demanda para arquivos de planilha.
- Geração com Web Crypto, descarte de valores que causariam viés de módulo e embaralhamento Fisher–Yates.
- Identidade visual Mobilemed no cabeçalho, navegação entre ferramentas e leiaute adaptável para telas menores.
- Processamento local da assinatura com prévia de 420 × 120 pixels e PNG final em resolução 3× (1260 × 360 pixels), com composição dos dados profissionais.

### Alterado

- O modo Implantação grava alterações no armazenamento local de forma síncrona e só confirma a ação na interface quando a persistência termina. Falhas de armazenamento são reportadas.
- Senhas agora usam uma parte aleatória de 4 a 32 caracteres, iniciada em 8, e o prefixo `mobile` por padrão. Maiúsculas e números são obrigatórios; minúsculas e caracteres especiais são opcionais.
- A seleção de assinatura está limitada a PNG, JPEG, WebP, GIF, BMP e AVIF, com no máximo 12 MB e 12 megapixels. GIFs são exportados como imagem estática.
- Campos profissionais têm limites de comprimento, e o módulo permite até cinco frases adicionais de até 120 caracteres.
- A prévia é recomposta quando imagem, opções ou dados profissionais mudam; o download só fica disponível quando representa o estado atual.
- A interface recebeu cabeçalho, navegação, formulários e estilos responsivos alinhados à identidade visual do produto.
- A prévia mantém o layout visual de 420 × 120 pixels, enquanto o PNG baixado é rasterizado em 3× (1260 × 360 pixels) com interpolação de alta qualidade.

### Corrigido

- O fundo da assinatura agora é removido com cobertura gradual, preservando traços claros e desconectados que a máscara binária descartava.
- A histerese, o fechamento morfológico, a remoção de componentes por área e o filtro de mediana foram retirados do fluxo padrão; a espessura só é alterada quando solicitada.
- Picos impulsivos isolados continuam sendo corrigidos antes do cálculo de Otsu, e pixels transparentes são compostos sobre branco durante a análise.
- A criação das bordas usa a curva smootherstep quintica para reduzir opacidade residual muito fraca sem alterar a máscara de tinta forte da amostra.
- Picos isolados agora são corrigidos mesmo abaixo da antiga densidade mínima de 0,5%; ruído impulsivo de densidade moderada ativa uma mediana direcional, orientada pela continuidade local do traço.
- O controle de espessura agora aceita incrementos de 0,1 e exibe o valor em pixels com uma casa decimal.
- Dilatação e erosão agora operam sobre a cobertura antialiasada, preservando os níveis de opacidade das bordas em vez de binarizar o traço.
- Valores fracionários de espessura interpolam entre passos morfológicos inteiros; a suavização duplicada foi removida desse ajuste para que incrementos pequenos continuem visíveis.
- Dimensões, margens, percentis e limiares do processador receberam padrões e limites explícitos.
- E-mails salvos são comparados sem diferenciar maiúsculas de minúsculas; alterações só aparecem como concluídas quando foram gravadas.

### Segurança e privacidade

- O processamento de imagens e a geração de senhas acontecem no navegador.
- O modo Implantação mantém e-mail e senha em texto legível no localStorage, sob mobilemedtools.savedUsers. Os arquivos exportados também contêm texto legível; esse fluxo não deve ser usado como cofre de credenciais.
- O modo Avançado mantém arquivos e credenciais em memória enquanto a tela está montada. “Salvar usuário” persiste a credencial no mesmo localStorage; arquivos baixados e conteúdo copiado ficam sob o controle de quem os receber.
- Imagens e dados profissionais da assinatura não são persistidos pelo código da aplicação. Senhas geradas no modo Padrão permanecem no estado da tela enquanto o módulo está montado.

### Acessibilidade e experiência de uso

- A navegação identifica seus grupos e expõe o estado selecionado. Campos de texto de assinatura exibem limites e erros do processamento.
- Os switches de caracteres usam seus rótulos como nomes acessíveis, e o hook de notificações foi separado do componente provedor para manter o lint compatível com Fast Refresh.

### Limitações conhecidas

- A importação avançada processa apenas a primeira aba, com limite de 10 MB e 10.000 linhas; todas as ocorrências de e-mail duplicado e os e-mails inválidos não recebem senha e não entram nos downloads.
- O processamento de imagem roda sincronamente na thread principal.
- O package.json não configura script ou runner de testes; o arquivo local tests/processImage.test.js tem uma variável não utilizada apontada pelo lint.
- O identificador de versão nos arquivos do pacote usa Dev 1.1 / DEV 1.1 e não segue SemVer.
- Os resultados quantitativos de ruído são de um ensaio local específico e não garantem o resultado para outras assinaturas.

### Validação

- [ ] npm run lint — sinaliza `no-unused-vars` em tests/processImage.test.js; o lint direcionado dos arquivos da funcionalidade passou.
- [x] Vite build — concluído sem erros em 21/10/2026 (41 módulos transformados; leitura/exportação XLSX em chunk sob demanda).
- [x] git diff --check — concluído sem erros em 21/10/2026.
- [x] npm audit — 0 vulnerabilidades após atualização compatível das dependências.
- [ ] Testes automatizados — não configurados.

### Referências

- [Documentação principal organizada conforme o modelo do Notion](docs/documentacao-principal.md)
- [Diagnóstico detalhado do algoritmo de imagem](docs/diagnostico-algoritmo-imagem.md)
- [Modelo para futuras entradas](docs/modelo-changelog.md)
