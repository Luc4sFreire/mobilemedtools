# Changelog

## 1.1.0

### Adicionado

- Módulo de geração de senhas com prefixo, quantidade, comprimento e opções de caracteres.
- Navegação entre os módulos de assinatura e senhas.

### Alterado

- Documentação atualizada para descrever os módulos disponíveis e o estado das funcionalidades em desenvolvimento.
- A seleção de imagem agora executa o pré-processamento no navegador e apresenta o resultado como prévia PNG.
- A prévia final é recomposta automaticamente com os dados profissionais, RQE, especialidade e frases extras selecionados.
- A assinatura composta pode ser baixada em PNG; o processamento e a composição acontecem localmente no navegador.
- Foram adicionados controles de espessura, transparência, cor da tinta e suavização, com atualização automática da prévia e do PNG final.
- A imagem final passou a ter dimensões fixas de 420 × 120 pixels, ajustando o conteúdo completo sem recortes.
- O ajuste de tamanho foi substituído por um slider de escala de 50% a 200%; a assinatura reduz ou amplia proporcionalmente para acompanhar o espaço restante quando o texto muda.
- Os ajustes avançados de segmentação continuam usando as configurações internas do algoritmo.
