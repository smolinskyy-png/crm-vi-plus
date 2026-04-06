# CRM VI PLUS — Projektplan

## 1. Was wollen wir bauen?

Wir bauen ein eigenes System für deinen Immobilienvertrieb — eine Art digitales Büro, in dem du alles an einem Ort hast: deine Kunden, deine Immobilien, deine Berechnungen und deinen gesamten Verkaufsprozess.

Das neue System vereint **zwei bestehende Systeme** in einem:
- **Alles von der Vertriebsimmo-App** (vertriebsimmo.app) — 1:1 übernommen
- **Alles von Investagon** (investimmo.investagon.com) — Funktionen übernommen, aber im VertriebsImmo-Design

**Design:** Das VertriebsImmo-Design (dunkelblau/gold) wird überall verwendet — auch für den Immobilienportal-Teil, der bei Investagon aktuell anders aussieht.

**Plattformen:** Website + Handy-App (iPhone und Android)

---

## 2. Was das bestehende Vertriebsimmo-Portal schon kann

(wird 1:1 übernommen, im gleichen Design)

### 2.1 Dashboard (Startseite)
- Willkommen-Bereich mit Übersicht
- Ansprechpartner-Karten mit Kontaktmöglichkeiten (Kalender, E-Mail, Telefon)
- Schnellzugriff auf Tools (Immobilienportal, Finanzierungsservice)

### 2.2 CRM & Pipeline (Kundenverwaltung)
- Kanban-Board (Pinnwand mit Kundenkarten zum Verschieben)
- Stufen im aktuellen System: Neuer Kontakt → Nicht erreicht → Erstgespräch → Beratung 1 → Beratung 2 (Objekt) → Beratung 3 → Abschluss/Notar
- Suche nach Name, E-Mail oder Telefon
- CSV-Import (Kunden aus Excel hochladen)
- Kundendaten: Vorname, Nachname, E-Mail, Telefon, Berufsstatus, Einkommen, Eigenkapital, Quelle
- Zwei Ansichten: Kanban-Board und Liste

### 2.3 Vertriebs-Score (Selbstbewertung)
- Quiz mit 61 Fragen und 746 möglichen Punkten
- Bewertet, wie professionell der Vertrieb aufgestellt ist
- 5 Kategorien: Außenauftritt & Marketing, Vertriebsprozess, Tools & Systeme, Mitarbeitergewinnung, Leadgewinnung
- Level-System (Neuling → höhere Stufen)

### 2.4 Wissensdatenbank
- 203 Artikel mit Praxis-Tipps
- Beratungsstrecke als Übersicht: Neuer Kontakt → Erstgespräch → Konzept & Selbstauskunft → Objektvorstellung → Abschlussgespräch → Notarvorbereitung → Notartermin → After Sales
- Kategorien: Grundlagen, Vertrieb & Abschluss, Lead-Generierung, Gespräche & Einwände, Finanzierung & Steuern, Objektanalyse, Verkaufspsychologie
- Suchfunktion

### 2.5 Dateien & Vorlagen
- Dokument-Bibliothek zum Herunterladen
- 10 Kategorien: Leitfäden & Checklisten, Dokumente & Formulare, Nachrichtenvorlagen, Plattform-Einrichtung, Marketing-Material, Tools & Systeme, Promo/Messestand, Coldcalling, Bestandskundenaktivierung, Incentives & Prämien

### 2.6 Videokurse
- Schulungsplattform mit Lernfortschritt
- Kurse mit verschiedenen Levels (Anfänger, Fortgeschritten, Profi)
- Fortschrittsanzeige pro Kurs
- Videos werden noch gedreht — Admin braucht eine Upload-Funktion zum Hochladen neuer Videos und Kurse

