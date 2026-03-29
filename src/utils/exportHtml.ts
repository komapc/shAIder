import type { SceneObject, Uniform } from '../store/useShaderStore';

export const generateStandaloneHtml = (
  vertexShader: string,
  fragmentShader: string,
  uniforms: Uniform[],
  sceneObjects: SceneObject[]
): string => {
  // Convert uniforms to a format Three.js can understand in a simple script
  const uniformsJs = uniforms.reduce((acc, u) => {
    if (u.type === 'color') {
      acc[u.name] = { value: `new THREE.Color('${u.value}')` };
    } else if (u.type === 'texture') {
      acc[u.name] = { value: `new THREE.TextureLoader().load('${u.value}')` };
    } else {
      acc[u.name] = { value: u.value };
    }
    return acc;
  }, {} as any);

  const uniformsString = JSON.stringify(uniformsJs, null, 2)
    .replace(/"value": "new THREE\.Color\('(.*?)'\)"/g, '"value": new THREE.Color(\'$1\')')
    .replace(/"value": "new THREE\.TextureLoader\(\)\.load\('(.*?)'\)"/g, '"value": new THREE.TextureLoader().load(\'$1\')');

  const sceneObjectsString = JSON.stringify(sceneObjects, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>shAIder Standalone Export</title>
    <style>
        body { margin: 0; overflow: hidden; background: #050505; }
        canvas { display: block; }
        #info {
            position: absolute;
            top: 10px;
            width: 100%;
            text-align: center;
            color: white;
            font-family: monospace;
            pointer-events: none;
            text-shadow: 1px 1px 2px black;
        }
    </style>
</head>
<body>
    <div id="info">shAIder Standalone Bundle</div>
    <script type="importmap">
        {
            "imports": {
                "three": "https://unpkg.com/three@0.166.1/build/three.module.js",
                "three/addons/": "https://unpkg.com/three@0.166.1/examples/jsm/"
            }
        }
    </script>
    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

        let scene, camera, renderer, controls;
        let materials = [];

        const vertexShader = \`${vertexShader.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
        const fragmentShader = \`${fragmentShader.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
        const uniformsConfig = ${uniformsString};
        const sceneObjects = ${sceneObjectsString};

        function init() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x050505);

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(8, 8, 8);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            document.body.appendChild(renderer.domElement);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;

            const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
            scene.add(ambientLight);

            const pointLight = new THREE.PointLight(0xffffff, 2.0);
            pointLight.position.set(10, 10, 10);
            scene.add(pointLight);

            const grid = new THREE.GridHelper(20, 20, 0x222222, 0x111111);
            grid.position.y = -1.5;
            scene.add(grid);

            // Create objects
            sceneObjects.forEach(obj => {
                const material = new THREE.ShaderMaterial({
                    vertexShader,
                    fragmentShader,
                    uniforms: THREE.UniformsUtils.clone(uniformsConfig),
                    transparent: true,
                    side: THREE.DoubleSide
                });
                materials.push(material);

                let geometry;
                const type = obj.objectType.toLowerCase();
                if (type === 'box') geometry = new THREE.BoxGeometry(obj.scale[0], obj.scale[1], obj.scale[2]);
                else if (type === 'plane' || type === 'floor') geometry = new THREE.PlaneGeometry(obj.scale[0], obj.scale[2]);
                else if (type === 'torus') geometry = new THREE.TorusGeometry(obj.scale[0], obj.scale[1]);
                else if (type === 'cylinder') geometry = new THREE.CylinderGeometry(obj.scale[0], obj.scale[0], obj.scale[1]);
                else geometry = new THREE.SphereGeometry(obj.scale[0], 32, 32);

                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(...obj.position);
                mesh.rotation.set(...obj.rotation);
                scene.add(mesh);
            });

            window.addEventListener('resize', onWindowResize, false);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
            requestAnimationFrame(animate);
            const time = performance.now() * 0.001;
            materials.forEach(m => {
                if (m.uniforms.time) m.uniforms.time.value = time;
            });
            controls.update();
            renderer.render(scene, camera);
        }

        init();
        animate();
    </script>
</body>
</html>`;
};
