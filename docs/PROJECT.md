# Tamesis Nexus — intenção e arquitetura

O projeto transforma o briefing visual em um atlas interativo: uma instalação científica imaginária, com um núcleo geométrico, camadas de infraestrutura e computação, observação, uma rede abstrata e módulos de evidência. A navegação deve permitir estudar a composição, separar as camadas e relacionar os painéis aos componentes da cena.

A direção visual usa grafite, titânio, cobre, âmbar, verde, violeta e carmim com funções consistentes. A câmera inicial é uma perspectiva de três quartos. A composição evoca uma prancha de engenharia; não é uma projeção axonométrica ortográfica.

## Executar

Abra `index.html` diretamente no navegador. Os scripts, controles 3D e estilos estão no projeto; não é preciso instalar dependências nem acessar uma CDN. A renderização 3D exige um navegador com WebGL disponível.

Como alternativa, com Node.js 18 ou superior instalado:

```sh
npm run dev
```

Abra `http://127.0.0.1:4173`. O servidor atende somente na máquina local e disponibiliza a página, os estilos e os diretórios públicos `src`, `vendor` e `assets`. Não disponibiliza a documentação, os scripts de desenvolvimento ou o repositório Git. Encerre com `Ctrl+C`.

```sh
npm run check
```

O verificador examina a sintaxe JavaScript, referências locais e identificadores da interface, além de invariantes dos dados ilustrativos. O comando usa `--experimental-vm-modules` para analisar a sintaxe dos módulos de desenvolvimento sem criar processos filhos; o Node pode exibir um aviso sobre essa API experimental. Para executar sem npm, use `node --experimental-vm-modules scripts/check.mjs`. A inspeção visual e o uso dos controles no navegador continuam necessários para verificar a experiência, o WebGL e a composição em diferentes telas.

## Organização

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Estrutura semântica da página, painéis e controles. |
| `styles.css` | Composição, tipografia, responsividade e estados da interface. |
| `src/scene.js` | Geometria, materiais, câmera, seleção, camadas e animação 3D. |
| `src/science.js` | Modelo ilustrativo compartilhado pelo campo 3D e pelos gráficos. |
| `src/evidence.js` | Informação editorial sobre observação, teoria, validação e falsificação. |
| `src/app.js` | Integração dos painéis, controles e estado da interface. |
| `src/export.js` | Exportação da composição e dos dados ilustrativos. |
| `vendor/` | Bibliotecas locais e suas licenças. |
| `scripts/` | Servidor de desenvolvimento e verificações sem dependências adicionais. |

O Three.js r128 e seus OrbitControls são mantidos juntos em `vendor/`. Essa versão preserva a compatibilidade da cena existente. Uma atualização futura deve revisar os dois arquivos, as APIs de materiais, a iluminação e os resultados visuais em conjunto.

## Significado científico

Tamesis Nexus é uma composição conceitual e educacional, não um solver de física ou um instrumento de pesquisa. O campo deformado usa `h(r) = -5,8 / (0,48 × max(0, r) + 0,6)`, em unidades virtuais, com simetria radial. É uma função escolhida para a ilustração; não resolve as equações de Einstein. A rede neural é uma estrutura abstrata de conexões; não modela um cérebro nem demonstra relações entre consciência e física.

As séries, resíduos e intensidades de incerteza são dados simulados. A seção bidimensional usa a mesma função da malha tridimensional, demonstrando consistência interna da visualização. Ela não valida uma teoria física. O gráfico de modelo versus observação é outro exemplo ilustrativo, com grandezas normalizadas. Os módulos de observação, teoria, validação e falsificação apresentam funções diferentes no processo científico; nenhum deles implica uma descoberta ou confirmação experimental.

Resultados, limitações, discrepâncias e estado exploratório devem permanecer identificados na interface e nas exportações. Referências editoriais oferecem contexto para os conceitos, sem funcionar como evidência dos valores ilustrativos.

## Evolução

Ao acrescentar um controle, conecte seu efeito ao estado da cena e dê uma indicação clara do resultado. Ao mudar uma fórmula, mantenha campo, seção, gráficos e exportações coerentes. Uma nova fonte de dados reais deve declarar sua origem, unidades, incertezas e método de transformação antes de substituir qualquer série simulada.
