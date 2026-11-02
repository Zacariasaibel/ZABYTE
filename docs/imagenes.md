# Representaciones de productos de ZABYTE

## Imágenes vigentes

Las diez fichas usan **diez archivos WebP distintos**, asignados por el slug real del producto. Son **representaciones generadas con IA de productos ficticios**, no fotografías de fabricantes ni modelos reales. No se atribuyen a Pexels, Unsplash o fotógrafos.

Los originales se suministraron en `frontend/public/assets/studio/`. Se revisaron visualmente los diez archivos, completos sobre fondo blanco, y se comprobaron dimensiones, bytes y SHA-256 contra [studio-assets.json](studio-assets.json). Sus prompts y procedencia se conservan en ese manifiesto y en [imagenes-estudio-zabyte.md](imagenes-estudio-zabyte.md).

| Slug conservado | Imagen principal en /assets/studio/ | Dimensiones | Bytes |
| --- | --- | --- | ---: |
| `fjord-keys` | `keyboard-full.webp` | 1200 × 900 | 57.946 |
| `fjord-keys-mini` | `keyboard-compact.webp` | 1200 × 900 | 45.388 |
| `klang-headset` | `headphones.webp` | 1200 × 900 | 34.072 |
| `hafen-hub` | `hub.webp` | 1200 × 900 | 20.368 |
| `klang-speaker` | `speaker.webp` | 1200 × 900 | 134.132 |
| `polar-mouse` | `mouse.webp` | 1200 × 900 | 33.528 |
| `strom-usb-c` | `cable-usbc.webp` | 1200 × 900 | 79.700 |
| `weitsicht-stand` | `stand.webp` | 1200 × 900 | 33.448 |
| `nordlicht-lamp` | `lamp.webp` | 1200 × 900 | 22.950 |
| `wolke-deskmat` | `deskmat.webp` | 1200 × 900 | 66.294 |

El total es 527.826 bytes. Cada archivo pesa menos de 150.000 bytes. Los diez hashes son diferentes. Se conservan intactos los WebP suministrados: conversión previa a WebP con calidad 84, desde 1448 × 1086 a 1200 × 900, sin recortes ni deformación.

## Los dos teclados

- `fjord-keys` → `keyboard-full.webp`: teclado negro completo con número y flechas separados.
- `fjord-keys-mini` → `keyboard-compact.webp`: teclado gris compacto sin bloque numérico.

Ambos conservan `/assets/products/keyboard.svg` en el campo original del API. La selección principal **no usa ese campo como clave**: `resolveProductImage` consulta primero `product.slug`. Si no hay asignación devuelve la imagen original del producto. Catálogo y detalle utilizan el mismo componente y la misma función; no hay un segundo mapa en las vistas.

No se comparte ya la imagen de teclado. No falta ninguna representación para las diez fichas. La candidata blanca antigua sigue fuera del catálogo vigente.

## Textos y conservación de datos

Se actualizaron siete nombres o descripciones mediante `DEMO_PRESENTATION` y el comando existente `sync_demo_presentation`, previa copia local de seguridad. No se ejecutó `seed_demo` ni se reinicializó SQLite.

Se retiraron contradicciones: el compacto ya no tiene número ni se describe negro; los auriculares son negros; el cable muestra dos USB-C y trenzado; el soporte está vacío; la alfombrilla es lisa. No se prometen layout alemán, conectividad inalámbrica, autonomía, potencia, velocidades, tamaños admitidos ni certificaciones. El seed lee la misma fuente compartida de textos.

Se compararon todos los campos salvo nombre y descripción antes y después. **IDs, slugs, precios, existencias, categorías, rutas SVG y estados activos se conservaron**, así como categorías y número de usuarios.

## Presentación y fallback

- Zonas **4:3** del catálogo y del detalle con fondo blanco, dimensiones HTML 1200 × 900, `object-fit: contain` y sin cambios según la última fila.
- Carga diferida en tarjetas y prioritaria en el detalle.
- Texto alternativo útil con el nombre del producto. Por instrucción actual no se muestran avisos de IA/KI, imágenes orientativas ni demostración en catálogo, detalle, cabecera o footer. El origen generado y el carácter ficticio se conservan en esta documentación y el README.
- Un fallo de la representación selecciona el SVG original. Si también falla el SVG no se alternan solicitudes en bucle.
- El error pertenece al producto mostrado. Un `linkedSignal` lo reinicia al cambiar la entrada de producto; navegar entre los teclados, o volver al anterior, no conserva el fallo previo.
- Los productos personalizados sin slug conocido conservan su imagen original; compartir un SVG no les asigna una imagen de otro artículo.

La prueba `frontend/scripts/check-product-images.mjs` comprueba las diez rutas y hashes, WebP 1200 × 900, el caso de los teclados con SVG compartido y el fallback al navegar A → B → A. Ejecuta el estado real de Angular sin presentar esa prueba como revisión visual de una página.

## Fuentes anteriores

Las fotografías de `assets/photos/` **no son las imágenes principales vigentes** y no se borraron. Su documentación se conserva como antecedente en [imagenes-fotograficas-anteriores.md](imagenes-fotograficas-anteriores.md), [fotos-seleccionadas.md](fotos-seleccionadas.md) y [photo-manifest.json](photo-manifest.json). Sus licencias y autores se refieren exclusivamente a esos archivos anteriores, nunca a las nuevas representaciones.

El resultado del build y las limitaciones de revisión en navegador se detallan en [verificacion.md](verificacion.md).

## Cesta y compra simulada

La misma representación por slug se usa también para las líneas de cesta. No se han cambiado imágenes ni asignaciones. La paleta pasa a azul y las imágenes mantienen fondo blanco. Los avisos de simulación corresponden únicamente al recorrido de checkout y su confirmación, no a las fichas.
