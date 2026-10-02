# Diagnóstico completo do módulo `processSignatureImage`

Arquivo principal: `src/utils/processSignatureImage.js`

## 1. Visão geral

Este módulo processa imagens de assinatura em navegador usando Canvas, sem alterar o arquivo original. O objetivo é transformar uma imagem carregada em uma versão mais limpa, com fundo removido quando necessário, crop automático e preparação para exportação em PNG.

A rotina central é:

- decodificar o arquivo de imagem;
- desenhar a imagem em um canvas;
- aplicar filtros opcionais por pixel;
- detectar e remover fundo dominante;
- recortar a região visível;
- retornar uma estrutura com a imagem processada e um threshold sugerido.

O fluxo principal é encapsulado em `processSignatureImage(file, adjustments)`, que retorna um objeto com:

```js
{
  image: 'data:image/png;base64,...',
  suggestedBackgroundThreshold: number | null
}
```

Esse retorno é usado pelo hook principal do editor para atualizar a prévia e sugerir pesos de remoção de fundo.

---

## 2. Estrutura do fluxo principal

### Função: `processSignatureImage(file, adjustments)`

```js
export async function processSignatureImage(file, adjustments) {
```

### Etapa 1: Decodificação da imagem

```js
const bitmap = await decodeImageFile(file);
const canvas = document.createElement('canvas');
canvas.width = bitmap.width;
canvas.height = bitmap.height;
```

A imagem é carregada em um canvas, preservando as dimensões originais. Isso permite processar os pixels em um buffer próprio, sem mexer no arquivo original.

A função `decodeImageFile(file)` tenta primeiro usar `createImageBitmap(file)`, que é mais eficiente e costuma ser mais rápida. Se falhar, usa `Image.decode()` como fallback.

### Etapa 2: Obtenção do contexto do canvas

```js
const context = canvas.getContext('2d', { willReadFrequently: true });
if (!context) throw new Error('Não foi possível preparar o canvas da imagem.');
```

O `willReadFrequently: true` é importante para evitar perda de performance quando a lógica lê pixel a pixel. O contexto do canvas permite acessar `getImageData` e `putImageData`.

### Etapa 3: Desenho da imagem no canvas

```js
context.drawImage(bitmap.source, 0, 0);
```

Esse passo copia a imagem original para o canvas e cria a base sobre a qual os filtros serão aplicados.

### Etapa 4: Verificação de filtros ativos

O módulo só entra no processamento por pixels quando alguma destas condições for verdadeira:

- `convertToBlack`
- `cleanWeakPixels`
- `autoCrop`
- `removeBackground`
- `contrast !== 200`
- `sharpness > 0`
- `applyPythonFilters`

Isso é uma otimização importante: se a imagem não precisar de alteração, o código evita a leitura completa dos pixels.

### Etapa 5: Leitura do buffer RGBA

```js
const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
const { data, width, height } = imageData;
```

`data` é um array linear contendo os canais RGBA de todos os pixels. Em cada pixel há 4 valores:

- `R` → canal vermelho
- `G` → canal verde
- `B` → canal azul
- `A` → canal alfa (transparência)

A estrutura lógica é:

```js
const index = (y * width + x) * 4;
const r = data[index];
const g = data[index + 1];
const b = data[index + 2];
const a = data[index + 3];
```

---

## 3. Remoção de fundo e threshold sugerido

### Função: `removeBackground(imageData, selectedThreshold)`

Essa função é o coração da etapa de isolamento do conteúdo principal da imagem.

Ela faz a seguinte análise:

1. percorre todos os pixels visíveis;
2. calcula a luminância de cada pixel;
3. coleta um histograma de luminância;
4. identifica qual tonalidade domina o fundo;
5. remove pixels próximos ao fundo dominante;
6. cria um fade suave na borda do limite para não cortar abruptamente a assinatura;
7. retorna `suggestedThreshold` para auxiliar a UI em ajustes manuais.

### Teoria da luminância

A luminância é calculada por uma aproximação BT.601:

```js
const luminance = Math.round(
  data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114,
);
```

Essa fórmula pondera os canais com maior influência visual:

- verde tem maior peso (0.587)
- vermelho tem peso médio (0.299)
- azul tem menor peso (0.114)

Isso se aproxima da percepção humana da luminosidade.

### Histograma

```js
const histogram = new Uint32Array(256);
```

O algoritmo monta um histograma para os 256 níveis possíveis de brilho. Isso permite detectar a tonalidade dominante do fundo sem precisar analisar o conteúdo visualmente.

