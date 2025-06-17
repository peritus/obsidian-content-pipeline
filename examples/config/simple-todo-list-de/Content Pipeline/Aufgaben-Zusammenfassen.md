# Todo-Konsolidierung aus Dokumenten

Durchsuche die bereitgestellten Dokumente nach allen Todo-Einträgen, Aufgaben und offenen Punkten. Erstelle daraus eine konsolidierte Liste im Markdown-Format.

**WICHTIG: Falls bereits eine Todo-Liste vorhanden ist, füge neue Todos zu dieser Liste hinzu und entferne Duplikate.**

## Aufgaben:

1. **Prüfe bestehende Liste:** Falls bereits eine Todo-Liste vorhanden ist, verwende diese als Basis
2. **Identifiziere neue Todos:** Finde alle neuen Aufgaben im aktuellen Dokument:
   - Explizite Todos (TODO, To-Do, Aufgabe)
   - Action Items und offene Punkte
   - Unerledigte Schritte in Anleitungen
   - Geplante Aktivitäten und Termine

3. **Konsolidiere:** Füge neue Todos zur bestehenden Liste hinzu, entferne Duplikate
4. **Kategorisiere und organisiere:** Gruppiere ähnliche Aufgaben thematisch
5. **Formatiere als Markdown-Checkliste:**
   - Verwende das Format: `- [ ] Aufgabenbeschreibung`
   - Füge bei Bedarf Kategorien als Überschriften hinzu
   - Ergänze wichtige Details (Deadlines, Prioritäten, Verantwortliche)

6. **Priorisiere:** Ordne nach Wichtigkeit oder Dringlichkeit

## Ausgabeformat:

```markdown
## [Kategorie 1]

- [ ] Aufgabe 1 (Details/Deadline)
- [ ] Aufgabe 2

## [Kategorie 2]

- [ ] Aufgabe 3
- [ ] Aufgabe 4 (Verantwortlich: Name)

```

## Wichtige Hinweise:

- **ANTWORTE NUR MIT DER GENERIERTEN TODO-LISTE** - wiederhole NICHT den Input oder die Anweisungen
- **Falls keine Todos gefunden werden:** 
  - Wenn eine bestehende Liste vorhanden ist: Gib die bestehende Liste unverändert zurück
  - Wenn keine bestehende Liste vorhanden ist: Erstelle eine leere Todo-Liste mit dem Text "Keine Aufgaben gefunden."
- **Analysiere den Inhalt sorgfältig** - auch indirekte Hinweise auf Aufgaben oder Pläne sollten als Todos erfasst werden
- **Duplikate vermeiden:** Vergleiche neue Todos mit bestehenden und füge nur wirklich neue hinzu
- **Verwende YAML-Frontmatter** für die Antwort im Format:

```yaml
---
filename: Aufgaben-Liste.md
---
# Konsolidierte Todo-Liste

[Deine Todo-Liste hier - bestehende Todos beibehalten und neue hinzufügen]
```