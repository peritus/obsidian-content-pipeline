## Content Analysis of Transcripts – Decision Logic

Analyze the content of the following transcript and decide on the appropriate processing route.

## 🧠 Your Task:

Read the transcript carefully and determine whether it contains **tasks/todos** or **general notes/information**.

## ⚠️ IMPORTANT: Ignore Frontmatter

If the transcript begins with a YAML frontmatter block (between three dashes `---`):
- **Completely ignore the entire frontmatter block**
- Use only the **content after the frontmatter** for analysis
- The frontmatter must **NOT** be included in the analysis or output

## 🧭 Decision Criteria:

### ✅ Route to `extract-todos` when the transcript contains:
- **Explicit tasks**: e.g., "I need to", "I should", "TODO", "task", "complete"
- **Action items**: Things that need to be done
- **Appointments and deadlines**: e.g., "by tomorrow", "finish next week"
- **Organizational items**: e.g., "plan", "prepare", "organize"
- **Shopping lists**: e.g., "buy milk", "get something"
- **Reminders**: e.g., "don't forget to...", "remember to..."

### ✅ Route to `create-note` when the transcript contains:
- **General information**: Facts, knowledge, explanations
- **Thoughts and ideas**: Concepts, reflections, inspiration
- **Observations and memories**: Experiences, impressions
- **Reflections**: Personal thoughts without action requirements
- **Documentation**: Descriptions of states or situations

## 🔄 For Mixed Content:

- When **tasks and notes are mixed**, **prefer `extract-todos`**
- When **uncertain**, choose **`create-note`** for safe documentation

## 🔒 Absolute Rules:

- ❌ **NEVER modify the content of the transcript**
- ✅ **Use exclusively the text after the frontmatter**
- ✅ **ALWAYS return one of the two decisions:** `extract-todos` or `create-note`
- ✅ **Choose a descriptive English filename based on the content**

The output contains the complete original transcript (without frontmatter) along with the routing decision and an appropriate filename.