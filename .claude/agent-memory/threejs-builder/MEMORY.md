# MEMORY — THREEJS agent — app_asturiasMobile

## nginx prefix
- App served at `/mobile/` prefix via nginx
- ALL absolute `/static/...` paths in static HTML files must be `/mobile/static/...`
- Jinja2 templates use `url_for('static', path=...)` which handles the prefix automatically
- Static preview files (served directly) must hardcode the prefix

## Vendor files available (confirmed r170)
- `three.module.js` — core
- `OrbitControls.js`
- `EffectComposer.js`, `RenderPass.js`, `OutlinePass.js`, `ShaderPass.js`, `Pass.js`, `MaskPass.js`
- `CopyShader.js`, `FXAAShader.js`
- `GLTFLoader.js` — added 2026-03-04, patched import to `/mobile/static/vendor/three/BufferGeometryUtils.js`
- `BufferGeometryUtils.js` — added 2026-03-04 (GLTFLoader dependency)

## GLTFLoader install pattern
- Download from `https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/jsm/loaders/GLTFLoader.js`
- Also download `BufferGeometryUtils.js` from `examples/jsm/utils/`
- Patch the relative import in GLTFLoader: `'../utils/BufferGeometryUtils.js'` → `/mobile/static/vendor/three/BufferGeometryUtils.js`
- Both files use bare `three` specifier for core imports (handled by importmap)

## Importmap pattern for static preview files
```json
{
  "imports": {
    "three": "/mobile/static/vendor/three/three.module.js",
    "three/addons/controls/OrbitControls.js": "/mobile/static/vendor/three/OrbitControls.js",
    "three/addons/loaders/GLTFLoader.js": "/mobile/static/vendor/three/GLTFLoader.js"
  }
}
```

## Three.js conventions (confirmed working)
- `renderer.outputColorSpace = THREE.SRGBColorSpace` (not LinearSRGBColorSpace for output)
- `renderer.setAnimationLoop(fn)` — preferred over requestAnimationFrame
- `Math.min(devicePixelRatio, 1.5)` for pixel ratio (mobile GPU budget)
- `THREE.PCFSoftShadowMap` for shadow quality
- Gabled roofs: two angled BoxGeometry panels + ExtrudeGeometry triangles for gables

## preview_login.html — Libro 3D + Leaflet (2026-03-04)
- Archivo: `app/static/preview_login.html` — standalone, sin Jinja2
- FASE 1: Three.js libro 3D cerrado con balanceo idle (sin OrbitControls)
- FASE 2: animación apertura portada + 3 páginas (~3.5s total) al click en canvas
- FASE 3: panel izquierdo decorativo (libro2.jpg fondo) + panel derecho Leaflet
- Leaflet cargado como `<script src>` sync antes del module (no importmap)
- bookGroup.position.x = -1.675 para centrar el libro (lomo en x=0, portada hacia x+)
- Cámara: PerspectiveCamera(45) en (0,2,8) mirando al origen
- frontCoverGroup.position.x = -0.175 (pivot en borde izq del lomo)
- frontCover.position.x = 1.5 dentro del frontCoverGroup
- Swiftshader no muestra texturas correctamente (gris plano) — normal en headless, OK en browser real
- textura.colorSpace = THREE.SRGBColorSpace necesario para r170
- Images: `/mobile/static/images/{libro.jpg, libro2.jpg, cruz.png, Mapa-de-Asturias-1696.jpg, rosadelvents1-2-1024x840.jpg}`

## explorer.js scene notes (2026-03-03)
- Diorama Paper Mario style with procedural character, PerspectiveCamera(38) at (0,9,17)
- No EffectComposer — uses BackSide scale outline hack
- Character controls: HTML buttons + keyboard ArrowKeys/Space
- See sesion_2026-03-03.md for full details
