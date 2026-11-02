# Imágenes de estudio para ZABYTE

## Estado

Este paquete contiene diez imágenes individuales generadas con IA para el catálogo ficticio de ZABYTE. Tienen fondo blanco, iluminación uniforme, producto completo y formato 4:3. Se han revisado visualmente, convertido a WebP y comprobado como archivos válidos de 1200 × 900 píxeles, cada uno inferior a 150.000 bytes.

**Integradas el 1 de noviembre de 2026:** diez archivos distintos se asignan por los slugs reales en `product-photos.ts`. Catálogo y detalle comparten la resolución y el fallback. Los nombres y descripciones incompatibles se actualizaron sin reinicializar SQLite. Véanse [imagenes.md](imagenes.md) y [verificacion.md](verificacion.md). Las instrucciones siguientes se conservan como guía de preparación e integración.

No son fotografías de modelos reales ni imágenes suministradas por fabricantes. No atribuirlas a Pexels, Unsplash o un fotógrafo. Documentar el carácter ficticio y el origen generado en README y docs/imagenes.md. La instrucción actual elimina los avisos visibles del catálogo y del detalle; el checkout identifica su simulación.

## Archivos

| Archivo sin extensión | Nombre orientativo | Peso decimal |
| --- | --- | ---: |
| keyboard-full | USB-Tastatur | 57.95 KB |
| keyboard-compact | Kompakte Tastatur | 45.39 KB |
| headphones | Over-Ear-Kopfhörer | 34.07 KB |
| hub | USB-C-Multiport-Hub | 20.37 KB |
| speaker | Lautsprecher | 134.13 KB |
| mouse | USB-Maus | 33.53 KB |
| cable-usbc | USB-C-Kabel | 79.70 KB |
| stand | Laptopständer | 33.45 KB |
| lamp | Schreibtischlampe | 22.95 KB |
| deskmat | Schreibtischmatte | 66.29 KB |

Los nombres orientativos no sustituyen por sí solos el catálogo ni cambian su precio o disponibilidad.

## Integración para Codex

1. Leer AGENTS.md, docs/studio-assets.json, ProductImageComponent, product-photos.ts, el tipo Product, el seed y DEMO_PRESENTATION.
2. Identificar los diez productos actuales por sus slugs o IDs estables. Estos identificadores no se han adivinado en este paquete.
3. Asignar exactamente una nueva imagen a cada producto. Los teclados requieren asignaciones distintas:
   - teclado negro de tamaño completo → /assets/studio/keyboard-full.webp
   - teclado gris compacto → /assets/studio/keyboard-compact.webp
4. Si ambos teclados comparten la ruta original keyboard.svg, una tabla indexada únicamente por product.image no puede distinguirlos. Resolver primero la imagen por el slug o ID del producto y usar el mapa por imagen original solo como alternativa. Mantener una fuente compartida de asignaciones, usada por catálogo y detalle.
5. Conservar el SVG original ante fallos de carga. Restablecer correctamente el estado de error al cambiar de producto y evitar bucles de reintentos. Aprovechar la lógica existente.
6. No cambiar IDs, slugs, precios, existencias, categorías ni estados activos. No reinicializar SQLite ni ejecutar seed_demo para aplicar la presentación. Si algún texto ficticio contradice las imágenes, actualizarlo mediante DEMO_PRESENTATION y el mecanismo sync_demo_presentation ya existente, con copia y comprobación de los campos protegidos.
7. Describir únicamente el diseño representado. No inventar layout alemán, Bluetooth, autonomía, potencia, resolución, certificaciones o velocidad. La alfombrilla nueva es lisa; los auriculares no llevan micrófono de brazo.
8. Mostrar el mismo archivo en catálogo y detalle. Zona de imagen con aspect-ratio: 4 / 3, fondo blanco, object-fit: contain y altura independiente de la descripción. No hacer que la última fila adopte el alto natural de la foto ni emplear cover con recortes arbitrarios.
9. Usar width=1200 y height=900 o sus proporciones correctas. Carga diferida en tarjetas que quedan fuera de pantalla; prioridad solo cuando corresponda.
10. Actualizar docs/imagenes.md y README con las asignaciones utilizadas y el origen generado. Conservar la documentación histórica de fuentes anteriores como antecedentes, sin presentarlas como las imágenes vigentes.
11. Las dependencias y la auditoría no forman parte de esta integración. No hacer actualizaciones ni añadir bibliotecas.

## Comprobaciones útiles

- Diez productos con diez URL nuevas distintas; ambos teclados usan archivos y hashes diferentes.
- Catálogo y detalle coinciden para cada slug; la navegación entre productos no conserva un error de imagen anterior.
- Archivo presente, imagen cargada y formato 4:3 también en la última fila.
- Fotografía sin deformaciones ni partes cortadas a 1440, 800, 390 y 320 píxeles.
- Filtros y navegación existentes conservados.
- Prueba significativa de resolución de imagen por producto para los dos teclados que comparten una ruta SVG, junto al fallback existente.
- Build una vez al final. Si Codex vuelve a recibir spawn EPERM, registrar el fallo y proporcionar npm.cmd run build --prefix frontend para PowerShell normal. No declarar una revisión visual si Chrome sigue bloqueado.

Sin staging, commits, push ni publicación.

## Procedencia y preparación

Generación realizada con la herramienta integrada de generación de imágenes. Cada archivo incluye en studio-assets.json su prompt completo, descripción visual, dimensiones, compresión y SHA-256.

Las fuentes generadas miden 1448 × 1086 píxeles. Solo se han redimensionado a 1200 × 900 y comprimido a WebP, sin recorte ni alteración de los productos. Las pequeñas leyendas de teclas son parte de una representación generada y no certifican una distribución de teclado real.

Este paquete no implementa carrito, pedidos ni pagos.
