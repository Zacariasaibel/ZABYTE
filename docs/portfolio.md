# ZABYTE: contenido definitivo y borrador de integración

## Textos en alemán para tarjeta y detalle

La fuente única del borrador es [portfolio-project.json](portfolio-project.json), objeto project. Usa los nombres reales del tipo Project del portfolio Astro: slug, name, category, summary, goal, features, technologies, implementation, repository, demo, note e images. El repositorio público confirmado ya es https://github.com/Zacariasaibel/ZABYTE. demo sigue null hasta comprobar la tienda; plannedDemoUrl solo registra el destino previsto, no es un enlace operativo para la interfaz.

**Name:** ZABYTE

**Kategorie:** Fullstack-Projekt · Bestellsimulation

**Kurztext der Karte:** Computerzubehör suchen, Produkte ansehen, einen Warenkorb verwalten und eine Bestellung serverseitig simulieren.

**Ziel:** Den vollständigen Ablauf vom Produktkatalog bis zur bestätigten Bestellsimulation mit einer gemeinsamen API und nachvollziehbaren Prüfungen umsetzen.

**Funktionen:** Zehn Produkte mit Details, Bildern, Preisen und Verfügbarkeit. Kombinierte Suche, Kategorien, Preis- oder Namenssortierung und Verfügbarkeitsfilter mit URL-Zustand. Warenkorb mit Mengenänderung und Speicherung nach dem Neuladen. Bestellsimulation mit Serverbestätigung ohne Zahlungs- oder Personendaten. Geschützte Verwaltung von Produkten, Kategorien und simulierten Bestellungen im Django Admin.

**Technische Umsetzung:** Angular lädt Katalog und Preise über das Django-API. Im Browser bleiben nur Produkt-IDs und Mengen gespeichert; Summen werden in ganzen Cent berechnet. Django prüft aktive Produkte, ganzzahlige Mengen und Bestand und berechnet Preise mit Decimal aus der Datenbank. Bestellung und Positionen werden gemeinsam in einer Transaktion als Snapshots in SQLite gespeichert. Eine vor dem Senden gesicherte eindeutige Anfragekennung verhindert doppelte Bestellungen bei Wiederholungen. Die Simulation verändert keine Bestände. Der vollständige E2E-Test prüft den Ablauf einschließlich Fehlerfällen, Navigation, Bildern und Tastaturfokus in vier Bildschirmgrößen.

**Hinweis:** Portfolio-Projekt mit fiktiven Produkten und KI-generierten Produktdarstellungen. Bestellungen werden nur simuliert; es gibt keine echten Zahlungen oder Lieferungen.

## Capturas finales disponibles

Capturas reales de la última ejecución correcta del usuario, 1 de noviembre de 2026 a las 20:29, hora local. Revisadas visualmente: contenido de ZABYTE, sin errores, herramientas de depuración, cuentas personales ni secretos. La referencia visible de confirmación pertenece a una simulación de prueba y no contiene datos personales.

| Archivo estable | Original temporal | Dimensiones reales | Bytes finales / originales |
| --- | --- | --- | ---: |
| [katalog-desktop.png](screenshots/katalog-desktop.png) | catalog-1440.png | 1425 × 1942 | 443947 / 451763 |
| [produktdetail-desktop.png](screenshots/produktdetail-desktop.png) | detail-photo-1440.png | 1440 × 950 | 175622 / 178817 |
| [warenkorb-desktop.png](screenshots/warenkorb-desktop.png) | cart-1440.png | 1440 × 950 | 46689 / 46895 |
| [bestaetigung-mobil.png](screenshots/bestaetigung-mobil.png) | confirmation-320.png | 320 × 879 | 29400 / 30767 |
| [katalog-mobil.png](screenshots/katalog-mobil.png) | catalog-320.png | 320 × 2422 | 175434 / 180050 |

Los originales están en .local/qa y no entran en Git. Optimización con Python estándar zlib, recompresión PNG IDAT nivel 9: sin pérdida, sin cambiar tamaño ni contenido. Total final: 871092 bytes frente a 888292 originales. El catálogo de escritorio se capturó en viewport de 1440; la imagen mide 1425 por la barra de desplazamiento. No se inventan dimensiones. Los textos alternativos definitivos y destinos de copia están en project.images y screenshots del JSON.

## Estructura Astro revisada

El proyecto no existe en C:\Users\UserS2025\Desktop\Portfolio-Redesign. La carpeta real encontrada es **C:\Users\UserS2025\Desktop\Portfolio projects\Portfolio-Redesign**. Se leyeron su AGENTS.md y sus archivos:

- src/data/projects.ts contiene la interfaz Project y el array compartido projects.
- src/components/Projects.astro genera la tarjeta desde name, summary, technologies e images[0], y enlaza a /projekte/slug/.
- src/pages/projekte/[slug].astro genera las rutas con getStaticPaths desde ese mismo array.
- src/layouts/ProjectLayout.astro consume goal, features, implementation, note y la galería; el enlace repository es obligatorio y demo es opcional.

El repositorio ya está disponible, pero la integración definitiva se aplaza hasta verificar el alojamiento, como pide este bloque. No copiar demo null al array TypeScript; ese campo se omite o se completa con una URL operativa comprobada. No se modifica Astro, sus estilos, GitHub Pages ni los proyectos existentes; tampoco se ejecuta su build sin cambios.

## Cambios exactos cuando existan URLs reales

1. Verificar personalmente la URL pública del repositorio y la tienda HTTPS. Sustituir project.repository y project.demo en el borrador por esas URLs reales. Si se decidiera presentar solo código, omitir demo completamente; nunca usar null o localhost en el array público.
2. Copiar los cinco PNG desde docs/screenshots a public/images/projects del portfolio con los nombres zabyte-* indicados en screenshots[].target. Conservar width, height y alt de project.images.
3. Añadir el objeto project ya completado al array projects de src/data/projects.ts, siguiendo el estilo TypeScript del archivo. No copiar el envoltorio status/verification/screenshots. repository debe ser string, demo debe ser string u omitirse. No hace falta crear una página manual ni duplicar los datos en la tarjeta.
4. La ruta /projekte/zabyte/ y las tarjetas surgirán de las plantillas compartidas. Revisar miniatura, galería, textos alternativos, navegación y enlaces reales. No cambiar ProjectLayout.astro ni Projects.astro por preferencia.
5. En PowerShell dentro del portfolio: npm.cmd run build y git diff --check. Comprobar localmente el resultado antes de que el usuario cree commit/push y publique.

Repositorio confirmado, commit inicial 831813f en main. Destino previsto: cuenta Zaibel, dominio zaibel.pythonanywhere.com, todavía sin validación pública. publishReady permanece false por esa fase pendiente, no por fallos del E2E local. La preparación de PythonAnywhere está en pythonanywhere.md. No usar el panel de la cuenta como demo ni integrar definitivamente Astro antes de comprobar HTTPS y el recorrido público.
