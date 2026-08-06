<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Source of truth

- Product requirements: `docs/REQUIREMENTS.md`
- Delivery roadmap: `docs/ROADMAP.md`
- Database schema: `prisma/schema.prisma`
- Database client: `src/lib/prisma.ts`

## Agent rules

- Read the relevant source-of-truth files before making changes.
- Do not invent requirements or expand scope without explicit instruction.
- Implement only the requested milestone or task.
- Do not add dependencies unless they are necessary for the requested task.
- Prefer simple, maintainable solutions over premature abstractions.
- Preserve strict TypeScript typing.
- Use Server Components by default and Client Components only when browser interactivity is required.
- Do not expose environment variables or secrets to the client.
- Update `docs/ROADMAP.md` only for items that were actually completed.
- Run `npm run lint` and `npm run build` after implementation.
- Report files changed, decisions made, tests executed, and remaining limitations.