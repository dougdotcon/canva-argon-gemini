(function() {
        'use strict';
        const status = document.getElementById('scene-status');
        function showStatus(message, failed = false) {
            if (!status) return;
            status.textContent = message;
            status.hidden = false;
            status.classList.toggle('is-error', failed);
            status.setAttribute('role', failed ? 'alert' : 'status');
        }
        try {
            if (!window.THREE || !THREE.OrbitControls) {
                throw new Error('A biblioteca 3D não carregou. Verifique a conexão e recarregue a página.');
            }
            const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            let reducedMotion = reducedMotionQuery.matches;
            let motionEnabled = !reducedMotion;
            let labelsEnabled = true;
            let dirty = true;
            let contextLost = false;
            let selectedId = 'c-geom';
            const fieldHeight = window.NexusScience?.fieldHeight || ((radius) => -5.8 / (radius * 0.48 + 0.6));

            // 2. INITIALIZE THREE.JS SCENE, CAMERA, RENDERER
            const container = document.getElementById('webgl-container');
            const scene = new THREE.Scene();
            scene.fog = new THREE.FogExp2(0x0a0b0e, 0.008);

            const camera = new THREE.PerspectiveCamera(34, container.clientWidth / container.clientHeight, 0.1, 1000);
            // Three-quarter axonometric perspective tilt
            camera.position.set(42, 30, 46);

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, container.clientWidth < 800 ? 1.5 : 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.15;
            renderer.outputEncoding = THREE.sRGBEncoding;
            container.appendChild(renderer.domElement);
            renderer.domElement.setAttribute('aria-label', 'Instalação científica Tamesis Nexus em 3D. Arraste para orbitar; use os controles para inspecionar os subsistemas.');
            renderer.domElement.setAttribute('role', 'img');

            const controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.target.set(0, 1, 0);
            controls.maxDistance = 180;
            controls.minDistance = 4;

            // 3. LIGHTING STRATEGY (Requirement 6)
            const ambientLight = new THREE.AmbientLight(0xd8dce6, 0.55);
            scene.add(ambientLight);

            // Broad Soft Key Light
            const keyLight = new THREE.DirectionalLight(0xfffcf5, 1.8);
            keyLight.position.set(35, 60, 40);
            keyLight.castShadow = true;
            keyLight.shadow.mapSize.width = container.clientWidth < 800 ? 1024 : 2048;
            keyLight.shadow.mapSize.height = keyLight.shadow.mapSize.width;
            keyLight.shadow.camera.near = 10;
            keyLight.shadow.camera.far = 140;
            const d = 35;
            keyLight.shadow.camera.left = -d;
            keyLight.shadow.camera.right = d;
            keyLight.shadow.camera.top = d;
            keyLight.shadow.camera.bottom = -d;
            keyLight.shadow.bias = -0.0005;
            scene.add(keyLight);

            // Rim Light to separate structure from graphite background
            const rimLight = new THREE.DirectionalLight(0x90a4ae, 1.1);
            rimLight.position.set(-45, 25, -40);
            scene.add(rimLight);

            // Subtle under-fill warm copper reflection
            const underLight = new THREE.DirectionalLight(0xb86b43, 0.45);
            underLight.position.set(0, -40, 10);
            scene.add(underLight);

            // Core Internal Point Light (Deep Violet / Amber glow)
            const coreLight = new THREE.PointLight(0x7c3aed, 2.2, 28);
            coreLight.position.set(0, 2, 0);
            scene.add(coreLight);

            // 4. CONTROLLED CHROMATIC PALETTE MATERIALS (Requirement 3 & 6)
            const MAT = {
                titanium: new THREE.MeshStandardMaterial({
                    color: 0x8c939e, metalness: 0.82, roughness: 0.32
                }),
                darkTitanium: new THREE.MeshStandardMaterial({
                    color: 0x2a2e37, metalness: 0.85, roughness: 0.4
                }),
                mineralWhite: new THREE.MeshStandardMaterial({
                    color: 0xf2f0ea, metalness: 0.1, roughness: 0.25
                }),
                oxidizedCopper: new THREE.MeshStandardMaterial({
                    color: 0xb86b43, metalness: 0.75, roughness: 0.45
                }),
                patinaCopper: new THREE.MeshStandardMaterial({
                    color: 0x5c7a6b, metalness: 0.4, roughness: 0.65
                }),
                glass: new THREE.MeshPhysicalMaterial({
                    color: 0xf2f0ea, transparent: true, opacity: 0.24,
                    roughness: 0.08, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false
                }),
                violetGlass: new THREE.MeshPhysicalMaterial({
                    color: 0x7c3aed, emissive: 0x2e1065, emissiveIntensity: 0.4,
                    transparent: true, opacity: 0.38, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false
                }),
                amberEmissive: new THREE.MeshStandardMaterial({
                    color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.5, roughness: 0.2
                }),
                emeraldEmissive: new THREE.MeshStandardMaterial({
                    color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.3, roughness: 0.2
                }),
                crimsonEmissive: new THREE.MeshStandardMaterial({
                    color: 0xe11d48, emissive: 0xe11d48, emissiveIntensity: 1.6, roughness: 0.2
                }),
                violetEmissive: new THREE.MeshStandardMaterial({
                    color: 0x7c3aed, emissive: 0x7c3aed, emissiveIntensity: 1.3, roughness: 0.25
                }),
                wireTitanium: new THREE.LineBasicMaterial({ color: 0x8c939e, transparent: true, opacity: 0.35 }),
                wireWhite: new THREE.LineBasicMaterial({ color: 0xf2f0ea, transparent: true, opacity: 0.55 }),
                wireAmber: new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8 }),
                wireViolet: new THREE.LineBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.65 }),
                wireEmerald: new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.75 }),
                wireCrimson: new THREE.LineBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0.85 })
            };

            // 5. SPATIAL LAYER GROUPS (Requirement 5: 5-Level Axonometric Explosion)
            const masterComplex = new THREE.Group();
            scene.add(masterComplex);

            const layers = {
                1: new THREE.Group(), // Level 1 — Infrastructure & Experimental Observatory Base
                2: new THREE.Group(), // Level 2 — Computational Architecture & Data Distribution
                3: new THREE.Group(), // Level 3 — Fundamental Geometry Core & Deformable Spacetime
                4: new THREE.Group(), // Level 4 — Observation & Abstract Neural System
                5: new THREE.Group()  // Level 5 — Scientific Evidence Modules & Interpretation
            };

            // Base vertical offsets and explosion multipliers
            const layerConfig = {
                1: { baseY: -10.5, explodeOffset: -9.5 },
                2: { baseY: -5.0,  explodeOffset: -4.5 },
                3: { baseY: 2.0,   explodeOffset: 0.0  },
                4: { baseY: 8.5,   explodeOffset: 5.5  },
                5: { baseY: 13.5,  explodeOffset: 10.5 }
            };

            Object.keys(layers).forEach(k => {
                masterComplex.add(layers[k]);
            });

            // Helper function to add micro-bolts/fasteners around circular flanges
            function addMicroBolts(parent, radius, yPos, count, mat = MAT.oxidizedCopper) {
                const boltGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 6);
                for (let i = 0; i < count; i++) {
                    const ang = (i / count) * Math.PI * 2;
                    const bolt = new THREE.Mesh(boltGeo, mat);
                    bolt.position.set(Math.cos(ang) * radius, yPos, Math.sin(ang) * radius);
                    parent.add(bolt);
                }
            }

            // =========================================================================
            // SUBSYSTEM A & B (LEVEL 3): FUNDAMENTAL GEOMETRY CORE & DEFORMABLE SPACETIME
            // =========================================================================
            const coreGroup = new THREE.Group();
            layers[3].add(coreGroup);

            // 1. Inner Topological Complex Sphere (Multi-layered concentric shells)
            const innerCoreSphere = new THREE.Mesh(
                new THREE.IcosahedronGeometry(1.7, 3),
                new THREE.MeshStandardMaterial({
                    color: 0x1a1c23, metalness: 0.9, roughness: 0.25, transparent: true, opacity: 0.6, depthWrite: false
                })
            );
            coreGroup.add(innerCoreSphere);

            // Topological mathematical Knot inside sphere
            const topoKnot = new THREE.Mesh(
                new THREE.TorusKnotGeometry(1.05, 0.22, 96, 16, 2, 3),
                MAT.oxidizedCopper
            );
            coreGroup.add(topoKnot);

            // Concentric shell 2: Geodesic Curved Field Lines around sphere
            const geoLinesGroup = new THREE.Group();
            for (let i = 0; i < 6; i++) {
                const curvePts = [];
                const rad = 2.35;
                const tilt = (i / 6) * Math.PI;
                for (let j = 0; j <= 64; j++) {
                    const t = (j / 64) * Math.PI * 2;
                    const x = Math.cos(t) * rad;
                    const y = Math.sin(t) * Math.sin(tilt) * rad;
                    const z = Math.sin(t) * Math.cos(tilt) * rad;
                    curvePts.push(new THREE.Vector3(x, y, z));
                }
                const geoLine = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints(curvePts),
                    i % 2 === 0 ? MAT.wireAmber : MAT.wireViolet
                );
                geoLinesGroup.add(geoLine);
            }
            coreGroup.add(geoLinesGroup);

            // 2. Partially Transparent Central Icosahedron + Vertex Connection Network
            const icosaGeo = new THREE.IcosahedronGeometry(3.4, 0);
            const icosaMesh = new THREE.Mesh(icosaGeo, MAT.glass);
            coreGroup.add(icosaMesh);

            const icosaEdges = new THREE.LineSegments(
                new THREE.EdgesGeometry(icosaGeo),
                MAT.wireWhite
            );
            coreGroup.add(icosaEdges);

            // Vertex nodes & internal vertex-to-origin struts
            const posAttr = icosaGeo.attributes.position;
            const uniqueVerts = [];
            for (let i = 0; i < posAttr.count; i++) {
                const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
                if (!uniqueVerts.some(u => u.distanceTo(v) < 0.01)) {
                    uniqueVerts.push(v);
                }
            }
            const nodeSphereGeo = new THREE.SphereGeometry(0.16, 12, 12);
            uniqueVerts.forEach((v, idx) => {
                const node = new THREE.Mesh(nodeSphereGeo, idx % 3 === 0 ? MAT.amberEmissive : MAT.oxidizedCopper);
                node.position.copy(v);
                coreGroup.add(node);

                // Internal vertex connection network
                const strutGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), v]);
                coreGroup.add(new THREE.Line(strutGeo, MAT.wireViolet));
            });

            // 3. Three Interlaced Toroidal Rings (Different orientations, thicknesses, and materials)
            const ring1 = new THREE.Group(); // Outer Heavy Brushed Titanium Ring
            const r1Mesh = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.36, 24, 96), MAT.titanium);
            r1Mesh.castShadow = true;
            ring1.add(r1Mesh);
            // Mechanical clamps on Ring 1
            for (let c = 0; c < 8; c++) {
                const a = (c / 8) * Math.PI * 2;
                const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.45), MAT.darkTitanium);
                clamp.position.set(Math.cos(a) * 6.2, Math.sin(a) * 6.2, 0);
                clamp.rotation.z = a;
                ring1.add(clamp);
            }
            ring1.rotation.set(Math.PI / 5, Math.PI / 8, 0);
            coreGroup.add(ring1);

            const ring2 = new THREE.Group(); // Middle Oxidized Copper Precision Ring
            const r2Mesh = new THREE.Mesh(new THREE.TorusGeometry(5.1, 0.24, 20, 84), MAT.oxidizedCopper);
            r2Mesh.castShadow = true;
            ring2.add(r2Mesh);
            ring2.rotation.set(-Math.PI / 3, Math.PI / 4, Math.PI / 6);
            coreGroup.add(ring2);

            const ring3 = new THREE.Group(); // Inner Mineral White / Deep Violet Calibration Ring
            const r3Mesh = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.15, 16, 72), MAT.mineralWhite);
            ring3.add(r3Mesh);
            ring3.rotation.set(Math.PI / 2.2, -Math.PI / 5, 0);
            coreGroup.add(ring3);

            // Mathematical Ribbon Surface piercing partially through the rings
            const surfaceCurvePts = [];
            for (let i = 0; i <= 80; i++) {
                const t = (i / 80) * Math.PI * 2;
                surfaceCurvePts.push(new THREE.Vector3(
                    Math.cos(t) * (4.8 + Math.sin(t * 3) * 1.4),
                    Math.sin(t * 2) * 2.6,
                    Math.sin(t) * (4.8 + Math.cos(t * 3) * 1.4)
                ));
            }
            const mathSurfaceCurve = new THREE.CatmullRomCurve3(surfaceCurvePts, true);
            const mathRibbonMesh = new THREE.Mesh(
                new THREE.TubeGeometry(mathSurfaceCurve, 120, 0.18, 8, true),
                MAT.violetGlass
            );
            coreGroup.add(mathRibbonMesh);

            // 4. Mechanical Support Gimbals & Orbital Satellites
            const gimbalStanchionGeo = new THREE.CylinderGeometry(0.22, 0.35, 14, 12);
            for (let s = 0; s < 3; s++) {
                const ang = (s / 3) * Math.PI * 2 + 0.4;
                const stanchion = new THREE.Mesh(gimbalStanchionGeo, MAT.darkTitanium);
                stanchion.position.set(Math.cos(ang) * 7.2, 0, Math.sin(ang) * 7.2);
                stanchion.rotation.z = Math.sin(ang) * 0.15;
                stanchion.rotation.x = Math.cos(ang) * 0.15;
                coreGroup.add(stanchion);
            }

            // Small Orbital Components in distinct planes
            const orbitalsGroup = new THREE.Group();
            for (let o = 0; o < 5; o++) {
                const orbPivot = new THREE.Group();
                orbPivot.rotation.set(o * 0.7, o * 1.1, o * 0.4);
                const radius = 6.8 + (o % 2) * 1.4;
                const sat = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), o % 2 === 0 ? MAT.mineralWhite : MAT.amberEmissive);
                sat.position.set(radius, 0, 0);
                orbPivot.add(sat);

                // Faint orbital track
                const track = new THREE.LineLoop(
                    new THREE.BufferGeometry().setFromPoints(
                        new THREE.Path().absarc(0, 0, radius, 0, Math.PI * 2, false).getPoints(64)
                    ),
                    MAT.wireTitanium
                );
                track.rotation.x = Math.PI / 2;
                orbPivot.add(track);
                orbitalsGroup.add(orbPivot);
            }
            coreGroup.add(orbitalsGroup);

            // 5. SUBSYSTEM B: Deformable 3D Spacetime Mesh (Gravity Well & Interrupted Horizon)
            const spacetimeGroup = new THREE.Group();
            spacetimeGroup.position.y = -2.2;
            layers[3].add(spacetimeGroup);

            const gridRadius = 15.5;
            const radialRings = 16;
            const angularSpokes = 36;

            // Radial concentric deformed rings (Higher density near central mass)
            for (let r = 1; r <= radialRings; r++) {
                const norm = Math.pow(r / radialRings, 1.35); // Non-uniform density!
                const rad = 2.0 + norm * (gridRadius - 2.0);
                const depression = fieldHeight(rad);

                const ringPts = [];
                for (let a = 0; a <= angularSpokes * 2; a++) {
                    const theta = (a / (angularSpokes * 2)) * Math.PI * 2;
                    // Create interrupted model limit gaps in inner horizon (r <= 3)
                    if (r <= 3 && (a % 6 === 0)) {
                        if (ringPts.length > 1) {
                            spacetimeGroup.add(new THREE.Line(
                                new THREE.BufferGeometry().setFromPoints(ringPts),
                                MAT.wireCrimson
                            ));
                        }
                        ringPts.length = 0;
                    } else {
                        ringPts.push(new THREE.Vector3(
                            Math.cos(theta) * rad,
                            depression,
                            Math.sin(theta) * rad
                        ));
                    }
                }
                if (ringPts.length > 1) {
                    spacetimeGroup.add(new THREE.Line(
                        new THREE.BufferGeometry().setFromPoints(ringPts),
                        r <= 3 ? MAT.wireCrimson : (r % 4 === 0 ? MAT.wireWhite : MAT.wireTitanium)
                    ));
                }
            }

            // Angular geodesic spokes curving down into central mass
            for (let a = 0; a < angularSpokes; a++) {
                const theta = (a / angularSpokes) * Math.PI * 2;
                const spokePts = [];
                const startR = (a % 3 === 0) ? 1.8 : 3.2; // Variable density & model limit truncation
                for (let r = 0; r <= 24; r++) {
                    const rad = startR + (r / 24) * (gridRadius - startR);
                    const depression = fieldHeight(rad, theta);
                    spokePts.push(new THREE.Vector3(
                        Math.cos(theta) * rad,
                        depression,
                        Math.sin(theta) * rad
                    ));
                }
                spacetimeGroup.add(new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints(spokePts),
                    a % 6 === 0 ? MAT.wireWhite : MAT.wireTitanium
                ));
            }

            // Curved Particle Trajectories skimming the gravitational well
            const particleCurves = [];
            for (let p = 0; p < 3; p++) {
                const pts = [];
                const offsetAng = (p / 3) * Math.PI * 2;
                for (let t = -12; t <= 12; t += 0.5) {
                    const x = t;
                    const z = 3.2 + Math.sin(t * 0.25) * 1.8;
                    const v = new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0,1,0), offsetAng);
                    const dist = Math.sqrt(v.x * v.x + v.z * v.z);
                    v.y = fieldHeight(dist, Math.atan2(v.z, v.x)) + 0.35;
                    pts.push(v);
                }
                const pCurve = new THREE.CatmullRomCurve3(pts);
                particleCurves.push(pCurve);
                const trajTube = new THREE.Mesh(
                    new THREE.TubeGeometry(pCurve, 64, 0.055, 6, false),
                    p === 0 ? MAT.amberEmissive : (p === 1 ? MAT.emeraldEmissive : MAT.crimsonEmissive)
                );
                spacetimeGroup.add(trajTube);
            }

            // =========================================================================
            // SUBSYSTEM C (LEVEL 2): COMPUTATIONAL ARCHITECTURE (Stacked Tower & 3 Paths)
            // =========================================================================
            const compGroup = new THREE.Group();
            layers[2].add(compGroup);

            // Positioned in back-left quadrant (-9, 0, -6) converging to central core
            const towerPos = new THREE.Vector3(-9.5, 0, -6.5);
            const towerStack = new THREE.Group();
            towerStack.position.copy(towerPos);
            compGroup.add(towerStack);

            const numStackLevels = 5;
            for (let lvl = 0; lvl < numStackLevels; lvl++) {
                const y = (lvl - 2) * 1.65;
                const modGroup = new THREE.Group();
                modGroup.position.y = y;

                // Structural plate
                const plate = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.35, 8), MAT.darkTitanium);
                plate.castShadow = true;
                plate.receiveShadow = true;
                modGroup.add(plate);

                // Radial cooling heatsink fins
                for (let f = 0; f < 16; f++) {
                    const ang = (f / 16) * Math.PI * 2;
                    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.08), MAT.titanium);
                    fin.position.set(Math.cos(ang) * 2.8, 0.45, Math.sin(ang) * 2.8);
                    fin.rotation.y = -ang;
                    modGroup.add(fin);
                }

                // Removable hot-swap compute bays (Mineral White & Oxidized Copper)
                for (let b = 0; b < 4; b++) {
                    const ang = (b / 4) * Math.PI * 2 + 0.39;
                    const isPulledOut = (lvl === 2 && b === 0); // Explicitly show removable compartment
                    const dist = isPulledOut ? 3.55 : 2.55;
                    const bay = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 1.2), MAT.mineralWhite);
                    bay.position.set(Math.cos(ang) * dist, 0.45, Math.sin(ang) * dist);
                    bay.rotation.y = -ang;
                    modGroup.add(bay);

                    // Luminous status strip on bay
                    const stripMat = b === 0 ? MAT.amberEmissive : (b === 1 ? MAT.emeraldEmissive : MAT.violetEmissive);
                    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 1.24), stripMat);
                    strip.position.copy(bay.position);
                    strip.rotation.y = -ang;
                    modGroup.add(strip);
                }

                towerStack.add(modGroup);
            }

            // Optical vertical buses linking tower levels
            for (let o = 0; o < 4; o++) {
                const ang = (o / 4) * Math.PI * 2;
                const bus = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.06, 0.06, 7.5, 8),
                    o % 2 === 0 ? MAT.amberEmissive : MAT.violetEmissive
                );
                bus.position.set(Math.cos(ang) * 1.8, 0, Math.sin(ang) * 1.8);
                towerStack.add(bus);
            }

            // THREE VISUALLY DISTINCT PROCESSING PATHS CONVERGING ON CENTRAL CORE:
            // Path 1: Local Processing (Amber) — Tower -> Core
            const pathLocalCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-9.5, 2.2, -6.5),
                new THREE.Vector3(-6.0, 2.5, -4.0),
                new THREE.Vector3(-3.2, 4.5, -1.8),
                new THREE.Vector3(0, 6.5, 0)
            ]);
            const localBus = new THREE.Mesh(new THREE.TubeGeometry(pathLocalCurve, 48, 0.11, 8, false), MAT.amberEmissive);
            compGroup.add(localBus);

            // Path 2: Distributed Computation (Deep Violet) — Tower -> Neural Bridge -> Core
            const pathDistCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-9.5, 0.2, -6.5),
                new THREE.Vector3(-2.0, 1.0, -8.5),
                new THREE.Vector3(6.5, 4.5, -5.5),
                new THREE.Vector3(9.5, 8.5, -4.5)
            ]);
            const distributedBus = new THREE.Mesh(new THREE.TubeGeometry(pathDistCurve, 48, 0.09, 8, false), MAT.violetEmissive);
            compGroup.add(distributedBus);

            // Path 3: External Validation Bus (Emerald) — Tower -> Validation Module & Observatory
            const pathExtCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-9.5, -2.2, -6.5),
                new THREE.Vector3(-5.5, -2.5, 2.0),
                new THREE.Vector3(0.0, -1.5, 6.5),
                new THREE.Vector3(8.5, 2.5, 8.5)
            ]);
            const validationBus = new THREE.Mesh(new THREE.TubeGeometry(pathExtCurve, 48, 0.09, 8, false), MAT.emeraldEmissive);
            compGroup.add(validationBus);

            // =========================================================================
            // SUBSYSTEM D (LEVEL 4): ABSTRACT NEURAL SYSTEM (Suspended Sculptural Quadrant)
            // =========================================================================
            const neuralGroup = new THREE.Group();
            layers[4].add(neuralGroup);

            const neuralCenter = new THREE.Vector3(10.0, 0.5, -5.0);
            const neuralSculpture = new THREE.Group();
            neuralSculpture.position.copy(neuralCenter);
            neuralGroup.add(neuralSculpture);

            // Generate non-literal abstract multi-layer topological filtering array
            const neuralNodes = [];
            const nodeCount = 34;
            for (let n = 0; n < nodeCount; n++) {
                // Stratified cylindrical/conical distribution (Input layer -> Dense hidden core -> Output filter)
                const stratum = (n % 3) - 1; // -1, 0, 1
                const angle = (n * 2.39996); // Golden angle spiral
                const radius = stratum === 0 ? (0.8 + (n / nodeCount) * 2.2) : (2.2 + (n / nodeCount) * 2.4);
                const pos = new THREE.Vector3(
                    Math.cos(angle) * radius,
                    stratum * 1.8 + Math.sin(n) * 0.6,
                    Math.sin(angle) * radius
                );
                neuralNodes.push(pos);

                const size = stratum === 0 ? 0.34 : 0.20;
                const mat = stratum === 0 ? MAT.violetEmissive : (n % 4 === 0 ? MAT.amberEmissive : MAT.mineralWhite);
                const sphere = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 16), mat);
                sphere.position.copy(pos);
                neuralSculpture.add(sphere);
            }

            // Organic branching translucent fibers connecting nodes with variable density
            for (let i = 0; i < neuralNodes.length; i++) {
                for (let j = i + 1; j < neuralNodes.length; j++) {
                    const d = neuralNodes[i].distanceTo(neuralNodes[j]);
                    if (d < 3.1) {
                        const mid = new THREE.Vector3().addVectors(neuralNodes[i], neuralNodes[j]).multiplyScalar(0.5);
                        mid.x += (Math.sin(i * j) * 0.35);
                        mid.y += (Math.cos(i + j) * 0.35);
                        const fiberCurve = new THREE.QuadraticBezierCurve3(neuralNodes[i], mid, neuralNodes[j]);
                        const fiberLine = new THREE.Line(
                            new THREE.BufferGeometry().setFromPoints(fiberCurve.getPoints(12)),
                            d < 1.9 ? MAT.wireAmber : MAT.wireViolet
                        );
                        neuralSculpture.add(fiberLine);
                    }
                }
            }

            // Partially occluded translucent containment shells around the neural array
            const containmentArcGeo = new THREE.CylinderGeometry(4.8, 4.8, 3.6, 32, 1, true, 0, Math.PI * 0.65);
            const arc1 = new THREE.Mesh(containmentArcGeo, MAT.glass);
            neuralSculpture.add(arc1);
            const arc2 = new THREE.Mesh(containmentArcGeo, MAT.violetGlass);
            arc2.rotation.y = Math.PI;
            neuralSculpture.add(arc2);

            // Observation interfaces & calibration frames positioned around the neural structure
            for (let k = 0; k < 3; k++) {
                const ang = (k / 3) * Math.PI * 2;
                const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.08), MAT.titanium);
                frame.position.set(Math.cos(ang) * 5.2, (k - 1) * 0.9, Math.sin(ang) * 5.2);
                frame.lookAt(0, 0, 0);
                neuralSculpture.add(frame);
            }

            // Defined Synaptic Bridge (Feixes de conexão) linking Neural System to Mathematical Core
            const neuralBridges = [];
            for (let b = 0; b < 5; b++) {
                const offsetY = (b - 2) * 0.45;
                const bridgeCurve = new THREE.CubicBezierCurve3(
                    new THREE.Vector3(10.0, 0.5 + offsetY, -5.0),
                    new THREE.Vector3(6.5, 0.2 + offsetY * 1.5, -3.2),
                    new THREE.Vector3(3.5, -2.5 + offsetY, -1.5),
                    new THREE.Vector3(0, -5.5, 0)
                );
                const beamLine = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints(bridgeCurve.getPoints(36)),
                    b === 2 ? MAT.wireAmber : MAT.wireViolet
                );
                neuralGroup.add(beamLine);
                neuralBridges.push({ curve: bridgeCurve, mesh: beamLine, offsetY });
            }

            // =========================================================================
            // SUBSYSTEM E (LEVEL 1): EXPERIMENTAL OBSERVATORY PLATFORM (Multi-level Base)
            // =========================================================================
            const obsPlatformGroup = new THREE.Group();
            layers[1].add(obsPlatformGroup);

            // Main Stepped Circular Foundation Ring
            const baseOuterRing = new THREE.Mesh(new THREE.CylinderGeometry(16.0, 16.8, 1.2, 64), MAT.darkTitanium);
            baseOuterRing.receiveShadow = true;
            obsPlatformGroup.add(baseOuterRing);

            // Cutout inspection deck
            const innerDeck = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 11.5, 1.6, 48), MAT.titanium);
            innerDeck.position.y = 0.3;
            innerDeck.receiveShadow = true;
            obsPlatformGroup.add(innerDeck);

            addMicroBolts(obsPlatformGroup, 15.2, 0.65, 36, MAT.oxidizedCopper);
            addMicroBolts(obsPlatformGroup, 11.0, 1.15, 24, MAT.darkTitanium);

            // Concentric Mechanical Rails
            const rail1 = new THREE.Mesh(new THREE.TorusGeometry(13.6, 0.14, 12, 96), MAT.oxidizedCopper);
            rail1.rotation.x = Math.PI / 2;
            rail1.position.y = 0.7;
            obsPlatformGroup.add(rail1);

            const rail2 = new THREE.Mesh(new THREE.TorusGeometry(8.8, 0.12, 12, 80), MAT.mineralWhite);
            rail2.rotation.x = Math.PI / 2;
            rail2.position.y = 1.15;
            obsPlatformGroup.add(rail2);

            // Articulated Robotic Arms on Mechanical Rails (3 Units)
            for (let r = 0; r < 3; r++) {
                const ang = (r / 3) * Math.PI * 2 + 0.8;
                const armRig = new THREE.Group();
                armRig.position.set(Math.cos(ang) * 8.8, 1.15, Math.sin(ang) * 8.8);
                armRig.lookAt(0, 1.15, 0);

                const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.75, 0.8, 12), MAT.oxidizedCopper);
                armRig.add(turret);

                const lowerBoom = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.4, 0.35), MAT.titanium);
                lowerBoom.position.set(0, 1.2, 0.6);
                lowerBoom.rotation.x = 0.45;
                armRig.add(lowerBoom);

                const upperBoom = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.0, 0.25), MAT.mineralWhite);
                upperBoom.position.set(0, 2.3, 1.7);
                upperBoom.rotation.x = 1.1;
                armRig.add(upperBoom);

                // Optical Laser Emitter Tip
                const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 0.5, 8), MAT.amberEmissive);
                emitter.position.set(0, 2.7, 2.7);
                emitter.rotation.x = Math.PI / 2;
                armRig.add(emitter);

                obsPlatformGroup.add(armRig);
            }

            // Optical Instruments & Telescope Collimators on Outer Deck (4 Units)
            for (let t = 0; t < 4; t++) {
                const ang = (t / 4) * Math.PI * 2 + 0.35;
                const scopeGroup = new THREE.Group();
                scopeGroup.position.set(Math.cos(ang) * 13.6, 0.75, Math.sin(ang) * 13.6);
                scopeGroup.lookAt(0, 8.0, 0);

                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 2.6, 16), MAT.darkTitanium);
                barrel.rotation.x = Math.PI / 2;
                scopeGroup.add(barrel);

                const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.1, 16), MAT.emeraldEmissive);
                lens.rotation.x = Math.PI / 2;
                lens.position.z = 1.32;
                scopeGroup.add(lens);

                obsPlatformGroup.add(scopeGroup);
            }

            // Central Sample Containment Chambers (Transparent Vacuum Bells with Samples)
            const sampleChamberGroup = new THREE.Group();
            sampleChamberGroup.position.y = 1.1;
            obsPlatformGroup.add(sampleChamberGroup);

            for (let c = 0; c < 6; c++) {
                const ang = (c / 6) * Math.PI * 2;
                const cPos = new THREE.Vector3(Math.cos(ang) * 4.5, 0, Math.sin(ang) * 4.5);
                
                const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 0.6, 16), MAT.darkTitanium);
                ped.position.copy(cPos);
                sampleChamberGroup.add(ped);

                const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 1.8, 20), MAT.glass);
                bell.position.copy(cPos).add(new THREE.Vector3(0, 1.2, 0));
                sampleChamberGroup.add(bell);

                // Experimental Quantum/Topological Sample inside
                const sampleMat = c % 2 === 0 ? MAT.amberEmissive : MAT.violetEmissive;
                const sample = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), sampleMat);
                sample.position.copy(cPos).add(new THREE.Vector3(0, 1.2, 0));
                sampleChamberGroup.add(sample);
            }

            // =========================================================================
            // SUBSYSTEM F (LEVEL 5): FOUR SCIENTIFIC EVIDENCE MODULES
            // =========================================================================
            const evidenceGroup = new THREE.Group();
            layers[5].add(evidenceGroup);

            // 1. OBSERVATION MODULE (Front-Left: Parabolic Sensor Dish & Telemetry Array)
            const modObservation = new THREE.Group();
            modObservation.position.set(-11.5, 0, 9.5);
            evidenceGroup.add(modObservation);

            const obsBase = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.2, 0.9, 16), MAT.titanium);
            modObservation.add(obsBase);
            const obsDish = new THREE.Mesh(
                new THREE.SphereGeometry(2.4, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.42),
                MAT.mineralWhite
            );
            obsDish.rotation.x = Math.PI;
            obsDish.position.y = 1.6;
            modObservation.add(obsDish);
            const obsHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 1.8, 8), MAT.amberEmissive);
            obsHorn.position.y = 1.5;
            modObservation.add(obsHorn);

            // 2. THEORY MODULE (Back-Left: Interlocking Polyhedral Mathematical Predictor)
            const modTheory = new THREE.Group();
            modTheory.position.set(-11.5, 0, -9.5);
            evidenceGroup.add(modTheory);

            const theBase = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.6, 3.8), MAT.darkTitanium);
            modTheory.add(theBase);
            const theDodeca = new THREE.Mesh(new THREE.DodecahedronGeometry(1.85, 0), MAT.violetGlass);
            theDodeca.position.y = 2.0;
            modTheory.add(theDodeca);
            theDodeca.add(new THREE.LineSegments(
                new THREE.EdgesGeometry(new THREE.DodecahedronGeometry(1.86, 0)),
                MAT.wireViolet
            ));
            const theInner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 0), MAT.mineralWhite);
            theInner.position.y = 2.0;
            modTheory.add(theInner);

            // 3. VALIDATION MODULE (Front-Right: Dual-Comparator Interferometer Bridge)
            const modValidation = new THREE.Group();
            modValidation.position.set(11.5, 0, 9.5);
            evidenceGroup.add(modValidation);

            const valBase = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.6, 6), MAT.titanium);
            modValidation.add(valBase);
            const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.8, 0.7), MAT.mineralWhite);
            pillarL.position.set(-1.3, 1.6, 0);
            modValidation.add(pillarL);
            const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.8, 0.7), MAT.mineralWhite);
            pillarR.position.set(1.3, 1.6, 0);
            modValidation.add(pillarR);
            // Emerald Validation Lock Core in center
            const valLock = new THREE.Mesh(new THREE.SphereGeometry(0.65, 20, 20), MAT.emeraldEmissive);
            valLock.position.set(0, 1.8, 0);
            modValidation.add(valLock);
            const valBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 12), MAT.emeraldEmissive);
            valBridge.rotation.z = Math.PI / 2;
            valBridge.position.set(0, 1.8, 0);
            modValidation.add(valBridge);

            // 4. FALSIFICATION MODULE (Back-Right: Adversarial Stress-Test Rig with SEVERED / DISCONNECTED Structure)
            const modFalsification = new THREE.Group();
            modFalsification.position.set(11.5, 0, -9.5);
            evidenceGroup.add(modFalsification);

            const falBase = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.6, 3.8), MAT.darkTitanium);
            modFalsification.add(falBase);

            // Intact half of hypothesis test rig
            const falHalfA = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 2.2), MAT.titanium);
            falHalfA.position.set(-0.9, 1.4, 0);
            modFalsification.add(falHalfA);

            // SEVERED / DISCONNECTED half shifted & tilted away (Indicates failed hypothesis under adversarial test)
            const falHalfB = new THREE.Group();
            falHalfB.position.set(1.85, 2.25, 0.65);
            falHalfB.rotation.set(0.28, -0.22, -0.35);
            const severedBlock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 2.0), MAT.oxidizedCopper);
            falHalfB.add(severedBlock);
            // Fractured conduit stubs glowing Crimson
            const stub1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 8), MAT.crimsonEmissive);
            stub1.rotation.z = Math.PI / 2;
            stub1.position.set(-0.8, 0.4, 0.4);
            falHalfB.add(stub1);
            const stub2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 8), MAT.crimsonEmissive);
            stub2.rotation.z = Math.PI / 2;
            stub2.position.set(-0.8, -0.4, -0.4);
            falHalfB.add(stub2);
            modFalsification.add(falHalfB);

            // Crimson Anomaly Breach Indicator Ring at fracture gap
            const breachRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 12, 32), MAT.crimsonEmissive);
            breachRing.rotation.y = Math.PI / 2;
            breachRing.position.set(0.35, 1.6, 0.2);
            modFalsification.add(breachRing);

            // Connect the 4 Evidence Modules toward the Center Axis
            const modCoords = [
                { pos: new THREE.Vector3(-11.5, 0, 9.5), mat: MAT.wireAmber, intact: true },
                { pos: new THREE.Vector3(-11.5, 0, -9.5), mat: MAT.wireViolet, intact: true },
                { pos: new THREE.Vector3(11.5, 0, 9.5), mat: MAT.wireEmerald, intact: true },
                { pos: new THREE.Vector3(11.5, 0, -9.5), mat: MAT.wireCrimson, intact: false }
            ];
            const evidenceLinks = [];
            modCoords.forEach((mc, index) => {
                const lines = [];
                if (mc.intact) {
                    const pts = [mc.pos, new THREE.Vector3(mc.pos.x * 0.4, -4.0, mc.pos.z * 0.4)];
                    lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mc.mat));
                } else {
                    // Interrupted / broken connection for Falsification Module
                    const pts1 = [mc.pos, new THREE.Vector3(mc.pos.x * 0.78, -1.2, mc.pos.z * 0.78)];
                    const pts2 = [new THREE.Vector3(mc.pos.x * 0.58, -2.6, mc.pos.z * 0.58), new THREE.Vector3(mc.pos.x * 0.4, -4.0, mc.pos.z * 0.4)];
                    lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts1), mc.mat));
                    lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), mc.mat));
                }
                lines.forEach(line => evidenceGroup.add(line));
                evidenceLinks.push({ id: ['observation-link', 'theory-link', 'validation-link', 'falsification-link'][index], start: mc.pos.clone(), targetLocal: new THREE.Vector3(mc.pos.x * 0.4, 1.0, mc.pos.z * 0.4), lines, intact: mc.intact });
            });

            // =========================================================================
            // AXONOMETRIC RECONSTRUCTION GUIDE LINES (Requirement 5)
            // =========================================================================
            const guideLinesGroup = new THREE.Group();
            masterComplex.add(guideLinesGroup);

            const guidePillars = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(-11.5, 0, 9.5),
                new THREE.Vector3(-11.5, 0, -9.5),
                new THREE.Vector3(11.5, 0, 9.5),
                new THREE.Vector3(11.5, 0, -9.5),
                new THREE.Vector3(-9.5, 0, -6.5),
                new THREE.Vector3(10.0, 0, -5.0)
            ];

            guidePillars.forEach(gp => {
                const lineGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(gp.x, -22, gp.z),
                    new THREE.Vector3(gp.x, 26, gp.z)
                ]);
                const line = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({
                    color: 0x8c939e, dashSize: 0.4, gapSize: 0.4, transparent: true, opacity: 0.35
                }));
                line.computeLineDistances();
                guideLinesGroup.add(line);
            });

            // =========================================================================
            // ANIMATED DATA PULSES ALONG PROCESSING PATHS
            // =========================================================================
            const pulseParticles = [];
            const pulseGeo = new THREE.SphereGeometry(0.2, 10, 10);
            [
                { curve: pathLocalCurve, mat: MAT.amberEmissive, speed: 0.28, parent: compGroup },
                { curve: pathDistCurve, mat: MAT.violetEmissive, speed: 0.22, parent: compGroup },
                { curve: pathExtCurve, mat: MAT.emeraldEmissive, speed: 0.34, parent: compGroup },
                { curve: mathSurfaceCurve, mat: MAT.amberEmissive, speed: 0.15, parent: coreGroup }
            ].forEach((cfg, idx) => {
                for (let p = 0; p < 3; p++) {
                    const mesh = new THREE.Mesh(pulseGeo, cfg.mat);
                    cfg.parent.add(mesh);
                    pulseParticles.push({
                        mesh,
                        curve: cfg.curve,
                        t: (p / 3) + idx * 0.1,
                        speed: cfg.speed
                    });
                }
            });

            // =========================================================================
            // 3D EDITORIAL CALLOUTS & LEADER LINES SYSTEM (Requirement 7)
            // =========================================================================
            const calloutsData = [
                {
                    id: 'c-geom',
                    title: 'GEOMETRIC STRUCTURE',
                    sub: 'LVL 03 // TRI-TOROIDAL TOPOLOGICAL CORE',
                    color: '#f2f0ea',
                    layer: 3,
                    localPos: new THREE.Vector3(0, 3.8, 0),
                    screenOffset: { x: -135, y: -75 },
                    desc: 'Tri-toroidal non-coplanar gimbal housing a translucent icosahedral cage and multi-shell topological manifold core.',
                    mat: 'Ti-6Al-4V / CuO / SiO2',
                    state: 'NOMINAL (SIMULATED DATA)',
                    focusLocalPos: new THREE.Vector3(0, 0, 0)
                },
                {
                    id: 'c-comp',
                    title: 'COMPUTATIONAL LAYER',
                    sub: 'LVL 02 // 3-PATH OPTICAL SUPERCOMPUTER',
                    color: '#f59e0b',
                    layer: 2,
                    localPos: new THREE.Vector3(-9.5, 1.5, -6.5),
                    screenOffset: { x: -155, y: -25 },
                    desc: 'Modular stacked processor tower routing Local (Amber), Distributed (Violet), and External Validation (Emerald) optical buses.',
                    mat: 'Brushed Ti / Au-Si Photonics',
                    state: 'ILLUSTRATIVE DATA FLOW'
                },
                {
                    id: 'c-obs',
                    title: 'OBSERVATIONAL DATA',
                    sub: 'LVL 05 // TELEMETRY & SENSOR MODULE 01',
                    color: '#f59e0b',
                    layer: 5,
                    localPos: new THREE.Vector3(-11.5, 2.0, 9.5),
                    screenOffset: { x: -140, y: 45 },
                    desc: 'High-gain parabolic telemetry array capturing horizon curvature signatures and feeding raw observational streams.',
                    mat: 'Mineral Ceramic / Cu Feed',
                    state: 'STREAMING (SIMULATED)'
                },
                {
                    id: 'c-hyp',
                    title: 'HYPOTHESIS TESTING',
                    sub: 'LVL 05 // MATHEMATICAL PREDICTION MODULE 02',
                    color: '#7c3aed',
                    layer: 5,
                    localPos: new THREE.Vector3(-11.5, 2.4, -9.5),
                    screenOffset: { x: -120, y: -65 },
                    desc: 'Dodecahedral tensor synthesizer projecting candidate formalisms onto the abstract neural filtration bridge.',
                    mat: 'Doped Quartz / Deep Violet Bus',
                    state: 'CANDIDATE MODEL (SIMULATED)'
                },
                {
                    id: 'c-val',
                    title: 'EVIDENCE VALIDATION',
                    sub: 'LVL 05 // INTERFEROMETRIC COMPARATOR 03',
                    color: '#10b981',
                    layer: 5,
                    localPos: new THREE.Vector3(11.5, 2.2, 9.5),
                    screenOffset: { x: 135, y: 45 },
                    desc: 'Dual-pillar interferometer verifying agreement between low-energy geodesic trajectories and empirical horizon bounds.',
                    mat: 'Mineral White / Emerald Core',
                    state: 'AGREEMENT (SIMULATED DATA)'
                },
                {
                    id: 'c-inc',
                    title: 'MODEL INCOMPATIBILITY',
                    sub: 'LVL 05 // ADVERSARIAL FALSIFICATION MODULE 04',
                    color: '#e11d48',
                    layer: 5,
                    localPos: new THREE.Vector3(11.5, 2.2, -9.5),
                    screenOffset: { x: 145, y: -55 },
                    desc: 'Adversarial stress-test rig showing structural disconnection where Candidate Hypothesis H4 fails high-curvature boundary tests.',
                    mat: 'Severed CuO / Crimson Alert',
                    state: 'REJECTED IN THIS EXAMPLE'
                },
                {
                    id: 'c-unc',
                    title: 'UNCERTAINTY REGION',
                    sub: 'LVL 03 // METRIC HORIZON TRUNCATION',
                    color: '#e11d48',
                    layer: 3,
                    localPos: new THREE.Vector3(2.3, -2.2 + fieldHeight(Math.hypot(2.3, 2.3)), 2.3),
                    screenOffset: { x: 140, y: 70 },
                    desc: 'Non-Euclidean gravity well boundary where classical smooth manifold equations diverge into interrupted trajectories.',
                    mat: 'Deformable Spacetime Mesh',
                    state: 'ILLUSTRATIVE MODEL LIMIT'
                }
            ];

            calloutsData.push(
                { id: 'c-infra', title: 'EXPERIMENTAL OBSERVATORY', sub: 'LVL 01 // INFRASTRUCTURE & RIGS', color: '#b86b43', layer: 1, localPos: new THREE.Vector3(0, 1.2, 4.5), screenOffset: { x: -130, y: 65 }, desc: 'Plataforma experimental com trilhos, instrumentos ópticos, braços articulados e câmaras de amostras. Arquitetura conceitual; nenhuma medição real.', mat: 'Titânio / cobre oxidado / vidro', state: 'SIMULATED DATA', focusRadius: 31 },
                { id: 'c-neural', title: 'OBSERVATION & COGNITION', sub: 'LVL 04 // ABSTRACT NEURAL SYSTEM', color: '#7c3aed', layer: 4, localPos: neuralCenter.clone(), screenOffset: { x: 130, y: -50 }, desc: 'Rede abstrata de integração e filtragem de informação. Os nós e as fibras são uma representação conceitual, sem equivalência estabelecida com consciência.', mat: 'Vidro / cerâmica / fibras ópticas', state: 'SIMULATED DATA', focusRadius: 17 }
            );
            const focusRadii = { 'c-geom': 22, 'c-comp': 16, 'c-obs': 13, 'c-hyp': 12, 'c-val': 13, 'c-inc': 13, 'c-unc': 23 };
            const calloutsById = Object.fromEntries(calloutsData.map(cd => [cd.id, cd]));
            const aliases = { 'mod-obs': 'c-obs', 'mod-the': 'c-hyp', 'mod-val': 'c-val', 'mod-fal': 'c-inc', infrastructure: 'c-infra', neural: 'c-neural', core: 'c-geom' };
            const calloutsContainer = document.getElementById('callouts-container');
            const leaderSvg = document.getElementById('leader-svg');
            const ns = 'http://www.w3.org/2000/svg';
            calloutsData.forEach(cd => {
                cd.focusRadius = cd.focusRadius || focusRadii[cd.id];
                const el = document.createElement('button');
                el.type = 'button';
                el.className = 'callout-node';
                el.id = cd.id;
                el.setAttribute('aria-label', `Inspecionar ${cd.title}`);
                el.setAttribute('aria-pressed', cd.id === selectedId ? 'true' : 'false');
                const box = document.createElement('span');
                box.className = 'callout-box';
                box.style.borderLeft = `3px solid ${cd.color}`;
                const title = document.createElement('strong');
                title.textContent = cd.title;
                const sub = document.createElement('small');
                sub.textContent = cd.sub;
                box.append(title, sub);
                el.appendChild(box);
                el.addEventListener('click', () => inspect(cd.id));
                calloutsContainer.appendChild(el);
                cd.domEl = el;
                cd.labelSize = null;
                const path = document.createElementNS(ns, 'polyline');
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', cd.color);
                path.setAttribute('stroke-width', '1');
                path.setAttribute('stroke-opacity', '0.65');
                leaderSvg.appendChild(path);
                cd.svgLine = path;
                const dot = document.createElementNS(ns, 'circle');
                dot.setAttribute('r', '2.5');
                dot.setAttribute('fill', cd.color);
                leaderSvg.appendChild(dot);
                cd.svgDot = dot;
            });

            let explosionFactor = 0.35;
            let targetExplosion = 0.35;
            let autoRotate = false;
            const activeLayers = { 1: true, 2: true, 3: true, 4: true, 5: true };
            const slider = document.getElementById('explosion-slider');
            const explosionVal = document.getElementById('explosion-val');
            const btnRot = document.getElementById('btn-toggle-rot');
            let camTargetPos = null;
            let lookAtTarget = new THREE.Vector3(0, 1, 0);
            let cameraTween = null;
            let lastConnectionExplosion = NaN;
            let animationTime = 0;
            let lastTimestamp = null;
            const cineState = { active: false, time: 0, duration: 30, chapter: -1, snapshot: null };
            const tempVec = new THREE.Vector3();
            const upAxis = new THREE.Vector3(0, 1, 0);
            const connectionScratch = new THREE.Vector3();
            const busSpecs = [
                { id: 'local-processing', parent: compGroup, sourceLayer: 2, targetLayer: 3, target: coreGroup, targetLocal: new THREE.Vector3(), curve: pathLocalCurve, mesh: localBus, radius: 0.11 },
                { id: 'distributed-processing', parent: compGroup, sourceLayer: 2, targetLayer: 4, target: neuralSculpture, targetLocal: new THREE.Vector3(), curve: pathDistCurve, mesh: distributedBus, radius: 0.09 },
                { id: 'external-validation', parent: compGroup, sourceLayer: 2, targetLayer: 5, target: modValidation, targetLocal: new THREE.Vector3(0, 1.8, 0), curve: pathExtCurve, mesh: validationBus, radius: 0.09 }
            ];
            busSpecs.forEach(spec => { spec.originalPoints = spec.curve.points.map(point => point.clone()); });
            neuralBridges.forEach((spec, index) => {
                spec.id = `neural-core-${index + 1}`;
                spec.parent = neuralGroup;
                spec.target = coreGroup;
                spec.targetLocal = new THREE.Vector3(0, spec.offsetY * 0.4, 0);
                spec.original = [spec.curve.v0, spec.curve.v1, spec.curve.v2, spec.curve.v3].map(point => point.clone());
            });

            function worldAnchor(cd, result = new THREE.Vector3()) {
                scene.updateMatrixWorld(true);
                return layers[cd.layer].localToWorld(result.copy(cd.focusLocalPos || cd.localPos));
            }
            function targetInParent(spec) {
                spec.target.localToWorld(connectionScratch.copy(spec.targetLocal));
                return spec.parent.worldToLocal(connectionScratch);
            }
            function updateLine(line, points) {
                const attribute = line.geometry.attributes.position;
                points.forEach((point, index) => attribute.setXYZ(index, point.x, point.y, point.z));
                attribute.needsUpdate = true;
                line.geometry.computeBoundingSphere();
            }
            // Keep the existing indexed tube buffers: changing the explosion never creates GPU geometries.
            function updateTube(spec) {
                const frames = spec.curve.computeFrenetFrames(48, false);
                const pos = spec.mesh.geometry.attributes.position;
                const normal = spec.mesh.geometry.attributes.normal;
                const point = new THREE.Vector3();
                for (let i = 0; i <= 48; i++) {
                    spec.curve.getPointAt(i / 48, point);
                    const n = frames.normals[i], b = frames.binormals[i];
                    for (let j = 0; j <= 8; j++) {
                        const a = j / 8 * Math.PI * 2;
                        const c = -Math.cos(a), s = Math.sin(a);
                        const nx = c * n.x + s * b.x, ny = c * n.y + s * b.y, nz = c * n.z + s * b.z;
                        const index = i * 9 + j;
                        pos.setXYZ(index, point.x + spec.radius * nx, point.y + spec.radius * ny, point.z + spec.radius * nz);
                        normal.setXYZ(index, nx, ny, nz);
                    }
                }
                pos.needsUpdate = true;
                normal.needsUpdate = true;
                spec.mesh.geometry.computeBoundingSphere();
            }
            function updateConnections(force = false) {
                if (!force && Math.abs(lastConnectionExplosion - explosionFactor) < 0.0001) return;
                scene.updateMatrixWorld(true);
                busSpecs.forEach(spec => {
                    const end = targetInParent(spec).clone();
                    const shift = end.sub(spec.originalPoints[3]);
                    spec.curve.points.forEach((point, index) => point.copy(spec.originalPoints[index]).addScaledVector(shift, index / 3));
                    spec.curve.updateArcLengths();
                    updateTube(spec);
                });
                neuralBridges.forEach(spec => {
                    const shift = targetInParent(spec).clone().sub(spec.original[3]);
                    spec.curve.v1.copy(spec.original[1]).addScaledVector(shift, 1 / 3);
                    spec.curve.v2.copy(spec.original[2]).addScaledVector(shift, 2 / 3);
                    spec.curve.v3.copy(spec.original[3]).add(shift);
                    spec.curve.updateArcLengths();
                    updateLine(spec.mesh, spec.curve.getPoints(36));
                });
                evidenceLinks.forEach(spec => {
                    const end = obsPlatformGroup.localToWorld(spec.targetLocal.clone());
                    evidenceGroup.worldToLocal(end);
                    if (spec.intact) updateLine(spec.lines[0], [spec.start, end]);
                    else {
                        updateLine(spec.lines[0], [spec.start, new THREE.Vector3().lerpVectors(spec.start, end, 0.42)]);
                        updateLine(spec.lines[1], [new THREE.Vector3().lerpVectors(spec.start, end, 0.60), end]);
                    }
                    spec.end = end;
                });
                const bottom = layers[1].position.y - 2;
                const top = layers[5].position.y + 5;
                guideLinesGroup.children.forEach((line, index) => {
                    const point = guidePillars[index];
                    updateLine(line, [new THREE.Vector3(point.x, bottom, point.z), new THREE.Vector3(point.x, top, point.z)]);
                    line.computeLineDistances();
                });
                guideLinesGroup.visible = explosionFactor > 0.08;
                lastConnectionExplosion = explosionFactor;
            }
            function syncLayerButtons() {
                document.querySelectorAll('.layer-btn').forEach(btn => {
                    const active = activeLayers[Number(btn.dataset.layer)];
                    btn.classList.toggle('active', active);
                    btn.setAttribute('aria-pressed', String(active));
                    btn.style.opacity = active ? '1' : '0.5';
                });
            }
            function setLayerVisibility(layer, visible) {
                activeLayers[layer] = visible;
                layers[layer].visible = visible;
                busSpecs.forEach(spec => { spec.mesh.visible = activeLayers[spec.sourceLayer] && activeLayers[spec.targetLayer]; });
                neuralBridges.forEach(spec => { spec.mesh.visible = activeLayers[3] && activeLayers[4]; });
                evidenceLinks.forEach(spec => spec.lines.forEach(line => { line.visible = activeLayers[1] && activeLayers[5]; }));
                syncLayerButtons();
                dirty = true;
            }
            function syncExplosionValue() {
                const value = Math.round(targetExplosion * 100);
                slider.value = String(value);
                explosionVal.textContent = `${value}%`;
                slider.setAttribute('aria-valuetext', `${value}% de separação das camadas`);
            }
            function selectSubsystem(cd) {
                selectedId = cd.id;
                document.getElementById('insp-title').textContent = cd.title;
                document.getElementById('insp-desc').textContent = cd.desc;
                document.getElementById('insp-mat').textContent = cd.mat;
                const stateEl = document.getElementById('insp-state');
                stateEl.textContent = cd.state;
                stateEl.style.color = cd.color;
                calloutsData.forEach(item => {
                    item.domEl.classList.toggle('is-selected', item.id === selectedId);
                    item.domEl.setAttribute('aria-pressed', String(item.id === selectedId));
                });
                window.dispatchEvent(new CustomEvent('nexus:selection', { detail: { id: cd.id, title: cd.title, layer: cd.layer } }));
                dirty = true;
            }
            function beginCameraTween(position, target, duration = 0.8) {
                controls.enableDamping = false;
                controls.update();
                controls.enableDamping = true;
                const immediate = reducedMotion || !motionEnabled;
                camTargetPos = position.clone();
                lookAtTarget.copy(target);
                cameraTween = immediate ? null : { time: 0, duration, fromPosition: camera.position.clone(), fromTarget: controls.target.clone() };
                if (immediate) {
                    camera.position.copy(position);
                    controls.target.copy(target);
                    camera.lookAt(target);
                    camTargetPos = null;
                    controls.update();
                }
                dirty = true;
            }
            function inspect(id) {
                const cd = calloutsById[aliases[id] || id];
                if (!cd) return false;
                if (cineState.active) stopCinematicSequence();
                setLayerVisibility(cd.layer, true);
                selectSubsystem(cd);
                const target = worldAnchor(cd);
                const direction = camera.position.clone().sub(controls.target).normalize();
                if (!Number.isFinite(direction.x) || direction.lengthSq() < 0.5) direction.set(0.65, 0.35, 0.68).normalize();
                const distance = cd.focusRadius * Math.max(1, 1 / camera.aspect);
                camera.fov = 34;
                camera.updateProjectionMatrix();
                beginCameraTween(target.clone().addScaledVector(direction, distance), target);
                return true;
            }
            function resetView() {
                if (cineState.active) stopCinematicSequence();
                const target = new THREE.Vector3(0, 1, 0);
                const offset = new THREE.Vector3(42, 29, 46).multiplyScalar(Math.max(1, 1 / camera.aspect));
                camera.fov = 34;
                camera.updateProjectionMatrix();
                beginCameraTween(target.clone().add(offset), target);
            }
            function setMotion(enabled) {
                motionEnabled = Boolean(enabled);
                if (!motionEnabled) autoRotate = false;
                syncRotationButton();
                const button = document.getElementById('btn-toggle-motion');
                if (button) {
                    button.setAttribute('aria-pressed', String(motionEnabled));
                    button.textContent = motionEnabled ? 'PAUSAR ANIMAÇÕES' : 'RETOMAR ANIMAÇÕES';
                }
                dirty = true;
                return motionEnabled;
            }
            function setLabels(enabled) {
                labelsEnabled = Boolean(enabled);
                const button = document.getElementById('btn-toggle-labels');
                if (button) button.setAttribute('aria-pressed', String(labelsEnabled));
                dirty = true;
                return labelsEnabled;
            }
            function syncRotationButton() {
                if (!btnRot) return;
                btnRot.className = 'tool-button';
                btnRot.classList.toggle('active', autoRotate);
                btnRot.setAttribute('aria-pressed', String(autoRotate));
                btnRot.textContent = `ORBIT: ${autoRotate ? 'ON' : 'OFF'}`;
            }
            slider.addEventListener('input', event => {
                if (cineState.active) stopCinematicSequence();
                targetExplosion = THREE.MathUtils.clamp(Number(event.target.value) / 100, 0, 1);
                if (reducedMotion || !motionEnabled) explosionFactor = targetExplosion;
                syncExplosionValue();
                dirty = true;
            });
            document.querySelectorAll('.layer-btn').forEach(btn => btn.addEventListener('click', () => {
                if (cineState.active) stopCinematicSequence();
                const layer = Number(btn.dataset.layer);
                if (layers[layer]) setLayerVisibility(layer, !activeLayers[layer]);
            }));
            document.getElementById('btn-reset-layers')?.addEventListener('click', () => {
                if (cineState.active) stopCinematicSequence();
                Object.keys(layers).forEach(key => setLayerVisibility(key, true));
            });
            document.getElementById('btn-cam-iso')?.addEventListener('click', resetView);
            document.getElementById('btn-cam-top')?.addEventListener('click', () => {
                if (cineState.active) stopCinematicSequence();
                beginCameraTween(new THREE.Vector3(0, 76, 0.01).multiplyScalar(Math.max(1, 1 / camera.aspect)), new THREE.Vector3(0, 1, 0));
            });
            document.getElementById('btn-cam-core')?.addEventListener('click', () => inspect('c-geom'));
            btnRot?.addEventListener('click', () => {
                if (cineState.active) stopCinematicSequence();
                autoRotate = !autoRotate;
                if (autoRotate && !motionEnabled) setMotion(true);
                syncRotationButton();
                dirty = true;
            });
            document.getElementById('btn-toggle-motion')?.addEventListener('click', () => setMotion(!motionEnabled));
            document.getElementById('btn-toggle-labels')?.addEventListener('click', () => setLabels(!labelsEnabled));
            document.querySelectorAll('.focus-btn').forEach(btn => btn.addEventListener('click', () => inspect(btn.dataset.focus)));
            const onReducedMotionChange = event => {
                reducedMotion = event.matches;
                setMotion(!reducedMotion);
                if (reducedMotion && cameraTween) {
                    camera.position.copy(camTargetPos);
                    controls.target.copy(lookAtTarget);
                    cameraTween = null;
                    camTargetPos = null;
                }
            };
            if (reducedMotionQuery.addEventListener) reducedMotionQuery.addEventListener('change', onReducedMotionChange);
            else reducedMotionQuery.addListener(onReducedMotionChange);

            // Audio uses one master gain and tracked voices, so mute, exit, and seeking really stop sound.
            let audioCtx = null;
            let audioMaster = null;
            let audioEnabled = false;
            const audioVoices = new Set();
            const audioButton = document.getElementById('btn-cine-audio');
            function initAudio() {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextClass) return false;
                try {
                    if (!audioCtx) {
                        audioCtx = new AudioContextClass();
                        audioMaster = audioCtx.createGain();
                        audioMaster.gain.value = 0.45;
                        audioMaster.connect(audioCtx.destination);
                    }
                    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
                    return true;
                } catch (_) { return false; }
            }
            function stopAudio() {
                if (!audioCtx) return;
                audioMaster.gain.cancelScheduledValues(audioCtx.currentTime);
                audioMaster.gain.setTargetAtTime(0, audioCtx.currentTime, 0.012);
                audioVoices.forEach(voice => { try { voice.osc.stop(audioCtx.currentTime + 0.05); } catch (_) {} });
                audioVoices.clear();
            }
            function playChord(chapter) {
                if (!audioEnabled || document.hidden || !initAudio()) return;
                stopAudio();
                const now = audioCtx.currentTime + 0.055;
                audioMaster.gain.cancelScheduledValues(now);
                audioMaster.gain.setValueAtTime(0.45, now);
                const chords = [[55,110,130.81,164.81],[65.41,130.81,164.81,196],[73.42,146.83,174.61,220],[61.74,123.47,155.56,185],[58.27,116.54,146.83,174.61],[55,110,164.81,220]];
                chords[chapter].forEach((frequency, index) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    const voice = { osc, gain };
                    osc.type = index === 0 ? 'sine' : 'triangle';
                    osc.frequency.value = frequency;
                    gain.gain.setValueAtTime(0.0001, now);
                    gain.gain.linearRampToValueAtTime(index === 0 ? 0.10 : 0.035, now + 0.4);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);
                    osc.connect(gain);
                    gain.connect(audioMaster);
                    audioVoices.add(voice);
                    osc.onended = () => { audioVoices.delete(voice); osc.disconnect(); gain.disconnect(); };
                    osc.start(now);
                    osc.stop(now + 4.9);
                });
            }
            function syncAudioButton() {
                if (!audioButton) return;
                audioButton.textContent = `ÁUDIO: ${audioEnabled ? 'ON' : 'OFF'}`;
                audioButton.setAttribute('aria-pressed', String(audioEnabled));
            }
            audioButton?.addEventListener('click', () => {
                audioEnabled = !audioEnabled;
                if (!audioEnabled) stopAudio();
                else if (cineState.active) playChord(Math.max(0, cineState.chapter));
                else initAudio();
                syncAudioButton();
            });

            const chapters = [
                { id: 'c-infra', title: 'EXPERIMENTAL OBSERVATORY', sub: 'Plataforma, instrumentos ópticos e câmaras experimentais.', tag: 'LAYER 01 // INFRASTRUCTURE', start: 0.15, end: 0.45, radius: 37 },
                { id: 'c-comp', title: 'COMPUTATIONAL ARCHITECTURE', sub: 'Três caminhos conectam computação local, rede neural e validação.', tag: 'LAYER 02 // COMPUTATION', start: 0.45, end: 0.65, radius: 23 },
                { id: 'c-geom', title: 'FUNDAMENTAL GEOMETRY', sub: 'Anéis, núcleo topológico e espaço-tempo compartilham uma arquitetura.', tag: 'LAYER 03 // CORE & SPACETIME', start: 0.65, end: 0.40, radius: 24 },
                { id: 'c-neural', title: 'OBSERVATION & COGNITION', sub: 'Uma estrutura neural abstrata se conecta ao núcleo matemático.', tag: 'LAYER 04 // NEURAL SYSTEM', start: 0.40, end: 0.75, radius: 23 },
                { id: 'c-inc', title: 'EVIDENCE & FALSIFICATION', sub: 'A ruptura carmim identifica uma hipótese que falha no cenário ilustrativo.', tag: 'LAYER 05 // EXPLORATORY EVIDENCE', start: 0.75, end: 1.0, radius: 19 },
                { id: 'c-geom', title: 'TAMESIS NEXUS', sub: 'Reconstrução das cinco camadas de um sistema científico conceitual.', tag: 'FULL SYSTEM // RECONSTRUCTION', start: 1.0, end: 0.35, radius: 75, wide: true }
            ];
            const cineElements = {
                time: document.getElementById('cine-timecode'), act: document.getElementById('cine-act-code'), progress: document.getElementById('cine-progress-bar'),
                tag: document.getElementById('cine-card-tag'), title: document.getElementById('cine-card-title'), sub: document.getElementById('cine-card-sub'), scrubber: document.getElementById('cine-scrubber')
            };
            function updateCineTime() {
                const t = cineState.time;
                if (cineElements.time) cineElements.time.textContent = `00:${t.toFixed(2).padStart(5, '0')} / 00:30.00`;
                if (cineElements.progress) cineElements.progress.style.width = `${t / 30 * 100}%`;
                if (cineElements.scrubber) {
                    const scrubber = cineElements.scrubber;
                    scrubber.setAttribute('aria-valuenow', t.toFixed(1));
                    scrubber.setAttribute('aria-valuetext', `${t.toFixed(1)} de 30 segundos`);
                    if (scrubber.tagName === 'INPUT') scrubber.value = String(t / 30 * Number(scrubber.max || 30));
                }
            }
            function startCinematicSequence() {
                if (cineState.active) return;
                cineState.snapshot = {
                    camera: camera.position.clone(), quaternion: camera.quaternion.clone(), target: controls.target.clone(), fov: camera.fov,
                    rotation: masterComplex.rotation.clone(), layers: { ...activeLayers }, explosion: explosionFactor, targetExplosion,
                    autoRotate, selectedId, light: coreLight.intensity, controlsEnabled: controls.enabled, damping: controls.enableDamping
                };
                camTargetPos = null;
                cameraTween = null;
                controls.enableDamping = false;
                controls.update();
                controls.enabled = false;
                cineState.active = true;
                cineState.time = 0;
                cineState.chapter = -1;
                autoRotate = false;
                masterComplex.rotation.y = 0;
                Object.keys(layers).forEach(key => setLayerVisibility(key, true));
                document.body.classList.add('cine-active');
                document.getElementById('btn-play-30s')?.setAttribute('aria-pressed', 'true');
                syncRotationButton();
                updateCineTime();
                if (audioEnabled) initAudio();
                dirty = true;
            }
            function stopCinematicSequence() {
                if (!cineState.active) return;
                cineState.active = false;
                stopAudio();
                document.body.classList.remove('cine-active');
                document.getElementById('btn-play-30s')?.setAttribute('aria-pressed', 'false');
                const saved = cineState.snapshot;
                if (saved) {
                    camera.position.copy(saved.camera);
                    camera.quaternion.copy(saved.quaternion);
                    camera.fov = saved.fov;
                    controls.target.copy(saved.target);
                    masterComplex.rotation.copy(saved.rotation);
                    explosionFactor = saved.explosion;
                    targetExplosion = saved.targetExplosion;
                    autoRotate = saved.autoRotate && motionEnabled;
                    coreLight.intensity = saved.light;
                    Object.keys(layers).forEach(key => setLayerVisibility(key, saved.layers[key]));
                    controls.enableDamping = false;
                    controls.update();
                    controls.enableDamping = saved.damping;
                    controls.enabled = saved.controlsEnabled;
                    selectSubsystem(calloutsById[saved.selectedId]);
                }
                cineState.snapshot = null;
                camTargetPos = null;
                cameraTween = null;
                camera.updateProjectionMatrix();
                syncExplosionValue();
                syncRotationButton();
                lastConnectionExplosion = NaN;
                dirty = true;
            }
            document.getElementById('btn-play-30s')?.addEventListener('click', () => cineState.active ? stopCinematicSequence() : startCinematicSequence());
            document.getElementById('btn-cine-stop')?.addEventListener('click', stopCinematicSequence);
            function seekCinematic(time) {
                if (!cineState.active) return;
                cineState.time = THREE.MathUtils.clamp(time, 0, 29.999);
                cineState.chapter = -1;
                stopAudio();
                updateCineTime();
                dirty = true;
            }
            if (cineElements.scrubber?.tagName === 'INPUT') {
                cineElements.scrubber.addEventListener('input', event => seekCinematic(Number(event.target.value) / Number(event.target.max || 30) * 30));
            } else if (cineElements.scrubber) {
                const scrubber = cineElements.scrubber;
                scrubber.tabIndex = 0;
                scrubber.setAttribute('role', 'slider');
                scrubber.setAttribute('aria-label', 'Tempo do percurso cinematográfico');
                scrubber.setAttribute('aria-valuemin', '0');
                scrubber.setAttribute('aria-valuemax', '30');
                scrubber.addEventListener('click', event => {
                    const rect = scrubber.getBoundingClientRect();
                    seekCinematic((event.clientX - rect.left) / rect.width * 30);
                });
                scrubber.addEventListener('keydown', event => {
                    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); seekCinematic(cineState.time + (event.key === 'ArrowRight' ? 1 : -1)); }
                    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); seekCinematic(event.key === 'Home' ? 0 : 29.999); }
                });
            }
            window.addEventListener('keydown', event => { if (event.key === 'Escape' && cineState.active) stopCinematicSequence(); });
            function updateCinematic(dt) {
                cineState.time = Math.min(30, cineState.time + dt);
                updateCineTime();
                if (cineState.time >= 30) { stopCinematicSequence(); return; }
                const chapterIndex = Math.min(5, Math.floor(cineState.time / 5));
                const chapter = chapters[chapterIndex];
                const localTime = (cineState.time - chapterIndex * 5) / 5;
                const smooth = localTime * localTime * (3 - 2 * localTime);
                const still = reducedMotion || !motionEnabled;
                const progress = still ? 0.5 : smooth;
                if (cineState.chapter !== chapterIndex) {
                    cineState.chapter = chapterIndex;
                    selectSubsystem(calloutsById[chapter.id]);
                    if (cineElements.act) cineElements.act.textContent = `ACT ${['I','II','III','IV','V','VI'][chapterIndex]} // ${chapter.tag}`;
                    if (cineElements.tag) cineElements.tag.textContent = chapter.tag;
                    if (cineElements.title) cineElements.title.textContent = chapter.title;
                    if (cineElements.sub) cineElements.sub.textContent = chapter.sub;
                    playChord(chapterIndex);
                }
                targetExplosion = THREE.MathUtils.lerp(chapter.start, chapter.end, progress);
                // Exact cinematic positions make seeking and replay independent of prior page time.
                explosionFactor = targetExplosion;
                Object.keys(layers).forEach(key => { layers[key].position.y = layerConfig[key].baseY + layerConfig[key].explodeOffset * explosionFactor; });
                syncExplosionValue();
                scene.updateMatrixWorld(true);
                const target = chapter.wide ? new THREE.Vector3(0, 1, 0) : worldAnchor(calloutsById[chapter.id]);
                const azimuth = chapter.wide ? 0.74 : 0.65 + chapterIndex * 0.9 + (still ? 0 : progress * 0.38);
                const elevation = chapter.wide ? 0.44 : 0.18 + (chapterIndex % 2) * 0.13;
                const radius = chapter.radius * (chapter.wide ? 1 : THREE.MathUtils.lerp(1.2, 0.8, progress)) * Math.max(1, 1 / camera.aspect);
                const offset = new THREE.Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation)).multiplyScalar(radius);
                camera.position.copy(target).add(offset);
                controls.target.copy(target);
                camera.fov = 34;
                camera.updateProjectionMatrix();
                camera.lookAt(target);
                dirty = true;
            }

            // Attach selection IDs to actual geometry; shared materials never need to be mutated.
            [[coreGroup, 'c-geom'], [spacetimeGroup, 'c-unc'], [compGroup, 'c-comp'], [obsPlatformGroup, 'c-infra'], [neuralGroup, 'c-neural'], [modObservation, 'c-obs'], [modTheory, 'c-hyp'], [modValidation, 'c-val'], [modFalsification, 'c-inc']].forEach(([object, id]) => object.traverse(child => { if (child.isMesh) child.userData.subsystem = id; }));
            const selectableMeshes = [];
            masterComplex.traverse(object => { if (object.isMesh && object.userData.subsystem) selectableMeshes.push(object); });
            const raycaster = new THREE.Raycaster();
            const pointer = new THREE.Vector2();
            let pointerStart = null;
            function objectIsVisible(object) { for (let current = object; current; current = current.parent) if (!current.visible) return false; return true; }
            renderer.domElement.addEventListener('pointerdown', event => {
                if (cineState.active) stopCinematicSequence();
                camTargetPos = null;
                cameraTween = null;
                pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
                dirty = true;
            });
            renderer.domElement.addEventListener('pointerup', event => {
                if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5 || performance.now() - pointerStart.time > 500) { pointerStart = null; return; }
                pointerStart = null;
                const rect = renderer.domElement.getBoundingClientRect();
                pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
                raycaster.setFromCamera(pointer, camera);
                const hit = raycaster.intersectObjects(selectableMeshes.filter(objectIsVisible), false)[0];
                if (hit) inspect(hit.object.userData.subsystem);
            });
            renderer.domElement.addEventListener('pointercancel', () => { pointerStart = null; });
            controls.addEventListener('change', () => { dirty = true; });

            function hideCallout(cd) {
                cd.domEl.hidden = true;
                cd.svgLine.setAttribute('visibility', 'hidden');
                cd.svgDot.setAttribute('visibility', 'hidden');
            }
            function projectLabels() {
                const width = container.clientWidth, height = container.clientHeight;
                const occupied = [];
                const order = [...calloutsData].sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId));
                order.forEach(cd => {
                    if (!labelsEnabled || !activeLayers[cd.layer]) { hideCallout(cd); return; }
                    tempVec.copy(cd.localPos);
                    layers[cd.layer].localToWorld(tempVec);
                    tempVec.project(camera);
                    if (tempVec.z < -1 || tempVec.z > 1 || Math.abs(tempVec.x) > 1 || Math.abs(tempVec.y) > 1) { hideCallout(cd); return; }
                    const anchorX = (tempVec.x + 1) * width / 2, anchorY = (1 - tempVec.y) * height / 2;
                    cd.domEl.hidden = false;
                    if (!cd.labelSize) cd.labelSize = { width: cd.domEl.offsetWidth || 235, height: cd.domEl.offsetHeight || 45 };
                    const w = cd.labelSize.width, h = cd.labelSize.height;
                    if (width < w + 32 || height < h + 32) { hideCallout(cd); return; }
                    const clampX = x => THREE.MathUtils.clamp(x, w / 2 + 14, width - w / 2 - 14);
                    const clampY = y => THREE.MathUtils.clamp(y, h / 2 + 14, height - h / 2 - 14);
                    const preferredX = clampX(anchorX + cd.screenOffset.x), preferredY = clampY(anchorY + cd.screenOffset.y);
                    const candidates = [[preferredX,preferredY], [preferredX,preferredY+h+12], [preferredX,preferredY-h-12], [anchorX+w/2+22,anchorY], [anchorX-w/2-22,anchorY], [preferredX,preferredY+2*(h+12)], [preferredX,preferredY-2*(h+12)]];
                    let chosen = null;
                    for (const candidate of candidates) {
                        const x = clampX(candidate[0]), y = clampY(candidate[1]);
                        const rect = { left:x-w/2-4, right:x+w/2+4, top:y-h/2-4, bottom:y+h/2+4 };
                        const overlaps = occupied.some(other => rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top);
                        if (!overlaps) { chosen = { x, y, rect }; break; }
                    }
                    if (!chosen) { hideCallout(cd); return; }
                    occupied.push(chosen.rect);
                    cd.domEl.style.left = `${chosen.x}px`;
                    cd.domEl.style.top = `${chosen.y}px`;
                    cd.svgLine.setAttribute('visibility', 'visible');
                    cd.svgLine.setAttribute('points', `${anchorX},${anchorY} ${anchorX+(chosen.x-anchorX)*0.45},${chosen.y} ${chosen.x},${chosen.y}`);
                    cd.svgDot.setAttribute('visibility', 'visible');
                    cd.svgDot.setAttribute('cx', String(anchorX));
                    cd.svgDot.setAttribute('cy', String(anchorY));
                });
            }
            function resize() {
                const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 800 ? 1.5 : 2));
                renderer.setSize(width, height, true);
                calloutsData.forEach(cd => { cd.labelSize = null; });
                dirty = true;
            }
            if (window.ResizeObserver) new ResizeObserver(resize).observe(container);
            else window.addEventListener('resize', resize);
            document.fonts?.ready.then(() => { calloutsData.forEach(cd => { cd.labelSize = null; }); dirty = true; });
            document.addEventListener('visibilitychange', () => {
                lastTimestamp = null;
                if (document.hidden) stopAudio();
                else { dirty = true; if (cineState.active && audioEnabled) playChord(Math.max(0, cineState.chapter)); }
            });
            renderer.domElement.addEventListener('webglcontextlost', event => {
                event.preventDefault();
                contextLost = true;
                stopAudio();
                showStatus('A conexão com a GPU foi interrompida. Aguarde a recuperação da visualização 3D.', true);
            });
            renderer.domElement.addEventListener('webglcontextrestored', () => {
                contextLost = false;
                lastTimestamp = null;
                dirty = true;
                if (status) status.hidden = true;
            });
            function exportImage(download = false) {
                if (contextLost) throw new Error('A visualização 3D está indisponível.');
                renderer.render(scene, camera);
                const output = document.createElement('canvas');
                output.width = renderer.domElement.width;
                output.height = renderer.domElement.height;
                const context = output.getContext('2d');
                context.fillStyle = '#0a0b0e';
                context.fillRect(0, 0, output.width, output.height);
                context.drawImage(renderer.domElement, 0, 0);
                const url = output.toDataURL('image/png');
                if (download) {
                    const link = document.createElement('a');
                    link.download = 'tamesis-nexus-scene.png';
                    link.href = url;
                    link.click();
                }
                return url;
            }
            function getDiagnostics() {
                scene.updateMatrixWorld(true);
                const connections = busSpecs.map(spec => {
                    const end = spec.parent.localToWorld(spec.curve.getPoint(1));
                    const target = spec.target.localToWorld(spec.targetLocal.clone());
                    return { id:spec.id, sourceLayer:spec.sourceLayer, targetLayer:spec.targetLayer, end:end.toArray(), target:target.toArray(), error:end.distanceTo(target), intendedGap:false, visible:objectIsVisible(spec.mesh) };
                });
                neuralBridges.forEach(spec => {
                    const end = spec.parent.localToWorld(spec.curve.getPoint(1));
                    const target = spec.target.localToWorld(spec.targetLocal.clone());
                    connections.push({ id:spec.id, sourceLayer:4, targetLayer:3, end:end.toArray(), target:target.toArray(), error:end.distanceTo(target), intendedGap:false });
                });
                evidenceLinks.forEach(spec => {
                    const end = evidenceGroup.localToWorld(spec.end.clone());
                    const target = obsPlatformGroup.localToWorld(spec.targetLocal.clone());
                    connections.push({ id:spec.id, sourceLayer:5, targetLayer:1, end:end.toArray(), target:target.toArray(), error:end.distanceTo(target), intendedGap:!spec.intact });
                });
                return {
                    ready:true, contextLost, motion:motionEnabled, reducedMotion, autoRotate, labels:labelsEnabled, selected:selectedId,
                    camera:{ position:camera.position.toArray(), target:controls.target.toArray(), fov:camera.fov, aspect:camera.aspect, controlsEnabled:controls.enabled, transition:Boolean(cameraTween) },
                    layers:Object.fromEntries(Object.keys(layers).map(key => [key, { visible:activeLayers[key], y:layers[key].position.y }])),
                    explosion:{ value:explosionFactor, target:targetExplosion }, cinema:{ active:cineState.active, time:cineState.time, chapter:cineState.chapter, audio:audioEnabled, voices:audioVoices.size },
                    connections, guides:{ bottom:layers[1].position.y-2, top:layers[5].position.y+5 },
                    render:{ calls:renderer.info.render.calls, triangles:renderer.info.render.triangles, geometries:renderer.info.memory.geometries, width:container.clientWidth, height:container.clientHeight, pixelRatio:renderer.getPixelRatio() }
                };
            }
            window.NexusScene = { ready:true, inspect, resetView, setMotion, setLabels, exportImage, getDiagnostics };
            Object.keys(layers).forEach(key => { layers[key].position.y = layerConfig[key].baseY + layerConfig[key].explodeOffset * explosionFactor; });
            updateConnections(true);
            resize();
            controls.update();
            syncLayerButtons();
            syncExplosionValue();
            syncRotationButton();
            syncAudioButton();
            setMotion(motionEnabled);
            selectSubsystem(calloutsById[selectedId]);
            if (status) status.hidden = true;
            window.dispatchEvent(new CustomEvent('nexus:ready'));

            function animate(timestamp) {
                requestAnimationFrame(animate);
                if (document.hidden || contextLost) { lastTimestamp = null; return; }
                const dt = lastTimestamp === null ? 0 : Math.min(Math.max((timestamp - lastTimestamp) / 1000, 0), 0.05);
                lastTimestamp = timestamp;
                if (cineState.active) updateCinematic(dt);
                if (!cineState.active) {
                    const alpha = reducedMotion || !motionEnabled ? 1 : 1 - Math.exp(-dt * 8);
                    explosionFactor += (targetExplosion - explosionFactor) * alpha;
                    if (Math.abs(explosionFactor - targetExplosion) < 0.0001) explosionFactor = targetExplosion;
                    Object.keys(layers).forEach(key => { layers[key].position.y = layerConfig[key].baseY + layerConfig[key].explodeOffset * explosionFactor; });
                }
                if (Math.abs(lastConnectionExplosion - explosionFactor) >= 0.0001 || Number.isNaN(lastConnectionExplosion)) { updateConnections(); dirty = true; }
                if (motionEnabled && dt > 0) {
                    animationTime += dt;
                    if (autoRotate && !cineState.active) masterComplex.rotation.y += dt * 0.06;
                    ring1.rotation.z += dt * 0.10;
                    ring2.rotation.x -= dt * 0.14;
                    ring3.rotation.y += dt * 0.18;
                    topoKnot.rotation.x += dt * 0.14;
                    topoKnot.rotation.y += dt * 0.12;
                    orbitalsGroup.rotation.y -= dt * 0.09;
                    falHalfB.position.y = 2.25 + Math.sin(animationTime * 1.2) * 0.06;
                    pulseParticles.forEach(p => { p.t = (p.t + dt * p.speed) % 1; p.curve.getPointAt(p.t, p.mesh.position); });
                    dirty = true;
                }
                if (!cineState.active && cameraTween) {
                    cameraTween.time = Math.min(cameraTween.duration, cameraTween.time + dt);
                    const t = cameraTween.time / cameraTween.duration;
                    const eased = t * t * (3 - 2 * t);
                    camera.position.lerpVectors(cameraTween.fromPosition, camTargetPos, eased);
                    controls.target.lerpVectors(cameraTween.fromTarget, lookAtTarget, eased);
                    if (t >= 1) { cameraTween = null; camTargetPos = null; }
                    dirty = true;
                }
                // The cinematic director owns the camera completely while its sequence is active.
                if (!cineState.active && controls.update()) dirty = true;
                if (dirty) {
                    renderer.render(scene, camera);
                    projectLabels();
                    dirty = false;
                }
            }
            requestAnimationFrame(animate);
        } catch (error) {
            showStatus(error.message || 'Não foi possível iniciar a visualização 3D neste navegador.', true);
            window.NexusScene = { ready:false, getDiagnostics:() => ({ ready:false, error:String(error.message || error) }) };
            console.error('Tamesis Nexus: scene initialization failed', error);
        }
})();
