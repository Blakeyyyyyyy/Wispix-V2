-- Grant specific permissions to prisma user on existing tables
GRANT ALL PRIVILEGES ON TABLE users TO prisma;
GRANT ALL PRIVILEGES ON TABLE automations TO prisma;
GRANT ALL PRIVILEGES ON TABLE executions TO prisma;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO prisma;

-- Grant future permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prisma;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO prisma; 