# Steps to release Thorax

Replace `patch` with `major` or `minor` as needed.

## Setup

1. `npm install -g yo generator-release`
2. Clone `components/thorax` and `cdnjs/cdnjs`

## Release

1. Ensure git state is clean
2. `grunt thorax:build`
3. `yo release:notes patch`
4. Modify `CHANGELOG.md` as needed and commit
5. `yo release:release patch`
6. `npm publish`
7. `yo release:publish cdnjs thorax build/release`
8. `yo release:publish components thorax build/release`
