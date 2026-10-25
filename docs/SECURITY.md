# Security notes

- Renderer uses context isolation, sandboxing, and disabled Node integration.
- The renderer can request only the exposed project-generation IPC action.
- Output is written only under a user-selected parent folder.
- Existing project directories are rejected; generated files use exclusive creation.
- Future AI API keys must not be hard-coded or committed; use protected local secret storage.
- Publishing or destructive actions require explicit user confirmation.
- Review and test generated Luau in a private Roblox Studio place before publishing.
