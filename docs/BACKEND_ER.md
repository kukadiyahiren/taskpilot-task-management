# Backend database — ER diagram

Generated from SQLAlchemy models in [`backend/app/models.py`](../backend/app/models.py).

## Diagram (Mermaid)

Paste into [Mermaid Live](https://mermaid.live) or any Markdown viewer that supports Mermaid (GitHub, many IDEs).

### Relationships only (compact)

```mermaid
erDiagram
    departments ||--o{ users : "belongs_to"
    users ||--o{ users : "manager"
    users ||--o{ password_reset_tokens : "has"
    users ||--o{ comments : "writes"
    users ||--o{ activity_logs : "performs"
    users }o--o{ tasks : "assigned"

    workspaces ||--o{ boards : "contains"
    workspaces ||--o{ meetings : "schedules"

    boards ||--o{ board_lists : "columns"
    boards ||--o{ labels : "defines"
    boards ||--o{ activity_logs : "logs"

    board_lists ||--o{ tasks : "contains"

    tasks ||--o{ comments : "has"
    tasks ||--o{ checklists : "has"
    tasks }o--o{ labels : "tagged"

    checklists ||--o{ checklist_items : "items"
```

### With key columns (detail)

```mermaid
erDiagram
    departments {
        int id PK
        string name
        string code UK
    }

    users {
        int id PK
        string email UK
        string name
        string role
        int department_id FK
        int manager_id FK
        json extra_permissions
    }

    password_reset_tokens {
        int id PK
        int user_id FK
        string token_hash
        datetime expires_at
    }

    workspaces {
        int id PK
        string name
    }

    boards {
        int id PK
        int workspace_id FK
        string name
    }

    board_lists {
        int id PK
        int board_id FK
        string name
        int position
    }

    tasks {
        int id PK
        int list_id FK
        string title
        string priority
        int position
    }

    labels {
        int id PK
        int board_id FK
        string name
        string color
    }

    comments {
        int id PK
        int task_id FK
        int user_id FK
        text body
    }

    checklists {
        int id PK
        int task_id FK
    }

    checklist_items {
        int id PK
        int checklist_id FK
        string title
        bool done
    }

    activity_logs {
        int id PK
        int board_id FK
        int user_id FK
        string action
    }

    meetings {
        int id PK
        int workspace_id FK
        string title
        datetime start_time
    }

    departments ||--o{ users : ""
    users ||--o{ users : "manager_id"
    users ||--o{ password_reset_tokens : ""
    workspaces ||--o{ boards : ""
    workspaces ||--o{ meetings : ""
    boards ||--o{ board_lists : ""
    boards ||--o{ labels : ""
    boards ||--o{ activity_logs : ""
    board_lists ||--o{ tasks : ""
    tasks ||--o{ comments : ""
    tasks ||--o{ checklists : ""
    users ||--o{ comments : ""
    users ||--o{ activity_logs : ""
    users }o--o{ tasks : "task_assignees"
    tasks }o--o{ labels : "task_labels"
    checklists ||--o{ checklist_items : ""
```

> **Note:** M:N links `task_assignees` (tasks ↔ users) and `task_labels` (tasks ↔ labels) are implied by `users }o--o{ tasks` and `tasks }o--o{ labels` in the compact diagram; junction tables are not drawn as separate entities here.

## Relationship summary

| From | To | Cardinality | Notes |
|------|-----|--------------|--------|
| `departments` | `users` | 1:N | Optional `department_id` on user |
| `users` | `users` | 1:N | `manager_id` → manager (org hierarchy) |
| `users` | `password_reset_tokens` | 1:N | Cascade delete |
| `workspaces` | `boards` | 1:N | |
| `workspaces` | `meetings` | 1:N | |
| `boards` | `board_lists` | 1:N | Kanban columns |
| `boards` | `labels` | 1:N | Unique `(board_id, name)` |
| `boards` | `activity_logs` | 1:N | |
| `board_lists` | `tasks` | 1:N | |
| `tasks` | `users` | N:M | Table `task_assignees` |
| `tasks` | `labels` | N:M | Table `task_labels` |
| `tasks` | `comments` | 1:N | |
| `tasks` | `checklists` | 1:N | |
| `checklists` | `checklist_items` | 1:N | |
| `users` | `comments` | 1:N | Author |
| `users` | `activity_logs` | 1:N | Actor |

## Enums (stored as string in DB)

- **`tasks.priority`**: `urgent`, `high`, `medium`, `low`
- **`meetings.status`**: `scheduled`, `live`, `ended`

---

*Regenerate this doc if `models.py` changes.*