### 2.7 Bonitätsrechner
- Berechnet, wie viel sich ein Kunde leisten kann
- Zwei Modi: Schnelle Einschätzung (60 Sek.) und Erweiterte Analyse (2 Min.)
- Eingaben: Nettoeinkommen, Fixkosten, Vermögen & Kredite, Schufa-Status
- Ergebnisse: Finanzierungsrahmen, Eigenkapital, Max. Darlehen, Darlehensspanne, Max. Rate, Eigenkapitalquote, Finanzierungswahrscheinlichkeit

### 2.8 Finanzierungsservice
- Digitale Selbstauskunft für Kunden
- Eigene Pipeline: Entwurf → Eingereicht → In Prüfung → Genehmigt → Abgelehnt
- Ansprechpartner werden manuell vom Admin angelegt mit: Vorname, Nachname, E-Mail-Adresse, Telefonnummer, Foto, Link zur Webseite
- DSGVO-konform

### 2.9 After Sales (Nachbetreuung)
- Restnutzungsdauergutachten (höhere Abschreibung für Kunden)
- Taxfix Steuer-Service (digitale Steuererklärung)

### 2.10 Provisionen (Provisions-Tracker)
- Übersicht: Gesamt verdient, Ausstehend, Diesen Monat, Abschlüsse
- Monatsziel mit Fortschrittsbalken
- Filter: Alle, Ausstehend, Genehmigt, Ausgezahlt

### 2.11 Empfehlungen (Partner werben)
- Partner-Werbesystem (1.000€ netto Bonus pro verkaufte Einheit)
- Übersicht: Aktive Partner, Verkäufe, Bonus, Ausstehende Auszahlung

### 2.12 Shop & Social Links & Onboarding
- Shop für Produkte/Services
- Social-Media-Links
- Onboarding-Prozess für neue Partner

---

## 3. Was Investagon kann (wird ins neue System eingebaut)

Aktuell ist Investagon ein separates System. Alle diese Funktionen werden ins eigene System übernommen — aber im VertriebsImmo-Design (dunkelblau/gold), NICHT im Investagon-Design.

### 3.1 Immobilien-Übersicht
- 183 Objekte (Wohnungen, Häuser, Mehrfamilienhäuser)
- Empfehlungen-Bereich (ausgewählte Top-Objekte)
- Favoriten-Funktion (Objekte merken)
- Kartenansicht (Objekte auf einer Karte sehen)
- Sortieren und Filtern: nach Adresse, Umkreis (km), Bundesland, Bauzustand, Anlageklasse und mehr
- Suchagent (automatische Benachrichtigung bei passenden neuen Objekten)
- Vergleichs-Funktion (mehrere Objekte nebeneinander vergleichen)

### 3.2 Objekt-Detailseite

Jedes Objekt hat eine ausführliche Detailseite mit vielen Datenfeldern. **Wichtig:** Der Admin kann per Schalter (an/aus) steuern, welche Felder für ein Objekt sichtbar sind und welche nicht. Das heißt: Nicht jedes Feld muss bei jedem Objekt angezeigt werden — der Admin entscheidet das per Klick.

#### Ansichtsmodi
Es gibt zwei verschiedene Ansichten, zwischen denen man wechseln kann:
- **Vertriebspartner-Ansicht:** Zeigt ALLE freigeschalteten Felder inklusive Provision
- **Kunden-Ansicht:** Zeigt das Gleiche wie die Vertriebspartner-Ansicht, ABER ohne Provision — Kunden sollen nicht sehen, wie viel Provision der Partner verdient

#### Alle Datenfelder pro Objekt (vom Admin ein-/ausschaltbar)

**Basis-Informationen:**
- ID (interne Nummer)
- Status (frei / reserviert / verkauft / angefragt)
- Sichtbarkeit (öffentlich sichtbar oder versteckt)
- Pre-Sale (ja/nein — ob Objekt vor offiziellem Verkaufsstart verfügbar ist)

**Standort:**
- Anbieter (Bauträger / Verkäufer)
- PLZ
- Stadt
- Straße
- Hausnummer
- Wohnungsnummer

