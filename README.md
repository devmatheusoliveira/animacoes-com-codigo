# Animações com código

Projeto de animações e vídeos programáticos com Remotion, React e TypeScript. Inclui uma cena de escritório em 3D com React Three Fiber e exemplos editáveis sobre banco de dados, widgets Flutter Material 3 e modelagem 3D com OpenSCAD.

## Vídeos de exemplo

Todos os exemplos abaixo estão renderizados em formato horizontal (1920 × 1080, 30 fps):

### Animação 3D do escritório

[![Preview da animação 3D](https://raw.githubusercontent.com/devmatheusoliveira/animacoes-com-codigo/main/public/videos/office-scene-3d.jpg)](https://github.com/devmatheusoliveira/animacoes-com-codigo/raw/refs/heads/main/public/videos/office-scene-3d.mp4)

[Baixar o vídeo da animação 3D](public/videos/office-scene-3d.mp4)

### Mapa do Brasil

[![Preview do mapa do Brasil](https://raw.githubusercontent.com/devmatheusoliveira/animacoes-com-codigo/main/public/videos/brasil-estados.jpg)](https://github.com/devmatheusoliveira/animacoes-com-codigo/raw/refs/heads/main/public/videos/brasil-estados.mp4)

[Baixar o vídeo do mapa do Brasil](public/videos/brasil-estados.mp4)

### Flutter Widgets

[![Preview de Flutter Widgets](https://raw.githubusercontent.com/devmatheusoliveira/animacoes-com-codigo/main/public/videos/flutter-widgets.jpg)](https://github.com/devmatheusoliveira/animacoes-com-codigo/raw/refs/heads/main/public/videos/flutter-widgets.mp4)

[Baixar o vídeo de Flutter](public/videos/flutter-widgets.mp4)

### OpenSCAD paramétrico

[![Preview de OpenSCAD](https://raw.githubusercontent.com/devmatheusoliveira/animacoes-com-codigo/main/public/videos/openscad-parametrico.jpg)](https://github.com/devmatheusoliveira/animacoes-com-codigo/raw/refs/heads/main/public/videos/openscad-parametrico.mp4)

[Baixar o vídeo de OpenSCAD](public/videos/openscad-parametrico.mp4)

### Compilado completo

[![Preview do vídeo completo](https://raw.githubusercontent.com/devmatheusoliveira/animacoes-com-codigo/main/public/videos/animacoes-completas.jpg)](https://github.com/devmatheusoliveira/animacoes-com-codigo/raw/refs/heads/main/public/videos/animacoes-completas.mp4)

[Baixar o vídeo compilado completo](public/videos/animacoes-completas.mp4)

## Abrir a prévia

```powershell
npm install
npm run dev
```

Também é possível usar `pnpm install` e `pnpm dev`. Node.js 22 ou superior é recomendado, inclusive para os scripts de verificação do personagem.

No Studio, selecione `OfficeScene3D`, `ConsultaAoBanco`, `Relacionamentos`, `FlutterWidgets` ou `OpenSCAD`. Nas cenas didáticas, o painel **Props** edita título, texto e etapas; você pode salvar as alterações de volta em `src/Root.tsx`.

## Escritório 3D

`OfficeScene3D` tem 12 segundos, 30 fps e resolução 1920 × 1080. O personagem caminha até a mesa, senta na cadeira e abre o notebook. A câmera acompanha a chegada, aproxima durante a abertura e recua no encerramento. Todas as animações são controladas pela timeline do Remotion.

Abra a composição no endereço mostrado pelo Studio, acrescentando `/OfficeScene3D` (normalmente `http://localhost:3000/OfficeScene3D`).

O código está em `src/OfficeScene/`: `OfficeScene.tsx` controla a câmera e a composição, `OfficeModels.tsx` define o cenário e `CharacterRig.ts` calcula a postura e os braços de comprimento fixo.

Verificações do personagem e dos enquadramentos:

```powershell
node --experimental-strip-types scripts/check-office-arms.mjs
node scripts/check-office-camera.mjs
```

O primeiro script verifica os 360 frames, comprimentos dos braços, contato da mão, continuidade e colisões com a mesa e o encosto durante a fase sentada. O segundo captura imagens em uma única sessão de navegador para revisão visual, sem recriar a câmera entre frames. As imagens ficam em `out/office-camera-sequence/` e não entram no Git.

## Identidade visual

A identidade Zunvi fica centralizada em `src/design/brand.ts`. Esse arquivo reúne:

- cores primitivas e semânticas da marca;
- temas reutilizáveis `light` e `dark`;
- Nunito para títulos e Nunito Sans para interface e leitura;
- escala de 8 px, raios, sombras, movimento e paleta dos editores de código.

As cenas devem consumir esses tokens em vez de declarar novas cores de interface. O teal indica foco e ação; verde, âmbar e vermelho ficam reservados para estados. Os temas dos diagramas são adaptados em `src/diagrams/themes.ts` para manter Mermaid desacoplado do restante da interface.

`FlutterWidgets` apresenta uma prévia ilustrativa de uma tela de app dentro de um mockup de iPhone, com o código Dart ao lado. Cada etapa simula a digitação com cores de sintaxe, um clique em Run e a entrada da tela. Um toque no widget demonstra sua ação e destaca o parâmetro correspondente. Toda a sequência acompanha o frame do vídeo, inclusive ao voltar ou avançar na timeline. A prévia é feita em React para o vídeo; não executa Flutter.

Depois do Run, o foco percorre três parâmetros de cada exemplo. A linha no editor e a região correspondente no celular recebem destaque sincronizado, com uma conexão visual e uma explicação específica. Os mapeamentos ficam em `widgetFocus`, no arquivo `src/FlutterWidgets.tsx`.

## Exemplo OpenSCAD

A composição `OpenSCAD` mostra uma construção contínua de uma placa de 64 × 44 × 10 mm. No mesmo `suporte.scad` mostrado na tela, digitamos o paralelepípedo, envolvemos o volume com `difference` e acrescentamos o furo central de Ø18 mm; depois inserimos o `for` que cria dois furos de fixação de Ø6 mm. A prévia automática mantém a peça visível e aplica cada operação assim que seu código fica completo. A rotação e os destaques continuam durante toda a construção.

Os arquivos reais ficam em `public/models/openscad/`:

- `01-bloco.scad` e `01-bloco.stl`: volume inicial.
- `02-furo.scad` e `02-furo.stl`: corte central.
- `03-suporte.scad` e `03-suporte.stl`: peça final.

O vídeo lê o código dos arquivos `.scad` e carrega os `.stl` exportados pelo OpenSCAD. Os contornos em teal são destaques didáticos sobre a peça.

Na etapa final, `animateParameters` anima a edição de `d` no próprio código: 18 → 26 → 10 → 18 mm. O número é apagado e redigitado, com cursor e linha em destaque, e o furo cresce ou diminui na prévia. Essa transição usa o mesmo perfil retangular com cortes circulares para gerar a geometria intermediária no navegador, sem depender do tempo de compilação do OpenSCAD. `continuousBuild` mantém as linhas já escritas, digitando somente a operação nova. A animação acompanha a timeline e funciona ao avançar ou voltar no vídeo.

Também existe `OpenSCADPlayground`, com `centerDiameter` e `mountDiameter` editáveis em Props. Para recompilar esses valores em STL nativo, mantenha o serviço local em execução:

```powershell
npm run openscad:live
```

O serviço atende apenas na máquina local, em `127.0.0.1:3031`, e salva as variantes em `out/openscad-live/`. A composição do vídeo com os valores padrão e a animação do diâmetro não precisam desse serviço.

Para alterar a geometria, edite o `.scad`, regenere os modelos e recarregue o Studio:

```powershell
npm run models:openscad
```

O gerador usa o OpenSCAD instalado, exporta STL binário e verifica dimensões, número de triângulos e volume. Em outra máquina, configure `OPENSCAD_BINARY` ou deixe `openscad` no PATH. A cor e a velocidade de rotação (graus por segundo) são editáveis em Props. `focuses` configura as linhas, o texto da explicação e a região destacada.

Referências: [exportação por linha de comando do OpenSCAD](https://files.openscad.org/documentation/manual/Using_OpenSCAD_in_a_command_line_environment.html) e [ThreeCanvas do Remotion](https://www.remotion.dev/docs/three-canvas).

## Mapa do Brasil em 3D

A composição `BrasilEstados` dura 26 segundos e compara projetos concluídos em São Paulo (120), Minas Gerais (84) e Bahia (56). **Os dados são fictícios**, apenas para demonstrar o formato. Cada estado ganha cor, sobe no eixo Z e aumenta 8% em torno do seu próprio centro. A câmera faz zoom in de até 1,75×, centralizando o estado elevado; segura o enquadramento e faz zoom out para o Brasil inteiro antes do próximo destaque. O zoom é limitado automaticamente para estados grandes caberem na área do mapa. No final, os três aparecem juntos com elevação proporcional aos valores e enquadramento aberto; a escala volta ao tamanho original para não sugerir uma alteração da área geográfica.

No painel Props, edite `comparisons` (três estados distintos, valores e cores), `metric`, `unit` e `dataNote`. `elevation`, `stateScale` e `zoom` controlam a intensidade do movimento. Atualize também a nota da fonte quando usar dados reais.

O mapa usa os 27 contornos vetoriais de [`@svg-maps/brazil`](https://github.com/VictorCazanave/svg-maps/tree/master/packages/brazil), com projeção 2.5D: inclinação, camadas de espessura, elevação e sombras. Todo o resultado é SVG, sem contexto WebGL, API de mapas ou chave. Isso evita falhas de criação de contexto GPU no Studio. As fronteiras são estilizadas, não uma malha oficial para medições. Créditos: MapSVG e Victor Cazanave, licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); adaptação: projeção, cores e animação. A atribuição também aparece na cena.

Em um app React Native, os mesmos caminhos SVG podem ser desenhados com [`react-native-svg`](https://github.com/software-mansion/react-native-svg). Esta composição é React web/Remotion; a elevação em Z é simulada por projeção vetorial, não um runtime React Native ou renderização 3D nativa.

Prévia: [BrasilEstados](http://localhost:3000/BrasilEstados). Toda a animação é baseada em frames, inclusive ao avançar e voltar na timeline.

## Horizontal e vertical

As seis cenas didáticas têm o campo **Formato do vídeo** (`videoFormat`) no painel Props do Studio; `OfficeScene3D` usa o formato horizontal fixo descrito acima:

- `horizontal`: 1920 × 1080, proporção 16:9 (padrão).
- `vertical`: 1080 × 1920, proporção 9:16, com layout reorganizado para celular.

Escolha a cena, abra **Props**, altere `videoFormat` e aplique as mudanças. A resolução e o layout acompanham a escolha. Não há cópia do roteiro: código, dados, duração, digitação e destaques são os mesmos nos dois formatos. Se tiver salvo props antigos sem esse campo, o padrão continua horizontal.

No vertical, Flutter e OpenSCAD empilham a prévia acima do editor; o mapa fica acima das estatísticas. Nos diagramas, fluxos Mermaid `LR`/`RL` são exibidos como `TB` (de cima para baixo), sem modificar o texto original em Props. Títulos, explicações e margens também são ajustados. A versão do mapa continua sem WebGL.

Para escolher o formato também na linha de comando, use os presets parciais (mesclados com os valores padrão da cena):

```powershell
npx remotion render BrasilEstados out/brasil-vertical.mp4 --props=presets/vertical.json
npx remotion render BrasilEstados out/brasil-horizontal.mp4 --props=presets/horizontal.json
npx remotion render FlutterWidgets out/flutter-vertical.mp4 --props=presets/vertical.json
npx remotion render OpenSCAD out/openscad-vertical.mp4 --props=presets/vertical.json --gl=angle
```

Com dados personalizados, acrescente `"videoFormat": "vertical"` ao seu próprio JSON de props. Novas cenas devem reutilizar `videoFormatSchema` e retornar `videoDimensions(props.videoFormat)` em `calculateMetadata`; o componente usa `useVideoConfig()` para decidir o layout. Rode `npm run check:formats` para conferir as resoluções e a duração das seis cenas, além do fallback e da orientação Mermaid.

## Instagram e YouTube

Há três presets de publicação, reutilizando o conteúdo das seis cenas:

| Destino | Formato | Preset |
| --- | --- | --- |
| YouTube convencional | 1920 × 1080 · 16:9 | `presets/youtube.json` |
| YouTube Shorts | 1080 × 1920 · 9:16 | `presets/youtube-shorts.json` |
| Instagram Reels | 1080 × 1920 · 9:16 | `presets/instagram-reels.json` |

As exportações CLI têm MP4/H.264, pixels `yuv420p`, cor SDR BT.709 e qualidade CRF 18 como padrão. As cenas usam 30 fps. Se houver uma trilha sonora, ela será codificada em AAC a 192 kbps; essa configuração não adiciona áudio às cenas silenciosas. Se exportar pela janela de renderização do Studio, confira também MP4/H.264 e a resolução escolhida antes de iniciar.

```powershell
npm run render:youtube -- BrasilEstados out/brasil-youtube.mp4
npm run render:shorts -- BrasilEstados out/brasil-shorts.mp4
npm run render:reels -- BrasilEstados out/brasil-reels.mp4
```

Troque `BrasilEstados` pelo ID da cena desejada. Para OpenSCAD, acrescente `--gl=angle` se necessário. Esses comandos geram arquivos locais; não publicam nas plataformas.

Os presets de Shorts e Reels ligam **Margens para Reels e Shorts** (`socialSafeArea`). Na prévia, escolha `videoFormat: vertical` e ligue essa opção em Props para ver exatamente o mesmo enquadramento. O conteúdo vertical é reduzido uniformemente a 82%, mantendo o fundo preenchido, sem recortar o código, o modelo ou os destaques. Nos layouts atuais, as bordas de conteúdo ficam aproximadamente a 132 px da esquerda, 194 px da direita, 164 px do topo e 346 px da base. A opção não afeta o horizontal.

Essas são margens de design deste projeto, não uma área oficial garantida: controles, descrição, legendas, grade do perfil e capas podem variar entre aplicativos. Confira a prévia de publicação no celular, sobretudo após aumentar os textos. Os presets cobrem YouTube, Shorts e Reels; não são uma composição específica de feed/carrossel 4:5.

Para Shorts, mantenha o vídeo vertical com até 3 minutos. `npm run check:formats` verifica os três presets em todas as cenas e avisa se o roteiro exceder esse tempo, sem cortar ou acelerar o conteúdo. Os exemplos atuais têm de 22 a 60 segundos. Esta alteração prepara a exportação, mas não gera um MP4 automaticamente.

Referências oficiais: [codificação recomendada pelo YouTube](https://support.google.com/youtube/answer/1722171?hl=pt-BR), [Shorts de até três minutos](https://support.google.com/youtube/answer/15424877?hl=pt-BR) e [orientações da Meta para Reels em 9:16 e área segura](https://www.facebook.com/business/ads/facebook-instagram-reels-ads). A orientação de área segura da Meta citada é para anúncios; aqui usamos margens próprias para publicação orgânica.

## Montar outro vídeo

Em `src/Root.tsx`, duplique uma composição e altere suas propriedades padrão e etapas.

- Escreva o diagrama com a sintaxe Mermaid e use identificadores curtos nos nós, como `PESSOA` e `PEDIDO`.
- Em cada etapa, edite `title` e `explanation`. `seconds` define sua duração, e o Remotion calcula a duração total do vídeo.
- `focusNodes` lista os identificadores Mermaid que devem ganhar destaque naquela etapa. Uma lista vazia dá o mesmo destaque a todos.
- Escolha `light` ou `dark` em `theme`.
- No exemplo Flutter, cada etapa configura `screen`, `code` e `highlightLines` para sincronizar a prévia com o trecho Dart explicado.

Exporte pelo Studio ou pelo terminal:

```powershell
npx remotion render ConsultaAoBanco out/consulta.mp4
npx remotion render Relacionamentos out/relacionamentos.mp4
npx remotion render FlutterWidgets out/flutter-widgets.mp4
npx remotion render OpenSCAD out/openscad.mp4 --gl=angle
```
