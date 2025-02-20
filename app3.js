import * as THREE from "three";
import {OrbitControls} from "threeModules/controls/OrbitControls.js";
import {TransformControls} from "threeModules/controls/TransformControls.js";
import {GLTFLoader} from "threeModules/loaders/GLTFLoader.js";
//import { ConvexHull } from "https://threejs.org/examples/jsm/math/ConvexHull.js";
//import GridMaterial from "./grid-material.js";

import Environment from "./cool-env.js"

import CanvasRecorder from "./canvas-recorder.js"

class App3 {


    constructor() {
        let camera, scene, renderer, ocontrols;
        this.THREE = THREE
        this.GLTFLoader = GLTFLoader
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        renderer.setClearColor(0xd0d0d0);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.shadowMap.type = THREE.VSMShadowMap;
        //THREE.PCFSoftShadowMap;
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);

        this.urlParams = new URLSearchParams(window.location.search);

        if (this.urlParams.get('record'))
            CanvasRecorder(renderer.domElement)

        scene = new THREE.Scene();

        let aspect = window.innerWidth / window.innerHeight;
        camera = this.camera = new THREE.PerspectiveCamera(75,aspect,0.1,1000);
        scene.add(camera);

        let lastSavedPosition = new THREE.Vector3(2,1.5,2)

        ocontrols = this.orbitControls = new OrbitControls(camera,renderer.domElement);

        //debugger
        //ocontrols.autoRotate = true;
        try {
            //throw ''
            camera.position.copy(JSON.parse(localStorage.cameraPosition))
            ocontrols.target.copy(JSON.parse(localStorage.controlsTarget))
        } catch {
            camera.position.copy(lastSavedPosition);
            ocontrols.target.set(0, 0, 0)
        }

        let environment = new Environment(renderer,scene,camera)

        /*
const geometry = new THREE.BoxBufferGeometry(1, 1, 1, 1, 1);
const backMaterial = new THREE.MeshStandardMaterial({
  color: "white",
  opacity: 0.9,
  transparent: true,
  side: THREE.BackSide,
  depthWrite: false
});
const frontMaterial = new THREE.MeshStandardMaterial({
  color: "white",
  opacity: 0.1,
  transparent: true,
  side: THREE.FrontSide
});
*/

        let frontMaterial = Environment.mkMat('yellow')
        frontMaterial.transparent = true;
        frontMaterial.opacity = .25;

        /*
const light = new THREE.PointLight("white", 0.5);
light.position.set(20, 30, 40);
scene.add(light);
const light1 = new THREE.PointLight("white", 0.5);
light1.position.set(-20, 30, -40);
scene.add(light1);
*/
        let transformControls = this.transformControls = new TransformControls(camera,renderer.domElement);
        transformControls.translationSnap = 0.05;
        transformControls.rotationSnap = Math.PI / 16;
        //scene.add(transformControls);
        /*
        let gridmat = Environment.mkMat(0x404040)
        gridmat.transparent = true;
        let grid = GridMaterial.makeGrid(gridmat)
        scene.add(grid);
*/

        var raycaster = new THREE.Raycaster();
        var mouse = new THREE.Vector2();

        let selectionMaterial = Environment.mkMat(0x404040);
        //grid.material.clone();
        //new GridMaterial(frontMaterial.clone());
        selectionMaterial.metalness = .2
        selectionMaterial.roughness = .8
        selectionMaterial.color.set(0x909090);
        selectionMaterial.emissive.set(0x002080)
        selectionMaterial.opacity = .9

        let transformGroup = this.transformGroup = new THREE.Group();
        scene.add(transformGroup);
        transformControls.attach(transformGroup);

