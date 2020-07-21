# Change Log

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning][].

## 0.14.0 - 2018-09-04

### Adds
- Match rule for the `async` keyword, part of async and await syntax.
- Match rule for `existential` declarations, part of named existential types.
- Match rule for reserved `try` expressions.

### Changes
- Match termination for unusual `impl` positions to avoid bad match contexts
  spilling into subsequent lines.

### Fixes
- Matching of `dyn` traits in several positions.
- Matching of `self` and `super` in `use` statements.

## 0.13.0 - 2018-08-21

First extension release.

[Semantic Versioning]: http://semver.org/
