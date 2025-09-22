// Using global THREE from CDN in index.html

// Canvas and renderer setup
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x20232a, 1);
renderer.shadowMap.enabled = true;
// Improve color/brightness
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// Scene and camera
const scene = new THREE.Scene();
// Relax fog so the track remains visible
scene.fog = new THREE.Fog(0x20232a, 60, 2000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 800);
camera.position.set(0, 10, 20);
scene.add(camera);

// Basic light for later levels
const ambient = new THREE.AmbientLight(0xffffff, 0.85);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.4);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 10, 5);
dir.castShadow = true;
scene.add(dir);

// Hide initial debug shapes (removed)

// Level 3: Environment - road and grass
const environment = new THREE.Group();
scene.add(environment);
// keep environment anchored; we simulate motion via texture scroll instead of moving the whole world

// Road (F1-like track styling)
const laneWidth = 3; // width of a single lane
const roadWidth = laneWidth * 3; // three lanes
const roadLength = 400; // long strip so we can move forward later
// Asphalt with subtle noise
function makeAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const n = Math.random() * 30 | 0; // cheap noise
            const base = 35 + n;
            ctx.fillStyle = `rgb(${base},${base},${base})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(roadWidth / 2, roadLength / 10);
    return tex;
}
const roadTexture = makeAsphaltTexture();
roadTexture.offset.y = 0;
const road = new THREE.Mesh(
    new THREE.PlaneGeometry(roadWidth, roadLength),
    new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95, map: roadTexture })
);
road.rotation.x = -Math.PI * 0.5;
road.receiveShadow = true;
environment.add(road);

// Grass left/right
// Dark shoulders instead of grass
function makeShoulder(xOffset) {
    const shoulder = new THREE.Mesh(
        new THREE.PlaneGeometry(12, roadLength),
        new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1 })
    );
    shoulder.rotation.x = -Math.PI * 0.5;
    shoulder.position.x = xOffset;
    shoulder.receiveShadow = true;
    return shoulder;
}
environment.add(makeShoulder(-roadWidth * 0.75 - 2), makeShoulder(roadWidth * 0.75 + 2));

// Guardrails
function addGuardrail(x) {
    const rail = new THREE.Group();
    const postGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 10);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, metalness: 0.6, roughness: 0.4 });
    const barGeom = new THREE.BoxGeometry(0.1, 0.12, 3);
    const barMat = postMat;
    for (let z = -roadLength * 0.5; z < roadLength * 0.5; z += 3) {
        const p = new THREE.Mesh(postGeom, postMat);
        p.position.set(x, 0.4, z);
        p.castShadow = true;
        rail.add(p);
        const b1 = new THREE.Mesh(barGeom, barMat);
        b1.position.set(x, 0.7, z + 1.5);
        rail.add(b1);
        const b2 = b1.clone();
        b2.position.y = 0.55;
        rail.add(b2);
    }
    environment.add(rail);
}
addGuardrail(-roadWidth * 0.5 - 1.2);
addGuardrail(roadWidth * 0.5 + 1.2);

// Optional dashed lane lines using CanvasTexture
function makeDashedLineTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2f2f2f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e0e0e0';
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.fillRect(canvas.width / 2 - 2, y, 4, 20);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, roadLength / 10);
    return tex;
}

const laneTex = makeDashedLineTexture();
laneTex.offset.y = 0;
const laneLineMat = new THREE.MeshBasicMaterial({ map: laneTex, transparent: true });
function addLaneLine(x) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.18, roadLength), laneLineMat);
    line.rotation.x = -Math.PI * 0.5;
    line.position.x = x;
    environment.add(line);
}
// three lanes: centers at -laneWidth, 0, +laneWidth → lane dividers at -laneWidth/2 and +laneWidth/2
addLaneLine(-laneWidth * 0.5);
addLaneLine(laneWidth * 0.5);

// Solid edge lines (optional)
const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
function addEdgeLine(x) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.12, roadLength), edgeMat);
    edge.rotation.x = -Math.PI * 0.5;
    edge.position.x = x;
    environment.add(edge);
}
addEdgeLine(-roadWidth * 0.5);
addEdgeLine(roadWidth * 0.5);

// Red/white curbs along edges
function makeCurbTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    for (let y = 0; y < canvas.height; y += 32) {
        ctx.fillStyle = (y / 32) % 2 === 0 ? '#d50000' : '#ffffff';
        ctx.fillRect(0, y, canvas.width, 16);
        ctx.fillStyle = (y / 32) % 2 === 0 ? '#ffffff' : '#d50000';
        ctx.fillRect(0, y + 16, canvas.width, 16);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, roadLength / 6);
    return tex;
}
const curbMat = new THREE.MeshBasicMaterial({ map: makeCurbTexture() });
const curbWidth = 0.4;
const curbLeft = new THREE.Mesh(new THREE.PlaneGeometry(curbWidth, roadLength), curbMat);
curbLeft.rotation.x = -Math.PI * 0.5;
curbLeft.position.x = -roadWidth * 0.5 - curbWidth * 0.5;
environment.add(curbLeft);
const curbRight = new THREE.Mesh(new THREE.PlaneGeometry(curbWidth, roadLength), curbMat);
curbRight.rotation.x = -Math.PI * 0.5;
curbRight.position.x = roadWidth * 0.5 + curbWidth * 0.5;
environment.add(curbRight);

// Level 2: Player car composed of boxes and cylinders
function makePlayerCar() {
    const car = new THREE.Group();
    // Materials
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xd32f2f, metalness: 0.4, roughness: 0.3, clearcoat: 1.0, clearcoatRoughness: 0.1 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x99aabb, metalness: 0, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.85 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.2, roughness: 0.6 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.8, roughness: 0.3 });

    // Body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.6, 4.0),
        bodyMat
    );
    body.position.y = 0.6;
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);

    // Cabin
    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.7, 1.8),
        trimMat
    );
    cabin.position.set(0, 1.1, -0.3);
    cabin.castShadow = true;
    car.add(cabin);

    // Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.05), glassMat);
    windshield.position.set(0, 1.2, 0.5);
    car.add(windshield);

    // Front bumper and grille
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 0.2), trimMat);
    bumper.position.set(0, 0.7, 2.0);
    car.add(bumper);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.05), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5, roughness: 0.4 }));
    grille.position.set(0, 0.9, 1.95);
    car.add(grille);

    // Side mirrors
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, metalness: 0.3, roughness: 0.4 });
    const mirrorL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.3), mirrorMat);
    mirrorL.position.set(-1.2, 1.05, 0.2);
    const mirrorR = mirrorL.clone();
    mirrorR.position.x = 1.2;
    car.add(mirrorL, mirrorR);

    // Rear spoiler
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.5), bodyMat);
    spoiler.position.set(0, 1.25, -1.8);
    car.add(spoiler);

    // Exhaust pipes
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.2 });
    const exL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16), exhaustMat);
    exL.rotation.x = Math.PI * 0.5;
    exL.position.set(-0.5, 0.4, -2.05);
    const exR = exL.clone();
    exR.position.x = 0.5;
    car.add(exL, exR);
    car.userData.exhaustPoints = [exL.position.clone(), exR.position.clone()];
    // Nitro flames (hidden until boosting)
    const flameMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x66ccff, emissiveIntensity: 0.0, transparent: true, opacity: 0.85 });
    const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 16), flameMat);
    flameL.rotation.x = Math.PI;
    flameL.position.copy(exL.position).add(new THREE.Vector3(0, 0, -0.2));
    const flameR = flameL.clone();
    flameR.position.x = exR.position.x;
    car.add(flameL, flameR);
    car.userData.nitroFlames = [flameL, flameR];

    // Wheel helper
    function makeWheel() {
        const group = new THREE.Group();
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.32, 48), tireMat);
        tire.rotation.z = Math.PI * 0.5;
        tire.castShadow = true;
        tire.receiveShadow = true;
        group.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.34, 24), rimMat);
        rim.rotation.z = Math.PI * 0.5;
        group.add(rim);
        group.rotation.z = Math.PI * 0.5;
        group.castShadow = true;
        group.receiveShadow = true;
        return group;
    }

    const wheelFL = makeWheel();
    wheelFL.position.set(-0.95, 0.38, 1.15);
    const wheelFR = makeWheel();
    wheelFR.position.set(0.95, 0.38, 1.15);
    const wheelRL = makeWheel();
    wheelRL.position.set(-0.95, 0.38, -1.15);
    const wheelRR = makeWheel();
    wheelRR.position.set(0.95, 0.38, -1.15);

    car.add(wheelFL, wheelFR, wheelRL, wheelRR);

    // Expose wheels for animation
    car.userData.wheels = [wheelFL, wheelFR, wheelRL, wheelRR];
    car.userData.frontWheels = [wheelFL, wheelFR];
    car.userData.wheelRadius = 0.38;

    // Headlights (emissive)
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffee, emissiveIntensity: 2.0 });
    const hlL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), headlightMat);
    hlL.rotation.x = Math.PI * 0.5;
    hlL.position.set(-0.45, 0.8, 1.9);
    const hlR = hlL.clone();
    hlR.position.x = 0.45;
    car.add(hlL, hlR);
    // Low-intensity headlight spots for effect
    const spotL = new THREE.SpotLight(0xffffff, 0.5, 20, Math.PI * 0.15, 0.6, 1.0);
    spotL.position.set(-0.45, 0.8, 1.9);
    spotL.target.position.set(-0.45, 0.5, 6);
    car.add(spotL, spotL.target);
    const spotR = new THREE.SpotLight(0xffffff, 0.5, 20, Math.PI * 0.15, 0.6, 1.0);
    spotR.position.set(0.45, 0.8, 1.9);
    spotR.target.position.set(0.45, 0.5, 6);
    car.add(spotR, spotR.target);

    // Taillights
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff0033, emissiveIntensity: 1.2 });
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.04), tailMat);
    tlL.position.set(-0.5, 0.75, -2.0);
    const tlR = tlL.clone();
    tlR.position.x = 0.5;
    car.add(tlL, tlR);

    car.userData.tailLights = [tlL, tlR];

    return car;
}

const playerCar = makePlayerCar();
playerCar.position.set(0, 0, 0);
scene.add(playerCar);

// Level 4: Chase camera (smooth follow) with multiple camera modes
const desiredCameraPos = new THREE.Vector3();
const desiredLookAt = new THREE.Vector3();
const cameraModes = [
    { name: 'Chase',       offset: new THREE.Vector3(0, 9.5, 18),  lookAhead: new THREE.Vector3(0, 0, -10), baseFov: 60 },
    { name: 'Near Chase',  offset: new THREE.Vector3(0, 4.0, 7.0), lookAhead: new THREE.Vector3(0, 0, -8),  baseFov: 64 },
    { name: 'Hood',        offset: new THREE.Vector3(0, 1.6, 2.2), lookAhead: new THREE.Vector3(0, 0, -8),  baseFov: 68 },
    { name: 'Top',         offset: new THREE.Vector3(0, 25, 25),   lookAhead: new THREE.Vector3(0, 0, -12), baseFov: 58 },
    { name: 'Side',        offset: new THREE.Vector3(6, 6, 10),    lookAhead: new THREE.Vector3(4, 0, -8),  baseFov: 62 },
];
let cameraModeIndex = 0;
// Simple exhaust particle system
const exhaustGroup = new THREE.Group();
scene.add(exhaustGroup);
const exhaustParticles = [];
function spawnExhaust() {
    if (!playerCar.userData || !playerCar.userData.exhaustPoints) return;
    for (const base of playerCar.userData.exhaustPoints) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0xcccccc, transparent: true, opacity: 0.7, roughness: 1 }));
        p.position.copy(playerCar.position).add(base);
        p.position.x += (Math.random() - 0.5) * 0.05;
        p.position.y += (Math.random()) * 0.03;
        p.userData.v = new THREE.Vector3(0, 0.3 + Math.random() * 0.4, 0.2);
        p.userData.life = 0.6;
        exhaustGroup.add(p);
        exhaustParticles.push(p);
    }
}

// Resize handling
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});

// Simple render loop
let lastTime = performance.now();
// Level 5: Controls and simple physics
const keys = new Set();
window.addEventListener('keydown', (e) => {
    // instant lane switch on discrete press (no auto-repeat)
    if (!e.repeat) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            carState.targetLaneX = Math.max(-laneWidth, carState.targetLaneX - laneWidth);
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            carState.targetLaneX = Math.min(laneWidth, carState.targetLaneX + laneWidth);
        }
    }
    keys.add(e.key);
});
window.addEventListener('keyup', (e) => { keys.delete(e.key); });

// Camera mode toggle (press C)
window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'c' || e.key === 'C') {
        cameraModeIndex = (cameraModeIndex + 1) % cameraModes.length;
    }
});

const carState = {
    velocityZ: 0,
    targetLaneX: 0,
    xLerpSpeed: 12,
    acceleration: 16,
    brakeDecel: 14,
    friction: 3,
    forwardMaxBase: 12,  // 120 km/h base cap
    forwardMaxBoost: 18, // 180 km/h when turbo
    minSpeed: -6         // reverse cap (units/s)
};
// Auto-cruise ramp (units/s). Starts ~80 km/h and ramps to ~100 km/h
const autoCruiseStart = 10.0;   // ~100 km/h
const autoCruiseMax = 14.0;     // ~140 km/h
const autoCruiseRampSec = 25;   // seconds to reach max

// Turbo system
const turboState = {
    value: 1.0, // 0..1 fraction
    drainPerSec: 0.5,
    rechargePerSec: 0.25,
    boostAccelMult: 1.8,
    visualFlame: true
};

// Level 6: Enemy cars and spawning
function makeEnemyCar() {
    const car = new THREE.Group();
    const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
    // avoid red-ish hues close to player color
    if (color.getHSL({}).h < 0.05 || color.getHSL({}).h > 0.95) color.setHSL(0.6, 0.7, 0.5);

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.6, 3.6),
        new THREE.MeshStandardMaterial({ color: color.getHex(), metalness: 0.1, roughness: 0.8 })
    );
    body.position.y = 0.6;
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);

    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.6, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x37474f })
    );
    cabin.position.set(0, 1.0, 0.2);
    car.add(cabin);

    // simple wheels
    function w(px, pz) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.26, 18), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        m.rotation.z = Math.PI * 0.5;
        m.position.set(px, 0.35, pz);
        return m;
    }
    car.add(w(-0.9, 1.0), w(0.9, 1.0), w(-0.9, -1.0), w(0.9, -1.0));

    car.rotation.y = Math.PI; // face toward player
    return car;
}

const enemies = [];
let spawnTimer = 0;
let spawnInterval = 1.4; // will ramp with time
const laneXs = [-laneWidth, 0, laneWidth];
function spawnEnemy(zBase) {
    const e = makeEnemyCar();
    const lane = laneXs[Math.floor(Math.random() * laneXs.length)];
    e.position.set(lane, 0, zBase);
    e.userData.speed = 10 + Math.random() * 6; // base speed
    enemies.push(e);
    scene.add(e);
}

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    if (gameOver) {
        renderer.render(scene, camera);
        return;
    }

    // Controls (leave as-is for any future use)
    const up = keys.has('ArrowUp') || keys.has('w') || keys.has('W');
    const down = keys.has('ArrowDown') || keys.has('s') || keys.has('S');
    const boost = keys.has('Shift') || keys.has(' ') || keys.has('Space');

    // ---- EDITED LINE: Always move forward ----
    carState.velocityZ = -10;
    // ------------------------------------------

    // Longitudinal speed control (previous logic now does nothing due to override above)
    let accel = carState.acceleration;
    let vmaxForward = carState.forwardMaxBase;
    if (boost && turboState.value > 0.05) {
        turboState.value = Math.max(0, turboState.value - turboState.drainPerSec * dt);
        accel *= turboState.boostAccelMult;
        vmaxForward = carState.forwardMaxBoost;
    } else {
        turboState.value = Math.min(1, turboState.value + turboState.rechargePerSec * dt);
    }


    if (up) carState.velocityZ -= accel * dt;
    else if (down) carState.velocityZ += carState.brakeDecel * dt;
    else {
        // Auto-cruise ramps up with survival time
        const t = Math.min(1, elapsed / autoCruiseRampSec);
        const cruise = THREE.MathUtils.lerp(autoCruiseStart, autoCruiseMax, t);
        const target = -cruise;
        const diff = target - carState.velocityZ;
        const rate = accel * 0.4; // gentle convergence
        carState.velocityZ += THREE.MathUtils.clamp(diff, -rate * dt, rate * dt);
    }
    // Clamp forward (negative z is forward) and reverse
    const maxForwardNeg = -vmaxForward; // negative value
    carState.velocityZ = Math.min(0 - carState.minSpeed, Math.max(carState.minSpeed, carState.velocityZ));
    if (carState.velocityZ < maxForwardNeg) carState.velocityZ = maxForwardNeg;

    // Brake lights intensity when braking
    if (playerCar.userData && playerCar.userData.tailLights) {
        const braking = down && carState.velocityZ < 0.5;
        const brighten = braking ? 2.2 : 1.2;
        for (const tl of playerCar.userData.tailLights) {
            tl.material.emissiveIntensity = brighten;
        }
    }

    // Apply movement (keep player z near 0 so road stays visible)
   // Apply movement (move car forward along -Z, keep lane logic)
const currentX = playerCar.position.x;
playerCar.position.x = THREE.MathUtils.lerp(currentX, carState.targetLaneX, 1 - Math.pow(1 - Math.min(1, carState.xLerpSpeed * dt), 2));

// ---- Edited for auto-forward ----
playerCar.position.z -= 10 * dt; // Move car forward every frame, speed=10 units/sec
// ---------------------------------


    // Animate wheel rotation based on linear speed
    if (playerCar.userData && playerCar.userData.wheels) {
        const radius = playerCar.userData.wheelRadius || 0.38;
        const linearSpeed = Math.abs(carState.velocityZ); // spin forward regardless of sign
        const angularSpeed = linearSpeed / radius; // rad/s
        for (const wheel of playerCar.userData.wheels) {
            wheel.rotation.x += angularSpeed * dt;
        }
        // subtle front wheel yaw while changing lanes
        if (playerCar.userData.frontWheels) {
            const steerTarget = THREE.MathUtils.clamp((carState.targetLaneX - playerCar.position.x) * 0.2, -0.35, 0.35);
            for (const fw of playerCar.userData.frontWheels) {
                fw.rotation.y = THREE.MathUtils.lerp(fw.rotation.y, steerTarget, 0.2);
            }
        }
    }

    // Scroll road visually to simulate motion (keep world anchored)
    const scrollSpeed = Math.max(0, -carState.velocityZ) * 0.12;
    if (roadTexture) {
        roadTexture.offset.y = (roadTexture.offset.y + scrollSpeed) % 1;
    }
    if (laneTex) {
        laneTex.offset.y = (laneTex.offset.y + scrollSpeed * 1.2) % 1;
    }
    environment.position.z = 0;

    // Subtle camera FOV and shake based on speed and current camera mode
    const camMode = cameraModes[cameraModeIndex];
    const baseFov = camMode.baseFov;
    const speedMag = Math.max(0, -carState.velocityZ);
    const fovTarget = baseFov + Math.min(14, speedMag * (boost ? 0.5 : 0.25));
    camera.fov = THREE.MathUtils.lerp(camera.fov, fovTarget, 0.06);
    camera.updateProjectionMatrix();

    // Enemy spawning and movement
    spawnTimer -= dt;
    const aheadZ = playerCar.position.z - 80;
    if (spawnTimer <= 0) {
        spawnEnemy(aheadZ);
        spawnTimer = spawnInterval;
        // Level 9: difficulty ramp (faster spawns over time)
        spawnInterval = Math.max(0.6, 1.4 - elapsed * 0.02);
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.position.z += e.userData.speed * dt; // move toward player (+Z)
        // remove if passed far behind
        if (e.position.z - playerCar.position.z > 60) {
            scene.remove(e);
            enemies.splice(i, 1);
        }
    }

    // Level 7: Collision detection (AABB) with same-lane check
    tmpBox.setFromObject(playerCar);
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        // Consider collision only if both are effectively in the same lane
    const sameLane = Math.abs(enemy.position.x - playerCar.position.x) < (laneWidth * 0.25); // tolerance scales with lane width
        if (!sameLane) continue;
        otherBox.setFromObject(enemy);
        if (tmpBox.intersectsBox(otherBox)) {
            triggerGameOver();
            break;
        }
    }

    // HUD update
    elapsed += dt;
    scoreEl.textContent = String(Math.floor(elapsed));
    // Convert to km/h (units are arbitrary; treat 1 unit/s ~= 10 km/h for feel)
    // 1 unit/s == 10 km/h
    const kmh = Math.abs(carState.velocityZ) * 10;
    speedEl.textContent = kmh.toFixed(0);
    if (turboEl) turboEl.textContent = Math.round(turboState.value * 100) + '%';

    // Smooth camera to follow playerCar based on mode
    desiredCameraPos.copy(playerCar.position).add(camMode.offset);
    camera.position.lerp(desiredCameraPos, 1 - Math.pow(0.0001, dt));
    desiredLookAt.copy(playerCar.position).add(camMode.lookAhead);
    camera.lookAt(desiredLookAt);

    // Exhaust update
    if (-carState.velocityZ > 2) {
        // more exhaust while boosting
        spawnExhaust();
        if (boost) spawnExhaust();
    }
    // Nitro flame visuals while boosting
    if (playerCar.userData && playerCar.userData.nitroFlames) {
        const active = boost && turboState.value > 0.05 && -carState.velocityZ > 2;
        const targetIntensity = active ? 3.0 : 0.0;
        for (const f of playerCar.userData.nitroFlames) {
            f.material.emissiveIntensity = THREE.MathUtils.lerp(f.material.emissiveIntensity, targetIntensity, 0.2);
            f.scale.y = THREE.MathUtils.lerp(f.scale.y, active ? 1.0 + Math.random() * 0.3 : 0.1, 0.3);
            f.visible = f.material.emissiveIntensity > 0.05;
        }
    }
    for (let i = exhaustParticles.length - 1; i >= 0; i--) {
        const p = exhaustParticles[i];
        p.userData.life -= dt;
        if (p.userData.life <= 0) {
            exhaustGroup.remove(p);
            exhaustParticles.splice(i, 1);
            continue;
        }
        p.position.addScaledVector(p.userData.v, dt);
        p.material.opacity = Math.max(0, p.userData.life);
        p.scale.multiplyScalar(1 + 0.8 * dt);
    }

    renderer.render(scene, camera);
}

// HUD placeholders
const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const turboEl = document.getElementById('turbo');
const highscoreEl = document.getElementById('highscore');
let elapsed = 0;
let highscore = Number(localStorage.getItem('highscore') || 0);
if (highscoreEl) highscoreEl.textContent = String(highscore);

// Collision helpers and Game Over flow
const tmpBox = new THREE.Box3();
const otherBox = new THREE.Box3();
let gameOver = false;

function triggerGameOver() {
    if (gameOver) return;
    gameOver = true;
    const final = Math.floor(elapsed);
    document.getElementById('final-score').textContent = String(final);
    if (final > highscore) {
        highscore = final;
        localStorage.setItem('highscore', String(highscore));
        if (highscoreEl) highscoreEl.textContent = String(highscore);
    }
    document.getElementById('game-over').classList.remove('hidden');
}

function resetGame() {
    // clear enemies
    for (const e of enemies) scene.remove(e);
    enemies.length = 0;
    // reset timers/state
    spawnInterval = 1.4;
    spawnTimer = 0;
    elapsed = 0;
    carState.velocityZ = 0;
    carState.targetLaneX = 0;
    playerCar.position.set(0, 0, 0);
    gameOver = false;
}

// Restart button
document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('game-over').classList.add('hidden');
    resetGame();
});

// Start loop after all state is initialized
animate();

