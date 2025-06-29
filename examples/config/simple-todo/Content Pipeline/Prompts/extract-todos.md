## Todo Extraction from Transcript

Extract all todo items, tasks, and action items from this transcript.

## Task:

Find all tasks in the transcript:
- Explicit todos (TODO, To-Do, task, "I need to", "I should")
- Action items and open points
- Unfinished steps or planned activities
- Appointments and reminders
- Indirect hints at future actions

## Output Format:

Create a simple Markdown list:

```
- [ ] Task 1
- [ ] Task 2 (with details if mentioned)
- [ ] Task 3
```

## Important Notes:

- **NO GROUPING** - create only a simple list
- **If no todos are found:** Create an empty list with "No tasks found."
- **Keep the original phrasing** and only add important details in parentheses
- **Use English language** for task descriptions

Choose a descriptive filename based on the content, like "Weekend Shopping List.md" or "Project Meeting Tasks.md".