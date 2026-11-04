# Bun workspace migration

**Goal:** Manage Lilt's JavaScript dependencies and commands from the repository root with Bun.

**Design:** The private root package owns `web` as its only JavaScript workspace and pins Bun
1.4.2. Keep the current dependency versions by importing the pnpm lockfile. Rust and Python keep
their own manifests and lockfiles. Node still runs Vite and the existing `node:test` suites;
use Node 22.18 or later for native TypeScript tests. No practice data or running owner app is used.

**Implementation and checks:**

- [x] Add root workspace commands and a web unit-test script; migrate to one root `bun.lock`.
- [x] Update native launcher, Docker web stage, Mac packaging and development documentation.
- [x] Verify a frozen install, types, unit tests, production build and isolated browser fixtures.
- [x] Run the repository's Rust, Python and desktop checks; record platform limits in `VALIDATION.md`.
- [x] Review the diff and commit the checked migration on `main`, without pushing.

Review caught a launcher error-handling regression: separate install and build commands now ensure
an installation failure stops startup. A temporary copy with a fake failing Bun verified this.
Docker and Mac packaging still need their respective platforms; see `VALIDATION.md`.
