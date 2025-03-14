import * as THREE from "three";
import { CSS3DRenderer } from "https://threejs.org/examples/jsm/renderers/CSS3DRenderer.js";

import { HDRCubeTextureLoader } from "https://threejs.org/examples/jsm/loaders/HDRCubeTextureLoader.js";
import { RGBELoader } from "https://threejs.org/examples/jsm/loaders/RGBELoader.js";
			//import { RoughnessMipmapper } from 'https://threejs.org/examples/jsm/loaders/RoughnessMipmapper.js';
//import {PMREMGenerator} from "https://threejs.org/examples/jsm/pmrem/PMREMGenerator.js";
//import {PMREMCubeUVPacker} from "https://threejs.org/examples/jsm/pmrem/PMREMCubeUVPacker.js";

import { EffectComposer } from "https://threejs.org/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://threejs.org/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "https://threejs.org/examples/jsm/postprocessing/ShaderPass.js";
import { CopyShader } from "https://threejs.org/examples/jsm/shaders/CopyShader.js";
import { LuminosityHighPassShader } from "https://threejs.org/examples/jsm/shaders/LuminosityHighPassShader.js";
import { UnrealBloomPass } from "https://threejs.org/examples/jsm/postprocessing/UnrealBloomPass.js";

import { SSAOShader } from "https://threejs.org/examples/jsm/shaders/SSAOShader.js";
import { SSAOPass } from "https://threejs.org/examples/jsm/postprocessing/SSAOPass.js";
import { FXAAShader } from "https://threejs.org/examples/jsm/shaders/FXAAShader.js";

import { SimplexNoise } from "https://threejs.org/examples/jsm/math/SimplexNoise.js";

class Environment {
  constructor(renderer, scene, camera) {
    let ssaoPass;
    let fxaaPass;
    let self = this;
    function setupPostProcessing() {
      var bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85
      );
      bloomPass.threshold = 0.99; //0.85;   0,1.5,0
      bloomPass.strength = 1.2;
      bloomPass.radius = 0.0; //0.02;

      

      //renderer.toneMapping = THREE.ACESFilmicToneMapping;
      //renderer.toneMapping = THREE.ReinhardToneMapping;
      renderer.toneMapping = THREE.LinearToneMapping;
      //renderer.toneMapping = THREE.CineonToneMapping;
      renderer.toneMappingExposure = .8;//.8; //0.5;//2.3;

      var renderScene = new RenderPass(scene, camera);

      let composer = new EffectComposer(renderer);
      let width = window.innerWidth;
      let height = window.innerHeight;

      composer.addPass(renderScene);

      fxaaPass = new ShaderPass(FXAAShader);

      renderer.setPixelRatio(1);

      var pixelRatio = renderer.getPixelRatio();

      let copyPass = new ShaderPass(THREE.CopyShader);

      ssaoPass = new SSAOPass(scene, camera, width, height);
      ssaoPass.minDistance = 0.005;
      ssaoPass.maxDistance = 0.28;
      ssaoPass.kernelRadius = 10.1;


self.resize=(width,height)=>{

      composer.setSize(width,height);

      fxaaPass.material.uniforms["resolution"].value.x =
        1 / (width * pixelRatio);
      fxaaPass.material.uniforms["resolution"].value.y =
        1 / (height * pixelRatio);

}
      self.resize(window.innerWidth, window.innerHeight);
      //bloomPass.renderToScreen = false;

      composer.addPass(fxaaPass);

      //ssaoPass.clear = false;
      //composer.addPass( ssaoPass );

      //composer.addPass( copyPass );

      composer.addPass(bloomPass);

      //renderer.toneMapping = THREE.ReinhardToneMapping;
      return composer;
    }

    let composer = this.composer = setupPostProcessing();





    // use of RoughnessMipmapper is optional
    //var roughnessMipmapper = new THREE.RoughnessMipmapper( renderer );


    function loadHDREquirect(path) {
        var pmremGenerator = new THREE.PMREMGenerator( renderer );
        pmremGenerator.compileEquirectangularShader();
        new RGBELoader()
//            .setDataType( THREE.UnsignedByteType )
//            .setPath( 'https://threejs.org/examples/textures/equirectangular/' )
//            .load( 'royal_esplanade_1k.hdr', 
            .setPath( '' )
            .load( 'boiler_room_2k.hdr',
            //.load( 'venice_sunset_2k.hdr', 
            //.load( 'reichstag_1_2k.hdr', 
                

                function ( texture ) {
                var envMap = pmremGenerator.fromEquirectangular( texture ).texture;
                
                scene.background = envMap;
                
                scene.environment = envMap;
                texture.dispose();
                pmremGenerator.dispose();
            })

    }

