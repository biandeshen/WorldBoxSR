# GitHub development platform

WorldBoxSR uses GitHub as more than source control. Each GitHub capability has one narrow job so that development stays reproducible without turning repository infrastructure into a second product.

## Capability roles

| Capability | WorldBoxSR role | Use it when |
| --- | --- | --- |
| Git branches + pull requests | Isolated change/review unit | Every scoped feature, fix, experiment or infrastructure change |
| Pull-request CI | Authoritative automated correctness gate | Before merge; runs the deterministic test suite and smoke simulation |
| GitHub Codespaces | Private visual/manual development environment | Run the browser client, inspect the world, interact with god tools, edit and refresh without local setup |
| Simulation Console workflow | Private ad-hoc deterministic execution | Run a chosen seed/horizon/map from the GitHub UI and preserve the JSON evidence |
| Actions artifacts | Durable run evidence | Keep generated simulation output attached to the exact workflow run/commit |
| Releases/tags | Version checkpoints | Publish bounded versions after their release gate passes |

## Visual loop: Codespaces

Open the repository with the `Open in GitHub Codespaces` badge in the README. The dev container uses Node 22, starts `npm run dev`, forwards port 8080 and opens the browser preview. Forwarded ports are private by default.

Use Codespaces for questions that require eyes or interaction: whether the world is legible, whether an inspector is useful, whether a god tool feels correct, or whether a visual change is worth keeping.

## Deterministic online run: Simulation Console

Open **Actions → simulation-console → Run workflow** and provide:

- seed;
- years;
- founder population;
- width;
- height.

The workflow runs the existing `tools/simulate.js` CLI, not a separate simulation implementation. It performs the normal smoke check first, writes the main outcome metrics to the Actions job summary, and uploads the complete JSON result as a 30-day workflow artifact.

Artifacts from this private repository remain behind repository read access. The run page ties the evidence to the exact commit that produced it.

## Correctness gate: pull-request CI

The existing `ci` workflow remains authoritative for merge safety. A successful manual Simulation Console run does not replace the test suite, and a visually convincing Codespaces session does not override a failing deterministic regression.

The normal loop is therefore:

1. issue / sprint;
2. branch;
3. implementation;
4. pull-request CI;
5. Codespaces visual inspection when the change is visual or interactive;
6. Simulation Console or a scoped research workflow when extra deterministic evidence is useful;
7. merge;
8. version/release checkpoint when the bounded release gate is complete.

## GitHub Pages policy

Do **not** enable GitHub Pages for this repository while it is a private repository owned by a personal account unless public exposure is explicitly intended.

GitHub can build Pages from a private repository on eligible paid plans, but the resulting site is normally public on the internet. Private Pages access control is an Enterprise Cloud organization feature. Codespaces is therefore the private online-preview mechanism for the current project.

If the project is intentionally made public later, Pages becomes a good fit for a stable versioned browser demo. That is a publication decision, not a development prerequisite.
