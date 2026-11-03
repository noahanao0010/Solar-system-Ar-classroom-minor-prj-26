import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

export type PlanetFactory = () => THREE.Object3D;

export class WebXRAR {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private createPlanet: PlanetFactory;

  private reticle: THREE.Mesh;
  private controller: THREE.XRTargetRaySpace;
  private floorShadowPlane: THREE.Mesh;
  private floorShadowMat: THREE.ShadowMaterial;
  private arDirectionalLight: THREE.DirectionalLight;

  private hitTestSource: any = null;
  private referenceSpace: any = null;
  private supported = false;

  public readonly button: HTMLElement;
  public onPlaced?: (object: THREE.Object3D) => void;
  public onHitTestResult?: (hasHit: boolean) => void;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    createPlanet: PlanetFactory,
    domOverlayElement?: HTMLElement
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.createPlanet = createPlanet;

    // Enable WebXR & Soft Shadow Mapping on Renderer
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local');
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 1. Realistic Directional Sunlight with AR shadow frustum
    this.arDirectionalLight = new THREE.DirectionalLight(0xfffaed, 2.8);
    this.arDirectionalLight.name = 'webxr-ar-shadow-light';
    this.arDirectionalLight.position.set(1.5, 3.8, 1.2);
    this.arDirectionalLight.castShadow = true;
    this.arDirectionalLight.shadow.mapSize.width = 1024;
    this.arDirectionalLight.shadow.mapSize.height = 1024;
    this.arDirectionalLight.shadow.camera.near = 0.05;
    this.arDirectionalLight.shadow.camera.far = 10;
    this.arDirectionalLight.shadow.camera.left = -2;
    this.arDirectionalLight.shadow.camera.right = 2;
    this.arDirectionalLight.shadow.camera.top = 2;
    this.arDirectionalLight.shadow.camera.bottom = -2;
    this.arDirectionalLight.shadow.bias = -0.001;
    this.arDirectionalLight.shadow.normalBias = 0.02;
    this.scene.add(this.arDirectionalLight);

    // 2. Real-World Floor Plane with ShadowMaterial
    // ShadowMaterial only renders the shadows cast onto it, keeping the real camera video transparent
    this.floorShadowMat = new THREE.ShadowMaterial({
      opacity: 0.55,
      transparent: true,
      depthWrite: false,
    });
    this.floorShadowMat.polygonOffset = true;
    this.floorShadowMat.polygonOffsetFactor = -1;
    this.floorShadowMat.polygonOffsetUnits = -1;

    const floorGeo = new THREE.PlaneGeometry(30, 30);
    this.floorShadowPlane = new THREE.Mesh(floorGeo, this.floorShadowMat);
    this.floorShadowPlane.rotation.x = -Math.PI / 2;
    this.floorShadowPlane.receiveShadow = true;
    this.floorShadowPlane.visible = false;
    this.scene.add(this.floorShadowPlane);

