# Diagnóstico técnico — algoritmo de assinatura

**Revisão:** 22/10/2026  
**Implementação examinada:** src/utils/processImage.js, src/utils/composeSignature.js e src/hooks/useSignature.js  
**Objetivo:** explicar o comportamento implementado e os compromissos do algoritmo; não é uma promessa de resultado para qualquer imagem.

## 1. Visão geral

O sistema transforma uma imagem de assinatura em pixels RGBA, estima e corrige o fundo, identifica tons de tinta, constrói uma máscara de opacidade graduada, aplica os ajustes solicitados e compõe a saída em uma tela fixa.

~~~text
Arquivo → validação e decodificação
       → composição da transparência sobre branco
       → estimativa do campo de iluminação
       → normalização por canal → luminância
       → correção de picos de ruído
       → expansão do contraste por percentis
       → limiar global de Otsu
       → cobertura de tinta contínua + suavização
       → redimensionamento e espessura opcional
       → alfa transparente ou composição sobre branco
       → PNG processado
       → layout de assinatura e texto → PNG final 3×
~~~

## 2. Entrada e limites

O formulário aceita PNG, JPEG, WebP, GIF, BMP e AVIF. O arquivo deve ter até 12 MB e a imagem decodificada até 12.000.000 pixels. O processador também limita entrada e saída a 36.000.000 pixels para restringir buffers. A interface normalmente mantém as dimensões originais durante o tratamento.

O conteúdo é lido pelo Canvas 2D com a opção willReadFrequently. Erros de decodificação, contexto ou tamanho são devolvidos ao hook e apresentados na interface. O algoritmo altera o próprio canvas recebido, incluindo suas dimensões finais.

## 3. Transparência de origem

Um pixel com cor C e opacidade alfa é composto sobre papel branco antes da análise:

~~~text
C_analisado = alfa × C + (1 − alfa) × 255
~~~

Isso impede que valores RGB ocultos em pixels transparentes (por exemplo, preto com alfa zero) sejam confundidos com tinta. A versão opaca também alimenta a estimativa do fundo. A opção de fundo transparente afeta a saída, não a análise da fonte.

## 4. Estimativa e compensação da iluminação

O algoritmo reduz a fonte progressivamente até uma imagem de referência com largura de 32 px por padrão, preservando a proporção; amplia essa referência com suavização de alta qualidade. A imagem reduzida aproxima as variações de iluminação em escala ampla, em vez de acompanhar cada detalhe fino do traço.

Para cada pixel e canal, calcula uma proporção em relação ao fundo estimado:

~~~text
canal_corrigido = canal_da_fonte × 255 / max(canal_estimado_do_fundo, 1)
~~~

O resultado é convertido em luminância com os pesos 0,299 para vermelho, 0,587 para verde e 0,114 para azul. A representação final é limitada ao intervalo de byte. A correção tenta tornar o papel mais uniforme, mas não distingue semanticamente papel, tinta e sombras; uma estimativa contaminada por uma área escura extensa pode alterar o contraste final.

## 5. Supressão de ruído impulsivo

No interior da imagem, cada pixel é comparado com os oito vizinhos imediatos. Ele é candidato a pico se nenhum vizinho estiver a até 90 níveis de cinza e se a diferença entre o centro e a média dos vizinhos for de pelo menos 120. Os candidatos são identificados a partir de uma cópia estável, e pixels da borda do quadro não são avaliados por essa regra.

Picos isolados são substituídos pela média dos oito vizinhos. Essa correção acontece mesmo quando a densidade total de picos é pequena. Quando os candidatos ocupam entre 1% e 2,5% de todos os pixels, o algoritmo primeiro aplica uma mediana direcional:

1. Compara pares de vizinhos opostos nas quatro direções (horizontal, vertical e duas diagonais).
2. Escolhe o par com menor diferença tonal, uma aproximação da direção local do traço.
3. Calcula a mediana entre o par e o centro.
4. Substitui o centro se a diferença da mediana for de pelo menos 80 níveis.
5. Repete a busca de picos isolados uma vez, sem reativar o filtro direcional.

A hipótese é que um traço contínuo recebe suporte tonal local, enquanto um ponto impulsivo muito distinto não recebe. Ruído denso fora da faixa de 1%–2,5% não recebe a mediana direcional; continua sujeito apenas à correção de picos isolados.

## 6. Contraste e limiar de Otsu

O histograma de 256 níveis fornece, por padrão, percentis inferior 0,5% e superior 99,5%. Uma tabela de consulta expande esse intervalo para 0–255, saturando valores externos. Se os percentis resultarem no mesmo nível, a conversão evita divisão por zero.

Otsu examina os cortes possíveis do histograma e seleciona o que maximiza a variância ponderada entre duas classes:

~~~text
variância_entre = peso_fundo × peso_tinta × (média_fundo − média_tinta)²
~~~

Essa estimativa é global para a imagem. A implementação não usa limiar adaptativo por blocos e não exige que um pixel claro esteja conectado a um pixel escuro.

## 7. Da tonalidade à cobertura da tinta

O corte gera dois limites, ajustáveis pelo processador e usados por padrão:

- Limite de tinta forte = Otsu − 20.
- Limite superior de fundo = Otsu + 55.

Os limites são contidos no intervalo de byte e o segundo fica pelo menos um nível acima do primeiro. Dado um nível corrigido g, limite forte s e limite de fundo b:

~~~text
t = limitar((b − g) / max(1, b − s), 0, 1)
cobertura = 255 × smootherstep(t)
smootherstep(t) = 6t⁵ − 15t⁴ + 10t³
~~~

