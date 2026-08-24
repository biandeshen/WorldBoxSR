# GitHub development platform

WorldBoxSR uses GitHub as more than source control. Each GitHub capability has one narrow job so that development stays reproducible without turning repository infrastructure into a second product.

## Capability roles

| Capability | WorldBoxSR role | Use it when |
| --- | --- | --- |
| Git branches + pull requests | Isolated change/review unit | Every scoped feature, fix, experiment or infrastructure change |
| Pull-request CI | Authoritative automated correctness gate | Before merge; runs the deterministic test suite, smoke simulation and Pages build check |
| GitHub Codespaces | Visual/manual development environment | Run the browser client, inspect the world, interact with god tools, edit and refresh without local setup |
| Simulation Console workflow | Ad-hoc deterministic execution | Run a chosen seed/horizon/map from the GitHub UI and preserve the JSON evidence |
| Actions artifacts | Durable run evidence | Keep generated simulation output attached to the exact workflow run/commit |
| GitHub Pages | Stable public playable demo | Let anyone open the current main-branch browser client without a development environment |
| Releases/tags | Version checkpoints | Publish bounded versions after their release gate passes |

## Visual loop: Codespaces

Open the repository with the `Open in GitHub Codespaces` badge in the README. The dev container uses Node 22, starts `npm run dev`, forwards port 8080 and opens the browser preview. Codespaces remains the development environment even after the repository becomes public; its forwarded preview port does not need to be the public demo URL.

Use Codespaces for questions that require eyes or interaction before merge: whether the world is legible, whether an inspector is useful, whether a god tool feels correct, or whether a visual change is worth keeping.

## Deterministic online run: Simulation Console

Open **Actions → simulation-console → Run workflow** and provide:

- seed;
- years;
- founder population;
- width;
- height.

The workflow runs the existing `tools/simulate.js` CLI, not a separate simulation implementation. It performs the normal smoke check first, writes the main outcome metrics to the Actions job summary, and uploads the complete JSON result as a 30-day workflow artifact.

The run page ties the evidence to the exact commit that produced it. Once the repository is public, Actions history and evidence should be treated as public project material rather than a private storage channel.

## Correctness gate: pull-request CI

The existing `ci` workflow remains authoritative for merge safety. A successful manual Simulation Console run does not replace the test suite, and a visually convincing Codespaces session does not override a failing deterministic regression.

CI also runs `npm run pages:build`. This makes the browser-deployable artifact a tested property of every PR rather than something discovered only after merge.

## Public playable demo: GitHub Pages

The project owner has explicitly approved making WorldBoxSR public and using GitHub Pages as the stable playable demo.

The Pages workflow builds only the browser runtime (`client`, `engine`, and `content`) into `.pages`; it does not publish tests, research tooling or repository metadata as site files. The root `index.html` is adapted so the existing browser client works at the project-site path.

Deployment is intentionally gated on repository visibility. While the repository is still private, the Pages jobs skip rather than accidentally publishing a site from a private repository. After the repository is public, configure **Settings → Pages → Build and deployment → Source → GitHub Actions**, then run the `pages` workflow (or push to `main`).

Expected project URL:

`https://biandeshen.github.io/WorldBoxSR/`

The Pages site is a demo of `main`, not a replacement for versioned releases. Tags/releases remain the durable version checkpoints.

## Normal development loop

1. issue / sprint;
2. branch;
3. implementation;
4. pull-request CI;
5. Codespaces visual inspection when the change is visual or interactive;
6. Simulation Console or a scoped research workflow when extra deterministic evidence is useful;
7. merge;
8. Pages updates automatically from `main` for the current public demo;
9. version/release checkpoint when the bounded release gate is complete.

## Publication boundary

Making the repository public exposes the repository code and project history to everyone and makes Actions history/logs public. Public visibility is therefore a deliberate publication boundary, not just a Pages switch.

Repository visibility and software licensing are separate decisions. A public repository without a license is publicly viewable but does not automatically grant an open-source reuse license. License selection must be made explicitly rather than inferred by infrastructure work.