**Immobilien-Daten:**
- Kaufpreis (€)
- Größe (m²)
- Miete (Kaltmiete €)
- Hausgeld (Monatliche Nebenkosten für Eigentümer)
  - davon umlagefähig (was auf Mieter umgelegt werden kann)
  - davon nicht umlagefähig (was der Eigentümer selbst zahlt)
- Erhaltungsrücklage (monatliche Rücklage für Reparaturen)
- Grundanteil % (Prozent des Kaufpreises, der auf das Grundstück entfällt — wichtig für Steuer)
- Projektname (Name des Bauprojekts)
- Bauzustand (Neubau / Sanierung / Bestand)
- Anlageklasse (z.B. Eigentumswohnung, WG-Wohnung, Apartment, Mikroapartment)
- SEV (Sondereigentumsverwaltung — ja/nein)
- Mietpoolverwaltung (ja/nein)
- Denkmal-/Sanierungsanteil (% für erhöhte steuerliche Abschreibung)

**Finanzierung & Provision:**
- Provision % (NUR in der Vertriebspartner-Ansicht sichtbar, NICHT für Kunden)
- MEA % (Miteigentumsanteil — Anteil am Gesamteigentum)
- Zimmer (Anzahl)
- KFW-Programm (Förderprogramm der KfW-Bank)
- Kredit-1: Kredithöhe, Kreditzins, Tilgung im 1. Jahr
- Kredit-2: Kredithöhe, Kreditzins, Tilgung im 1. Jahr

**Stellplatz / Parkplatz:**
- Kaufpreis Stellplatz
- Park-Möglichkeit (ja/nein, Art)
- Stellplatz: Hausgeld, umlagefähig, nicht umlagefähig
- Stellplatz: Miete, Erhaltungsrücklage

**Energie:**
- Energieeffizienzklasse (A+ bis H)
- Energieausweistyp (Bedarfsausweis / Verbrauchsausweis)
- Energieverbrauch (kWh/m²/Jahr)
- Heizungsart (Gas, Fernwärme, Wärmepumpe, etc.)

**Steuer & Abschreibung:**
- Abschreibungssatz (% pro Jahr, z.B. 2%, 3%, 3,5%)
- Degressive Abschreibung (ja/nein)
- 7b-Felder (spezielle Abschreibungsregelungen)
- Sanierungsjahr

**Kaufnebenkosten:**
- Grunderwerbsteuer %
- Grundbucheintragung %
- Notar-/Rechtsanwaltskosten %
- Erhaltungsaufwand

**Sonstige Felder:**
- Balkon / Terrasse / Garten (ja/nein, welche)
- Etage (Stockwerk)
- Kontingent (Verfügbare Einheiten für bestimmte Partner)
- Tags (Schlagwörter zur Kategorisierung)
- Apartment-Typ
- Umsatzsteuer (ja/nein)
- Betriebskostenvorauszahlung
- Marktdaten (Marktvergleichswerte)

**Konzept-Tabs:**
- WEG (Wohnungseigentümergemeinschaft)
- SEV (Sondereigentumsverwaltung)
- Mietpool
- Betreiber

**Details pro Konzept:**
- Kaltmiete, Nebenkosten (Mieter), Hausgeld, Verwaltungskosten
- Extras, Factsheet (automatisch generierbar)

**Schnellzugriff:**
- Dokumente, Karte, Umgebung, Drucken
- Anfragen-Button, Favorit (Herz), Teilen
- "Zum Vergleich hinzufügen"

**Berateransicht (für Vertriebspartner):**
- Storyline (Verkaufsargumente)
- Verkaufsstatus
- Kaufpreisliste (alle Einheiten)
- Provision (netto) — NUR in der Vertriebspartner-Ansicht
- Anbieter-Informationen
- Neue Kalkulation erstellen
- Einheiten-Auswahl (z.B. verschiedene Wohnungen im gleichen Gebäude)

