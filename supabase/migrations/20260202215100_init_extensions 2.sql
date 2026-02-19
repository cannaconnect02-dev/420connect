-- Migration: Initialize required PostgreSQL extensions
-- Rerunnable: Yes (uses IF NOT EXISTS)

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
