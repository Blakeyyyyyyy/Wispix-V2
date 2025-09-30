-- Create tables manually to match Prisma schema
-- This script creates the tables with the correct structure

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    "subscriptionTier" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create automations table
CREATE TABLE IF NOT EXISTS automations (
    id VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "workflowJson" JSONB NOT NULL,
    config JSONB,
    status VARCHAR(255),
    "isActive" BOOLEAN DEFAULT true,
    "retry_config" JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES users(id)
);

-- Create executions table
CREATE TABLE IF NOT EXISTS executions (
    id VARCHAR(255) PRIMARY KEY,
    "automationId" VARCHAR(255) NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    status VARCHAR(255) DEFAULT 'pending',
    "startedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP,
    logs JSONB,
    result JSONB,
    error TEXT,
    progress INTEGER,
    duration INTEGER,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("automationId") REFERENCES automations(id),
    FOREIGN KEY ("userId") REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_automations_user_id ON automations("userId");
CREATE INDEX IF NOT EXISTS idx_executions_automation_id ON executions("automationId");
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON executions("userId"); 