**Kennzahlen auf der Objektseite (vom Admin ein-/ausschaltbar, 3 Stufen: sofort anzeigen / Expertenansicht / ausblenden):**
- Kaufpreis/m²
- Kaltmiete
- Bruttorendite
- Nettorendite
- Netto-Cashflow
- Netto-Cashflow nach Steuer
- Netto-Cashflow nach Steuer (Monat 13–24)
- Steuerersparnis gesamt (im Betrachtungszeitraum)
- Gewinn nach Steuer gesamt
- Kreditrate pro Monat
- Tilgung pro Monat
- Zinsen pro Monat
- Hausgeld + IH-Rücklage pro Monat
- Verwaltungskosten pro Monat
- Steuervorteil pro Monat
- Gesamtkapital-Verzinsung (Haltedauer 10 Jahre)
- Eigenkapital-Verzinsung (Haltedauer 10 Jahre)
- Eigenkapital-Verzinsung nach Steuer (Haltedauer 10 Jahre)
- Netto-Cashflow (erstes volles Wirtschaftsjahr)
- Netto-Cashflow nach Steuer (erstes volles Wirtschaftsjahr)
- Tilgung / Zinsen / Hausgeld / Verwaltungskosten / Steuervorteil (jeweils erstes volles Wirtschaftsjahr)

**Kennzahlen in der Objektübersicht (vom Admin ein-/ausblendbar):**
- Größe (m²)
- Kaufpreis (/m²)
- Kaltmiete (€)
- Bruttorendite (%)
- Bauzustand
- Anlageklasse
- Anbieter

### 3.3 Finanzanalyse / Renditerechner
Das Herzstück von Investagon — eine ausführliche Renditeberechnung pro Objekt:

**Tab "Diagramme":**
- Vermögensentwicklung (kumuliert) über 10 Jahre als Balkendiagramm
- Zeigt: Erwarteter Gesamtertrag, Erwartete Wertsteigerung, Netto-Cashflow nach Steuer, Tilgung
- Eigenkapital-Aufbau: Kreditsumme vs. Eigenkapital vs. Wertentwicklung

**Tab "Kalkulationen":**
- Zahlungsflüsse bei Haltedauer 10 Jahre (Tabelle)
- OBJEKTKAUF: Kaufpreis, Kaufnebenkosten, Investment Cashflow
- EINNAHMEN: Vermietbare Monate, Warmmiete, Nebenkostenvorauszahlung, Miete, Summe Einnahmen
- AUSGABEN: Hausgeld + IH-Rücklage, davon umlagefähig, Verwaltungskosten, Summe Ausgaben
- OPERATIVER CASHFLOW (was nach allen Kosten übrig bleibt)
- FINANZIERUNG: Kreditsumme, Zinsen & Tilgung (aufgeteilt in Zinsen und Tilgungen)
- ERTRAG/AUFWAND: Netto-Cashflow
- STEUERLICHE AUSWIRKUNGEN: Netto-Cashflow + Tilgung - Abschreibung Gebäude = Ergebnis vor Steuer
- Steuerersparnis/Steuerbelastung (Grenzsteuer)
- NETTO-CASHFLOW NACH STEUER (das Endergebnis)
- "Erweiterte Berechnung" für noch mehr Details

**Tab "Annahmen" (einstellbare Werte):**
- Wertsteigerung pro Jahr (z.B. 2,00%)
- Mietsteigerung pro Jahr (z.B. 2,50%)
- Grenzsteuerbelastung (z.B. 42,00%)
- Kaufnebenkosten: Grunderwerbsteuer, Grundbucheintragung, Notar-/Rechtsanwaltskosten
- Kaufpreisaufteilung: Grundanteil vs. Gebäudeanteil (wichtig für AfA/Abschreibung)

