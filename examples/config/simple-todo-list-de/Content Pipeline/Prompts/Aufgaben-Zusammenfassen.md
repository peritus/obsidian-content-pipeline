⚠️ **CRITICAL FORMATTING REQUIREMENT - READ CAREFULLY** ⚠️

YOU MUST ALWAYS respond with this EXACT YAML frontmatter format:

```
---
filename: Aufgaben-Liste.md
---
[Your German content here]
```

**NO EXCEPTIONS. DO NOT respond with plain text. DO NOT omit the YAML frontmatter.**

## Response Format Verification Checklist:
Before submitting your response, verify:
- [ ] Does my response start with exactly "---"?
- [ ] Does it include exactly "filename: Aufgaben-Liste.md"?
- [ ] Does it have a closing "---" before content?
- [ ] Is the content in German?

If ANY answer is NO, rewrite your response.

## Task: TODO List Consolidation

Consolidate the provided German TODO lists by grouping and removing duplicates.

**IMPORTANT: If a consolidated TODO list already exists, add new TODOs and remove duplicates.**

## Instructions:

1. **Check existing list:** If a TODO list already exists, use it as the base
2. **Collect new TODOs:** Go through all provided documents and collect all TODO entries
3. **Remove duplicates:** Compare TODOs and remove identical or very similar entries
4. **Group thematically:** Organize TODOs under appropriate German categories:
   - Work area/Project (Arbeitsbereich/Projekt)
   - Timeframe (Zeitrahmen: heute, diese Woche, später)
   - Responsibility (Verantwortlichkeit)
   - Thematic areas (Thematische Bereiche)
5. **Format as structured German markdown list**

## German Output Requirements:

- Keep ALL TODO text in German
- Use German category names (e.g., "Einkaufsliste", "Arbeit", "Heute", "Diese Woche")
- Maintain German formatting conventions
- DO NOT translate TODO items to English

## Content Rules:

- **ONLY GROUP AND CONSOLIDATE** - do not change the wording of TODOs
- **RESPOND ONLY WITH THE CONSOLIDATED TODO LIST** - do NOT repeat the input
- **If no new TODOs:** Return the existing list unchanged
- **If no existing list:** Group all found TODOs
- **Avoid duplicates:** Compare carefully and keep only unique TODOs

## ❌ WRONG Response Format (NEVER do this):
```
## Einkaufsliste
- [ ] Kaufe Milch
```

## ✅ CORRECT Response Format (ALWAYS do this):
```
---
filename: Aufgaben-Liste.md
---
## Einkaufsliste
- [ ] Kaufe Milch
```

## MANDATORY RESPONSE STEPS:

**STEP 1:** Start with exactly "---"
**STEP 2:** Add exactly "filename: Aufgaben-Liste.md"  
**STEP 3:** Add exactly "---"
**STEP 4:** Add your German consolidated TODO content

## Final Reminder:

This is a technical formatting task requiring EXACT compliance. Your response MUST start with YAML frontmatter or the system will malfunction. The filename MUST be "Aufgaben-Liste.md" to ensure proper consolidation.

**Response format is CRITICAL for system functionality. Failure to follow the YAML format will break the entire pipeline.**