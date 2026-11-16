import * as THREE from 'three';

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
  private currentSession: any = null;

  public readonly button: HTMLElement;
  public onPlaced?: (object: THREE.Object3D) => void;
  public onHitTestResult?: (hasHit: boolean) => void;
  public onFallback?: () => void;

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
    try {
      this.renderer.xr.setReferenceSpaceType('local');
    } catch {}
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

    // 5. Safe, robust AR Launch Button (prevents "The specified session configuration is not supported")
    this.button = this.createSafeARButton(domOverlayElement);

    this.renderer.xr.addEventListener('sessionstart', this.onSessionStart);
    this.renderer.xr.addEventListener('sessionend', this.onSessionEnd);
  }

  /**
   * Builds an AR launch button that safely initiates immersive-ar without crashing
   * on devices or runtimes lacking specific physical AR features.
   */
  private createSafeARButton(domOverlayElement?: HTMLElement): HTMLElement {
    const button = document.createElement('button');
    button.id = 'SafeARButton';
    button.style.display = 'none';
    button.className = 'px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer select-none';
    button.textContent = 'START WEBAR';

    const onSessionEnded = () => {
      if (this.currentSession) {
        this.currentSession.removeEventListener('end', onSessionEnded);
        this.currentSession = null;
      }
      button.textContent = 'START WEBAR';
      button.className = 'px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer select-none';
      this.onSessionEnd();
    };

    const startARSession = async () => {
      if (typeof navigator === 'undefined' || !('xr' in navigator)) {
        if (this.onFallback) this.onFallback();
        return;
      }

      const xr = (navigator as any).xr;

      // Safe tiered configurations: ALL advanced capabilities in optionalFeatures, NEVER requiredFeatures
      const configsToTry: any[] = [
        {
          optionalFeatures: ['hit-test', 'local-floor', 'dom-overlay', 'light-estimation'],
          ...(domOverlayElement ? { domOverlay: { root: domOverlayElement } } : {}),
        },
        {
          optionalFeatures: ['hit-test', 'local-floor'],
        },
        {
          optionalFeatures: ['local-floor'],
        },
        {},
      ];

      let session: any = null;

      for (const config of configsToTry) {
        try {
          session = await xr.requestSession('immersive-ar', config);
          if (session) break;
        } catch {
          // Gracefully continue to next configuration
        }
      }

      if (!session) {
        console.warn('WebXR immersive-ar session could not be started; falling back to camera stream');
        button.style.display = 'none';
        if (this.onFallback) {
          this.onFallback();
        }
        return;
      }

      try {
        session.addEventListener('end', onSessionEnded);
        try {
          this.renderer.xr.setReferenceSpaceType('local');
        } catch {}
        await this.renderer.xr.setSession(session);
        this.currentSession = session;
        button.textContent = 'STOP WEBAR';
        button.className = 'px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer select-none';
      } catch (err) {
        console.warn('Could not set WebXR session on renderer:', err);
        try {
          session.end().catch(() => {});
        } catch {}
        button.style.display = 'none';
        if (this.onFallback) this.onFallback();
      }
    };

    button.onclick = async () => {
      if (this.currentSession === null) {
        await startARSession();
      } else {
        try {
          await this.currentSession.end();
        } catch {}
      }
    };

    // Check if immersive-ar is truly supported before showing button
    if (typeof navigator !== 'undefined' && 'xr' in navigator && (navigator as any).xr?.isSessionSupported) {
      try {
        (navigator as any).xr.isSessionSupported('immersive-ar')
          .then((isSupported: boolean) => {
            if (isSupported) {
              button.style.display = 'inline-block';
            } else {
              button.style.display = 'none';
              if (this.onFallback) this.onFallback();
            }
          })
          .catch(() => {
            button.style.display = 'none';
          });
      } catch {
        button.style.display = 'none';
      }
    }

    return button;
  }

  public setPlanetFactory(factory: PlanetFactory) {
    this.createPlanet = factory;
  }

  private onSessionStart = async () => {
    try {
      const session = this.renderer.xr.getSession();
      if (!session) return;

      this.currentSession = session;

      try {
        const viewerSpace = await session.requestReferenceSpace('viewer');
        this.referenceSpace = this.renderer.xr.getReferenceSpace();

        if ('requestHitTestSource' in session) {
          try {
            this.hitTestSource = await (session as any).requestHitTestSource({
              space: viewerSpace,
            });
          } catch {
            this.hitTestSource = null;
          }
        }
      } catch (spaceErr) {
        console.warn('Reference space request notice:', spaceErr);
      }

      this.reticle.visible = false;
      this.floorShadowPlane.visible = true;
      this.supported = true;
    } catch (error) {
      console.warn('AR session start fallback notice:', error);
      this.hitTestSource = null;
      this.supported = false;
    }
  };

  private onSessionEnd = () => {
    try {
      this.hitTestSource?.cancel();
    } catch {}
    this.hitTestSource = null;
    this.referenceSpace = null;
    this.reticle.visible = false;
    this.floorShadowPlane.visible = false;
    this.supported = false;
    this.currentSession = null;
  };

  // Called inside the Three.js animation loop with XR frame
  public update(frame?: any) {
    if (!frame || !this.hitTestSource || !this.referenceSpace || !this.supported) {
      return;
    }

    try {
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
    } catch {
      this.reticle.visible = false;
    }
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
    try {
      (this.controller as any)?.removeEventListener('select', this.placePlanet);
      this.renderer.xr.removeEventListener('sessionstart', this.onSessionStart);
      this.renderer.xr.removeEventListener('sessionend', this.onSessionEnd);
      this.hitTestSource?.cancel();
    } catch {}

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
