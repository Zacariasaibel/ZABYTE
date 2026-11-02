# Antecedente histórico: fotografías anteriores

**Estas imágenes no son las principales vigentes.** Se conservan este documento y las fuentes originales como antecedentes. Las diez representaciones generadas actuales se documentan en [imagenes.md](imagenes.md) y [studio-assets.json](studio-assets.json). Las asignaciones descritas a continuación corresponden al bloque anterior.

# Fotografías candidatas para ZABYTE

Preparado el 31 de octubre de 2026.

## Contenido y estado

Este paquete contiene diez JPEG locales: fotografías para nueve tipos de artículo y una alternativa de teclado. Se han descargado, comprobado como imágenes válidas y revisado visualmente. Cada archivo pesa menos de 150.000 bytes. El paquete no contiene código ejecutable.

**Estado del bloque anterior:** nueve archivos se utilizan en diez fichas. El teclado negro se comparte entre dos artículos ficticios; la foto blanca no se usa porque no muestra el teclado completo. La revisión y las correspondencias actuales están en [imagenes.md](imagenes.md).

Las fotografías muestran productos reales o escenas de uso. No certifican el aspecto ni las prestaciones exactas de los productos ficticios ZABYTE. El usuario autorizó adaptar nombres y descripciones para corresponder a las fotos. Solo se actualizan esos textos, sincronizados con el seed; IDs, slugs, stock, precios, categorías y estado activo se conservan. Una contradicción visible, como un ratón con cable frente a una ficha de ratón inalámbrico, obliga a descartar esa asignación.

## Archivos y procedencia

| Archivo | Autor | Dimensiones | Peso decimal | Fuente |
| --- | --- | --- | ---: | --- |
| cable-usbc.jpg | Marcus Urbenz | 1000 × 667 | 38.76 KB | [Original](https://unsplash.com/photos/white-usb-cable-on-white-surface-4xMAiJZPQXI) |
| deskmat.jpg | Minh Phuc | 800 × 1200 | 140.26 KB | [Original](https://www.pexels.com/photo/a-keyboard-and-mouse-on-a-desk-with-a-map-27559488/) |
| headphones.jpg | Sound On | 1000 × 1000 | 12.40 KB | [Original](https://www.pexels.com/photo/white-headset-on-white-background-3394648/) |
| hub.jpg | Gül Işık | 1000 × 662 | 40.93 KB | [Original](https://www.pexels.com/photo/laptop-and-usb-hub-on-table-5576311/) |
| keyboard-white.jpg | Adrian Regeci | 1000 × 1250 | 56.13 KB | [Original](https://www.pexels.com/photo/minimalist-workspace-keyboard-and-mouse-setup-28396251/) |
| keyboard-wired.jpg | Matheus Bertelli | 1000 × 1500 | 69.98 KB | [Original](https://www.pexels.com/photo/computer-keyboard-with-a-cable-on-a-plain-background-20509998/) |
| lamp.jpg | Prem Singh Tanwar | 1000 × 667 | 20.09 KB | [Original](https://www.pexels.com/photo/black-desk-lamp-on-white-wall-8263858/) |
| mouse-wired.jpg | Matheus Bertelli | 1000 × 669 | 24.02 KB | [Original](https://www.pexels.com/photo/mouse-in-a-studio-20510002/) |
| speaker.jpg | Caleb Oquendo | 1000 × 667 | 32.83 KB | [Original](https://www.pexels.com/photo/speaker-in-white-background-7772558/) |
| stand.jpg | Anete Lusina | 1000 × 668 | 64.38 KB | [Original](https://www.pexels.com/photo/modern-laptop-placed-on-stand-on-desk-4792717/) |

Licencias consultadas: [Pexels](https://www.pexels.com/license/) y [Unsplash](https://unsplash.com/license/). Permiten el uso gratuito de fotografías en sitios web bajo sus condiciones. Se conserva el autor y el enlace de cada foto. Las marcas que aparecen pertenecen a sus titulares; no presentar las fotografías como productos fabricados por ZABYTE ni como respaldo de esas marcas.

## Integración actual

Las fichas actuales y las decisiones de encuadre están documentadas en [imagenes.md](imagenes.md). Los textos se sincronizan sin reinicializar SQLite mediante `sync_demo_presentation`. El manifiesto conserva la procedencia y los hashes, además de las asignaciones actuales. Las notas siguientes describen los archivos, no prometen prestaciones de las fichas.

## Notas visuales

- **cable-usbc.jpg:** Primer plano de un conector USB-C. No acredita la longitud del cable, el conector del otro extremo, la potencia de carga ni la velocidad de datos.
- **deskmat.jpg:** Alfombrilla amplia negra con dibujo topográfico, teclado y ratón. No usar si la ficha promete otro acabado específico.
- **headphones.jpg:** Auriculares claros sobre fondo blanco. La fotografía no acredita Bluetooth, autonomía, micrófono ni cancelación de ruido.
- **hub.jpg:** Hub con marca Kingston Nucleum visible, conectado a un portátil. No atribuir puertos ni prestaciones sin verificar la ficha.
- **keyboard-white.jpg:** Alternativa: escena blanca con parte de un teclado, un ratón y un lápiz. No representa un teclado aislado ni un modelo ZABYTE exacto.
- **keyboard-wired.jpg:** Teclado negro completo con cable y marca Acer visible. Comprobar distribución y tipo de conexión frente al texto del producto. Composición vertical.
- **lamp.jpg:** Lámpara articulada negra con detalles dorados. La imagen no acredita regulación LED, temperatura de color ni otras prestaciones.
- **mouse-wired.jpg:** Ratón negro Acer con cable USB visible. No usar para una ficha que afirme conexión inalámbrica.
- **speaker.jpg:** Altavoz portátil oscuro sobre fondo claro. No acredita potencia, resistencia al agua ni otros datos técnicos.
- **stand.jpg:** Soporte metálico de portátil mostrado en uso. El portátil no es el artículo de la ficha.

## Procesamiento y verificación

Las variantes JPEG fueron servidas redimensionadas y comprimidas por el CDN de la fuente. No se han recortado, retocado, eliminado logotipos ni regenerado localmente. El manifiesto contiene las URL de descarga, dimensiones, bytes y SHA-256. El rectángulo 4:3 del catálogo debe resolverse en la presentación sin deformar los originales.

Las fotos sustituyen recursos visuales, pero no implementan carrito, pedidos, cuentas ni pagos.