    function loadHDRCubeMap(dir) {
      var hdrCubeRenderTarget;
      var hdrCubeMap;
      var NhdrUrls = [
        "px.hdr",
        "nx.hdr",
        "py.hdr",
        "ny.hdr",
        "pz.hdr",
        "nz.hdr"
      ];
      var hdrUrls = [
        "https://cdn.glitch.com/02b1773f-db1a-411a-bc71-ff25644e8e51%2Fpx.hdr?v=1594535462236",
        "https://cdn.glitch.com/02b1773f-db1a-411a-bc71-ff25644e8e51%2Fnx.hdr?v=1594535462924",
        "https://cdn.glitch.com/02b1773f-db1a-411a-bc71-ff25644e8e51%2Fpy.hdr?v=1594535455937",
        "https://cdn.glitch.com/02b1773f-db1a-411a-bc71-ff25644e8e51%2Fny.hdr?v=1594535464928",
        "https://cdn.glitch.com/02b1773f-db1a-411a-bc71-ff25644e8e51%2Fpz.hdr?v=1594535459665",
        "https://cdn.glitch.com/02b1773f-db1a-411a-bc71-ff25644e8e51%2Fnz.hdr?v=1594535458938"
      ];
      dir = dir || ""; //"san_guiseppe_bridge";
      hdrCubeMap = new HDRCubeTextureLoader()
        .setDataType(THREE.UnsignedByteType)
        .load(hdrUrls, function() {
          var pmremGenerator = new THREE.PMREMGenerator(renderer);

          hdrCubeRenderTarget = pmremGenerator.fromCubemap(hdrCubeMap);
          pmremGenerator.dispose();

          hdrCubeMap.magFilter = THREE.LinearFilter;
          hdrCubeMap.needsUpdate = true;

          scene.background = hdrCubeMap;

          var newEnvMap =  hdrCubeRenderTarget
            ? hdrCubeRenderTarget.texture
            : null;
        
        scene.environment = newEnvMap
        });
      return { cubeMap: hdrCubeMap, cubeRenderTarget: hdrCubeRenderTarget };
    }

    let hdr = loadHDREquirect();//loadHDR();

    function mkCanvas(dim) {
      var canvas = document.createElement("canvas");
      canvas.width = canvas.height = dim;
      return canvas;
    }
    function makeProceduralTexture(dim, fn) {
      var canv = mkCanvas(dim);
      var ctx = canv.getContext("2d");
      var pix = ctx.getImageData(0, 0, dim, dim);
      var u32view = new DataView(pix.data.buffer);
      var idx = -4;
      for (var j = 0; j < dim; j++)
        for (var i = 0; i < dim; i++)
          u32view.setUint32((idx += 4), fn(j / dim, i / dim) | 0);
      ctx.putImageData(pix, 0, 0);
      var tex = new THREE.Texture(canv);
      tex.needsUpdate = true;
      return tex;
    }
    var tx = makeProceduralTexture(1024, (u, v) => {
      var rb =
        ((Math.random() * 128) | 0) *
        ((((u * 2) & 1) ^ ((v * 2) & 1)) | 0 ? 1 : 2);
      return (
        (rb * 256) | (rb * 256 * 256) | (rb * 256 * 256 * 256) | 0x000000ff
      );
    });
    tx.repeat.set(2, 2);
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;

    //let mkMat=(color) => new THREE.MeshStandardMaterial({color:color,roughness:0.51,metalness:0.7,map:tx});
    let mkMat = (color='white') =>
      new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.51,
        metalness: 0.7,
        roughnessMap: tx
      });
    //debugger
    Environment.mkMat = mkMat;
    
    let rnd = rng => (Math.random() * 2 - 1) * (rng || 1);
    /*let mkLight = ()=>{
        let light1 = new THREE.PointLight();
        light1.position.set(rnd(20),rnd(3)+5,rnd(20))
        scene.add(light1);
    }
    
    for(var i=0;i<4;i++)mkLight()*/

    let light1 = new THREE.DirectionalLight('white',.1);
    
    light1.position.set(2.8, 12, -15);
    light1.position.set(10, 12, 10);
    light1.castShadow = true;
    var setShadowSize = (sz, mapSz) => {
      light1.shadow.camera.left = sz;
      light1.shadow.camera.bottom = sz;
      light1.shadow.camera.right = -sz;
      light1.shadow.camera.top = -sz;
      if (mapSz) {
        light1.shadow.mapSize.set(mapSz, mapSz);
      }
    };
    setShadowSize(15, 1024);
    scene.add(light1);


light1.shadow.bias=-0.0001
light1.shadow.radius = 1;



    let ground = new THREE.Mesh(
      new THREE.BoxGeometry(2000, 1, 2000),
      mkMat("grey")
    );
    scene.add(ground);
    ground.position.y -= .51;
    ground.name = "ground";
    ground.receiveShadow = true;
    ground.material.roughnessMap = ground.material.roughnessMap.clone();
    ground.material.roughnessMap.repeat.set(80, 80);
    ground.material.roughnessMap.needsUpdate = true;
    ground.material.color.set(0x000000)
    ground.material.metalness = 0;
    ground.material.roughness = .5;

  }
}

export default Environment;
