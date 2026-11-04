# ZABYTE

[Shop ausprobieren](https://zaibel.pythonanywhere.com/)

Mit ZABYTE wollte ich einen vollständigen Shop für Computerzubehör entwickeln: vom Produktkatalog über den Warenkorb bis zur gespeicherten Bestellsimulation.

Dabei war mir wichtig, dass Oberfläche und Backend zusammenarbeiten. Preise, Mengen und Bestellbestätigung sollen auch dann stimmen, wenn eine Anfrage wiederholt wird oder sich Produktdaten geändert haben.

## Was man ausprobieren kann

- Zehn Produkte durchsuchen, filtern und sortieren.
- Produktdetails mit Preis und Verfügbarkeit öffnen.
- Verschiedene Artikel in den Warenkorb legen und Mengen ändern.
- Die Bestellung prüfen und eine Bestellsimulation abschließen.

Der Warenkorb bleibt nach dem Neuladen erhalten. Nach erfolgreicher Simulation erscheinen die bestätigte Gesamtsumme und eine Bestellreferenz. Der Warenkorb wird anschließend geleert.

## Technischer Aufbau

Angular und TypeScript bilden die Oberfläche. Python und Django REST Framework stellen die API bereit. Produkte und simulierte Bestellungen werden in SQLite gespeichert.

Das Backend ermittelt die gültigen Preise, prüft Mengen und Verfügbarkeit und berechnet die Gesamtsumme. Bei der Wiederholung desselben Bestellversuchs wird keine zweite Bestellung angelegt. So bleiben Bestellbestätigung und gespeicherte Daten konsistent.

## Umfang der Demo

Produkte und Produktbilder sind fiktiv. Die Bilder wurden mit KI generiert.

Die Anwendung simuliert Bestellungen. Es gibt keine echten Zahlungen, Lieferungen oder Kundenkonten. Zum Ausprobieren sind keine Zahlungs- oder Personendaten erforderlich. Die Bestände bleiben bei der Simulation unverändert. Der Django Admin ist geschützt.

## Lokal starten

Voraussetzungen: Python 3.13, Node.js 24 und npm.

Die vollständigen PowerShell-Befehle für Installation, Datenbank und Start stehen in der [lokalen Startanleitung](docs/inicio-local.md). Dort wird auch erklärt, wie vorhandene Daten erhalten bleiben.

Die lokale Oberfläche läuft unter `http://127.0.0.1:4200/`, das Backend auf Port 8000.

## Prüfungen

Backend-Tests sowie Warenkorb- und Filterprüfungen wurden ausgeführt. Der Angular-Build und die vollständige E2E-Suite wurden lokal erfolgreich geprüft.

In der öffentlichen Demo wurden der Katalog und eine Bestellsimulation mit passender Referenz, korrekter Summe und geleertem Warenkorb geprüft. Die vollständige E2E-Suite wurde nicht gegen die öffentliche Demo ausgeführt.

Details stehen im [Prüfbericht](docs/review-2026-11-02.md).

[Architektur](docs/arquitectura-v1.md) · [PythonAnywhere](docs/pythonanywhere.md) · [Bildnachweise](docs/imagenes-estudio-zabyte.md)