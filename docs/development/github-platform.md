# GitHub development platform

WorldBoxSR uses GitHub as more than source control. Each GitHub capability has one narrow job so that development stays reproducible without turning repository infrastructure into a second product.

## Capability roles

| Capability | WorldBoxSR role | Use it when |
| --- | --- | --- |
| Git branches + pull requests | Isolated change/review unit | Every scoped feature, fix, experiment or infrastructure change |
| GitHub-hosted pull-request CI | Independent clean-room correctness gate | Before merge; deterministic tests, smoke simulation and Pages build check on fresh hosted Ubuntu |
| Self-hosted Actions runner | Reusable browser-heavy evidence environment | Chromium/Pages visual QA, touch/recovery/persistence evidence and other bounded long-running validation |
| GitHub Codespaces | Visual/manual development environment | Run the browser client, inspect the world, interact with god tools, edit and refresh without local setup |
| Simulation Console workflow | Ad-hoc deterministic execution | Run a chosen seed/horizon/map from the GitHub UI and preserve the JSON evidence |
| Actions artifacts | Durable run evidence | Keep generated simulation output attached to the exact workflow run/commit |
| GitHub Pages | Stable public playable demo | Let anyone open the current main-branch browser client without a development environment |
| Releases/tags | Version checkpoints | Publish bounded versions after their release gate passes |

## Self-hosted runner: reusable visual evidence environment

The project owner provides a repository self-hosted runner for browser-heavy validation. It is a **reusable execution environment**, not a replacement for GitHub-hosted CI.

The split is deliberate:

- `.github/workflows/ci.yml` stays on `ubuntu-latest` so core correctness is independently reproduced on a fresh GitHub-hosted machine;
- `.github/workflows/visual-qa.yml` uses `self-hosted` for production Vite builds plus real Chromium evidence;
- a green self-hosted visual run cannot override failing hosted CI, and a green hosted CI run cannot replace required browser evidence for player-visible changes.

### Runner environment contract

The self-hosted service account must be able to run:

- Node.js 22 or newer and npm;
- `bash` and `curl`;
- a system Google Chrome or Chromium capable of headless WebGL/CDP execution;
- local loopback Vite preview servers on the bounded QA ports used by repository scripts;
- writable GitHub workspace and `RUNNER_TEMP` directories.

`tools/self-hosted-runner-preflight.mjs` is the executable contract. It:

1. probes required commands with hard timeouts so environment discovery itself cannot lock the runner;
2. verifies the Node major version;
3. discovers Chrome/Chromium from `WORLDBOXSR_BROWSER`, common system paths or PATH;
4. exports the resolved browser to later Actions steps and installs a temporary `google-chrome-stable` shim so existing browser evidence scripts can share one browser resolution path;
5. prints runner identity, OS/architecture, tool versions, browser path/version and cache/workspace facts into the workflow log.

If preflight fails, fix the runner **once** rather than adding feature-specific install hacks to individual evidence scripts. `WORLDBOXSR_BROWSER` is the preferred explicit override when Chrome exists outside PATH.

### Reuse and cost rules

- Keep heavyweight browser dependencies/system Chrome installed on the runner between jobs.
- Reuse npm's normal machine cache; do not commit dependency caches or browser binaries into the repository.
- PR Visual QA uses workflow concurrency with `cancel-in-progress` so a single runner validates only the newest revision rather than burning time on stale commits.
- Evidence scripts may use current authoritative simulation and visible product controls, but must not inject the state they are supposed to prove.
- Do not silently broaden the self-hosted machine into a second production deployment environment; Pages remains the public product surface.

### Failure recovery

When a self-hosted Visual QA job fails:

1. distinguish product/test failure from runner preflight/environment failure;
2. if preflight fails, repair Node/bash/curl/Chrome or `WORLDBOXSR_BROWSER` on the runner and rerun the same bounded job;
3. if a browser evidence step fails after preflight, treat it as a product/evidence failure until logs prove otherwise;
4. if an old job is stuck from a superseded workflow that predates concurrency or probe timeouts, cancel that stale run once in GitHub Actions (or restart the runner service if the process itself is wedged); future runs are protected by the repository concurrency and timeout rules.

Do not move ordinary deterministic CI onto the self-hosted runner merely to make failures disappear. The two environments are intentionally complementary.

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

The existing `ci` workflow remains authoritative for merge safety. A successful manual Simulation Console run does not replace the test suite, and a visually convincing Codespaces or self-hosted browser session does not override a failing deterministic regression.

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
4. GitHub-hosted pull-request CI;
5. self-hosted browser Visual QA for player-visible/runtime changes;
6. Codespaces visual inspection when additional human/manual review is useful;
7. Simulation Console or a scoped research workflow when extra deterministic evidence is useful;
8. merge;
9. Pages updates automatically from `main` for the current public demo;
10. version/release checkpoint when the bounded release gate is complete.

## Publication boundary

Making the repository public exposes the repository code and project history to everyone and makes Actions history/logs public. Public visibility is therefore a deliberate publication boundary, not just a Pages switch.

Repository visibility and software licensing are separate decisions. A public repository without a license is publicly viewable but does not automatically grant an open-source reuse license. License selection must be made explicitly rather than inferred by infrastructure work.
