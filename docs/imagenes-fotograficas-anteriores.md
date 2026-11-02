# Antecedente histórico de fotografías de ZABYTE

**Documento conservado del bloque anterior.** Describe las imágenes usadas antes de las diez representaciones generadas de estudio. Sus fotografías y licencias no corresponden a las imágenes principales actuales. Para el estado vigente, consultar [imagenes.md](imagenes.md).

# Fotografías de ZABYTE

## Estado actual

Las diez fichas utilizan fotografías locales: nueve archivos JPEG, con la foto del teclado negro compartida por las dos fichas de teclado. Los SVG se conservan exclusivamente como alternativa ante errores de carga. Las fotografías originales no se han modificado ni se han eliminado marcas.

Por autorización del usuario se han adaptado los nombres y descripciones ficticios a lo que muestran las fotos. Se mantienen IDs, slugs, precios, existencias, categorías, rutas SVG y estado activo. La fuente de textos es `backend/catalog/demo_presentation.py`, usada tanto por `seed_demo` como por `sync_demo_presentation`. En la base existente se ejecutó solamente el segundo comando: no se reinicializó ni se volvió a sembrar SQLite.

## Procedencia y archivos

Todos los archivos están en `frontend/public/assets/photos/`. Se conservan los autores, páginas originales, licencias, URLs de descarga y hashes en [photo-manifest.json](photo-manifest.json). Los diez JPEG originales se han revisado visualmente durante la integración. Cada archivo pesa menos de 150.000 bytes.

| Archivo | Ficha actual | Dimensiones | Bytes | Autor y fuente |
| --- | --- | --- | ---: | --- |
| cable-usbc.jpg | USB-C-Kabel | 1000 × 667 | 38.759 | Marcus Urbenz · [Original](https://unsplash.com/photos/white-usb-cable-on-white-surface-4xMAiJZPQXI) |
| deskmat.jpg | Schreibtischmatte | 800 × 1200 | 140.258 | Minh Phuc · [Original](https://www.pexels.com/photo/a-keyboard-and-mouse-on-a-desk-with-a-map-27559488/) |
| headphones.jpg | Kopfhörer, weiß | 1000 × 1000 | 12.405 | Sound On · [Original](https://www.pexels.com/photo/white-headset-on-white-background-3394648/) |
| hub.jpg | USB-C-Hub | 1000 × 662 | 40.930 | Gül Işık · [Original](https://www.pexels.com/photo/laptop-and-usb-hub-on-table-5576311/) |
| keyboard-white.jpg | No utilizada | 1000 × 1250 | 56.128 | Adrian Regeci · [Original](https://www.pexels.com/photo/minimalist-workspace-keyboard-and-mouse-setup-28396251/) |
| keyboard-wired.jpg | USB-Tastatur, schwarz; Tastatur mit Nummernblock | 1000 × 1500 | 69.978 | Matheus Bertelli · [Original](https://www.pexels.com/photo/computer-keyboard-with-a-cable-on-a-plain-background-20509998/) |
| lamp.jpg | Schreibtischlampe | 1000 × 667 | 20.088 | Prem Singh Tanwar · [Original](https://www.pexels.com/photo/black-desk-lamp-on-white-wall-8263858/) |
| mouse-wired.jpg | USB-Maus | 1000 × 669 | 24.015 | Matheus Bertelli · [Original](https://www.pexels.com/photo/mouse-in-a-studio-20510002/) |
| speaker.jpg | Kompaktlautsprecher | 1000 × 667 | 32.827 | Caleb Oquendo · [Original](https://www.pexels.com/photo/speaker-in-white-background-7772558/) |
| stand.jpg | Laptopständer | 1000 × 668 | 64.383 | Anete Lusina · [Original](https://www.pexels.com/photo/modern-laptop-placed-on-stand-on-desk-4792717/) |

Licencias indicadas en el paquete de origen: [Pexels](https://www.pexels.com/license/) y [Unsplash](https://unsplash.com/license/). Los archivos estaban ya comprimidos y redimensionados por sus CDN; no se ha aplicado otra generación JPEG ni se han alterado sus píxeles. Las marcas visibles no implican fabricación ni respaldo de ZABYTE.

## Correspondencia con las descripciones

- **Teclados:** ahora se describen como teclados negros con cable y bloque numérico. La primera ficha indica QWERTY y la segunda no promete un formato mini. Se retiraron las afirmaciones anteriores de layout alemán, USB-C y ausencia de bloque numérico. Ambas usan la foto completa del teclado negro, como imagen orientativa compartida de dos artículos ficticios con precios conservados.
- **Auriculares:** la ficha ahora dice «Kopfhörer, weiß». Se describen las almohadillas y el arco; no se afirma micrófono, USB, Bluetooth ni autonomía.
- **Hub:** solo se describen el cuerpo estrecho, el acabado plateado y el cable conectado a un portátil. Se retiró la promesa de cuatro puertos USB-A; no se inventan interfaces, velocidades ni carga.
- **Ratón:** se describen cable USB y rueda visibles, sin prometer prestaciones adicionales.
- **Altavoz:** se describen la rejilla oscura y los controles superiores, sin afirmar alimentación USB ni conectividad.
- **Cable:** se describe el conector USB-C en primer plano; no se promete longitud, trenzado ni tipo de conector en el extremo que no se ve.
- **Soporte:** se describe el aspecto metálico y la base amplia, sin certificar material, peso soportado o tamaños de portátil.
- **Alfombrilla:** se describe la superficie oscura con dibujo de líneas, sin inventar dimensiones o propiedades antideslizantes.
- **Lámpara:** se describen brazo, pie y pantalla, sin afirmar fuente LED, niveles de brillo ni temperatura de color.

La leyenda «Beispielabbildung · Ausführung kann abweichen» se mantiene discretamente en el detalle, solo si se está mostrando una foto.

## Encuadres y alternativa

Las zonas del listado y del detalle reservan proporción **4:3**. El componente de imagen queda posicionado dentro de esa zona, para que su contenido no cambie la altura de las imágenes de la última fila. `object-fit: contain` preserva la proporción original y no oculta el artículo. La foto vertical de la alfombrilla y la del teclado dejan espacio lateral deliberado; no se aplica `cover`.

`ProductImageComponent` utiliza la foto seleccionada o, ante un fallo, el SVG original del API. Si también falla el SVG no vuelve a solicitar la foto en bucle. Los productos personalizados sin correspondencia conservan su imagen original.

## Foto no utilizada y pendiente opcional

**keyboard-white.jpg no es adecuada como foto principal de un teclado aislado:** el original corta parte del teclado y muestra además un ratón y un lápiz. No se puede reconstruir la parte ausente mediante CSS. No se ha asignado ni se han inventado sus prestaciones.

No falta imagen para que las diez fichas utilicen fotografías. Para dar a la segunda ficha un motivo diferente, falta una **segunda fotografía completa de un teclado con cable y bloque numérico**, preferiblemente horizontal. Actualmente se comparte la imagen negra completa y se documenta expresamente.

La revisión visual de los archivos originales está realizada. La revisión del catálogo renderizado en escritorio y hasta 320 px depende de poder iniciar Chrome en el ejecutor; su resultado concreto figura en [verificacion.md](verificacion.md).
