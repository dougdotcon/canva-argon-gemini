import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = relative => readFile(path.join(root, relative), 'utf8');
const required = ['index.html', 'styles.css', 'src/scene.js', 'src/science.js',
  'src/evidence.js', 'src/app.js', 'src/export.js', 'vendor/three.min.js', 'vendor/OrbitControls.js'];

async function javascriptFiles(directory) {
  const found = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await javascriptFiles(relative));
    else if (entry.isFile() && entry.name.endsWith('.js')) found.push(relative);
  }
  return found;
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match ? match[1] ?? match[2] : null;
}

function localReference(reference) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) return null;
  const resource = reference.split(/[?#]/, 1)[0];
  if (!resource) return null;
  const decoded = decodeURIComponent(resource).replace(/^\//, '');
  const relative = path.normalize(decoded);
  assert(!path.isAbsolute(relative) && !relative.startsWith('..') && !relative.includes('\0'),
    `Referência fora do projeto: ${reference}`);
  return relative;
}

async function check() {
  for (const filename of required) {
    assert((await stat(path.join(root, filename))).isFile(), `Arquivo obrigatório ausente: ${filename}`);
  }
  const files = [...await javascriptFiles('src'), ...await javascriptFiles('vendor')];
  const sources = new Map();
  for (const filename of files) {
    const source = await read(filename);
    new vm.Script(source, { filename });
    sources.set(filename.replaceAll('\\', '/'), source);
  }
  assert.equal(typeof vm.SourceTextModule, 'function',
    'Execute npm run check ou node --experimental-vm-modules scripts/check.mjs.');
  for (const filename of ['scripts/serve.mjs', 'scripts/check.mjs']) {
    new vm.SourceTextModule(await read(filename), { identifier: filename });
  }
  console.log(`Sintaxe: ${files.length} scripts da aplicação e bibliotecas; 2 scripts de desenvolvimento.`);

  const html = await read('index.html');
  const tags = [...html.matchAll(/<[a-z][^>]*>/gi)].map(match => match[0]);
  const ids = new Set();
  for (const tag of tags) {
    const id = attribute(tag, 'id');
    if (id !== null) {
      assert(id.length > 0 && !/\s/.test(id), `Identificador HTML inválido: ${id}`);
      assert(!ids.has(id), `Identificador HTML repetido: ${id}`);
      ids.add(id);
    }
  }
  let references = 0;
  const loadedScripts = [];
  for (const tag of tags) {
    for (const name of ['src', 'href']) {
      const reference = attribute(tag, name);
      if (!reference) continue;
      const relative = localReference(reference);
      if (relative) {
        assert((await stat(path.join(root, relative))).isFile(), `Referência ausente: ${reference}`);
        references++;
      }
      if (reference.startsWith('#') && reference.length > 1) {
        assert(ids.has(decodeURIComponent(reference.slice(1))), `Âncora HTML ausente: ${reference}`);
      }
      if (/^<script\b/i.test(tag) && name === 'src') {
        assert(relative, `Script deve ser local para permitir uso offline: ${reference}`);
        loadedScripts.push(relative.replaceAll('\\', '/'));
      }
      if (/^<link\b/i.test(tag) && name === 'href' && attribute(tag, 'rel') === 'stylesheet') {
        assert(relative, `Estilo deve ser local para permitir uso offline: ${reference}`);
      }
    }
    for (const name of ['for', 'aria-labelledby', 'aria-describedby', 'aria-controls']) {
      const reference = attribute(tag, name);
      if (reference) {
        for (const id of reference.split(/\s+/)) {
          assert(ids.has(id), `${name} aponta para identificador ausente: ${id}`);
        }
      }
    }
  }
  for (const filename of required.filter(filename => filename.endsWith('.js'))) {
    assert(loadedScripts.includes(filename), `Script obrigatório não está carregado no HTML: ${filename}`);
  }
  for (const [dependency, consumer] of [
    ['vendor/three.min.js', 'vendor/OrbitControls.js'],
    ['vendor/OrbitControls.js', 'src/scene.js'],
    ['src/science.js', 'src/scene.js'],
    ['src/evidence.js', 'src/app.js'],
    ['src/scene.js', 'src/app.js']
  ]) {
    assert(loadedScripts.indexOf(dependency) < loadedScripts.indexOf(consumer),
      `${dependency} deve ser carregado antes de ${consumer}.`);
  }
  for (const [filename, source] of sources) {
    if (!filename.startsWith('src/')) continue;
    for (const match of source.matchAll(/\bgetElementById\(\s*(['"])([^'"]+)\1\s*\)/g)) {
      assert(ids.has(match[2]), `${filename}: identificador HTML ausente: ${match[2]}`);
    }
  }
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!attribute(`<script${match[1]}>`, 'src') && match[2].trim()) {
      new vm.Script(match[2], { filename: 'index.html:script' });
    }
  }
  const css = await read('styles.css');
  for (const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/gi)) {
    const relative = localReference(match[1]);
    if (relative) {
      assert((await stat(path.join(root, relative))).isFile(), `Recurso CSS ausente: ${match[1]}`);
      references++;
    }
  }
  console.log(`Interface: ${ids.size} identificadores únicos; ${references} recursos locais encontrados.`);

  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(sources.get('src/science.js'), { filename: 'src/science.js' }).runInContext(sandbox);
  const science = sandbox.window.NexusScience;
  assert(science, 'src/science.js deve expor window.NexusScience.');
  assert.equal(typeof science.fieldHeight, 'function', 'fieldHeight deve ser uma função.');
  for (const radius of [0, 1, 5, 10, 20]) {
    for (const theta of [0, Math.PI / 2, Math.PI, Math.PI * 2]) {
      assert(Number.isFinite(science.fieldHeight(radius, theta)), 'Campo deve ser finito, inclusive no centro.');
    }
    assert(Math.abs(science.fieldHeight(radius, 0) - science.fieldHeight(radius, Math.PI * 2)) < 1e-10,
      'Campo deve fechar a volta em theta = 2π.');
  }
  checkScienceData(science);
  console.log('Ciência ilustrativa: campo finito e periódico; séries e incerteza coerentes.');
  console.log('Verificações concluídas. A renderização e as interações precisam de inspeção no navegador.');
}

function checkScienceData(science) {
  const close = (actual, expected, message) => assert(Math.abs(actual - expected) < 1e-10, message);
  close(science.fieldHeight(0), -29 / 3, 'Centro deve preservar a profundidade definida pelo modelo ilustrativo.');
  close(science.fieldHeight(10), -29 / 27, 'Amostra radial deve preservar a fórmula documentada.');
  close(science.fieldHeight(-1), science.fieldHeight(0), 'Raio negativo deve ser limitado ao centro.');
  let previousHeight = -Infinity;
  for (const radius of [0, 1, 5, 10, 20]) {
    const height = science.fieldHeight(radius);
    assert(height < 0 && height > previousHeight, 'Deformação deve se aproximar de zero com o raio.');
    close(height, science.fieldHeight(radius, Math.PI / 3), 'Campo radial deve ser simétrico em theta.');
    previousHeight = height;
  }
  assert(Array.isArray(science.series) && science.series.length >= 3, 'Série deve conter amostras suficientes.');
  let previousX = -Infinity;
  for (const point of science.series) {
    for (const key of ['x', 'model', 'observed', 'uncertainty', 'lower', 'upper', 'discrepancy']) {
      assert(Number.isFinite(point[key]), `Valor não finito na série: ${key}`);
      assert(point[key] >= 0 && point[key] <= 1, `Valor fora do intervalo normalizado: ${key}`);
    }
    assert(point.x > previousX, 'Eixo da série deve crescer sem amostras repetidas.');
    assert(point.uncertainty > 0, 'Envelope ilustrativo deve ter largura positiva.');
    assert(point.lower <= point.observed && point.observed <= point.upper,
      'Envelope deve conter a observação ilustrativa.');
    close(point.discrepancy, Math.abs(point.model - point.observed),
      'Discrepância deve refletir a diferença entre modelo e observação.');
    previousX = point.x;
  }
  close(science.series[0].x, 0, 'Série deve começar no limite normalizado zero.');
  close(science.series.at(-1).x, 1, 'Série deve terminar no limite normalizado um.');
  const discrepant = science.series.find(point => point.discrepancy > point.uncertainty);
  assert(discrepant, 'Exemplo deve conter uma região de discrepância visível.');
  close(science.discrepancyStart, discrepant.x, 'Início da discrepância deve corresponder às amostras.');
  assert(Array.isArray(science.uncertaintyMatrix) && science.uncertaintyMatrix.length > 0,
    'Matriz de incerteza deve conter linhas.');
  assert.equal(science.uncertaintyMatrix.length, science.rowLabels.length,
    'Rótulos de linhas devem corresponder à matriz.');
  assert(science.columnLabels.length > 0, 'Matriz deve ter colunas rotuladas.');
  const intensities = [];
  for (const row of science.uncertaintyMatrix) {
    assert.equal(row.length, science.columnLabels.length, 'Matriz deve ser retangular e rotulada.');
    for (const intensity of row) {
      assert(Number.isFinite(intensity) && intensity >= 0 && intensity <= 1,
        'Intensidade da matriz deve permanecer entre zero e um.');
      intensities.push(intensity);
    }
  }
  assert(new Set(intensities).size > 1, 'Mapa de incerteza deve conter variação.');
  assert.equal(science.metadata.status, 'SIMULATED DATA', 'Dados devem declarar sua natureza simulada.');
}

check().catch(error => {
  console.error(`Falha: ${error.message}`);
  process.exitCode = 1;
});
