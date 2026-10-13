(function () {
    'use strict';

    const science = window.NexusScience;
    if (!science) return;
    const NS = 'http://www.w3.org/2000/svg';
    const C = {
        white: '#e9e5dc', muted: '#a1a3a4', grid: '#303133',
        violet: '#aa8bd8', amber: '#e7ae57', crimson: '#db687b',
        background: '#151617', ink: '#151617'
    };
    let serial = 0;

    function svgNode(tag, attributes = {}, value) {
        const node = document.createElementNS(NS, tag);
        Object.entries(attributes).forEach(([key, attr]) => node.setAttribute(key, attr));
        if (value !== undefined) node.textContent = value;
        return node;
    }

    function text(svg, x, y, value, attributes = {}) {
        const node = svgNode('text', {
            x, y, fill: C.muted, 'font-size': 12,
            'font-family': 'Consolas, monospace', ...attributes
        }, value);
        svg.appendChild(node);
        return node;
    }

    function line(svg, x1, y1, x2, y2, attributes = {}) {
        svg.appendChild(svgNode('line', { x1, y1, x2, y2, stroke: C.grid, ...attributes }));
    }

    function createChart(id, title, description, height, moduleId, note) {
        const host = document.getElementById(id);
        if (!host) return null;
        host.replaceChildren();
        const heading = document.createElement('div');
        heading.className = 'evidence-heading';
        const name = document.createElement('span');
        name.className = 'evidence-title';
        name.textContent = title;
        const badge = document.createElement('span');
        badge.className = 'data-badge';
        badge.textContent = science.metadata.status;
        heading.append(name, badge);

        const uid = `evidence-${++serial}`;
        const svg = svgNode('svg', {
            viewBox: `0 0 360 ${height}`, width: '100%',
            role: 'img', 'aria-labelledby': `${uid}-title ${uid}-desc`,
            class: 'evidence-chart', preserveAspectRatio: 'xMidYMid meet'
        });
        svg.style.display = 'block';
        svg.appendChild(svgNode('title', { id: `${uid}-title` }, `${title} — SIMULATED DATA`));
        svg.appendChild(svgNode('desc', { id: `${uid}-desc` }, description));
        const explanation = document.createElement('p');
        explanation.className = 'evidence-note';
        explanation.textContent = note;
        const readout = document.createElement('p');
        readout.className = 'chart-readout';
        readout.setAttribute('aria-live', 'polite');
        readout.textContent = 'Passe o cursor ou use Tab para ler os valores.';
        const inspect = document.createElement('button');
        inspect.type = 'button';
        inspect.className = 'chart-inspect';
        inspect.textContent = 'Inspecionar módulo conectado ↗';
        inspect.addEventListener('click', () => {
            if (window.NexusScene && typeof window.NexusScene.inspect === 'function') {
                window.NexusScene.inspect(moduleId);
            }
        });
        host.append(heading, svg, explanation, readout, inspect);
        return { svg, readout };
    }

    function interactive(node, value, readout) {
        node.setAttribute('tabindex', '0');
        node.setAttribute('role', 'img');
        node.setAttribute('aria-label', value);
        node.appendChild(svgNode('title', {}, value));
        node.addEventListener('mouseenter', () => { readout.textContent = value; });
        node.addEventListener('focus', () => { readout.textContent = value; });
    }

    function pathFrom(points, x, y, accessor) {
        return points.map((point, index) => `${index ? 'L' : 'M'}${x(point.x).toFixed(2)},${y(accessor(point)).toFixed(2)}`).join(' ');
    }

    function drawComparison() {
        const chart = createChart('chart-comparison', '01 / MODEL VS. OBSERVATION',
            'Modelo e observações ilustrativos, sem unidades, de zero a um. A faixa violeta representa a incerteza assumida das observações. Uma região carmim separada destaca a divergência além dessa faixa.',
            234, 'mod-obs',
            'Exemplo normalizado. A faixa ± representa a incerteza assumida; a área carmim indica a discrepância além da faixa. Os dados são ilustrativos.');
        if (!chart) return;
        const { svg, readout } = chart;
        const x = value => 45 + value * 296;
        const y = value => 170 - value * 136;
        [0, 0.25, 0.5, 0.75, 1].forEach(tick => {
            line(svg, x(0), y(tick), x(1), y(tick));
            text(svg, 35, y(tick) + 4, tick.toFixed(2), { 'text-anchor': 'end', 'font-size': 11 });
            line(svg, x(tick), y(0), x(tick), y(0) + 5, { stroke: C.muted });
            text(svg, x(tick), 189, tick.toFixed(2), { 'text-anchor': 'middle', 'font-size': 11 });
        });
        line(svg, x(0), y(0), x(1), y(0), { stroke: C.muted });
        line(svg, x(0), y(0), x(0), y(1), { stroke: C.muted });
        text(svg, 193, 207, 'Entrada normalizada', { 'text-anchor': 'middle' });
        text(svg, 13, 110, 'Resposta normalizada', {
            transform: 'rotate(-90 13 110)', 'text-anchor': 'middle', 'font-size': 11
        });

        const series = science.series;
        const bandPath = pathFrom(series, x, y, point => point.upper)
            + ' ' + pathFrom([...series].reverse(), x, y, point => point.lower).replace(/^M/, 'L') + ' Z';
        svg.appendChild(svgNode('path', { d: bandPath, fill: C.violet, 'fill-opacity': 0.2 }));
        const divergent = series.filter(point => point.x >= science.discrepancyStart);
        const gapPath = pathFrom(divergent, x, y, point => point.model)
            + ' ' + pathFrom([...divergent].reverse(), x, y, point => point.upper).replace(/^M/, 'L') + ' Z';
        svg.appendChild(svgNode('path', { d: gapPath, fill: C.crimson, 'fill-opacity': 0.22 }));
        svg.appendChild(svgNode('path', {
            d: pathFrom(series, x, y, point => point.model), fill: 'none', stroke: C.white, 'stroke-width': 2
        }));
        svg.appendChild(svgNode('path', {
            d: pathFrom(series, x, y, point => point.observed), fill: 'none', stroke: C.amber,
            'stroke-width': 2, 'stroke-dasharray': '5 3'
        }));
        line(svg, x(science.discrepancyStart), y(0), x(science.discrepancyStart), y(1), {
            stroke: C.crimson, 'stroke-dasharray': '3 4', 'stroke-opacity': 0.7
        });
        text(svg, 333, 29, 'DISCREPÂNCIA', { fill: C.crimson, 'text-anchor': 'end', 'font-size': 11 });

        series.forEach((point, index) => {
            if (index % 4 !== 0) return;
            const dot = svgNode('circle', {
                cx: x(point.x), cy: y(point.observed), r: 3.5,
                fill: C.amber, stroke: C.background, 'stroke-width': 1
            });
            interactive(dot,
                `x ${point.x.toFixed(2)} · modelo ${point.model.toFixed(3)} · observação ${point.observed.toFixed(3)} ± ${point.uncertainty.toFixed(3)} · discrepância ${point.discrepancy.toFixed(3)} (simulado)`, readout);
            svg.appendChild(dot);
        });
        line(svg, 45, 224, 61, 224, { stroke: C.white, 'stroke-width': 2 });
        text(svg, 67, 228, 'Modelo', { 'font-size': 11 });
        line(svg, 121, 224, 138, 224, { stroke: C.amber, 'stroke-width': 2, 'stroke-dasharray': '4 2' });
        text(svg, 145, 228, 'Observação', { 'font-size': 11 });
        svg.appendChild(svgNode('rect', { x: 246, y: 218, width: 12, height: 12, fill: C.violet, 'fill-opacity': 0.4 }));
        text(svg, 264, 228, 'Faixa ±', { 'font-size': 11 });
    }

    function drawDependencies() {
        const chart = createChart('chart-dependencies', '02 / HYPOTHESIS TESTING',
            'Grafo dirigido de dependências ilustrativas. Dois modelos alimentam parâmetros de forma, desvio e faixa. Os parâmetros alimentam comparações dentro e fora da faixa assumida. Os resultados representam exemplos simulados.',
            190, 'mod-the',
            'Dependências ilustrativas entre modelos, parâmetros e comparações. A concordância em um intervalo sintético é um teste limitado, sem validar uma teoria.');
        if (!chart) return;
        const { svg, readout } = chart;
        const markerId = `dependency-arrow-${serial}`;
        const defs = svgNode('defs');
        const marker = svgNode('marker', {
            id: markerId, viewBox: '0 0 8 8', refX: 7, refY: 4,
            markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse'
        });
        marker.appendChild(svgNode('path', { d: 'M0 0 L8 4 L0 8 Z', fill: C.muted }));
        defs.appendChild(marker);
        svg.appendChild(defs);
        text(svg, 57, 21, 'MODELOS', { 'text-anchor': 'middle', 'font-size': 11 });
        text(svg, 176, 21, 'PARÂMETROS', { 'text-anchor': 'middle', 'font-size': 11 });
        text(svg, 299, 21, 'EVIDÊNCIA', { 'text-anchor': 'middle', 'font-size': 11 });

        const nodes = [
            { x: 57, y: 65, code: 'M1', label: 'Referência', color: C.violet },
            { x: 57, y: 137, code: 'M2', label: 'Candidato', color: C.violet },
            { x: 176, y: 48, code: 'P1', label: 'Forma', color: C.amber },
            { x: 176, y: 101, code: 'P2', label: 'Desvio', color: C.amber },
            { x: 176, y: 154, code: 'P3', label: 'Faixa ±', color: C.amber },
            { x: 299, y: 65, code: 'E1', label: 'Na faixa', color: C.white },
            { x: 299, y: 137, code: 'E2', label: 'Fora da faixa', color: C.crimson }
        ];
        [[0, 2], [0, 3], [1, 3], [1, 4], [2, 5], [3, 5], [3, 6], [4, 6]].forEach(([from, to]) => {
            const a = nodes[from], b = nodes[to];
            const edge = svgNode('path', {
                d: `M${a.x + 43} ${a.y} C${a.x + 62} ${a.y},${b.x - 62} ${b.y},${b.x - 45} ${b.y}`,
                fill: 'none', stroke: to === 6 ? C.crimson : C.muted,
                'stroke-opacity': 0.55, 'stroke-width': 1.3,
                'marker-end': `url(#${markerId})`
            });
            if (to === 6) edge.setAttribute('stroke-dasharray', '4 3');
            svg.appendChild(edge);
        });
        nodes.forEach(node => {
            const group = svgNode('g');
            group.appendChild(svgNode('rect', {
                x: node.x - 44, y: node.y - 19, width: 88, height: 38, rx: 4,
                fill: C.background, stroke: node.color, 'stroke-opacity': 0.7
            }));
            text(group, node.x, node.y - 3, node.code, {
                fill: node.color, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600
            });
            text(group, node.x, node.y + 11, node.label, { 'text-anchor': 'middle', 'font-size': 10 });
            interactive(group, `${node.code}: ${node.label}. Dependência ilustrativa.`, readout);
            svg.appendChild(group);
        });
    }

    function heatColor(value) {
        const low = [170, 139, 216], high = [231, 174, 87];
        return `rgb(${low.map((channel, index) => Math.round(channel + (high[index] - channel) * value)).join(',')})`;
    }

    function drawUncertainty() {
        const chart = createChart('chart-uncertainty', '03 / UNCERTAINTY MATRIX',
            'Cinco estratos ilustrativos S1 a S5 e seis parâmetros P1 a P6. Cada célula mostra um índice numérico de incerteza de zero a um. Violeta indica menor índice e âmbar indica maior índice. A escala contínua descreve apenas incerteza.',
            226, 'mod-val',
            'Índice de incerteza assumido de 0 a 1. Linhas: estratos. Colunas: parâmetros. A cor expressa incerteza, sem atribuir validação ou falha.');
        if (!chart) return;
        const { svg, readout } = chart;
        const originX = 50, originY = 36, cellW = 47, cellH = 27;
        science.columnLabels.forEach((label, column) => {
            text(svg, originX + column * cellW + 22, 26, label, { 'text-anchor': 'middle' });
        });
        science.uncertaintyMatrix.forEach((row, rowIndex) => {
            text(svg, 39, originY + rowIndex * cellH + 18, science.rowLabels[rowIndex], { 'text-anchor': 'end' });
            row.forEach((value, column) => {
                const group = svgNode('g');
                group.appendChild(svgNode('rect', {
                    x: originX + column * cellW, y: originY + rowIndex * cellH,
                    width: cellW - 3, height: cellH - 3, rx: 2, fill: heatColor(value)
                }));
                text(group, originX + column * cellW + 22, originY + rowIndex * cellH + 17,
                    value.toFixed(2), { fill: C.ink, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600 });
                interactive(group,
                    `${science.rowLabels[rowIndex]}, ${science.columnLabels[column]}: incerteza assumida ${value.toFixed(2)} de 1 (simulado)`, readout);
                svg.appendChild(group);
            });
        });
        const gradientId = `uncertainty-gradient-${serial}`;
        const defs = svgNode('defs');
        const gradient = svgNode('linearGradient', { id: gradientId });
        gradient.appendChild(svgNode('stop', { offset: '0%', 'stop-color': heatColor(0) }));
        gradient.appendChild(svgNode('stop', { offset: '100%', 'stop-color': heatColor(1) }));
        defs.appendChild(gradient);
        svg.appendChild(defs);
        text(svg, 50, 190, 'MENOR', { 'font-size': 10 });
        text(svg, 328, 190, 'MAIOR', { 'text-anchor': 'end', 'font-size': 10 });
        svg.appendChild(svgNode('rect', { x: 50, y: 196, width: 279, height: 9, fill: `url(#${gradientId})`, rx: 2 }));
        [0, 0.25, 0.5, 0.75, 1].forEach(tick => {
            text(svg, 50 + 279 * tick, 222, tick.toFixed(2), { 'text-anchor': 'middle', 'font-size': 10 });
        });
    }

    function drawSection() {
        const chart = createChart('chart-section', '04 / GEOMETRIC SECTION',
            'Seção da mesma deformação conceitual, com simetria radial, usada na cena 3D. O centro possui uma lacuna intencional dentro do raio 1.8. A coordenada radial vai de menos 15.5 a mais 15.5, com altura relativa nas coordenadas do modelo.',
            210, 'core',
            'A seção e a malha 3D compartilham h(r) = −5.8 / (0.48r + 0.6). Superfície geométrica ilustrativa; a região central é omitida por escolha do modelo.');
        if (!chart) return;
        const { svg, readout } = chart;
        const x = value => 51 + (value + 15.5) / 31 * 288;
        const y = value => 43 - value * 34;
        [0, -1, -2, -3, -4].forEach(tick => {
            line(svg, x(-15.5), y(tick), x(15.5), y(tick));
            text(svg, 41, y(tick) + 4, tick.toFixed(0), { 'text-anchor': 'end', 'font-size': 11 });
        });
        [-15, -10, -5, 0, 5, 10, 15].forEach(tick => {
            text(svg, x(tick), 191, tick.toString(), { 'text-anchor': 'middle', 'font-size': 10 });
        });
        line(svg, x(-15.5), y(0), x(15.5), y(0), { stroke: C.muted, 'stroke-dasharray': '4 3' });
        text(svg, 334, 30, 'PLANO DE REFERÊNCIA', { 'text-anchor': 'end', 'font-size': 10 });
        svg.appendChild(svgNode('rect', {
            x: x(-1.8), y: 43, width: x(1.8) - x(-1.8), height: 134,
            fill: C.violet, 'fill-opacity': 0.12
        }));
        [-1, 1].forEach(side => {
            const samples = Array.from({ length: 70 }, (_, index) => {
                const radial = 1.8 + index / 69 * (15.5 - 1.8);
                return { x: side * radial, height: science.fieldHeight(radial) };
            });
            svg.appendChild(svgNode('path', {
                d: pathFrom(samples, x, y, point => point.height),
                fill: 'none', stroke: C.white, 'stroke-width': 2
            }));
            [2, 5, 10, 15].forEach(radial => {
                const height = science.fieldHeight(radial);
                const dot = svgNode('circle', { cx: x(side * radial), cy: y(height), r: 3, fill: C.amber });
                interactive(dot, `Raio ${radial.toFixed(1)} · altura relativa ${height.toFixed(3)} (coordenadas do modelo conceitual)`, readout);
                svg.appendChild(dot);
            });
        });
        text(svg, 195, 168, 'LACUNA', { fill: C.violet, 'text-anchor': 'middle', 'font-size': 9 });
        text(svg, 195, 207, 'Coordenada radial / unidades do modelo', { 'text-anchor': 'middle', 'font-size': 10 });
        text(svg, 13, 112, 'Altura relativa', { transform: 'rotate(-90 13 112)', 'text-anchor': 'middle', 'font-size': 11 });
    }

    drawComparison();
    drawDependencies();
    drawUncertainty();
    drawSection();
})();
