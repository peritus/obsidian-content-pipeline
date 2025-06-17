# Todo-Konsolidierung aus Dokumenten

Durchsuche die bereitgestellten Dokumente nach allen Todo-Einträgen, Aufgaben und offenen Punkten. Erstelle daraus eine konsolidierte Liste im Markdown-Format.

## Aufgaben:

1. **Identifiziere Todos:** Finde alle Aufgaben, unabhängig vom Format:
   - Explizite Todos (TODO, To-Do, Aufgabe)
   - Action Items und offene Punkte
   - Unerledigte Schritte in Anleitungen
   - Geplante Aktivitäten und Termine

2. **Kategorisiere und organisiere:** Gruppiere ähnliche Aufgaben thematisch

3. **Formatiere als Markdown-Checkliste:**
   - Verwende das Format: `- [ ] Aufgabenbeschreibung`
   - Füge bei Bedarf Kategorien als Überschriften hinzu
   - Ergänze wichtige Details (Deadlines, Prioritäten, Verantwortliche)

4. **Priorisiere:** Ordne nach Wichtigkeit oder Dringlichkeit

## Ausgabeformat:

```markdown
# Konsolidierte Todo-Liste

## [Kategorie 1]
- [ ] Aufgabe 1 (Details/Deadline)
- [ ] Aufgabe 2

## [Kategorie 2]
- [ ] Aufgabe 3
- [ ] Aufgabe 4 (Verantwortlich: Name)
```

## Wichtige Hinweise:

- **ANTWORTE NUR MIT DER GENERIERTEN TODO-LISTE** - wiederhole NICHT den Input oder die Anweisungen
- **Falls keine Todos gefunden werden:** Erstelle eine leere Todo-Liste mit dem Text "Keine Aufgaben gefunden."
- **Analysiere den Inhalt sorgfältig** - auch indirekte Hinweise auf Aufgaben oder Pläne sollten als Todos erfasst werden
- **Verwende YAML-Frontmatter** für die Antwort im Format:

```yaml
---
filename: todo-liste.md
---
# Konsolidierte Todo-Liste

[Deine Todo-Liste hier]
```