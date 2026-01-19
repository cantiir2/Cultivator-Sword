import * as THREE from 'three';

export class SwordSwarm {
    constructor(scene, count = 100) {
        this.scene = scene;
        this.count = count;
        this.mesh = null;
        this.dummy = new THREE.Object3D();
        // Arrays for logic
        this.velocities = [];
        this.targets = [];
        this.currentState = 'IDLE';
        this.formationOffsets = [];
        this.targetPoint = new THREE.Vector3(0, 0, 0);

        this.init();
    }

    init() {
        const geometry = this.createSwordGeometry();
        const material = this.createSwordMaterial();

        this.mesh = new THREE.InstancedMesh(geometry, material, this.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(this.mesh);

        // Initialize positions
        for (let i = 0; i < this.count; i++) {
            this.dummy.position.set(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 10 + 5,
                (Math.random() - 0.5) * 10
            );
            this.dummy.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);

            // Init logic arrays
            this.velocities.push(new THREE.Vector3(0, 0, 0));
        }

        this.mesh.instanceMatrix.needsUpdate = true;

        console.log(`SwordSwarm initialized with ${this.count} swords.`);
        if (document.getElementById('sword-count')) {
            document.getElementById('sword-count').innerText = `Swords: ${this.count}`;
        }
    }

    createSwordGeometry() {
        // Low-poly Epeiolus Sword
        const bladeGeo = new THREE.ConeGeometry(0.04, 0.8, 4, 1);
        bladeGeo.translate(0, 0.4, 0); // Tip up

        const guardGeo = new THREE.BoxGeometry(0.2, 0.02, 0.05);
        guardGeo.translate(0, 0, 0);

        const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6);
        handleGeo.translate(0, -0.1, 0);

        // Merge
        const geometry = THREE.BufferGeometryUtils ? THREE.BufferGeometryUtils.mergeGeometries([bladeGeo, guardGeo, handleGeo]) : bladeGeo;
        const simpleGeo = new THREE.ConeGeometry(0.03, 1.0, 4);
        simpleGeo.rotateX(Math.PI / 2);
        simpleGeo.rotateX(-Math.PI / 2);
        return simpleGeo;
    }

    createSwordMaterial() {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0xffcc00) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                void main() {
                    vUv = uv;
                    vNormal = normal;
                    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform float uTime;
                varying vec2 vUv;
                varying vec3 vNormal;
                
                void main() {
                    // Simple rim lighting / glow
                    float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
                    vec3 glow = uColor * intensity * 2.0;
                    vec3 finalColor = uColor + glow;
                    
                    // Add some "lightning" noise (simplified)
                    float noise = sin(vUv.y * 20.0 + uTime * 10.0) * 0.5 + 0.5;
                    finalColor += vec3(noise * 0.5);

                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            side: THREE.DoubleSide
        });
    }

    updateState(gesture, position) {
        if (this.currentState === gesture) return;
        this.currentState = gesture;

        console.log(`Swarm State: ${gesture}`);

        this.calculateFormationTargets();
    }

    updateTarget(position) {
        // Smoothly interp target
        const lerpFactor = 0.1;
        this.targetPoint.x += (position.x - this.targetPoint.x) * lerpFactor;
        this.targetPoint.y += (position.y - this.targetPoint.y) * lerpFactor;
        this.targetPoint.z += (position.z - this.targetPoint.z) * lerpFactor;
    }

    calculateFormationTargets() {
        const count = this.count;
        this.formationOffsets = [];

        for (let i = 0; i < count; i++) {
            const vec = new THREE.Vector3();
            const idxRatio = i / count;

            if (this.currentState === 'SHIELD' || this.currentState === 'Fist') {
                // Sphere
                const phi = Math.acos(1 - 2 * idxRatio);
                const theta = Math.PI * (1 + Math.sqrt(5)) * i;
                const r = 3.0;

                vec.set(
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.sin(phi) * Math.sin(theta),
                    r * Math.cos(phi)
                );
            }
            else if (this.currentState === 'SUMMON' || this.currentState === 'Open_Palm') {
                // Ring
                const r = 5.0 + Math.random() * 2.0;
                const theta = idxRatio * Math.PI * 2;

                vec.set(
                    r * Math.cos(theta),
                    r * Math.sin(theta),
                    (Math.random() - 0.5) * 1.0
                );
            }
            else if (this.currentState === 'PIERCE' || this.currentState === 'Two_Finger_Point') {
                const z = idxRatio * 10;
                const r = (1 - idxRatio) * 1.5;
                const theta = i * 0.5;

                vec.set(
                    r * Math.cos(theta),
                    r * Math.sin(theta),
                    -z
                );
            }
            else {
                vec.set(
                    (Math.random() - 0.5) * 15,
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10
                );
            }
            this.formationOffsets.push(vec);
        }
    }

    update(time, delta) {
        if (this.mesh.material.uniforms) {
            this.mesh.material.uniforms.uTime.value = time;
        }

        // Physics Update
        const spring = 0.05; // Stiffness
        const friction = 0.9; // Damping

        // Temporary objects
        const currentPos = new THREE.Vector3();
        const currentRot = new THREE.Quaternion();
        const currentScale = new THREE.Vector3();
        const matrix = new THREE.Matrix4();

        for (let i = 0; i < this.count; i++) {
            // Get current matrix
            this.mesh.getMatrixAt(i, matrix);
            matrix.decompose(currentPos, currentRot, currentScale);

            // Determine Target
            let target = new THREE.Vector3();
            if (this.formationOffsets[i]) {
                target.copy(this.formationOffsets[i]);
            }

            target.add(this.targetPoint);

            // Boids / Physics
            const velocity = this.velocities[i];

            // Spring force
            const force = new THREE.Vector3().subVectors(target, currentPos).multiplyScalar(spring);

            // Noise / Wander (Perlin would be better, using sin/cos for cheapness)
            const noise = new THREE.Vector3(
                Math.sin(time * 2 + i) * 0.01,
                Math.cos(time * 3 + i) * 0.01,
                Math.sin(time * 1 + i) * 0.01
            );

            velocity.add(force);
            velocity.add(noise);
            velocity.multiplyScalar(friction);

            currentPos.add(velocity);

            // LookAt Target (Visual orientation)
            const lookTarget = new THREE.Vector3().copy(currentPos).add(velocity);
            this.dummy.position.copy(currentPos);
            this.dummy.lookAt(lookTarget);
            this.dummy.updateMatrix();

            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
    }
}
