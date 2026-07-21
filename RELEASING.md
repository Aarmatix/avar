# Releasing `@avar/reference-verifier`

This repository ships the independent AVAR reference verifier as:
1. A source tarball on the GitHub release
2. Standalone `avar` binaries for macOS (arm64, x64)
3. A Homebrew formula update in [`Aarmatix/homebrew-tap`](https://github.com/Aarmatix/homebrew-tap)

## Release flow

- Tag a version: `git tag vX.Y.Z && git push --tags`
- The `release.yml` workflow runs gates G1–G8, publishes the release, and pushes an updated `avar.rb` PR to the Homebrew tap.
- To rehearse without publishing, run the workflow with `workflow_dispatch` and `dry_run=true`.

## Secrets

### `HOMEBREW_TAP_PUSH_TOKEN`

Fine-grained GitHub PAT used by the `tap-pr` job to push the formula update to `Aarmatix/homebrew-tap`.

- **Scope:** `contents:write` on `Aarmatix/homebrew-tap`
- **Type:** Fine-grained PAT (never a classic broad-scope token)
- **Current expiry:** **2027-07-21**
- **Rotation reminder:** 2027-07-14 (one week before expiry)

Without this secret, the `tap-pr` job fails and the formula must be updated by hand (see [`Aarmatix/homebrew-tap#1`](https://github.com/Aarmatix/homebrew-tap/pull/1) for the manual template).

### Rotation procedure

1. Create a new fine-grained PAT with the scope above and a 1-year expiry.
2. Update the `HOMEBREW_TAP_PUSH_TOKEN` secret in **Settings → Secrets and variables → Actions**.
3. Trigger a `workflow_dispatch` dry-run to confirm the workflow still authenticates (the `tap-pr` job is skipped on dry-runs, but the rest of the pipeline exercises the runner env).
4. Update the **Current expiry** and **Rotation reminder** dates in this file.
5. Revoke the old PAT.
