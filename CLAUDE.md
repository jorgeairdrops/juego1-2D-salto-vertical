# Penguin Jump — Contexto del proyecto

## Qué es este juego
Juego 2D estilo Doodle Jump (scroll vertical) hecho con HTML5 Canvas + JavaScript puro.
Sin librerías externas. Todo el arte pixel art se dibuja con `fillRect` excepto el pingüino
que viene de un PNG (`penguin pixel art.png`) con el fondo eliminado por pixel manipulation.

## Archivos
- `index.html` — Shell: canvas 480×720, carga style.css y game.js
- `style.css` — Fondo #0a0a1a, centra el canvas, activa `image-rendering: pixelated`
- `game.js` — Todo el juego (~1000 líneas)
- `penguin pixel art.png` — Sprite del pingüino (fondo azul claro, se elimina al cargar)

## Repo GitHub
https://github.com/jorgeairdrops/juego1-2D-salto-vertical

## Mecánicas principales
- El pingüino rebota automáticamente al tocar plataformas seguras
- Se mueve con ← → (o A D)
- Pierde si cae fuera de la pantalla por abajo
- Plataformas: teal (estática), amarilla (se mueve horizontal), roja con picos (mata)
- 4 power-ups: Invencibilidad (8s), Doble Salto (12s), Super Salto (1 uso), Imán (10s)
- Dificultad escala automáticamente con la altura alcanzada
- Score = altura en metros + monedas recogidas
- Récord guardado en localStorage

## Arquitectura de clases (game.js)
```
Game              — loop principal, estados, score
├── InputHandler  — teclado (keydown/keyup map)
├── Camera        — sigue al pingüino hacia arriba, no baja nunca (ratchet)
├── Renderer      — drawPixelSprite, drawRect, drawText sobre canvas 2D
├── World         — generador procedural de plataformas, colisiones
│   ├── Penguin   — física, power-ups, sprite PNG
│   ├── Platform  — static / moving / deadly
│   ├── PowerUpOrb— 4 tipos, animación bob
│   ├── Coin      — coleccionables, atraídos por imán
│   └── Particle  — efectos visuales
├── HUD           — overlay de score, altura, power-up activo
├── DifficultyManager — parámetros de dificultad según altura
└── ScreenManager — estados: start → playing → gameOver
```

## Física
```
GRAVITY       = 1800 px/s²
JUMP_FORCE    = -900 px/s   (rebote en plataformas)
SUPER_JUMP    = -1400 px/s  (power-up super salto)
DOUBLE_JUMP   = -765 px/s   (doble salto en el aire)
TERMINAL_VEL  = 1200 px/s
MOVE_SPEED    = 220 px/s
```

## Generación de plataformas
- Procedural: genera plataformas arriba de `generatedUpTo` mientras estén dentro de 1.5 pantallas de la cámara
- Tutorial: primeras 10 plataformas siempre estáticas y seguras
- Regla de seguridad: si las últimas 3 generadas fueron mortales, la siguiente es forzosamente estática
- Dificultad aumenta de 0 a 200m: plataformas más angostas, gaps más grandes, más mortales y más rápidas

## Bugs conocidos / historial de fixes
1. `const _ = null` fue eliminado accidentalmente junto con PENGUIN_SPRITE → ReferenceError al parsear todos los sprites
2. `loadPenguinSprite` no manejaba error de `getImageData()` en archivos locales (SecurityError) → `callback()` nunca se llamaba → pantalla azul marino sin juego
3. `_checkCollisions` retornaba `undefined` al estar muerto → `NaN` en score
4. Penguin spawnaba con los pies debajo de la primera plataforma (vy=0) → caída inmediata sin rebote

## Para abrir el juego
Abrir `index.html` directamente en el navegador (doble clic).
Funciona en Chrome, Firefox, Edge sin servidor local.

## Push a GitHub
El token clásico (ghp_...) hay que usarlo así:
```bash
cd "juego1"
git -c credential.helper="" remote set-url origin "https://jorgeairdrops:TOKEN@github.com/jorgeairdrops/juego1-2D-salto-vertical.git"
git push origin main
git remote set-url origin "https://github.com/jorgeairdrops/juego1-2D-salto-vertical.git"
```