    // 3. Surface-placement indicator (Reticle)
    const geometry = new THREE.RingGeometry(0.08, 0.12, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x45e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });

    this.reticle = new THREE.Mesh(geometry, material);
    this.reticle.rotation.x = -Math.PI / 2;
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    // Center pulse dot inside reticle
    const dotGeo = new THREE.CircleGeometry(0.02, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const dotMesh = new THREE.Mesh(dotGeo, dotMat);
    dotMesh.position.z = 0.001;
    this.reticle.add(dotMesh);

    // 4. AR touch input controller
    this.controller = this.renderer.xr.getController(0);
    (this.controller as any).addEventListener('select', this.placePlanet);
    this.scene.add(this.controller);

    // 5. Browser-managed AR launch button
    const sessionInit: any = {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'light-estimation'],
    };

    if (domOverlayElement) {
      sessionInit.domOverlay = { root: domOverlayElement };
    }

    this.button = ARButton.createButton(this.renderer, sessionInit);

    this.renderer.xr.addEventListener('sessionstart', this.onSessionStart);
    this.renderer.xr.addEventListener('sessionend', this.onSessionEnd);
  }

  public setPlanetFactory(factory: PlanetFactory) {
    this.createPlanet = factory;
  }

  private onSessionStart = async () => {
    try {
      const session = this.renderer.xr.getSession();
      if (!session) return;

      const viewerSpace = await session.requestReferenceSpace('viewer');
      this.referenceSpace = this.renderer.xr.getReferenceSpace();

      if ('requestHitTestSource' in session) {
        this.hitTestSource = await (session as any).requestHitTestSource({
          space: viewerSpace,
        });
      }

      this.reticle.visible = false;
      this.floorShadowPlane.visible = true;
      this.supported = true;
    } catch (error) {
      console.warn('AR hit test initialization failed or running in simulator:', error);
      this.hitTestSource = null;
      this.supported = false;
    }
  };

  private onSessionEnd = () => {
    this.hitTestSource?.cancel();
    this.hitTestSource = null;
    this.referenceSpace = null;
    this.reticle.visible = false;
    this.floorShadowPlane.visible = false;
    this.supported = false;
  };

  // Called inside the Three.js animation loop with XR frame
  public update(frame?: any) {
    if (!frame || !this.hitTestSource || !this.referenceSpace || !this.supported) {
      return;
    }

    const results = frame.getHitTestResults(this.hitTestSource);
    if (results.length === 0) {
      this.reticle.visible = false;
      if (this.onHitTestResult) this.onHitTestResult(false);
      return;
    }

    const pose = results[0].getPose(this.referenceSpace);
    if (!pose) {
      this.reticle.visible = false;
      if (this.onHitTestResult) this.onHitTestResult(false);
      return;
    }

    this.reticle.visible = true;
    this.reticle.matrix.fromArray(pose.transform.matrix);
    this.reticle.matrixWorldNeedsUpdate = true;

    // Anchor shadow receiver plane exactly flush with the detected real-world floor plane
    const floorPos = new THREE.Vector3().setFromMatrixPosition(this.reticle.matrix);
    this.floorShadowPlane.position.set(floorPos.x, floorPos.y - 0.002, floorPos.z);
    this.floorShadowPlane.visible = true;

    if (this.onHitTestResult) this.onHitTestResult(true);
  }

  public placePlanet = () => {
    if (!this.reticle.visible) return;

    const object = this.createPlanet();

    // Enable castShadow and receiveShadow across all meshes of the model
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Position the new model at the detected real-world surface
    object.position.setFromMatrixPosition(this.reticle.matrix);
    object.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().extractRotation(this.reticle.matrix)
    );

    this.scene.add(object);

    // Keep the floor shadow plane active and firmly positioned at the detected surface
    this.floorShadowPlane.position.y = object.position.y - 0.002;
    this.floorShadowPlane.visible = true;

    if (this.onPlaced) {
      this.onPlaced(object);
    }
  };

  public isReticleVisible(): boolean {
    return this.reticle.visible;
  }

  public getFloorPlane(): THREE.Mesh {
    return this.floorShadowPlane;
  }

  public dispose() {
    (this.controller as any).removeEventListener('select', this.placePlanet);
    this.renderer.xr.removeEventListener('sessionstart', this.onSessionStart);
    this.renderer.xr.removeEventListener('sessionend', this.onSessionEnd);

    this.hitTestSource?.cancel();
    this.scene.remove(this.reticle);
    this.scene.remove(this.controller);
    this.scene.remove(this.floorShadowPlane);
    this.scene.remove(this.arDirectionalLight);

    this.reticle.geometry.dispose();
    this.floorShadowPlane.geometry.dispose();
    this.floorShadowMat.dispose();

    const material = this.reticle.material;
    if (Array.isArray(material)) {
      material.forEach(item => item.dispose());
    } else {
      material.dispose();
    }
  }
}
