#!/bin/bash
set -e

# Create the test database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE uniconnect_test OWNER uniconnect'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'uniconnect_test')\gexec
EOSQL

echo "Test database 'uniconnect_test' is ready."