**Interaktive Schieberegler (rechte Seite):**
- Eigenkapital (0–100%)
- Kredithöhe
- Kreditzins (z.B. 4,40%)
- Tilgung im 1. Jahr (z.B. 1,30%)
- Verkaufszeitpunkt in Jahren (z.B. 10 Jahre)
- Experten-Ansicht (zeigt mehr Details)

**Kennzahlen-Zusammenfassung:**
- Kaufpreis/m²
- Kaltmiete (€/m²)
- Bruttorendite (%)
- Netto-Cashflow pro Monat (ersten 12 Monate)
- Netto-Cashflow nach Steuer pro Monat
- Gesamtgewinn nach Steuer im Betrachtungszeitraum

### 3.4 Reservierungen (Verkaufs-Pipeline für Objekte)
- Pipeline: Anfragen → Reservierungen → Notarvorbereitung → Notartermin → Verkauft → Abgebrochen
- Tabelle mit: ID, Status, Vermittler, Berater, Käufer, Projekt, Kaufpreis, Erstellungsdatum, Notardatum
- Suchfunktion

### 3.5 Verwaltung

**Meine Organisation:**
- Einstellungen: Name, Logo, Farben (Haupt- und Zweitfarbe), Provisionsaufteilung (Level 1 und Level 2), Transaktionsgebühr
- Optionen: Factsheet automatisch erstellen (ja/nein), Preisänderungswarnung, Projektübersicht zeigen/verstecken, Angefragte Einheiten als "Frei" anzeigen
- Rechnungsdaten: Firmenname, Adresse, UST-ID, Bevollmächtigter, Telefon, E-Mail, IBAN, BIC, Steuernummer
- Separate E-Mail-Adressen möglich für: Rechnungen und Reservierungsmanagement

**Benutzeraccounts (Benutzerverwaltung):**
- Benutzer-Gruppen / Rollen:
  - Manager (Benutzer & Objekte) — voller Zugriff
  - Objektadmin — kann Objekte verwalten
  - Vertriebsleiter — kann Team sehen und steuern
  - Untervertriebsleiter — kann eigene Unter-Partner verwalten
  - Untervertrieb — normaler Partner
  - Kunde — eingeschränkte Sicht (keine Provisionen)
- Benutzer anlegen: Anrede, Titel, Vorname, Nachname, Telefon, E-Mail
- Provision pro Benutzer: relativ (z.B. 90% der Gesamtprovision) ODER fix (z.B. 9% fest)
- Objekt-Zuteilung: Welcher Partner darf welche Projekte und Einheiten sehen?
  - Projekt & Kontingent (nur bestimmte Einheiten)
  - Alle Objekte
  - Teilungsgruppe
- Benutzer per E-Mail einladen oder ohne Einladung anlegen
- Provisionsliste über alle Projekte hinweg

**Standardwerte (Organisations-Standardwerte):**
Der Admin kann Standardwerte festlegen, die automatisch bei neuen Berechnungen vorausgefüllt werden:
- Kaufnebenkosten: Grundbucheintragung (z.B. 0,5%), Notar (z.B. 1,5%)
- Abschreibung: Grundanteil %, Möbel (Jahre), Außenanlagen (Jahre), sofort abschreibbar
- Eigene Instandhaltungsrücklage (pro m²/Monat)
- Steuer: Persönlicher Grenzsteuersatz (z.B. 42%)
- Eigenkapitalanteil (z.B. 0%)
- Kredit-1: Zins, Tilgung, Grundschuld, Einmalkreditkosten, Tilgungszuschuss, tilgungsfreie Zeit, Zinsbindung
- Kredit-2: Zins, Tilgung, Grundschuld, Einmalkreditkosten, Tilgungszuschuss, tilgungsfreie Zeit, Zinsbindung
- KfW: Kredithöhe, Zins, Tilgung, Grundschuld, Einmalkreditkosten, Tilgungszuschuss, tilgungsfreie Zeit, Zinsbindung
- Erwartungswerte: Wertsteigerung (%), Mietsteigerung (%), Leerstandsrate (%), Ausgabensteigerung (%)
- Verkaufszeitpunkt (Jahre)
- Denkmal-Abschreibung: Jahr 1–8 (z.B. 9%) und Jahr 9–12 (z.B. 7%)
- MABV-Phasen (7 Zahlungsstufen beim Neubau mit % und Monaten)

