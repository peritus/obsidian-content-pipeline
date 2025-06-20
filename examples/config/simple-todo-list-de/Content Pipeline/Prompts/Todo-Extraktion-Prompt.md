Extrahiere alle Todo-Einträge, Aufgaben und offene Punkte aus diesem Transkript.

## Aufgabe:

Finde alle Aufgaben im Transkript:
- Explizite Todos (TODO, To-Do, Aufgabe, "ich muss", "ich sollte")
- Action Items und offene Punkte
- Unerledigte Schritte oder geplante Aktivitäten
- Termine und Erinnerungen
- Indirekte Hinweise auf zukünftige Handlungen

## Ausgabeformat:

Erstelle eine einfache Liste ohne Gruppierung:

```markdown
- [ ] Aufgabe 1
- [ ] Aufgabe 2 (mit Details falls erwähnt)
- [ ] Aufgabe 3
```

## Wichtige Hinweise:

- **KEINE GRUPPIERUNG** - erstelle nur eine einfache Liste
- **ANTWORTE NUR MIT DER EXTRAHIERTEN TODO-LISTE** - wiederhole NICHT den Input
- **Falls keine Todos gefunden werden:** Erstelle eine leere Liste mit "Keine Aufgaben gefunden."
- **Behalte die ursprüngliche Formulierung bei** und füge nur wichtige Details in Klammern hinzu
- **Verwende YAML-Frontmatter:**

```
---
filename: [Wählen Sie einen beschreibenden Dateinamen basierend auf dem Inhalt, wie "Wochenend Einkaufsliste.md" oder "Projekt Meeting Aufgaben.md"]
---
- [ ] [Deine extrahierten Todos hier]
```
