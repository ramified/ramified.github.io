    import * as THREE from 'three';
    import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
    import {GUI} from 'three/addons/libs/lil-gui.module.min.js';
    // import { MeshLine, MeshLineMaterial, MeshLineRaycast } from 'threemeshline';

    function main() {
        const canvas = document.querySelector('#c');
        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
        });

        const fov = 45;
        const aspect = 2;  // the canvas default
        const near = 0.3;
        const far = 10;
        const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.set(0, 1, 3);

        const scene = new THREE.Scene();
        // scene.background = new THREE.Color('blue');
        const controls = new OrbitControls(camera, canvas);
        controls.target.set(0, 0, 0);
        controls.enableDamping = true;
        controls.update();

        const material = new THREE.MeshPhongMaterial({
            color: 'yellow',  
            shininess: 90,
            opacity: 0.5,
            transparent: true,
            flatShading: true,
        });
// material.wireframe = true;

// Cube
const boxWidth = 1;
const boxHeight = 1;
const boxDepth = 1;
const radius = 0.5;


const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
const geometry2 = new THREE.DodecahedronGeometry(radius);
const geometry3 = new THREE.OctahedronGeometry(radius);
const position = geometry2.getAttribute('position');
//     console.log( position.count ); // 24
//     console.log( position.array.length ); // 72
//     console.log( position.count * 3 === position.array.length); // true
// alert(" odd " +  typeof position + position.array[0] + " " + position.array[1] + " "+position.array[2] );
// Recall the vertices
const t = ( 1 + Math.sqrt( 5 ) ) / 2;
const r = 1 / t;
const vertices = [

            // (±1, ±1, ±1)
            - 1, - 1, - 1,  - 1, - 1, 1,
            - 1, 1, - 1, - 1, 1, 1,
            1, - 1, - 1, 1, - 1, 1,
            1, 1, - 1, 1, 1, 1,

            // (0, ±1/φ, ±φ)
            0, - r, - t, 0, - r, t,
            0, r, - t, 0, r, t,

            // (±1/φ, ±φ, 0)
            - r, - t, 0, - r, t, 0,
            r, - t, 0, r, t, 0,

            // (±φ, 0, ±1/φ)
            - t, 0, - r, t, 0, - r,
            - t, 0, r, t, 0, r
            ];

            var sceneObjects = [];
            sceneObjects.clear = function () {
                var a;
                while (a = sceneObjects.pop()) {
                    scene.remove(a);
                    a.geometry.dispose();
                }
            }
            sceneObjects.clear();
            

            for (var i = 0; i < 20; i++) {
                const geometry = new THREE.SphereGeometry(0.034, 32, 32);
                const material = new THREE.MeshStandardMaterial({ color: 'white' });
                const sphere = new THREE.Mesh(geometry, material);
                const a = new THREE.Vector3( vertices[3*i], vertices[3*i+1], vertices[3*i+2]);

                sphere.position.copy(a.multiplyScalar(radius/Math.sqrt( 3 )));
                scene.add(sphere);
                sceneObjects.push(sphere);
            }

            let edgeList = [
            [0,16],[1,18],[2,16],[3,18],[16,18],
            [4,17],[5,19],[6,17],[7,19],[17,19],
            [2,13],[6,15],[3,13],[7,15],[13,15],
            [0,12],[4,14],[1,12],[5,14],[12,14],
            [1,9],[3,11],[5,9],[7,11],[9,11],
            [0,8],[2,10],[4,8],[6,10],[8,10],
            ];

            for (var i = 0; i < edgeList.length; i++) {
                var v1 = edgeList[i][0];
                var v2 = edgeList[i][1];
                var s = createLine(sceneObjects[v1].position, sceneObjects[v2].position, 0.01, 'white');
                if (s != undefined) {
                    scene.add(s);
                    sceneObjects.push(s);
                }
            }

  // const cube = new THREE.Mesh(geometry, material);
  // scene.add(cube);