**Mein Netzwerk:**
- Übersicht aller verbundenen Organisationen und Partner
- Projekte teilen und empfangen
- Regeln für Immoframe (einbettbare Objekt-Ansicht für externe Websites)

**Objektdaten:**
- Projekte verwalten (Projekte anlegen, bearbeiten, Einheiten zuordnen)
- Immoframe (einbettbares Widget für Immobilien auf externen Websites)
- Anbieter-Rechnungsadressen verwalten

**Dokumente:**
- Anbieter-Dokumente (Unterlagen vom Bauträger)
- Organisations-Dokumente (eigene Unterlagen hochladen)

**Add-Ons:**
- Analytics (Auswertungen): Ansichten pro Tag/Woche als Diagramm, filterbar nach Projekten, Objekten, Anbietern, Benutzern und Organisation, mit Zeitraum-Auswahl
- Suchagentanalyse (Welche Suchkriterien nutzen die Nutzer?)
- Change-Log (Protokoll aller Änderungen an Objekten)

**Chat:**
- Internes Nachrichtensystem zwischen Nutzern der Organisation

### 3.6 Wissen & Connect

**Wissen — Tutorials:**
- Video-Anleitungen mit Suche und Sortierung
- Themen u.a.: Willkommen, Admin-Einstellungen, Vertriebsaccount anlegen, Kontingent erstellen, Kundenaccount anlegen, Projekte anlegen, Portfolio, Netzwerk aufbauen, Objekte teilen, Reservierungsprozess, Abwicklungsdokumente, Vergleichsfunktion, Immoframe, Suchagentenanalyse, PartnerHub, Analytics, Marktdaten, Open-API
- Die Wissensdatenbank und Tutorials werden im neuen System LEER angelegt — Inhalte werden manuell hinzugefügt
- Es muss eine einfache Funktion geben, um neue Artikel und Videos hinzuzufügen

**Wissen — Updates:**
- Benachrichtigungs-Feed: Wer hat was getan? (Neue Reservierungen, Dokumenten-Uploads, Projekt-Updates, geteilte Projekte)
- Filter: Nur eigene Updates, Ungelesen, Alle als gelesen markieren

**Connect:**
- Netzwerk-Funktion, um sich mit anderen Organisationen zu verbinden
- Verifizierung per Personalausweis und Gewerbeerlaubnis (Dokument-Upload)

---

## 4. Was kommt ZUSÄTZLICH NEU dazu?

Über die bestehenden Funktionen hinaus kommen diese Erweiterungen:

### 4.1 Erweiterte Pipeline (dein Wunsch)
Die Pipeline wird erweitert auf:

| Stufe | Was passiert hier? |
|---|---|
| **1. Neuer Lead** | Jemand hat Interesse gezeigt |
| **2. Nicht erreicht** | Kontaktversuch, aber nicht erreicht |
| **3. Erstgespräch** | Erster Termin |
| **4. Zweitgespräch** | Vertiefendes Gespräch, Objektvorstellung |
| **5. Abschlussgespräch** | Kaufentscheidung steht an |
| **6. Finanzierungsvorbereitung** | Unterlagen, Finanzierung läuft |
| **7. Notarvorbereitung** | Kaufvertrag wird vorbereitet |
| **8. Notartermin** | Termin beim Notar |
| **9. Verkauft** | Immobilie ist verkauft |
| **10. After Sales** | Bestandskundenbetreuung |