### Determinação do fundo

O código suaviza as frequências de luminância com uma janela centrada em cada valor:

```js
for (let luminance = 0; luminance < 256; luminance += 1) {
  let frequency = 0;
  let valuesInWindow = 0;

  for (let offset = -2; offset <= 2; offset += 1) {
    const neighbor = luminance + offset;
    if (neighbor < 0 || neighbor > 255) continue;
    frequency += histogram[neighbor];
    valuesInWindow += 1;
  }

  const averageFrequency = frequency / valuesInWindow;
  if (averageFrequency > highestFrequency) {
    highestFrequency = averageFrequency;
    backgroundLuminance = luminance;
  }
}
```

O resultado `backgroundLuminance` é a tonalidade mais frequente após suavização, considerada o eixo do fundo.

### Cálculo do threshold sugerido

```js
const luminanceRange = Math.abs(backgroundLuminance - inkLuminance);
const suggestedThreshold = Math.min(100, Math.max(12, Math.round(luminanceRange * 0.35)));
const threshold = Number.isFinite(selectedThreshold)
  ? Math.max(0, Math.min(100, selectedThreshold))
  : suggestedThreshold;
const fadeZone = Math.max(6, Math.round(threshold * 0.25));
```

Isso cria um threshold inicial adaptativo baseado na diferença entre o fundo e a tinta predominante, com limite de 0 a 100.

### Remoção efetiva do fundo

```js
const difference = Math.abs(luminances[pixelIndex] - backgroundLuminance);

if (difference <= threshold) {
  data[index + 3] = 0;
} else if (difference <= threshold + fadeZone) {
  const opacity = (difference - threshold) / fadeZone;
  data[index + 3] = Math.round(originalAlpha * opacity);
}
```

Esse trecho faz duas coisas importantes:

- pixels muito próximos da luminância do fundo ficam totalmente transparentes;
- pixels na borda do fundo recebem transparência gradual para evitar corte agressivo.

Esse é o mecanismo principal da remoção de fundo em tons de fundo uniforme ou quase uniforme.

### Diagnóstico da lógica de fundo

A remoção de fundo funciona melhor quando:

- o fundo é uniforme ou aproximadamente uniforme;
- a assinatura é escura sobre fundo claro ou vice-versa;
- a expressão visual do fundo não se mistura com a tinta da assinatura.

A lógica tende a falhar em imagens com:

- fundo texturizado;
- fundo com gradação forte;
- sobreposição de tons claros e escuros;
- imagem com contraste baixo entre a assinatura e a superfície.

---

## 4. Ajuste de contraste

### Função: `applyContrast(imageData, percentage)`

```js
const factor = percentage / 100;
```

A fórmula segue a lógica clássica de contraste linear:

```js
(data[channel] - 128) * factor + 128
```

Esse cálculo expande ou comprime a distância do canal em relação ao meio-tom 128. Em termos práticos:

- `percentage > 100` aumenta o contraste;
- `percentage = 100` mantém a tonalidade original em relação ao ponto central;
- `percentage < 100` reduz o contraste;
- `percentage = 200` aplica fator 2, ou seja, dobra a distância em relação a 128.

O código usa:

```js
Math.max(0, Math.min(255, ...))
```

para garantir que cada canal permaneça entre 0 e 255.

### Observação importante

No código principal, o contraste é tratado assim:

```js
const contrast = adjustments.applyPythonFilters ? 400 : adjustments.contrast;
if (contrast !== 200) applyContrast(imageData, contrast);
```

Isso significa que o valor neutro do slider é 200, mas o processamento só ignora a operação quando a comparação for estritamente igual a 200. Valores próximos a 200 ainda produzem alteração forte, devido ao fator linear. Esse ponto precisa ser observado porque pode causar saltos visuais perto do neutro.

---

## 5. Remoção de pixels claros por limiar

### Função: `applyBrightnessThreshold(imageData, threshold)`

```js
const brightness = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
if (brightness >= threshold) data[index + 3] = 0;
```

Essa função remove pixels visualmente claros baseados na luminância perceptual. Ela é usada em presets mais agressivos, como um filtrado de fundo claro.

### Teoria

A fórmula do brilho é a mesma do cálculo da luminância, e o uso do canal alfa (`A`) permite apagar pixel por pixel sem perder completamente a imagem, preservando a transparência como mecanismo de corte.

---

## 6. Nitidez

### Função: `applySharpness(imageData, sharpness)`

