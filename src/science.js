(function () {
    'use strict';

    // These dimensionless examples support the atlas narrative. They are not
    // measurements, fitted physical models, or statistical confidence intervals.
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const smoothstep = (start, end, value) => {
        const t = clamp((value - start) / (end - start), 0, 1);
        return t * t * (3 - 2 * t);
    };

    function fieldHeight(radius, theta = 0) {
        // theta is deliberately unused: this conceptual surface is rotationally
        // symmetric. The same function drives the 3D mesh and its 2D section.
        void theta;
        return -5.8 / (Math.max(0, radius) * 0.48 + 0.6);
    }

    const series = Object.freeze(Array.from({ length: 33 }, (_, index) => {
        const x = index / 32;
        const model = 0.12 + 0.77 * Math.pow(x, 1.35);
        const observed = model - 0.49 * smoothstep(0.54, 1, x)
            + 0.008 * Math.sin(index * 0.83);
        const uncertainty = 0.025 + 0.012 * x + 0.018 * x * x;
        return Object.freeze({
            x,
            model,
            observed,
            uncertainty,
            lower: clamp(observed - uncertainty, 0, 1),
            upper: clamp(observed + uncertainty, 0, 1),
            discrepancy: Math.abs(model - observed)
        });
    }));

    const rowLabels = Object.freeze(['S1', 'S2', 'S3', 'S4', 'S5']);
    const columnLabels = Object.freeze(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
    const uncertaintyMatrix = Object.freeze(rowLabels.map((_, row) =>
        Object.freeze(columnLabels.map((__, column) => {
            const base = 0.08 + 0.075 * column + 0.032 * row;
            const ridge = 0.39 * Math.exp(-Math.pow(column - 3.6, 2) / 2.2
                - Math.pow(row - 2.1, 2) / 2.1);
            const modulation = 0.07 * (1 + Math.sin((row + 1) * (column + 2) * 0.72));
            return Math.round(clamp(base + ridge + modulation, 0, 1) * 100) / 100;
        }))));

    const firstDiscrepancy = series.find(point => point.discrepancy > point.uncertainty);
    window.NexusScience = Object.freeze({
        fieldHeight,
        series,
        uncertaintyMatrix,
        rowLabels,
        columnLabels,
        discrepancyStart: firstDiscrepancy ? firstDiscrepancy.x : null,
        metadata: Object.freeze({
            status: 'SIMULATED DATA',
            units: 'dimensionless / normalized',
            uncertainty: 'Assumed illustrative ± envelope; not a confidence interval.',
            field: 'Conceptual radial deformation; not a solution of gravitational field equations.'
        })
    });
})();
