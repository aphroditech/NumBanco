import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const FACE_ORDER = ['+x', '-x', '+y', '-y', '+z', '-z'];
const PIPS_BY_FACE = { '+x': 3, '-x': 4, '+y': 1, '-y': 6, '+z': 2, '-z': 5 };

function easeOutBounce(t) {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

function easeOutQuart(t) {
    return 1 - (1 - t) ** 4;
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
}

const FLOOR_SURFACE_Y = -0.62;
const DIE_MESH_SCALE = 1.25;
const DIE_CENTER_REST_Y = FLOOR_SURFACE_Y + 0.5 * DIE_MESH_SCALE;
const FLOOR_CURVE_K = 0.0035;

function floorSurfaceYAt(x, z) {
    return FLOOR_SURFACE_Y + FLOOR_CURVE_K * (x * x + z * z);
}

function clampDieAboveFloor(mesh) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    if (!Number.isFinite(box.min.y)) return;
    const px = mesh.position.x;
    const pz = mesh.position.z;
    const groundY = floorSurfaceYAt(px, pz);
    if (box.min.y < groundY) {
        mesh.position.y += groundY - box.min.y;
    }
}

function createCurvedFloorGeometry(width, height, segW, segH) {
    const geo = new THREE.PlaneGeometry(width, height, segW, segH);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        pos.setY(i, FLOOR_CURVE_K * (x * x + z * z));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
}

const PIP_LAYOUT = {
    1: [[0, 0]],
    2: [
        [-1, -1],
        [1, 1],
    ],
    3: [
        [-1, -1],
        [0, 0],
        [1, 1],
    ],
    4: [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
    ],
    5: [
        [-1, -1],
        [1, -1],
        [0, 0],
        [-1, 1],
        [1, 1],
    ],
    6: [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [1, -1],
        [1, 0],
        [1, 1],
    ],
};

