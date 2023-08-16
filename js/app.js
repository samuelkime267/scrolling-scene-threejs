import * as THREE from "three";
import fragment from "./shader/fragment.glsl";
import vertex from "./shader/vertex.glsl";
import { gsap } from "gsap";
import * as dat from "dat.gui";

import red from "../img/red.png";
import green from "../img/green.png";
import gray from "../img/gray.png";
import redBg from "../img/bg.jpg";
import greenBg from "../img/bg2.jpg";
import grayBg from "../img/bg1.jpg";

import { Lethargy } from "lethargy";
import { WheelGesture } from "@use-gesture/vanilla";
import VirtualScroll from "virtual-scroll";

export default class Sketch {
  constructor(options) {
    this.container = options.dom;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xeeeeee, 1);
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );
    this.camera.position.set(0, 0, 2);

    this.current = 0;
    this.scenes = [
      {
        bg: redBg,
        matCap: red,
        geometry: new THREE.BoxGeometry(0.1, 0.1, 0.1),
      },
      {
        bg: grayBg,
        matCap: gray,
        geometry: new THREE.TorusGeometry(0.3, 0.05, 50, 10),
      },
      {
        bg: greenBg,
        matCap: green,
        geometry: new THREE.SphereGeometry(0.1, 29, 20),
      },
    ];
    this.scenes.forEach((obj, i) => {
      const { bg, matCap, geometry } = obj;
      obj.scene = this.createScene(bg, matCap, geometry);
      this.renderer.compile(obj.scene, this.camera);
      obj.target = new THREE.WebGLRenderTarget(this.width, this.height);
    });

    this.time = 0;

    // this.lethargy = new Lethargy();
    // this.gesture = WheelGesture(document.body, (state) => {
    //   console.log(this.lethargy.check(state.event));
    // });

    this.currentState = 0;
    this.scroller = new VirtualScroll();
    this.scroller.on((event) => {
      this.currentState -= event.deltaY / 4000;
      this.currentState = (this.currentState + 3000) % 3;
    });

    this.setSettings();
    this.initPost();
    this.resize();
    this.render();
    this.setupResize();
  }

  initPost() {
    this.postScene = new THREE.Scene();
    let frustumSize = 1;
    let aspect = 1;
    this.postCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      -1000,
      1000
    );

    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        uTexture1: { value: new THREE.TextureLoader().load(redBg) },
        uTexture2: { value: new THREE.TextureLoader().load(grayBg) },
        progress: { value: 0 },
      },
      // wireframe: true,
      // transparent: true,
      vertexShader: vertex,
      fragmentShader: fragment,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);

    this.postScene.add(this.quad);
  }

  setSettings() {
    let that = this;
    this.settings = {
      progress: 0,
    };
    this.gui = new dat.GUI();
    this.gui.add(this.settings, "progress", 0, 1, 0.01);
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  createScene(background, matCap, geometry) {
    let scene = new THREE.Scene();
    let bgTexture = new THREE.TextureLoader().load(background);
    scene.background = bgTexture;

    let material = new THREE.MeshMatcapMaterial({
      map: new THREE.TextureLoader().load(matCap),
    });
    // let geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    let mesh = new THREE.Mesh(geometry, material);

    for (let i = 0; i < 300; i++) {
      let random = new THREE.Vector3().randomDirection();
      let clone = mesh.clone();
      clone.position.copy(random);
      clone.rotation.x = Math.random();
      clone.rotation.y = Math.random();
      scene.add(clone);
    }

    return scene;
  }

  render() {
    this.time += 0.05;

    this.current = Math.floor(this.currentState);
    this.next = Math.floor((this.current + 1) % this.scenes.length);

    this.progress = this.currentState % 1;

    //undating textures
    this.renderer.setRenderTarget(this.scenes[this.current].target);
    this.renderer.render(this.scenes[this.current].scene, this.camera);
    // this.next = (this.current + 1) % this.scenes.length;

    this.renderer.setRenderTarget(this.scenes[this.next].target);
    this.renderer.render(this.scenes[this.next].scene, this.camera);

    this.renderer.setRenderTarget(null);

    this.material.uniforms.uTexture1.value =
      this.scenes[this.current].target.texture;
    this.material.uniforms.uTexture2.value =
      this.scenes[this.next].target.texture;

    this.material.uniforms.progress.value = this.progress;

    // updating scenes
    this.scenes.forEach((obj) => {
      obj.scene.rotation.y = this.time * 0.1;
    });

    requestAnimationFrame(this.render.bind(this));
    // this.renderer.render(this.scenes[1].scene, this.camera);
    this.renderer.render(this.postScene, this.postCamera);
  }
}

new Sketch({
  dom: document.getElementById("container"),
});
