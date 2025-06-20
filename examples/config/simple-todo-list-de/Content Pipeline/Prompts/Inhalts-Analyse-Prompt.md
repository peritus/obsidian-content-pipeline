Inhaltsanalyse von Transkripten – Entscheidungslogik und Ausgabeformat:

Analysiere den Inhalt des folgenden Transkripts und entscheide über die geeignete Weiterverarbeitung.

---

## 🧠 Deine Aufgabe:

Lies das Transkript sorgfältig und bestimme, ob es sich um eine **Aufgabe/Todo** oder um eine **allgemeine Notiz/Information** handelt.

---

## ⚠️ WICHTIG: Frontmatter entfernen

Wenn das Transkript mit einem sogenannten **YAML Frontmatter-Block** beginnt (das ist ein Abschnitt am Anfang, der zwischen drei Bindestrichen `---` steht), dann gilt:

- **Entferne den gesamten Frontmatter-Block vollständig**, inklusive der öffnenden und schließenden `---`.
- Entferne auch alle **nachfolgenden Leerzeilen**, bis der eigentliche inhaltliche Text beginnt.
- Nur der **Inhalt nach dem Frontmatter** wird als das **"ursprüngliche Transkript"** betrachtet und verwendet.
- **Ignoriere den Inhalt des Frontmatters vollständig** – er darf **nicht** in die Analyse oder in die Ausgabe übernommen werden.

**Beispiel (zum Verständnis):**

```text
---
role: input
filename: 2025_06_19T07_42_23_02_00.md
---

Das ist eine neue Notiz zum Thema. Neues Feature wäre, wenn eine Zusammenfassungsdatei mehrere Quellen hat ...
```

→ **Verwende nur diesen Teil:**

```text
Das ist eine neue Notiz zum Thema. Neues Feature wäre, wenn eine Zusammenfassungsdatei mehrere Quellen hat ...
```

---

## 🧭 Entscheidungskriterien:

### ✅ Route zu `extract-todos`, wenn das Transkript enthält:
- **Explizite Aufgaben**: z. B. „ich muss“, „ich sollte“, „TODO“, „Aufgabe“, „erledigen“
- **Action Items**: Dinge, die getan werden müssen
- **Termine und Deadlines**: z. B. „bis morgen“, „nächste Woche erledigen“
- **Organisatorisches**: z. B. „planen“, „vorbereiten“, „strukturieren“
- **Einkaufslisten**: z. B. „Milch kaufen“, „etwas besorgen“
- **Erinnerungen**: z. B. „nicht vergessen zu...“, „daran denken...“

### ✅ Route zu `create-note`, wenn das Transkript enthält:
- **Allgemeine Informationen**: Fakten, Wissen, Erklärungen
- **Gedanken und Ideen**: Konzepte, Überlegungen, Inspiration
- **Beobachtungen und Erinnerungen**: Erlebnisse, Erfahrungen, Eindrücke
- **Reflexionen**: Persönliche Gedanken ohne Handlungsaufforderung
- **Dokumentation**: Beschreibungen von Zuständen oder Situationen

---

## 🔄 Falls Mischinhalt vorhanden ist:

- Wenn **Aufgaben und Notizen gemischt** vorkommen, dann **bevorzuge `extract-todos`**.
- Wenn **unsicher**, wähle **`create-note`** für sichere Dokumentation.

---

## 🧾 Ausgabeformat:

Deine Ausgabe soll exakt wie folgt aufgebaut sein:

```markdown
---
filename: [wähle einen beschreibenden deutschen Dateinamen basierend auf dem Inhalt]
nextStep: [extract-todos ODER create-note]
---
[HIER DAS KOMPLETTE URSPRÜNGLICHE TRANSKRIPT EINFÜGEN – OHNE FRONTMATTER, UNVERÄNDERT]
```

---

## 🔒 Absolute Regeln:

- ❌ **Verändere NIEMALS den Inhalt des Transkripts.**
- ✅ **Nutze ausschließlich den Text nach dem Frontmatter.**
- ✅ **Entferne Frontmatter immer vollständig – auch wenn es leer ist oder komisch aussieht.**
- ✅ **Gib IMMER eine der beiden Entscheidungen zurück:** `extract-todos` oder `create-note`
- ✅ **Halte dich strikt an das Format.**
