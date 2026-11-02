# ZABYTE

ZABYTE ist ein Onlineshop für Computerzubehör, den ich im Rahmen meiner Umschulung als Fullstack-Projekt für mein Portfolio entwickle. Produkte, Warenkorb und Bestellablauf sind miteinander verbunden. Die Produkte sind fiktiv. Bestellungen werden simuliert; es gibt keine echten Zahlungen oder Lieferungen.

Im Katalog kannst du zehn Artikel ansehen, nach Namen suchen und Kategorien auswählen. Dazu kommen die Sortierung nach Name oder Preis und ein Filter für verfügbare Artikel. Die Auswahl bleibt in der URL erhalten. Produktkarten führen zur Detailseite mit Bild, Beschreibung, Preis und Bestand. Artikel lassen sich direkt oder mit einer gewählten Menge in den Warenkorb legen. Dort kannst du Mengen ändern und Artikel entfernen.

Für die Oberfläche verwende ich Angular und TypeScript mit eigenständigen Komponenten und CSS. Python, Django und Django REST Framework stellen die API bereit. SQLite speichert Produkte, Kategorien und simulierte Bestellungen. Über den geschützten Django Admin lassen sich Katalogdaten verwalten und Bestellungen ansehen.

Django prüft beim Bestätigen, ob Produkte aktiv und Mengen gültig und verfügbar sind. Preise und Gesamtsumme berechnet der Server aus der Datenbank. Angular rechnet mit ganzen Cent, Django mit Decimal. Die Simulation verändert keine Bestände. Der Browser speichert nur Produkt-IDs und Mengen in localStorage; aktuelle Preise werden erneut geladen. Eine gespeicherte Anfragekennung sorgt dafür, dass ein wiederholter Bestellversuch keinen zweiten Auftrag erzeugt. Bei einem Fehler bleibt der Warenkorb erhalten.

Der Angular-Build und der vollständige E2E-Test wurden lokal erfolgreich ausgeführt. Geprüft wurden unter anderem Katalog, Filter, Navigation, Warenkorb, Bestellsimulation, Fehlerfälle, Bilder und Tastaturfokus bei 1440, 800, 390 und 320 Pixeln. Auch Backend- und Warenkorbtests sind bestanden. Diese Ergebnisse bestätigen den lokalen Stand; der öffentliche Betrieb mit HTTPS ist noch nicht geprüft.

Die [Start- und Testanleitung](docs/inicio-local.md) enthält die PowerShell-Befehle. Weitere Informationen stehen im [Prüfbericht](docs/verificacion-v1.md) und der [Architekturbeschreibung](docs/arquitectura-v1.md). Für PythonAnywhere sind ein eigenes Build-Profil und eine [Schritt-für-Schritt-Anleitung](docs/pythonanywhere.md) vorbereitet. Der neue Hosting-Build ist in Codex an einer Ausführungsbeschränkung gescheitert; ein Upload-Paket wurde hier nicht erzeugt. Die [Docker-Anleitung](docs/despliegue.md) bleibt als Alternative erhalten. Eine öffentliche Demo ist noch nicht bestätigt. [Screenshots und Portfolio-Texte](docs/portfolio.md) zeigen den lokalen Stand.

Die Produktbilder stellen fiktive Artikel dar und wurden mit KI generiert. Herkunft und Zuordnung sind in den [Bildnachweisen](docs/imagenes-estudio-zabyte.md) dokumentiert.
