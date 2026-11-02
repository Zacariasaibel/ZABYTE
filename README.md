# ZABYTE

Fullstack-Shop für Computerzubehör mit Angular, TypeScript, Django REST Framework und SQLite.

[Shop öffnen](https://zaibel.pythonanywhere.com/) · [Code auf GitHub](https://github.com/Zacariasaibel/ZABYTE)

## Ausprobieren

Zehn Produkte ansehen, suchen, nach Kategorie oder Verfügbarkeit filtern und nach Preis oder Name sortieren. Produktdetails öffnen, Artikel in den Warenkorb legen und Mengen ändern. Der Warenkorb bleibt nach dem Neuladen erhalten.

Anschließend die Bestellung prüfen und simulieren. Der Server validiert Preise, Mengen und Bestand und bestätigt die Simulation mit einer Referenz. Eine wiederholte Anfrage erzeugt keine doppelte Bestellung. Die Bestände bleiben unverändert.

Produkte und Produktbilder sind fiktiv. Die Bilder wurden mit KI generiert. Es gibt keine echten Zahlungen, Lieferungen oder Kundenkonten. Zum Testen sind keine Zahlungs- oder Personendaten erforderlich. Der Django Admin ist geschützt.

## Lokal starten

Voraussetzungen: Python 3.13, Node 24 und npm. In einer virtuellen Umgebung `backend/requirements.txt` installieren, unter `frontend` die Pakete mit `npm.cmd ci` installieren. Einen privaten `DJANGO_SECRET_KEY` setzen, Migrationen ausführen und bei einer neuen Datenbank `seed_demo` aufrufen. Danach Django auf Port 8000 und Angular mit `npm.cmd start --prefix frontend` starten. Die Oberfläche läuft auf `http://127.0.0.1:4200/`.

Die vollständigen PowerShell-Befehle und Hinweise zum Erhalt bestehender Daten stehen in der [lokalen Startanleitung](docs/inicio-local.md).

## Prüfungen

Die öffentliche HTTPS-Demo funktioniert. Die zehn Produkte und eine Bestellsimulation mit passender Referenz, korrekter Summe und geleertem Warenkorb wurden bereits geprüft. Die vollständige E2E-Suite lief lokal; sie wurde nicht vollständig gegen Produktion ausgeführt.

Bei der aktuellen Überarbeitung wurden 37 Backend-Tests, die Warenkorb- und Filterprüfungen sowie der Angular-Build erneut ausgeführt. Die neue echte Katalogaufnahme ersetzt die Hauptaufnahme im Portfolio. Details und Abgrenzung der öffentlichen und lokalen Prüfungen stehen im [aktuellen Prüfbericht](docs/review-2026-11-02.md).

[Architektur](docs/arquitectura-v1.md) · [PythonAnywhere](docs/pythonanywhere.md) · [Bildnachweise](docs/imagenes-estudio-zabyte.md)
