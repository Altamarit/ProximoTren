# Atos Blueprint — Proximo Metro

This project uses the Atos Blueprint for AI-Assisted Development.
All code must comply with Atos engineering standards.

## IMPORTANT: How to Access Resources in Copilot

Copilot does NOT support MCP resources directly. You MUST use the `get_resource` tool
to access any `atos://` content. This is the universal accessor.

### Project Context (live from Blueprint)
Call `get_resource({ uri: "atos://project/stories" })` to see all stories and sprints.
Call `get_resource({ uri: "atos://project/prd" })` for the current PRD.
Call `get_resource({ uri: "atos://project/architecture" })` for architecture decisions.
Call `get_resource({ uri: "atos://project/agents" })` for agent configurations.
Call `get_resource({ uri: "atos://project/best-practices" })` for quality criteria.

### Standards
Call `get_resource({ uri: "atos://standards/non-negotiables" })` before every task.
Call `get_resource({ uri: "atos://standards/code" })` for code standards.
Call `get_resource({ uri: "atos://tech/typescript" })` for tech-specific patterns.

## Dev Workflow
When the developer asks "what's next" or wants to start work:
1. Use `get_resource({ uri: "atos://project/stories" })` to find the next eligible story
2. Use `claim_story` tool to claim it
3. Read story details and architecture context to implement
4. When done, use `submit_code` tool with the implementation
5. Use `request_review` tool to trigger QA review
6. After review approval, use `update_story_status` tool to mark as done

## Available MCP Tools
- `get_resource` — Read any atos:// resource (REQUIRED for Copilot)
- `claim_story` — Claim a story to start implementation
- `submit_code` — Submit implementation for a story
- `request_review` — Request QA review for a story
- `update_story_status` — Move story through the workflow
- `validate_output` — Check documents against standards
- `scan_pii` — Detect PII in files or text
- `log_decision` — Record decisions to audit trail
- `log_tokens` — Track LLM token usage
- `log_workflow` — Log workflow events
- `get_agent_instructions` — Get full agent instructions by slug (REQUIRED before acting as any agent)

## Non-Negotiables (enforced by the platform)
1. EU Data Residency — all data stored and processed in EU
2. Full Audit Trail — every mutation logged, 12-month retention
3. Graceful Degradation — no hard failures on AI outage
4. Observability — traces, metrics, logs from day one
5. Multi-Tenant — architecture supports multi-tenancy