Assim, tons abaixo do limite forte ficam opacos, tons no intervalo geram opacidade gradual e tons acima do limite superior viram fundo. A função quintica aproxima uma transição com derivadas suaves nas extremidades. Se a opção de suavização estiver desligada, a implementação converte a cobertura em uma escolha binária no ponto médio t = 0,5.

Esse desenho conserva marcas claras sem exigir conectividade a uma linha escura, ao custo de potencialmente conservar artefatos que também estejam na faixa tonal da tinta.

## 8. Redimensionamento e espessura

Quando a dimensão muda, os tons de cinza são desenhados em um Canvas intermediário com interpolação de alta qualidade. Reduções grandes são feitas em etapas, aproximadamente pela metade, enquanto largura e altura ainda permitem a operação; o ajuste final chega às dimensões exatas. A cobertura só é criada depois desse redimensionamento para diminuir a perda de traços estreitos em reduções.

A espessura utiliza morfologia matemática sobre a cobertura de 8 bits, sem convertê-la para preto/branco:

- Valor positivo: dilatação, escolhendo o maior valor na vizinhança.
- Valor negativo: erosão, escolhendo o menor valor.
- As vizinhanças alternam entre cruz de quatro vizinhos e quadrado de oito para aproximar um elemento estruturante arredondado.
- O raio acompanha a resolução por meio de abs(espessura) × raiz quadrada da razão entre pixels de saída e de entrada.
- Quando o raio é fracionário, o resultado entre passos inteiros é interpolado; não se aplica uma segunda média que apagaria ajustes pequenos.

O controle atual admite valores de −10 a +10. A função também aceita dimensões de saída explicitamente, mas o fluxo normal da interface preserva a resolução processada da fonte.

## 9. Cor e fundo da saída

Com a opção de preto puro, o núcleo da tinta usa RGB 0,0,0. Caso contrário, calcula a média RGB dos pixels fonte classificados como tinta forte. Se nenhum for encontrado, usa preto.

Com fundo transparente, a cobertura é escrita no canal alfa da tinta escolhida. Com fundo opaco, a cobertura mistura a tinta com branco:

~~~text
pixel_final = cobertura × tinta + (1 − cobertura) × branco
~~~

Pixels sem tinta viram branco; bordas parcialmente cobertas são compostas com alfa intermediário. Não há remoção de componentes por área nem abertura/fechamento no fluxo atual.

## 10. Composição final

O compositor mede cada linha de texto usando Canvas e largura útil de 400 px (420 menos duas margens de 10 px). Quebra frases em palavras; também divide palavras maiores que a largura útil. O nome usa fonte base de 14 px e ênfase; as outras linhas usam 11 px. A altura de linha é 1,25 vezes a fonte.

O layout tenta primeiro o tamanho tipográfico normal. Se não couber, refaz a medida em 45% do tamanho. Se ultrapassar o limite mesmo assim, interrompe com mensagem de erro para reduzir/remover texto. Uma área de ao menos 18 px é reservada para o desenho. A assinatura mantém a proporção e é centralizada no espaço restante; escala pedida é limitada a 50%–200% da escala máxima ajustada ao espaço.

O canvas lógico de 420 × 120 px é ampliado a 3× e gera PNG de 1260 × 360 px. O fundo é branco por padrão ou transparente quando solicitado; o texto é preto em ambos. A validação da prévia compara as revisões de arquivo, opções e campos aplicados para evitar baixar um resultado desatualizado.

## 11. Custo, limitações e riscos

- A rotina percorre múltiplos arrays com custo aproximadamente linear no número de pixels; operações de mediana, Canvas e morfologia são mais caras. Para uma imagem de 12 MP, há vários buffers de bytes e canvases temporários.
- O processador é chamado sincronamente na thread principal. Um arquivo grande pode congelar a interação até terminar.
- O fundo é modelado por uma estimativa reduzida e a separação tonal é global. Gradientes fortes, sombras locais, tinta muito clara, papel colorido, textura e assinatura densa podem exigir revisão visual ou falhar.
- Converter uma fotografia para luminância descarta diferenças cromáticas que poderiam separar tinta e papel.
- A suavização pode manter ruído leve com aparência semelhante a tinta. Desligá-la torna a borda mais dura e pode perder antialias.
- Dilatação pode unir partes próximas; erosão pode romper linhas finas. A suavização não substitui análise visual do resultado.
- O GIF produz quadro estático; não há OCR, reconhecimento de identidade ou verificação de registro.
- Arquivos aceitos e limites de entrada reduzem o espaço de processamento, mas ainda há custo temporário de memória em dezenas de milhões de pixels.

## 12. Verificação e recomendações

Os testes automatizados verificam casos sintéticos do processador e do compositor, inclusive preservação da tinta, fundo transparente, proporção e falhas. Eles não validam um conjunto estatisticamente representativo de assinaturas reais nem medem qualidade visual em todos os navegadores.

Para a evolução:

1. Executar o algoritmo em Web Worker ou OffscreenCanvas, com cancelamento e indicação de progresso.
2. Montar um conjunto de referência consentido e desidentificado, com variações de papel, sombra, cor, contraste, traço fino e ruído; medir perda de traço e fundo residual.
3. Acrescentar testes em navegadores reais, tamanhos máximos, imagem transparente, AVIF/GIF e opção de espessura fracionária.
4. Tornar os parâmetros de detecção auditáveis na UI avançada somente se houver necessidade operacional; manter defaults documentados.
5. Reavaliar limites de memória para celular e registrar os dispositivos testados antes de prometer suporte de desempenho.
