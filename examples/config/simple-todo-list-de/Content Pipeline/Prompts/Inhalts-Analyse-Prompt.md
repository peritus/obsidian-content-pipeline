## Inhaltsanalyse von Transkripten – Entscheidungslogik

Analysiere den Inhalt des folgenden Transkripts und entscheide über die geeignete Weiterverarbeitung.

## 🧠 Deine Aufgabe:

Lies das Transkript sorgfältig und bestimme, ob es sich um eine **Aufgabe/Todo** oder um eine **allgemeine Notiz/Information** handelt.

## ⚠️ WICHTIG: Frontmatter ignorieren

Falls das Transkript mit einem YAML Frontmatter-Block beginnt (zwischen drei Bindestrichen `---`):
- **Ignoriere den gesamten Frontmatter-Block vollständig**
- Verwende nur den **Inhalt nach dem Frontmatter** für die Analyse
- Der Frontmatter darf **nicht** in die Analyse oder Ausgabe übernommen werden

## 🧭 Entscheidungskriterien:

### ✅ Route zu `extract-todos`, wenn das Transkript enthält:
- **Explizite Aufgaben**: z. B. „ich muss", „ich sollte", „TODO", „Aufgabe", „erledigen"
- **Action Items**: Dinge, die getan werden müssen
- **Termine und Deadlines**: z. B. „bis morgen", „nächste Woche erledigen"
- **Organisatorisches**: z. B. „planen", „vorbereiten", „strukturieren"
- **Einkaufslisten**: z. B. „Milch kaufen", „etwas besorgen"
- **Erinnerungen**: z. B. „nicht vergessen zu...", „daran denken..."

### ✅ Route zu `create-note`, wenn das Transkript enthält:
- **Allgemeine Informationen**: Fakten, Wissen, Erklärungen
- **Gedanken und Ideen**: Konzepte, Überlegungen, Inspiration
- **Beobachtungen und Erinnerungen**: Erlebnisse, Erfahrungen, Eindrücke
- **Reflexionen**: Persönliche Gedanken ohne Handlungsaufforderung
- **Dokumentation**: Beschreibungen von Zuständen oder Situationen

## 🔄 Bei Mischinhalt:

- Wenn **Aufgaben und Notizen gemischt** vorkommen, dann **bevorzuge `extract-todos`**
- Wenn **unsicher**, wähle **`create-note`** für sichere Dokumentation

## 🔒 Absolute Regeln:

- ❌ **Verändere NIEMALS den Inhalt des Transkripts**
- ✅ **Nutze ausschließlich den Text nach dem Frontmatter**
- ✅ **Gib IMMER eine der beiden Entscheidungen zurück:** `extract-todos` oder `create-note`
- ✅ **Wähle einen beschreibenden deutschen Dateinamen basierend auf dem Inhalt**

Die Ausgabe enthält das vollständige ursprüngliche Transkript (ohne Frontmatter) sowie die Routing-Entscheidung und einen passenden Dateinamen.