# Supabase Migrations

This directory contains all database migration scripts for the 420connect application.

## Migration Files

All migrations are prefixed with a datetime timestamp in the format `YYYYMMDDHHMMSS_` and are designed to be **rerunnable** (idempotent).

| File | Description |
|------|-------------|
| `20260202215100_init_extensions.sql` | Enables PostGIS extension |
| `20260202215200_create_profiles_table.sql` | Creates profiles table with RLS |
| `20260202215300_create_restaurants_table.sql` | Creates restaurants table with all columns |
| `20260202215400_create_menu_items_table.sql` | Creates menu_items table |
| `20260202215500_create_orders_table.sql` | Creates orders table with comprehensive RLS |
| `20260202215600_create_order_items_table.sql` | Creates order_items table |
| `20260202215700_create_messages_table.sql` | Creates messages table for order chat |
| `20260202215800_create_user_roles_tables.sql` | Creates user_roles and role_requests tables |
| `20260202215900_create_functions_triggers.sql` | Creates functions and triggers |
| `20260202216000_create_views.sql` | Creates database views |
| `20260202216100_grant_permissions_storage.sql` | Sets up permissions and avatar storage |
| `20260202216200_security_fixes.sql` | PostGIS security fixes |

## Running Migrations

### Using Supabase CLI
```bash
supabase db push
```

### Manually
Run each migration file in order against your Supabase database.

## Creating New Migrations

1. Create a new file with format: `YYYYMMDDHHMMSS_description.sql`
2. Ensure all operations are **rerunnable**:
   - Use `CREATE TABLE IF NOT EXISTS`
   - Use `DROP POLICY IF EXISTS` before `CREATE POLICY`
   - Use `CREATE OR REPLACE` for functions and views
   - Use `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`
