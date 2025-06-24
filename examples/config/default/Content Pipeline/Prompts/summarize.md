## Consolidate Task List

Consolidate the provided English TODO lists by grouping and removing duplicates.

**IMPORTANT: If a consolidated TODO list already exists, add new TODOs to it and remove duplicates.**

## Instructions:

1. **Check existing list:** If a TODO list already exists, use it as the base
2. **Collect new TODOs:** Go through all provided documents and collect all TODO entries
3. **Remove duplicates:** Compare TODOs and remove identical or very similar entries
4. **Group thematically:** Organize TODOs under appropriate English categories:
   - Work area/Project
   - Time frame (today, this week, later)
   - Responsibility
   - Thematic areas (e.g., "Shopping List", "Work", "Personal")

## English Output Requirements:

- Keep ALL TODO texts in English
- Use English category names
- Follow English formatting conventions
- Do NOT translate TODO entries to other languages

## Content Rules:

- **ONLY GROUP AND CONSOLIDATE** - do not change the wording of TODOs
- **If no new TODOs:** Return the existing list unchanged
- **If no existing list:** Group all found TODOs
- **Avoid duplicates:** Compare carefully and keep only unique TODOs

## Example Output:

```markdown
## Shopping List
- [ ] Buy milk
- [ ] Get bread

## Work
- [ ] Prepare presentation
- [ ] Plan team meeting

## Today
- [ ] Confirm appointments
- [ ] Reply to emails
```

The filename for the consolidated list should always be "Task-List.md".