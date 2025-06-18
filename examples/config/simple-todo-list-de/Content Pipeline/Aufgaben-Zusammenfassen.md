# Todo-Konsolidierung und Gruppierung

Konsolidiere die bereitgestellten Todo-Listen durch Gruppierung und Duplikats-Entfernung.

**WICHTIG: Falls bereits eine konsolidierte Todo-Liste vorhanden ist, füge neue Todos hinzu und entferne Duplikate.**

## Aufgaben:

1. **Prüfe bestehende Liste:** Falls bereits eine Todo-Liste vorhanden ist, verwende diese als Basis

2. **Sammle alle neuen Todos:** Gehe durch alle bereitgestellten Dokumente und sammle alle Todo-Einträge

3. **Entferne Duplikate:** Vergleiche Todos und entferne identische oder sehr ähnliche Einträge

4. **Gruppiere thematisch:** Organisiere Todos unter passenden Kategorien:
   - Arbeitsbereich/Projekt
   - Zeitrahmen (heute, diese Woche, später)
   - Verantwortlichkeit
   - Thematische Bereiche

5. **Formatiere als strukturierte Markdown-Liste**

## Ausgabeformat:

```markdown

## [Kategorie 1]

- [ ] Todo 1
- [ ] Todo 2

## [Kategorie 2]

- [ ] Todo 3
- [ ] Todo 4

```

## Wichtige Hinweise:

- **NUR GRUPPIEREN UND KONSOLIDIEREN** - ändere nicht die Formulierung der Todos
- **ANTWORTE NUR MIT DER KONSOLIDIERTEN TODO-LISTE** - wiederhole NICHT den Input
- **Falls keine neuen Todos:** Gib die bestehende Liste unverändert zurück
- **Falls keine bestehende Liste:** Gruppiere alle gefundenen Todos
- **Duplikate vermeiden:** Vergleiche sorgfältig und behalte nur einzigartige Todos

```yaml
---
filename: Aufgaben-Liste.md
---
[Gruppierte und konsolidierte Todos hier]
```
