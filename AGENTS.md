# AGENTS.md

## Project Overview
- Project name: certbuddy.
- Stack:
  - Frontend: React + TanStack Router + TypeScript + shadcn/ui.
  - Backend: Python Flask API.
- Main folders:
  - `src/`: frontend routes, components, hooks, and lib services.
  - `backend/`: API controllers, engine, tasks, and helpers.
  - `shared/`: generated schema and shared typings.

## General Agent Guidelines
- Prefer minimal, focused changes that preserve existing behavior.
- Follow existing code style and patterns already used in the repository.
- Do not refactor unrelated areas when implementing a feature/fix.
- Keep public API contracts stable unless explicitly requested.
- Validate changes by checking for TypeScript/Python errors when possible.

## Frontend Architecture Rules
- Frontend code must be componentized.
- Avoid large route files with too much UI logic.
- Extract reusable or complex UI blocks into dedicated components under `src/components/`.
- Keep route files focused on page composition, orchestration, and data fetching/actions.
- Shared UI state should be lifted only when required by multiple components.

## Modal/Dialog Rules (Required)
- Modals and dialogs must be implemented in separated components.
- Do not keep modal implementation inline inside route files when it has form logic or more than trivial markup.
- Place certificate-related modals in `src/components/certificates/`.
- Use explicit prop contracts for modal components (open/state handlers, submit handlers, loading flags).

## Service and Data Access Rules
- API calls should be centralized in `src/lib/` service files.
- Components should call service methods instead of using raw `fetch` directly.
- Keep payload transformations close to the service or to the form submit handler, not spread across the tree.

## Backend Rules
- Keep controller endpoints focused and validate user-owned resources before mutation.
- Restrict editable fields explicitly when required by business rules.
- Return clear error messages for invalid payloads.

## Suggested Workflow for Agents
1. Read the relevant route/component/controller and service first.
2. Implement the smallest change that satisfies the request.
3. Extract/organize components when UI complexity increases.
4. Run error checks and fix regressions introduced by the change.
5. Summarize what changed and why.