### 4.2 Hierarchische Partnerverwaltung
- Admin kann Vertriebspartner anlegen
- Vertriebspartner können eigene Unter-Partner einladen
- Jeder sieht nur seine eigenen Daten
- Mehrstufige Baumstruktur

---

## 5. Womit wird das gebaut? (Technologie)

| Was | Werkzeug | Warum |
|---|---|---|
| **Die Website** | Next.js | Moderner Baukasten für schnelle Websites, wird von großen Firmen genutzt |
| **Die Handy-App** | React Native | EINE App für iPhone UND Android gleichzeitig |
| **Die Datenbank** | Supabase (PostgreSQL) | Der "Aktenschrank" — speichert alles sicher, mit Benutzer-Anmeldung und Dateispeicherung |
| **Die Videos** | Mux oder Bunny.net | Zum Abspielen der Schulungsvideos |
| **Die Diagramme** | Recharts | Für die Rendite-Diagramme und Vermögensentwicklung |
| **Das Hosting** | Vercel + Supabase | Server in Europa, DSGVO-konform |

**Laufende Kosten (Technik):**

| Was | Kosten pro Monat |
|---|---|
| Website-Hosting | 0–20 € |
| Datenbank + Speicher | 0–25 € |
| Video-Streaming | 10–50 € |
| Domain | ca. 1–2 € |
| Apple App Store | ca. 8 € (99 €/Jahr) |
| Google Play Store | einmalig 25 € |
| **Gesamt am Anfang** | **ca. 20–100 €/Monat** |

---

## 6. Der Bauplan — In 3 Phasen

### Phase 1 — Kern-CRM + Vertriebsimmo-Features (ca. 10–12 Wochen)

**Ziel:** Das bestehende Vertriebsimmo-Portal 1:1 nachgebaut + erweiterte Pipeline + Partnerverwaltung

- Login und Benutzerverwaltung (Admin + Partner + Unter-Partner)
- Dashboard mit Ansprechpartnern und Tools
- CRM & Pipeline als Kanban-Board (alle 10 Stufen, Drag & Drop)
- Kundenanlage mit allen Feldern + CSV-Import
- Kundendetails mit Verlauf und Notizen
- Bonitätsrechner (Schnelle Einschätzung + Erweiterte Analyse)
- Finanzierungsservice mit eigener Pipeline
- Dateien & Vorlagen Bibliothek
- Provisionen-Tracker mit Monatsziel
- Empfehlungen/Partner werben
- After Sales Bereich
- E-Mail-Benachrichtigungen (jeder Nutzer kann selbst einstellen, welche Aktionen per E-Mail gemeldet werden)
- Responsive Design (funktioniert auch am Handy im Browser)

### Phase 2 — Immobilienportal + Renditerechner (ca. 10–14 Wochen)

**Ziel:** Investagon wird komplett ersetzt — alles im eigenen System im VertriebsImmo-Design

