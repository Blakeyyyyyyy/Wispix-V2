# Migration: Add Agent Spec and Execution Step

Generated via `prisma migrate diff` for CI deployment.

This migration adds:
- `agentSpec` and `version` fields to the Automation model
- New `ExecutionStep` model for tracking individual automation step executions
