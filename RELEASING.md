# Releasing `@avar/reference-verifier`

This repository ships the independent AVAR reference verifier as:
1. A source tarball on the GitHub release
2. Standalone `avar` binaries (see **Release matrix** below)
3. A Homebrew formula update in [`Aarmatix/homebrew-tap`](https://github.com/Aarmatix/homebrew-tap) — supported on **macOS and Linux** (see support definition below)

## Release matrix

Release semantics are versioned. Once a release is cut, its asset list is
immutable — new platforms land in a new patch version, they do **not**
retroactively appear in a prior release.

| Version | macOS arm64 | macOS x64 | Linux arm64 | Linux x64 | Homebrew (macOS) | Homebrew (Linuxbrew) |
| ------- | ----------- | --------- | ----------- | --------- | ---------------- | -------------------- |
| v0.1.0  | ✅          | ✅        | —           | —         | ✅               | —                    |
| v0.1.1  | ✅          | ✅        | ✅          | ✅        | ✅               | ✅ (linux-arm64, linux-x64) |

Linux artifacts on v0.1.1 must pass the same gates as Darwin: native or
appropriately validated build, full conformance suite against the compiled
executable, stable CLI exit codes, no undeclared network access, versioned
tarballs, SHA256 entries in `SHA256SUMS`, individual build-provenance
attestations, and an updated `release-manifest.json`.

### Homebrew support contract

Homebrew is supported on macOS and Linux for the platforms listed in the
release matrix. Direct release downloads remain available for all supported
platforms.

To keep "supported" honest, we distinguish three states:

- **Available** — a platform tarball is published on the GitHub release.
- **Supported (Homebrew)** — the tap formula installs successfully in CI
  for that platform, `avar --version` matches the formula version, a valid
  RFC-0008 conformance vector exits `0`, an invalid vector exits `1`, and
  `brew test avar` passes. Linuxbrew support is gated on the
  [`linuxbrew-smoke`](https://github.com/Aarmatix/homebrew-tap/actions/workflows/linuxbrew-smoke.yml)
  workflow in `Aarmatix/homebrew-tap` staying green on both `linux-x64`
  and `linux-arm64`. A weekly cron re-validates so upstream Linuxbrew
  drift can't silently invalidate the claim.
- **Best effort / unsupported** — untested distributions (e.g. Alpine/musl)
  or architectures not in the matrix. Users may attempt direct download,
  but no CI backs it.

If `linuxbrew-smoke` goes red on either architecture, downgrade this row
to "direct download only" until the formula is fixed — don't leave the
formula's `on_linux` blocks claiming support the CI no longer proves.

## Release flow

- Tag a version: `git tag vX.Y.Z && git push --tags`
- The `release.yml` workflow runs gates G1–G8, publishes the release, and pushes an updated `avar.rb` PR to the Homebrew tap. The tap's `linuxbrew-smoke` workflow then re-validates the Linux blocks against the new release before merge.
- To rehearse without publishing, run the workflow with `workflow_dispatch` and `dry_run=true`.


## Secrets

### `HOMEBREW_TAP_PUSH_TOKEN`

Fine-grained GitHub PAT used by the `tap-pr` job to push the formula update to `Aarmatix/homebrew-tap`.

- **Scope:** `contents:write` and `pull_requests:write` on `Aarmatix/homebrew-tap`
- **Type:** Fine-grained PAT (never a classic broad-scope token)
- **Location:** Organization secret on the **`Aarmatix`** GitHub organization, accessible to `Aarmatix/avar`
- **Current expiry:** **2027-07-21**
- **Rotation reminder:** 2027-07-14 (one week before expiry)

This token was rotated from the previous `Aarmatix-dev` personal-account secret into the `Aarmatix` organization so that repository transfers and org ownership changes do not break the automated tap workflow.

Without this secret, the `tap-pr` job fails and the formula must be updated by hand (see [`Aarmatix/homebrew-tap#1`](https://github.com/Aarmatix/homebrew-tap/pull/1) for the manual template).

### Rotation procedure

1. Create a new fine-grained PAT under an `Aarmatix` org-admin account with the scope above and a 1-year expiry.
2. Update the `HOMEBREW_TAP_PUSH_TOKEN` organization secret in **Aarmatix organization settings → Secrets and variables → Actions**.
3. Trigger a `workflow_dispatch` dry-run on `Aarmatix/avar` to confirm the workflow still authenticates (the `tap-pr` job is skipped on dry-runs, but the rest of the pipeline exercises the runner env).
4. Verify token access with a manual test PR before the next release:
   ```bash
   GH_TOKEN=<new-token> gh repo view Aarmatix/homebrew-tap --json url
   GH_TOKEN=<new-token> gh pr list --repo Aarmatix/homebrew-tap --limit 1
   ```
5. Update the **Current expiry** and **Rotation reminder** dates in this file.
6. Revoke the old PAT.