A nitidez é aplicada por um algoritmo de unsharp masking aproximado usando blur como referência.

#### Passo 1: preparar uma cópia da imagem

```js
const sourceCanvas = document.createElement('canvas');
sourceCanvas.width = width;
sourceCanvas.height = height;
sourceContext.putImageData(imageData, 0, 0);
```

#### Passo 2: criar variação borrada

```js
blurContext.filter = `blur(${sharpness > 10 ? 2 : 1}px)`;
blurContext.drawImage(sourceCanvas, 0, 0);
blurContext.filter = 'none';
const blurredData = blurContext.getImageData(0, 0, width, height).data;
```

A idea central é: compare o pixel original com o mesmo pixel em uma versão borrada.

#### Passo 3: reforçar diferença

```js
const amount = sharpness / 3;

for (let index = 0; index < data.length; index += 4) {
  if (data[index + 3] === 0) continue;

  for (let channel = 0; channel < 3; channel += 1) {
    data[index + channel] = Math.max(
      0,
      Math.min(255, data[index + channel] + (data[index + channel] - blurredData[index + channel]) * amount),
    );
  }
}
```

A equação pode ser interpretada como:

```text
novo = original + (original - borrado) * intensidade
```

Esse cálculo realça bordas e contornos, aumentando a sensação de nitidez.

### Observação de uso

O código usa:

```js
const sharpness = adjustments.applyPythonFilters ? 15 : adjustments.sharpness;
if (sharpness > 0) applySharpness(imageData, sharpness);
```

Ou seja, o preset avançado impõe nitidez alta, enquanto a opção manual respeita o valor configurado pelo controle.

---

## 7. Conversão para preto

### Parte do processamento principal

```js
if (adjustments.convertToBlack || adjustments.applyPythonFilters) {
  data[index] = 0;
  data[index + 1] = 0;
  data[index + 2] = 0;
}
```

Esse filtro remove a cor da imagem e transforma todos os pixels visíveis em preto puro, preservando apenas a transparência e o brilho das bordas. Esse padrão é útil para assinatura em fundo transparente e com contraste forte em tinta preta.

### Importante

A conversão para preto não é uma forma de “remover fundo” por si só. Ela apenas transforma a imagem em um desenho monocromático. Para remover de fato o fundo branco ou colorido, ainda é necessário o processo de transparência por `removeBackground` ou outra máscara segmentada.

---

## 8. Limpeza de pixels fracos

### Trecho principal

```js
if (adjustments.cleanWeakPixels && alpha < 15) {
  data[index + 3] = 0;
  continue;
}
```

Esse filtro identifica pixels com opacidade muito baixa e os torna totalmente transparentes. Ele ajuda a eliminar ruídos e área mínima que não contribuem para a assinatura.

### Por que isso funciona

No canal alfa, valores baixos indicam pixels quase invisíveis. Quando esse valor está muito próximo de zero, o pixel geralmente é ruído ou borda fraca. A transparência zerada remove esse artefato de forma simples e segura.

---

## 9. Crop automático

### Lógica de detecção da caixa visível

Antes do loop principal:

```js
bounds = { left: width, top: height, right: -1, bottom: -1 };
```

Durante a iteração, sempre que um pixel visível é encontrado, a caixa delimitadora é expandida:

```js
bounds.left = Math.min(bounds.left, x);
bounds.top = Math.min(bounds.top, y);
bounds.right = Math.max(bounds.right, x);
bounds.bottom = Math.max(bounds.bottom, y);
```

Isso cria uma caixa mínima que inclui todo o conteúdo visível da imagem.

### Critério de visibilidade

```js
if (alpha === 0) continue;
```

Pixels transparentes não entram na área de crop. Isso é fundamental para detectar apenas o conteúdo útil.

### Margem

```js
const margin = 15;
const cropWidth = bounds.right - bounds.left + 1;
const cropHeight = bounds.bottom - bounds.top + 1;
```

A função adiciona 15 pixels de margem em volta do conteúdo para evitar que traços da assinatura sejam cortados na borda.

### Caso vazio

```js
if (bounds.right < 0) {
  const emptyCanvas = document.createElement('canvas');
  emptyCanvas.width = 1;
  emptyCanvas.height = 1;
  return {
    image: emptyCanvas.toDataURL('image/png'),
    suggestedBackgroundThreshold,
  };
}
```

Se toda a imagem ficou transparente, o código evita gerar um canvas com dimensões inválidas e devolve um PNG mínimo.