// Light
function addLight(...pos) {
    const color = 0xFFFFFF;
    const intensity = 2;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...pos);
    scene.add(light);
}
addLight(2,2,2);


// const skyColor = 0xB1E1FF;  // light blue
// const groundColor = 0xB97A20;  // brownish orange
// const intensity = 1;
// const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
// scene.add(light);


// group
function makeInstance(geometry, material, x) {

    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    cube.position.x = x;

    return cube;
}

const cubes = [
makeInstance(geometry2, material,  0),
// makeInstance(geometry2, material, -2),
// makeInstance(geometry3, material,  2),
];


// class ColorGUIHelper {
//  constructor(object, prop) {
//      this.object = object;
//      this.prop = prop;
//  }
//  get value() {
//      return `#${this.object[this.prop].getHexString()}`;
//  }
//  set value(hexString) {
//      this.object[this.prop].set(hexString);
//  }
// }



// const gui = new GUI();
// gui.addColor(new ColorGUIHelper(light, 'color'), 'value').name('skyColor');
// gui.addColor(new ColorGUIHelper(light, 'groundColor'), 'value').name('groundColor');
// gui.add(light, 'intensity', 0, 2, 0.01);

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}


// Real axesHelper
// const axesHelper = new THREE.AxesHelper( 2 );
// scene.add( axesHelper );


function createLine(from, to, width, color, arrowWidth, arrowLength) {
    const m = new THREE.MeshStandardMaterial({
        color: color,
    });
    const dist = from.distanceTo(to);
    if (dist < 0.0001) return;

    let geometry = new THREE.CylinderGeometry(width, width, dist, 10, 1);
    let mesh = new THREE.Mesh(geometry, m);
    const axis = new THREE.Vector3(0, 1, 0);
    geometry.dispose();
    const vector = (new THREE.Vector3()).subVectors(to, from);
    if (arrowWidth != undefined) {
        const geometry2 = new THREE.CylinderGeometry(0, arrowWidth, arrowLength, 10, 1);
        // geometry2.translate(0, (dist - arrowLength) / 2, 0);
        geometry2.translate(0, (dist + arrowLength) / 2, 0);
        geometry.merge(geometry2);      //How to merge??
        // alert("Hello! Here it is actually wrong!!");
        let mesh2 = new THREE.Mesh(geometry2, m);
        mesh2.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
        mesh2.position.copy(from.clone().addScaledVector(vector, 0.5));
        sceneAdd(scene, mesh2, "vertices");
    }

    


    mesh.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
    mesh.position.copy(from.clone().addScaledVector(vector, 0.5));

    return mesh;
}

function getVertices() {
    const v = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];
    return v;
};
const v = getVertices();
const w = 0.02;
const arrowWidth = 0.05;
const arrowLength = 0.1;
const c = 0x0000ff;

function sceneAdd(scene, object, group) {
    if (scene.groupings == undefined) {
        scene.groupings = new Map();
    }
    if (scene.groupings.get(group) == undefined) {
        scene.groupings.set(group, []);
    }
    scene.groupings.get(group).push(object);
    scene.add(object);
}

sceneAdd(scene, createLine(v[0], v[1], w, 0xff0000, arrowWidth, arrowLength), "vertices");
sceneAdd(scene, createLine(v[0], v[3], w, 0x00ff00, arrowWidth, arrowLength), "vertices");
sceneAdd(scene, createLine(v[0], v[5], w, 0x0000ff, arrowWidth, arrowLength), "vertices");

function render(time) {
    time *= 0.001;  // convert time to seconds

    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }

    // cubes.forEach((cube, ndx) => {
    //  const speed = 0.1 + ndx * .3;
    //  const rot = time * speed;
    //  cube.rotation.x = rot;
    //  cube.rotation.y = rot;
    // });

    renderer.render(scene, camera);

    requestAnimationFrame(render);
}
requestAnimationFrame(render);
}

main();