function drawPipsOnCanvas(pipCount) {
    const size = 512;
    const colorCanvas = document.createElement('canvas');
    const emissiveCanvas = document.createElement('canvas');
    colorCanvas.width = colorCanvas.height = size;
    emissiveCanvas.width = emissiveCanvas.height = size;

    const ctx = colorCanvas.getContext('2d');
    const ectx = emissiveCanvas.getContext('2d');

    const pad = 72;
    const w = size - pad * 2;
    const cx = size / 2;
    const cy = size / 2;
    const rDot = 30;
    const rOutline = rDot + 3.5;

    const grad = ctx.createRadialGradient(cx - 96, cy - 96, 0, cx, cy, size * 0.92);
    grad.addColorStop(0, '#e82d3c');
    grad.addColorStop(0.35, '#b01024');
    grad.addColorStop(0.65, '#7a0818');
    grad.addColorStop(1, '#3d050e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ectx.fillStyle = '#000000';
    ectx.fillRect(0, 0, size, size);

    const pts = PIP_LAYOUT[pipCount] || PIP_LAYOUT[1];
    const step = w / 3;

    const drawPipPair = (px, py) => {
        const x = cx + px * step * 0.85;
        const y = cy + py * step * 0.85;

        ctx.beginPath();
        ctx.arc(x, y, rOutline, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(12,4,8,0.92)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, rDot, 0, Math.PI * 2);
        const pipGrad = ctx.createRadialGradient(x - 9, y - 9, 0, x, y, rDot);
        pipGrad.addColorStop(0, '#ffffff');
        pipGrad.addColorStop(0.55, '#f5f5f5');
        pipGrad.addColorStop(1, '#d8d8d8');
        ctx.fillStyle = pipGrad;
        ctx.fill();

        ectx.beginPath();
        ectx.arc(x, y, rDot, 0, Math.PI * 2);
        ectx.fillStyle = '#ffffff';
        ectx.fill();
    };

    pts.forEach(([ix, iy]) => drawPipPair(ix, iy));

    return { colorCanvas, emissiveCanvas };
}

function materialsForDie() {
    const mats = FACE_ORDER.map((key) => {
        const n = PIPS_BY_FACE[key];
        const { colorCanvas, emissiveCanvas } = drawPipsOnCanvas(n);
        const tex = new THREE.CanvasTexture(colorCanvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.generateMipmaps = true;

        const emissiveTex = new THREE.CanvasTexture(emissiveCanvas);
        emissiveTex.colorSpace = THREE.SRGBColorSpace;
        emissiveTex.anisotropy = 8;
        emissiveTex.minFilter = THREE.LinearMipmapLinearFilter;
        emissiveTex.generateMipmaps = true;

        return new THREE.MeshPhysicalMaterial({
            map: tex,
            emissiveMap: emissiveTex,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: 0.62,
            color: 0xc91828,
            roughness: 0.1,
            metalness: 0,
            clearcoat: 1,
            clearcoatRoughness: 0.06,
            transmission: 0.72,
            thickness: 0.62,
            ior: 1.52,
            transparent: true,
            opacity: 1,
            attenuationColor: new THREE.Color(0x4a020c),
            attenuationDistance: 0.38,
            envMapIntensity: 1.35,
        });
    });
    return mats;
}

function quaternionForTopValue(value) {
    const e = new THREE.Euler(0, 0, 0, 'XYZ');
    switch (value) {
        case 1:
            e.set(0, 0, 0);
            break;
        case 2:
            e.set(-Math.PI / 2, 0, 0);
            break;
        case 3:
            e.set(0, 0, Math.PI / 2);
            break;
        case 4:
            e.set(0, 0, -Math.PI / 2);
            break;
        case 5:
            e.set(Math.PI / 2, 0, 0);
            break;
        case 6:
            e.set(Math.PI, 0, 0);
            break;
        default:
            e.set(0, 0, 0);
    }
    return new THREE.Quaternion().setFromEuler(e);
}

function createDieMesh() {
    const geo = new RoundedBoxGeometry(1, 1, 1, 4, 0.11);
    const mesh = new THREE.Mesh(geo, materialsForDie());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.setScalar(1.25);
    return mesh;
}

const TwoDiceCanvas3D = forwardRef(function TwoDiceCanvas3D(
    { height = 420, onRollComplete, className },
    ref
) {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const diceRef = useRef([]);
    const animRef = useRef(null);
    const rollingRef = useRef(false);
    const onRollCompleteRef = useRef(onRollComplete);
    onRollCompleteRef.current = onRollComplete;

    const rollInternal = (value1, value2) => {
        const die1 = diceRef.current[0];
        const die2 = diceRef.current[1];
        if (!die1 || !die2 || rollingRef.current) return;
        rollingRef.current = true;

        const qA1 = die1.quaternion.clone();
        const qA2 = die2.quaternion.clone();
        const qT1 = quaternionForTopValue(value1);
        const qT2 = quaternionForTopValue(value2);
        
        const qWild1 = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
                Math.PI * (6 + Math.random() * 8),
                Math.PI * (6 + Math.random() * 8),
                Math.PI * (6 + Math.random() * 8)
            )
        );
        const qWild2 = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
                Math.PI * (6 + Math.random() * 8),
                Math.PI * (6 + Math.random() * 8),
                Math.PI * (6 + Math.random() * 8)
            )
        );
        
        const qMid1 = qT1.clone().multiply(qWild1);
        const qMid2 = qT2.clone().multiply(qWild2);

        const T_TOSS = 0.09;
        const T_FALL_END = 0.44;
        const T_TUMBLE_SPLIT = 0.52;
        const liftY = 2.15 + Math.random() * 0.45;

        const wobbleFreq1 = {
            x: 13 + Math.random() * 4,
            y: 11 + Math.random() * 4,
            z: 15 + Math.random() * 3,
        };
        const wobbleFreq2 = {
            x: 13 + Math.random() * 4,
            y: 11 + Math.random() * 4,
            z: 15 + Math.random() * 3,
        };

        const t0 = performance.now();
        const duration = 3200;

        const tick = (now) => {
            const t = Math.min(1, (now - t0) / duration);

            let animOffY = 0;
            if (t < T_TOSS) {
                const u = t / T_TOSS;
                animOffY = liftY * easeOutQuad(u);
            } else if (t < T_FALL_END) {
                const u = (t - T_TOSS) / (T_FALL_END - T_TOSS);
                animOffY = liftY * (1 - easeOutBounce(u));
            }

            const sway = (1 - t) * (1 - t);
            
            // Die 1 animation
            die1.position.set(
                Math.sin(t * 19.2) * 0.16 * sway - 1.2,
                DIE_CENTER_REST_Y + animOffY,
                Math.cos(t * 16.8) * 0.13 * sway
            );

            // Die 2 animation
            die2.position.set(
                Math.sin(t * 19.2) * 0.16 * sway + 1.2,
                DIE_CENTER_REST_Y + animOffY,
                Math.cos(t * 16.8) * 0.13 * sway
            );

            // Die 1 rotation
            let qBase1;
            if (t < T_TUMBLE_SPLIT) {
                const u = t / T_TUMBLE_SPLIT;
                qBase1 = new THREE.Quaternion().slerpQuaternions(qA1, qMid1, easeInOutCubic(u));
            } else {
                const u = (t - T_TUMBLE_SPLIT) / (1 - T_TUMBLE_SPLIT);
                qBase1 = new THREE.Quaternion().slerpQuaternions(qMid1, qT1, easeOutQuart(u));
            }

            // Die 2 rotation
            let qBase2;
            if (t < T_TUMBLE_SPLIT) {
                const u = t / T_TUMBLE_SPLIT;
                qBase2 = new THREE.Quaternion().slerpQuaternions(qA2, qMid2, easeInOutCubic(u));
            } else {
                const u = (t - T_TUMBLE_SPLIT) / (1 - T_TUMBLE_SPLIT);
                qBase2 = new THREE.Quaternion().slerpQuaternions(qMid2, qT2, easeOutQuart(u));
            }

            const wob = (1 - t) * (1 - t);
            
            const qOsc1 = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                    Math.sin(t * Math.PI * wobbleFreq1.x) * 2.85 * wob,
                    Math.cos(t * Math.PI * wobbleFreq1.y) * 2.85 * wob,
                    Math.sin(t * Math.PI * wobbleFreq1.z) * 2.35 * wob
                )
            );
            
            const qOsc2 = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                    Math.sin(t * Math.PI * wobbleFreq2.x) * 2.85 * wob,
                    Math.cos(t * Math.PI * wobbleFreq2.y) * 2.85 * wob,
                    Math.sin(t * Math.PI * wobbleFreq2.z) * 2.35 * wob
                )
            );
            
            die1.quaternion.copy(qBase1).multiply(qOsc1);
            die2.quaternion.copy(qBase2).multiply(qOsc2);
            
            clampDieAboveFloor(die1);
            clampDieAboveFloor(die2);

            if (t < 1) {
                animRef.current = requestAnimationFrame(tick);
            } else {
                die1.position.set(-1.2, DIE_CENTER_REST_Y, 0);
                die1.quaternion.copy(quaternionForTopValue(value1));
                die1.quaternion.multiply(
                    new THREE.Quaternion().setFromEuler(
                        new THREE.Euler(0, (Math.random() - 0.5) * 0.06, 0)
                    )
                );
                
                die2.position.set(1.2, DIE_CENTER_REST_Y, 0);
                die2.quaternion.copy(quaternionForTopValue(value2));
                die2.quaternion.multiply(
                    new THREE.Quaternion().setFromEuler(
                        new THREE.Euler(0, (Math.random() - 0.5) * 0.06, 0)
                    )
                );
                
                clampDieAboveFloor(die1);
                clampDieAboveFloor(die2);
                rollingRef.current = false;
                onRollCompleteRef.current?.([value1, value2]);
            }
        };
        animRef.current = requestAnimationFrame(tick);
    };

    useImperativeHandle(ref, () => ({
        roll: (v1, v2) => {
            const n1 = Number(v1);
            const n2 = Number(v2);
            const val1 = v1 != null && v1 !== '' && Number.isFinite(n1) && n1 >= 1 && n1 <= 6
                ? Math.round(n1)
                : Math.floor(Math.random() * 6) + 1;
            const val2 = v2 != null && v2 !== '' && Number.isFinite(n2) && n2 >= 1 && n2 <= 6
                ? Math.round(n2)
                : Math.floor(Math.random() * 6) + 1;
            rollInternal(val1, val2);
            return [val1, val2];
        },
        isRolling: () => rollingRef.current,
    }));

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return undefined;

        const width = mount.clientWidth || 640;
        const h = height;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0b1420);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(40, width / h, 0.1, 100);
        camera.position.set(0, 2, 6.4);
        camera.lookAt(0, DIE_CENTER_REST_Y + 0.12, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, h);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
        pmrem.dispose();

        const hemi = new THREE.HemisphereLight(0x2f5a86, 0x0a1220, 0.58);
        scene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 1.05);
        dir.position.set(4.5, 9, 5);
        dir.castShadow = true;
        dir.shadow.mapSize.set(1024, 1024);
        dir.shadow.camera.near = 0.5;
        dir.shadow.camera.far = 30;
        dir.shadow.bias = -0.00025;
        scene.add(dir);
        const rim = new THREE.SpotLight(0x8ed6ff, 2.0, 24, Math.PI / 5, 0.45, 1);
        rim.position.set(-4, 6, 2);
        rim.target.position.set(0, DIE_CENTER_REST_Y, 0);
        scene.add(rim);
        scene.add(rim.target);
        const fill = new THREE.PointLight(0x24b4ff, 0.62, 22);
        fill.position.set(3, 1.8, 4);
        scene.add(fill);

        const floorGeom = createCurvedFloorGeometry(40, 40, 96, 96);
        const floor = new THREE.Mesh(
            floorGeom,
            new THREE.MeshPhysicalMaterial({
                color: 0x0b2f5a,
                roughness: 0.35,
                metalness: 0.52,
                clearcoat: 0.95,
                clearcoatRoughness: 0.18,
                envMapIntensity: 1.05,
            })
        );
        floor.position.y = FLOOR_SURFACE_Y;
        floor.receiveShadow = true;
        scene.add(floor);

        const die1 = createDieMesh();
        die1.position.set(-1.2, DIE_CENTER_REST_Y, 0);
        scene.add(die1);
        
        const die2 = createDieMesh();
        die2.position.set(1.2, DIE_CENTER_REST_Y, 0);
        scene.add(die2);
        
        diceRef.current = [die1, die2];

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.minDistance = 3.2;
        controls.maxDistance = 10;
        controls.maxPolarAngle = Math.PI / 2 - 0.08;
        controls.target.set(0, DIE_CENTER_REST_Y + 0.12, 0);
        controlsRef.current = controls;

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            controls.update();
            renderer.render(scene, camera);
        };
        loop();

        const ro = new ResizeObserver(() => {
            if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
            const w = mountRef.current.clientWidth;
            if (w < 10) return;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        });
        ro.observe(mount);

        return () => {
            cancelAnimationFrame(raf);
            if (animRef.current) cancelAnimationFrame(animRef.current);
            ro.disconnect();
            if (scene.environment) {
                scene.environment.dispose();
            }
            controls.dispose();
            renderer.dispose();
            if (renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
            diceRef.current = [];
            scene.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    const m = obj.material;
                    if (Array.isArray(m)) m.forEach((x) => x.dispose?.());
                    else m.dispose?.();
                }
            });
        };
    }, [height]);

    return (
        <div
            ref={mountRef}
            className={className}
            style={{
                width: '100%',
                height,
                minHeight: height,
                borderRadius: 14,
                overflow: 'hidden',
                background:
                    'radial-gradient(ellipse 85% 70% at 50% 42%, rgba(40,140,220,0.28) 0%, transparent 55%), linear-gradient(165deg, #0d1b2a 0%, #0a1522 50%, #08111a 100%)',
                border: '1px solid rgba(64, 164, 255, 0.42)',
                boxShadow: 'inset 0 0 80px rgba(0,0,0,0.45)',
            }}
        />
    );
});

export default TwoDiceCanvas3D;
