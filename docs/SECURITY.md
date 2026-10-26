# Security

The authoritative security checklist is maintained in the root-level SECURITY.md. This file remains as a pointer for old links.

Key rules: keep the Anthropic API key server-side, use HTTPS and persistent storage in production, review generated Luau, and leave the plugin's run_code permission disabled unless the user explicitly enables it for a trusted place.
