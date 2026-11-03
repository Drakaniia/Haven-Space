# Haven Space — Documentation

Where things live:

| Folder       | What it holds                                                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `guides/`    | How to work on the project: `COMMIT_GUIDELINES`, `DESIGN` (visual language), `MANUAL` (operator walkthrough), `MODAL` (dialog anatomy).                                              |
| `specs/`     | One file per feature, grouped by domain. Each spec states a decision record: request, current state, decisions, behaviour, UI, tests. Start at [`specs/README.md`](specs/README.md). |
| `reference/` | Facts rather than decisions: `schema.md` (database), `google-oauth.md` (auth contract), `style-flatline-illustration.json` (illustration tokens).                                    |
| `qa/`        | QA method (`qa/specs/`) and run reports (`qa/reports/`).                                                                                                                             |
| `plans/`     | Dated, one-off migration plans. Historical — read for context, not as current truth.                                                                                                 |
| `assets/`    | Images referenced by these documents.                                                                                                                                                |

## Conventions

- A feature spec is named `<feature>-spec.md` and lives in the domain folder it touches. The `-spec`
  suffix means "decisions here are binding until a later spec amends them".
- Cross-references use the spec's bare name in backticks (`` `leave-now` §4.1 ``), never a file path, so
  moving a spec does not break citations.
- `AGENTS.md` (repo root) is the entry point for agents; it points back here.