- Immobilien-Übersicht mit Filtern, Karte, Sortierung
- Objekt-Detailseite mit allen Datenfeldern (siehe Abschnitt 3.2 — über 60 Felder)
- Admin-Feld-Steuerung: Schalter (an/aus) für jedes Datenfeld pro Objekt
- Kennzahlen mit 3 Sichtbarkeitsstufen (sofort / Experte / ausgeblendet)
- Zwei Ansichtsmodi: Vertriebspartner-Ansicht und Kunden-Ansicht (ohne Provision)
- Berateransicht (Storyline, Verkaufsstatus, Provision, Kaufpreisliste)
- Einheiten-Verwaltung (mehrere Wohnungen pro Gebäude)
- Manuelles Anlegen neuer Objekte durch Admin (kein Import aus Investagon)
- Finanzanalyse / Renditerechner mit Diagrammen
- Kalkulationstabelle (Zahlungsflüsse über 10 Jahre)
- Annahmen-Einstellungen (Wertsteigerung, Mietsteigerung, Steuer, etc.)
- Organisations-Standardwerte (Admin legt Standardwerte für Berechnungen fest)
- Interaktive Schieberegler (Eigenkapital, Kreditzins, Tilgung, Verkaufszeitpunkt)
- Reservierungs-Pipeline (Anfragen → Reserviert → Notarvorbereitung → Notartermin → Verkauft)
- Favoriten und Vergleichsfunktion
- Suchagent (Benachrichtigung bei passenden Objekten)
- PDF-Exposé / Factsheet erstellen
- Kunden-Objekt-Matching
- Verwaltung: Organisationseinstellungen, Benutzerverwaltung (6 Rollen), Netzwerk, Dokumente
- Analytics (Auswertungen nach Projekten, Objekten, Benutzern)
- Wissensdatenbank (leer angelegt, manuelles Hinzufügen von Artikeln/Videos)
- Videokurse mit Lernfortschritt
- Vertriebs-Score Quiz
- Chat (internes Nachrichtensystem)
- Updates-Feed (Benachrichtigungen über Aktivitäten)

### Phase 3 — Handy-App + Extras (ca. 8–12 Wochen)

**Ziel:** Die App steht im App Store + letzte Verfeinerungen

- App für iPhone und Android (Pipeline, Kunden, Bonitätsrechner, Immobilien)
- Push-Benachrichtigungen
- Kalender-Integration (Google Kalender, Outlook)
- Automatische Erinnerungen
- Shop-Bereich
- Social Links
- Onboarding für neue Partner
- Schnittstellen zu externen Systemen

---

## 7. Geklärte Fragen & Entscheidungen

1. **Pipeline-Stufen:** Die Stufen werden sinnvoll benannt (siehe 4.1). Endgültige Benennung wird später festgelegt.

2. **Wer sieht was?** Zwei Ansichtsmodi: Vertriebspartner-Ansicht (alles sichtbar) und Kunden-Ansicht (identisch, aber OHNE Provisionsfeld). Der Admin steuert per Schalter, welche Felder pro Objekt sichtbar sind.

3. **Wissensdatenbank-Inhalte:** Werden NICHT aus Investagon übernommen. Die Wissensdatenbank wird leer angelegt und Inhalte werden manuell hinzugefügt. Es muss eine einfache "Neuen Artikel/Video hinzufügen"-Funktion geben.

4. **Investagon-Daten / Objekte:** Werden NICHT aus Investagon importiert. Objekte werden manuell im neuen System angelegt. Es muss eine einfache "Neues Objekt anlegen"-Funktion geben, bei der der Admin alle Felder ausfüllen kann.

5. **Domain:** app.vertriebsimmo.de

## 8. Weitere geklärte Fragen

6. **Videokurse:** Videos werden noch gedreht. Der Admin braucht eine Upload-Funktion, um Videos und Kurse ins System hochzuladen.

7. **Finanzierungsservice-Partner:** Werden manuell vom Admin angelegt (kein automatischer Import). Pro Ansprechpartner: Vorname, Nachname, E-Mail, Telefon, Foto, Link zur Webseite.

8. **E-Mail-Benachrichtigungen:** Jeder Vertriebspartner kann selbst einstellen, bei welchen Aktionen er per E-Mail benachrichtigt werden möchte (z.B. neue Objekte, neuer Vertriebspartner hat Account erstellt, Reservierungen, etc.). Es gibt eine Einstellungsseite, wo man die Benachrichtigungen an/aus schalten kann.

## 9. Noch offene Fragen

1. **Branding-Details:** Genaue Hex-Farbcodes für das Design, Schriftarten, Logo-Dateien?

---

## 10. Wie geht's weiter?

**Phase 1 startet jetzt!** Wir beginnen mit dem Kern-CRM und den Vertriebsimmo-Features.