        let tv30 = new THREE.Vector3();
        class Elements {
            constructor() {
                this.selected = {};
                this.selection = [];
                this.elements = [];
            }
            get selectedCount() {
                return this.selection.length;
            }
            forEach(fn) {
                this.elements.slice(0).forEach(fn);
            }
            forSelected(fn) {
                this.selection.slice(0).forEach(fn);
            }
            setMaterial(m, mat) {
                if (!m.userData.saveMaterial && m.userData.material !== m.material)
                    m.userData.saveMaterial = m.material;
                m.material = mat;
            }
            clearSelection() {
                this.forSelected((e)=>{
                    //        e.userData.saveParent.attach(e)
                    //scene.attach(e);
                    if (e.userData.saveMaterial)
                        e.material = e.userData.saveMaterial
                }
                )
                this.selected = {};
                this.selection = [];
            }

            deselect(idx) {
                let e = this.selected[idx];
                if (e) {
                    delete this.selected[idx];
                    //       e.userData.saveParent.attach(e)
                    //scene.attach(e);
                    this.selection = []
                    this.forEach((e,i)=>this.selected[i] && this.selection.push(e) && ((e.userData.saveMaterial) && (e.material = e.userData.saveMaterial)))
                    this.update();
                }
            }

            update() {
                if (this.selectedCount) {
                    //this.forSelected(e=>scene.attach(e))
                    //this.forSelected(e=>e.userData.saveParent.attach(e))
                    transformGroup.position.set(0, 0, 0);
                    this.forSelected(e=>transformGroup.position.add(e.position));
                    transformGroup.position.multiplyScalar(1 / this.selectedCount);
                    transformGroup.updateMatrixWorld()
                    //      this.forSelected(e=>transformGroup.attach(e))

                }
            }
            select(idx) {
                let e = this.elements[idx];
                this.selected[idx] = e;
                this.selection.push(e);

                selectionMaterial.opacity = e.material.opacity
                selectionMaterial.transparent = e.material.transparent

                this.setMaterial(e, selectionMaterial);
                //     transformGroup.attach(e);

                this.update();
            }
            set(e) {
                this.forEach(s=>s.parent.remove(s));
                this.elements = e.slice(0);
                this.selection = [];

                this.forEach((s,i)=>{
                    //                    scene.attach(s);
                    if (this.selected[i])
                        this.select(i);
                }
                );
                this.update();
            }
        }

        let elements = new Elements();

        let wasDragged = false;

        let transpMat = (color,opacity)=>{
            let m = Environment.mkMat(color)
            if ((m.opacity = opacity) === 1)
                m.transparent = true;
            return m
        }

        let materials = this.materials = [transpMat('gray', 1.), transpMat('red', .7), transpMat('green', .7), transpMat('purple', .7), transpMat('teal', .7), transpMat('orange', .7), ]

        transformControls.addEventListener("dragging-changed", event=>{
            ocontrols.enabled = !event.value;
            wasDragged = event.value;
            if (!wasDragged) {
                console.log("Dragging");
            } else {
                console.log("Drag");
                //setElements(fc.update())
            }
        }
        );

        this.scene = scene;
        this.elements = elements;

        this.mouseWorld = new THREE.Vector3(0,0,0)
        this.smoothMouseWorld = new THREE.Vector3(0,0,0)

        this.mouse = {
            mouseWorld: this.mouseWorld,
            smoothMouseWorld: this.smoothMouseWorld,
            buttons: 0
        }

        let groundProxy = new THREE.Mesh(new THREE.PlaneGeometry(1000,1000))
        groundProxy.rotation.x = Math.PI * -.5
        groundProxy.updateMatrixWorld()

        let v0 = new THREE.Vector3();

