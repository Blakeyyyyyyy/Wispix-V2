#!/bin/bash

echo "🧪 Wispix AI - Phase 2 Complete Testing Script"
echo "=============================================="

BASE_URL="http://localhost:3000"
JWT_TOKEN=""
AUTOMATION_ID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_test() {
    echo -e "${YELLOW}Testing: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Test 1: Health Check
print_test "1. Health Check"
health_response=$(curl -s "$BASE_URL/health")
if [[ $health_response == *"healthy"* ]]; then
    print_success "Health check passed"
    echo "Response: $health_response"
else
    print_error "Health check failed"
    echo "Response: $health_response"
fi

# Test 2: Claude Test Endpoint
print_test "2. Claude Test Endpoint"
claude_test_response=$(curl -s "$BASE_URL/api/claude/test")
if [[ $claude_test_response == *"claude test ok"* ]]; then
    print_success "Claude test endpoint passed"
else
    print_error "Claude test endpoint failed"
    echo "Response: $claude_test_response"
fi

# Test 3: Claude Generate (Basic)
print_test "3. Claude Generate (Basic)"
claude_generate_response=$(curl -s -X POST "$BASE_URL/api/claude/generate" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello"}')

if [[ $claude_generate_response == *"output"* ]]; then
    print_success "Claude generate passed"
    echo "Response: $claude_generate_response"
else
    print_error "Claude generate failed"
    echo "Response: $claude_generate_response"
fi

# Test 4: Claude Automation Generation
print_test "4. Claude Automation Generation"
claude_automation_response=$(curl -s -X POST "$BASE_URL/api/claude/generate-automation" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create an automation that gets weather data",
    "type": "http_request",
    "description": "Weather automation test"
  }')

if [[ $claude_automation_response == *"steps"* ]]; then
    print_success "Claude automation generation passed"
    echo "Response: $claude_automation_response"
else
    print_error "Claude automation generation failed"
    echo "Response: $claude_automation_response"
fi

# Test 5: User Registration
print_test "5. User Registration"
register_response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@wispix.com",
    "password": "test123456"
  }')

if [[ $register_response == *"token"* ]]; then
    print_success "User registration passed"
    JWT_TOKEN=$(echo $register_response | jq -r '.token')
    echo "JWT Token obtained: ${JWT_TOKEN:0:20}..."
else
    print_error "User registration failed"
    echo "Response: $register_response"
fi

# Test 6: User Login
print_test "6. User Login"
login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@wispix.com",
    "password": "test123456"
  }')

if [[ $login_response == *"token"* ]]; then
    print_success "User login passed"
    JWT_TOKEN=$(echo $login_response | jq -r '.token')
    echo "JWT Token obtained: ${JWT_TOKEN:0:20}..."
else
    print_error "User login failed"
    echo "Response: $login_response"
fi

# Test 7: Create Automation (with auth)
print_test "7. Create Automation (with auth)"
if [ -n "$JWT_TOKEN" ]; then
    create_response=$(curl -s -X POST "$BASE_URL/api/automations" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -d '{
        "name": "Test Weather Automation",
        "description": "Gets weather data for testing",
        "workflow_json": {
          "trigger": {"type": "manual"},
          "steps": [{
            "id": "1",
            "name": "Get Weather",
            "type": "http_request",
            "config": {
              "url": "https://api.weather.gov/",
              "method": "GET"
            }
          }]
        }
      }')
    
    if [[ $create_response == *"id"* ]]; then
        print_success "Automation creation passed"
        AUTOMATION_ID=$(echo $create_response | jq -r '.id')
        echo "Automation ID: $AUTOMATION_ID"
        echo "Response: $create_response"
    else
        print_error "Automation creation failed"
        echo "Response: $create_response"
    fi
else
    print_error "Skipping automation creation - no JWT token"
fi

# Test 8: List Automations
print_test "8. List User Automations"
if [ -n "$JWT_TOKEN" ]; then
    list_response=$(curl -s -X GET "$BASE_URL/api/automations" \
      -H "Authorization: Bearer $JWT_TOKEN")
    
    if [[ $list_response == *"["* ]]; then
        print_success "Automation listing passed"
        echo "Response: $list_response"
    else
        print_error "Automation listing failed"
        echo "Response: $list_response"
    fi
else
    print_error "Skipping automation listing - no JWT token"
fi

# Test 9: Execute Automation
print_test "9. Execute Automation"
if [ -n "$JWT_TOKEN" ] && [ -n "$AUTOMATION_ID" ]; then
    execute_response=$(curl -s -X POST "$BASE_URL/api/automations/$AUTOMATION_ID/execute" \
      -H "Authorization: Bearer $JWT_TOKEN")
    
    if [[ $execute_response == *"execution"* ]] || [[ $execute_response == *"id"* ]]; then
        print_success "Automation execution passed"
        echo "Response: $execute_response"
    else
        print_error "Automation execution failed"
        echo "Response: $execute_response"
    fi
else
    print_error "Skipping automation execution - missing token or ID"
fi

# Test 10: List Executions
print_test "10. List Executions"
if [ -n "$JWT_TOKEN" ]; then
    executions_response=$(curl -s -X GET "$BASE_URL/api/executions" \
      -H "Authorization: Bearer $JWT_TOKEN")
    
    if [[ $executions_response == *"["* ]]; then
        print_success "Executions listing passed"
        echo "Response: $executions_response"
    else
        print_error "Executions listing failed"
        echo "Response: $executions_response"
    fi
else
    print_error "Skipping executions listing - no JWT token"
fi

# Test 11: Error Handling - Invalid Auth
print_test "11. Error Handling - Invalid Auth"
invalid_auth_response=$(curl -s -X GET "$BASE_URL/api/automations" \
  -H "Authorization: Bearer invalid-token")

if [[ $invalid_auth_response == *"Access token required"* ]] || [[ $invalid_auth_response == *"invalid"* ]]; then
    print_success "Invalid auth error handling passed"
    echo "Response: $invalid_auth_response"
else
    print_error "Invalid auth error handling failed"
    echo "Response: $invalid_auth_response"
fi

# Test 12: Error Handling - Invalid Data
print_test "12. Error Handling - Invalid Data"
if [ -n "$JWT_TOKEN" ]; then
    invalid_data_response=$(curl -s -X POST "$BASE_URL/api/automations" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -d '{"invalid": "data"}')
    
    if [[ $invalid_data_response == *"error"* ]] || [[ $invalid_data_response == *"Invalid"* ]]; then
        print_success "Invalid data error handling passed"
        echo "Response: $invalid_data_response"
    else
        print_error "Invalid data error handling failed"
        echo "Response: $invalid_data_response"
    fi
else
    print_error "Skipping invalid data test - no JWT token"
fi

# Test 13: Route Not Found
print_test "13. Route Not Found"
not_found_response=$(curl -s "$BASE_URL/api/nonexistent")

if [[ $not_found_response == *"Route not found"* ]]; then
    print_success "Route not found handling passed"
    echo "Response: $not_found_response"
else
    print_error "Route not found handling failed"
    echo "Response: $not_found_response"
fi

echo ""
echo "🎯 Test Summary:"
echo "================"
echo "Phase 2 testing completed!"
echo ""
echo "💡 Next Steps:"
echo "- Review results above"
echo "- Check Supabase dashboard for actual data"
echo "- Verify Redis queue is processing jobs"
echo "- If all green: Ready for Phase 3"
echo "- If any red: Fix failing components first" 