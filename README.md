# Design to Code

Local-first, multi-format design-to-code compiler.

The first architecture milestone focuses on a stable conversion kernel:

1. Detect a design source through an adapter.
2. Normalize it into versioned Design IR.
3. Analyze layout, tokens and reusable components.
4. Build a target-independent code generation plan.
5. Generate and validate framework-specific output.

OMLX is an optional intelligence provider. The core pipeline must remain fully usable without a model.

## Workspace

- `apps/cli`: local command-line entry point.
- `packages/contracts`: Design IR and code generation contracts.
- `packages/adapter-sdk`: input adapter interface.
- `packages/adapter-json`: IR JSON adapter used for debugging and tests.
- `packages/adapter-sketch`: Sketch ZIP and layer parser.
- `packages/core`: adapter registry and conversion orchestration.
- `packages/component-mapper`: validated design-to-code component mappings.
- `packages/codegen-sdk`: output generator interface.
- `packages/intelligence-sdk`: optional reasoning provider interface.
- `packages/repository-sdk`: database-neutral repository contracts.

## Commands

```bash
pnpm install
pnpm cli -- adapters
pnpm cli -- inspect examples/minimal.design.json
# Replace this with the path to a Sketch file when one is available.
pnpm cli -- inspect ./example.sketch
pnpm cli -- generate examples/minimal.design.json --output ./generated
pnpm check
```

## Storage boundary

Relational databases hold projects, jobs, status and artifact indexes. Design files, Design IR, assets, generated code and screenshots stay in the filesystem or object storage.