---

## 10. Decodificação robusta de arquivos

### Função: `decodeImageFile(file)`

Essa função foi pensada para lidar com ambientes e navegadores que tratam `ImageBitmap` e `Image.decode()` de forma diferente.

### Primeiro caminho: `createImageBitmap`

```js
const bitmap = await createImageBitmap(file);
return {
  source: bitmap,
  width: bitmap.width,
  height: bitmap.height,
  close: () => bitmap.close(),
};
```

Esse caminho é mais eficiente e comum em navegadores modernos.

### Fallback: URL object + `Image.decode()`

```js
const objectUrl = URL.createObjectURL(file);
const image = new Image();
image.src = objectUrl;
await image.decode();
```

Esse caminho é usado em browser que não suportam `createImageBitmap`. Ele converte o arquivo em uma URL temporária para carregar como imagem no DOM.

### Liberação de memória

```js
close: () => URL.revokeObjectURL(objectUrl)
```

ou

```js
finally {
  bitmap.close();
}
```

A liberação de recursos evita vazamentos durante o processamento do arquivo.

---

## 11. Fluxo de processamento e ordem das operações

A ordem exata do processamento é a seguinte:

1. decodificar arquivo;
2. criar canvas e desenhar imagem;
3. verificar se algum filtro está ativo;
4. se necessário, obter `imageData`;
5. remover fundo se solicitado;
6. aplicar filtros de preset, se ativos;
7. aplicar contraste;
8. aplicar nitidez;
9. remover pixels claros por luminância, se necessário;
10. preparar bounds para crop;
11. percorrer cada pixel e:
    - apagar pixels fracos;
    - ignorar pixels transparentes;
    - converter para preto, se necessário;
    - expandir o crop;
12. escrever `imageData` de volta no canvas;
13. se `autoCrop` estiver ativo, gerar um novo canvas recortado;
14. retornar a imagem processada como PNG e o threshold sugerido.

Essa sequência é importante porque a remoção de fundo e o crop precisam acontecer antes da conversão final e da compactação do conteúdo na área de preview.

---

## 12. Diagnóstico funcional por variável e ajuste

### `convertToBlack`

- transforma pixels visíveis em preto;
- útil para assinatura com tinta preta sobre fundo transparente;
- não remove fundo sozinho;
- pode piorar a legibilidade se a assinatura tiver gradiente ou cor.

### `cleanWeakPixels`

- remove pixels quase transparentes;
- reduz ruído e bordas fracas;
- útil para limpar artefatos leves.

### `autoCrop`

- detecta caixa mínima que contém conteúdo visible;
- recorta a imagem para a assinatura;
- aumenta precisão visual da composição final;
- exige cuidado em estilo de assinatura com sombras ou elementos periféricos.

### `removeBackground`

- identifica o fundo dominante pela luminância;
- reduz o alpha destes pixels;
- elimina fundo uniforme;
- é dependente de contraste e uniformidade do fundo.

### `contrast`

- ajusta intensidade da imagem em torno do meio-tom 128;
- afeta todos os canais RGB;
- pode produzir saltos visuais graves quando o valor está próximo de 200.

### `sharpness`

- realça bordas e contornos;
- pode exagerar traços pequenos e reduzir suavidade;
- útil para melhorar legibilidade de assinatura digitalizada.

### `applyPythonFilters`

- ativa um conjunto de filtros mais agressivos;
- faz o processo mais “pesado” e mais específico para imagens de assinatura;
- converte para preto, aumenta contraste, aplica nitidez e remove pixels claros.

---

## 13. Pontos críticos de robustez

### 13.1. Dependência forte do fundo

O algoritmo de remoção de fundo assume que o fundo dominante é tonalmente uniforme. Se a imagem tiver:

- bordas ou manchas visíveis;
- fundo com gradações;
- reflexão ou contraste não uniforme;
- assinatura com cores variadas;

então a detecção da luminância dominante pode gerar resultados inconsistentes.

### 13.2. Threshold manual e sugerido

O código usa um `suggestedBackgroundThreshold` mas preserva o valor selecionado manualmente quando o usuário o ajusta. Isso é bom, mas exige cuidado para não confundir:

- `selectedThreshold` (valor do usuário)
- `suggestedThreshold` (valor calculado automaticamente)

O valor final usado no algoritmo é o manual, quando informado; caso contrário, o sugerido.

### 13.3. Processamento no thread principal