        let mouseChangeEvent = new Event('mouseChange')
        let mouseEvent = event=>{
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            // calculate objects intersecting the picking ray
            var intersects = raycaster.intersectObjects(elements.elements);
            this.mouse.buttons = event.buttons;
            // scene.children );
            if (!intersects.length) {
                let gndintersects = raycaster.intersectObjects([groundProxy]);
                if (gndintersects.length) {
                    this.mouseWorld.copy(gndintersects[0].point)
                    return
                }
            }
            //console.log(event.type)
            if (event.type === "pointerdown") {

                // return

                if (event.target !== renderer.domElement)
                    return;
                if (wasDragged)
                    return;

                if (intersects.length) {
                    if (!event.shiftKey)
                        elements.clearSelection()
                    let o = intersects[0].object;
                    elements.forEach((e,i)=>e === o && ((!elements.selected[i]) ? elements.select(i) : elements.deselect(i)));
                } else if (!wasDragged) {
                    if (event.buttons === 1)
                        elements.clearSelection();
                }
            } else if (event.type === "pointerup") {//updateCSG()
            } else if (event.type === "pointermove") {}

            mouseChangeEvent.event = event;

            document.dispatchEvent(mouseChangeEvent)

            transformControls.enabled = transformControls.visible = elements.selectedCount ? true : false;

            transformControls.enabled = transformControls.visible = false;

        }
        ;





	window.addEventListener( 'pointerdown', mouseEvent, false );
	window.addEventListener( 'pointermove', mouseEvent, false );
	window.addEventListener( 'pointerup', mouseEvent, false );


	window.addEventListener( 'touchstart', mouseEvent, false );
	window.addEventListener( 'touchend', mouseEvent, false );
	window.addEventListener( 'touchmove', mouseEvent, false );

	//document.addEventListener( 'wheel', onMouseWheel, false );

    window.addEventListener("keyup", ()=>transformControls.setMode("translate"), false);

//transformControls.enabled = false;

        window.addEventListener("mousemove", mouseEvent, false);
        window.addEventListener("mousedown", mouseEvent, false);
        window.addEventListener("mouseup", mouseEvent, false);




        let resizeFn = event=>{
            let width = window.innerWidth;
            let height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            renderer.setSize(width, height);
            if (environment && environment.composer)
                environment.resize(width, height)
        }
        ;

        resizeFn();
        window.addEventListener("resize", resizeFn, false)

        let clamp = (v,n,p)=>v < n ? n : v > p ? p : v
        let clampPoint = (pt,mdist)=>{
            pt.set(clamp(pt.x, -mdist, mdist), clamp(pt.y, -mdist, mdist), clamp(pt.z, -mdist, mdist))
        }

        let constrainView = ()=>{

            if (ocontrols.target.y < 1) {
                camera.position.y += 1 - ocontrols.target.y;
                ocontrols.target.y += 1 - ocontrols.target.y;
            }
            if (camera.position.y < 1) {
                ocontrols.target.y += 1 - camera.position.y;
                camera.position.y += 1 - camera.position.y;
            }
            ocontrols.minDistance = 1;
            ocontrols.maxDistance = 1000;
            if (ocontrols.target.y < 1) {
                //camera.position.y += 1-ocontrols.target.y;
                ocontrols.target.y += 1 - ocontrols.target.y;
            }
            //ocontrols.target.set(0,0,0)
            clampPoint(ocontrols.target, 10)
            clampPoint(camera.position, 30)
            //clampPoint(camera.position,100)
        }

        let beforeRenderEvent = new Event('beforeRender')
        renderer.setAnimationLoop(()=>{
            this.smoothMouseWorld.add(v0.copy(this.mouseWorld).sub(this.smoothMouseWorld).multiplyScalar(0.1))
            // Mouse smoothing...
            ocontrols.update();
            if (!lastSavedPosition.equals(camera.position)) {
                lastSavedPosition.copy(camera.position)
                localStorage.cameraPosition = JSON.stringify(camera.position)
                localStorage.controlsTarget = JSON.stringify(ocontrols.target)
            }

            constrainView()

            document.dispatchEvent(beforeRenderEvent)
            if (environment && environment.composer)
                environment.composer.render();
            else
                renderer.render(scene, camera);

        }
        );

        this.renderer = renderer;
        let initEvt = new Event('init')
        initEvt.app = this;
        document.dispatchEvent(initEvt);
    }
}

new App3();
