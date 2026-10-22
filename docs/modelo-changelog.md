# Modelo de changelog

Use este formato para cada release e para alterações ainda não publicadas. Registre mudanças relevantes para usuários e mantenedores, com linguagem observável: o que mudou, quem é afetado, qual ação é necessária e como foi validado.

## Princípios

- Mantenha o bloco **Não lançado** para mudanças que ainda estão em desenvolvimento.
- Ao publicar, mova as entradas para uma versão e data; não apague o histórico anterior.
- Use categorias consistentes: **Adicionado**, **Alterado**, **Corrigido**, **Segurança e privacidade**, **Desempenho**, **Acessibilidade**, **Removido/depreciado** e **Limitações conhecidas**. Omita categorias sem mudança.
- Uma entrada descreve um resultado concreto para usuário ou mantenedor; detalhes internos podem apontar para issue, PR ou commit.
- Declare compatibilidade, alteração de formato, migração necessária, retenção de dados e risco operacional quando aplicável.
- Não registre como concluída uma validação que não foi executada. Distingua falha de teste, indisponibilidade de serviço e resultado não verificado.
- Não inclua senhas, e-mails reais, dados de pacientes ou outros segredos em exemplos.

## Modelo reutilizável

Copie o bloco abaixo e preencha os campos relevantes:

~~~markdown
## Não lançado

**Status:** em desenvolvimento | pronto para revisão | bloqueado
**Compatibilidade:** navegadores, formatos de entrada/saída, APIs e dados afetados
**Resumo:** uma ou duas frases descrevendo o efeito visível da mudança
**Risco:** baixo | médio | alto — explicar quando houver risco ou migração
**Ação necessária:** nenhuma | passo que mantenedores ou usuários precisam executar

### Adicionado

- [Capacidade] O usuário agora pode [resultado], dentro de [limite/condição].

### Alterado

- [Comportamento] [Comportamento anterior] passou a [novo comportamento]; impacto: [efeito].

### Corrigido

- [Problema] Corrige [sintoma observável] quando [condição].

### Segurança e privacidade

- [Dados/ameaça] [Dado tratado], [local de processamento/armazenamento] e [controle/limitação].

### Desempenho

- [Operação/entrada] [mudança de tempo, memória ou responsividade], observada em [ambiente].

### Acessibilidade

- [Fluxo/componente] [teclado, nome acessível, foco, contraste ou mensagem de estado].

### Removido ou depreciado

- [Recurso/API/formato] [o que deixa de funcionar] e [substituto/prazo].

### Migração e compatibilidade

- **Dados:** [migração ou nenhuma]
- **Arquivos:** [formatos/compatibilidade]
- **Configuração:** [variáveis e valores]
- **Quebra de compatibilidade:** [não/sim; detalhe]
- **Procedimento de retorno:** [passos]

### Limitações conhecidas

- [Limitação reproduzível, condição e impacto; apontar alternativa se houver.]

### Validação

- [ ] npm run lint — [resultado, data e ambiente]
- [ ] npm test — [resultado, quantidade, data e ambiente]
- [ ] npm run build — [resultado, data e observações]
- [ ] npm audit — [resultado, origem/atualidade dos dados]
- [ ] Revisão manual ou navegador — [fluxos, navegador/dispositivo e evidência]
- [ ] Changelog, README e documentação sincronizados

### Referências

- Issue/PR/commit: [identificador ou link]
- Documentação: [página ou arquivo]
- Responsável pela revisão: [nome/equipe, quando necessário]
~~~

## Exemplo de uma release publicada

~~~markdown
## [1.2.0] — 2026-11-15

**Status:** publicada
**Compatibilidade:** aplicação web; preserva os formatos de credencial anteriores
**Resumo:** reduz o tempo de processamento de assinaturas grandes e mantém os controles atuais.
**Risco:** médio — validado em navegadores de desktop; o desempenho móvel ainda deve ser observado.
**Ação necessária:** nenhuma para uso; atualizar a aplicação para habilitar a melhoria.

### Adicionado

- Processamento cancelável de imagens grandes; a tela informa quando o trabalho termina.

### Corrigido

- A seleção de um novo arquivo deixa de exibir resultado referente à assinatura anterior.

### Segurança e privacidade

- O processamento continua local. Credenciais previamente salvas no perfil permanecem até remoção manual.

### Validação

- [x] npm run lint — aprovado em 2026-11-15.
- [x] npm test — 43 testes aprovados em 2026-11-15.
- [x] npm run build — aprovado em 2026-11-15.
- [ ] Revisão em navegador móvel — pendente.

### Referências

- Issue/PR/commit: substituir pelo link real
~~~

## Checklist de publicação

1. Confirmar escopo, usuário afetado, impacto de compatibilidade e alteração de dados.
2. Executar as verificações aplicáveis e registrar evidências reproduzíveis.
3. Revisar privacidade, segurança, acessibilidade, formatos de arquivo e mensagens de erro.
4. Sincronizar esta entrada com README e documentação técnica.
5. Publicar a versão e mover o bloco de **Não lançado** para o cabeçalho da release.
6. Confirmar que os passos de implantação e retorno são conhecidos antes de uma mudança de alto risco.