Como o código usa Canvas e processamento pixel a pixel no navegador, imagens grandes podem gerar lentidão. O módulo é funcional, mas não é adequado para arquivos com dimensões excessivas sem otimização.

### 13.4. Controle do crop e da transparência

A remoção de fundo e o crop fazem parte do mesmo ciclo de processamento, então a ordem dos filtros afeta diretamente o resultado final. Isso significa que pequenas mudanças na ordem podem mudar o comportamento da imagem final.

---

## 14. Ajustes recomendados para a remoção de fundo

Para melhorar a funcionalidade de remoção de fundo, as áreas mais promissoras são:

### 14.1. Melhorar a detecção do fundo dominante

O algoritmo atual se baseia em um histograma simples de luminância. Uma evolução possível é:

- detectar a faixa dominante de pixels em uma região de borda;
- avaliar não só o valor mais frequente, mas também a sua distribuição por área;
- ignorar regiões internas do conteúdo principal ao detectar o fundo.

### 14.2. Usar análise por bordas

Em vez de analisar toda a imagem, o algoritmo pode:

- inspecionar as bordas laterais e superiores do canvas;
- assumir que o fundo dominante está nas bordas;
- remover pixels com tonalidade próxima ao fundo de borda.

Isso costuma funcionar melhor quando a assinatura está centralizada numa folha branca ou em fundo uniforme.

### 14.3. Criar um fade mais controlado

O uso de `fadeZone` é bom, mas o efeito pode ser demasiado agressivo em alguns fundos. Ajustes possíveis:

- reduzir o fade em fundos muito limpos;
- aumentar o fade em fundos com textura suave;
- aplicar uma transição menos abrupta em gradientes.

### 14.4. Separar fundo e tinta por canal

Em certos casos, a remoção de fundo funciona melhor se o algoritmo considerar

- luminância total;
- diferença de canal R/G/B;
- saturação relativa;
- contraste entre pixels próximos.

Isso já é parcialmente visível no uso de luminância, mas um modelo combinado pode ser mais robusto.

### 14.5. Tratar imagens com fundo cinza ou muito claro

Como o sistema usa luminância, imagens em:

- cinza neutro;
- fundo quase branco;
- fundo amarelo suave;
- fundo pixelado;

precisam de ajuste mais fino do threshold e da faixa de fade.

---

## 15. Resumo executivo

Este módulo é uma pipeline de processamento bitmap em navegador que transforma imagens de assinatura em versões limpas e prontas para composição. Ele faz:

- leitura segura do arquivo;
- transformação por pixel com Canvas;
- detecção de fundo dominante por luminância;
- remoção de fundo em alpha;
- crop automático;
- export em PNG sem alterar o arquivo original.

A parte mais sensível é a remoção de fundo, porque ela depende de:

- uniformidade do fundo;
- contraste da assinatura;
- definição de threshold;
- suavização gradual do alpha.

A implementação está funcional, mas seu comportamento é mais heurístico do que matematicamente robusto. Isso significa que ela funciona bem em cenários previsíveis e pode exigir ajuste manual de threshold em situações mais complexas.

---

## 16. Conclusão

O arquivo `processSignatureImage.js` é uma solução completa de processamento visual em navegador, com foco em assinaturas e documentos legíveis. Ele combina:

- canvas em 2D;
- manipulação de pixels em RGBA;
- luminância e histograma;
- contraste e sharpen;
- crop automático;
- transparência dinâmica para remoção de fundo.

A estrutura é bem organizada e separada em funções específicas, permitindo evoluir cada parte com minimal risco. A funcionalidade que mais exige ajuste fino é a remoção de fundo, porque sua eficiência depende do tipo de fundo, da qualidade da composição e do threshold usado.

Se você deseja melhorar essa área, os pontos mais altos de impacto são:

- análise do fundo por bordas;
- threshold mais adaptativo;
- faixa de fade mais inteligente;
- separação entre fundo dominante e assinatura por maior variedade de indicadores visuais.

---

## 17. Referências internas no projeto

Este módulo é consumido pelo hook principal do editor:

- `src/hooks/useSignatureEditor.js`

Esse hook:

- envia o arquivo para `processSignatureImage`;
- armazena as imagens processadas;
- reprocessa ao alterar filtros;
- usa a imagem final na prévia e na exportação.

A integração com a interface e a preparação para exportação dependem diretamente das saídas desse arquivo, principalmente:

- `image`
- `suggestedBackgroundThreshold`

Esses dois valores são determinantes para a qualidade visual final da assinatura.
