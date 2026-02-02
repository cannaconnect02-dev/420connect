# Monorepo Structure

This directory contains the new organized structure for the 420Connect marketplace.

## 📁 Directory Overview

- **`apps/`** - Contains the 4 main applications (customer-app, driver-app, merchant-portal, admin-dashboard)
- **`supabase/`** - Supabase configuration and database migrations
- **`tests/`** - Integration and system tests
- **`packages/`** - Shared packages (future use for shared utilities)
- **`docs/`** - Documentation files (all `.md` and `.sql` files should be organized here)

## 🔄 Migration In Progress

Root-level files are being organized into appropriate subdirectories:

| Original File | New Location |
|--|--|
| SQL schema files | `supabase/migrations/` |
| Setup/debug scripts | `scripts/` or `tests/` |
| Config files | App-specific `package.json` files |
| Documentation | Root or `docs/` |

## 🚀 Getting Started

See [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md) for detailed documentation.

Run tests with:
```bash
npm run test
```

Run all apps:
```bash
npm run dev:all
```
