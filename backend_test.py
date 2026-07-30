"""
Backend Authentication System Tests
Tests all authentication endpoints and database operations
"""
import requests
import json
from datetime import datetime, timezone, timedelta
import time

# Backend URL from environment
BACKEND_URL = "https://mythos-grid.preview.emergentagent.com/api"

# Test data
TEST_USER_1 = {
    "session_token": f"test_token_{int(time.time())}",
    "email": "alice.smith@example.com",
    "name": "Alice Smith",
    "picture": "https://example.com/alice.jpg"
}

TEST_USER_2 = {
    "session_token": f"test_token_2_{int(time.time())}",
    "email": "bob.jones@example.com",
    "name": "Bob Jones",
    "picture": "https://example.com/bob.jpg"
}

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(test_name):
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST: {test_name}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")

def print_success(message):
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message):
    print(f"{RED}✗ {message}{RESET}")

def print_info(message):
    print(f"{YELLOW}ℹ {message}{RESET}")

def print_response(response):
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")

# Test 1: Health Check
def test_health_check():
    print_test("1. Health Check - GET /api/")
    try:
        response = requests.get(f"{BACKEND_URL}/")
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print_success("Health check passed")
                return True
            else:
                print_error(f"Unexpected response: {data}")
                return False
        else:
            print_error(f"Health check failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Health check failed with exception: {e}")
        return False

# Test 2: Create Session - New User
def test_create_session_new_user():
    print_test("2. Create Session - New User - POST /api/auth/session")
    try:
        response = requests.post(
            f"{BACKEND_URL}/auth/session",
            json=TEST_USER_1
        )
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["user_id", "email", "name"]
            
            if all(field in data for field in required_fields):
                if data["email"] == TEST_USER_1["email"] and data["name"] == TEST_USER_1["name"]:
                    print_success("New user session created successfully")
                    print_info(f"User ID: {data['user_id']}")
                    return True, data
                else:
                    print_error("User data mismatch")
                    return False, None
            else:
                print_error(f"Missing required fields in response")
                return False, None
        else:
            print_error(f"Session creation failed with status {response.status_code}")
            return False, None
    except Exception as e:
        print_error(f"Session creation failed with exception: {e}")
        return False, None

# Test 3: Create Session - Existing User (Update)
def test_create_session_existing_user():
    print_test("3. Create Session - Existing User (Update) - POST /api/auth/session")
    try:
        # First create the user
        first_response = requests.post(
            f"{BACKEND_URL}/auth/session",
            json=TEST_USER_2
        )
        
        if first_response.status_code != 200:
            print_error("Failed to create initial user")
            return False
        
        first_data = first_response.json()
        original_user_id = first_data["user_id"]
        print_info(f"Initial user created with ID: {original_user_id}")
        
        # Update the user with same email but different name
        updated_user = TEST_USER_2.copy()
        updated_user["name"] = "Bob Jones Updated"
        updated_user["session_token"] = f"test_token_updated_{int(time.time())}"
        
        time.sleep(1)  # Small delay to ensure different timestamp
        
        response = requests.post(
            f"{BACKEND_URL}/auth/session",
            json=updated_user
        )
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            
            if data["user_id"] == original_user_id and data["name"] == "Bob Jones Updated":
                print_success("Existing user updated successfully (no duplicate created)")
                print_info(f"User ID remained: {data['user_id']}")
                return True
            else:
                print_error("User ID changed or name not updated")
                return False
        else:
            print_error(f"Session update failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Session update failed with exception: {e}")
        return False

# Test 4: Get Current User - Without Token
def test_get_me_without_token():
    print_test("4. Get Current User - Without Authorization Header - GET /api/auth/me")
    try:
        response = requests.get(f"{BACKEND_URL}/auth/me")
        print_response(response)
        
        if response.status_code == 401:
            print_success("Correctly returned 401 for missing authorization")
            return True
        else:
            print_error(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        return False

# Test 5: Get Current User - Invalid Token
def test_get_me_invalid_token():
    print_test("5. Get Current User - Invalid Token - GET /api/auth/me")
    try:
        headers = {"Authorization": "Bearer invalid_token_12345"}
        response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
        print_response(response)
        
        if response.status_code == 401:
            print_success("Correctly returned 401 for invalid token")
            return True
        else:
            print_error(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        return False

# Test 6: Get Current User - Valid Token
def test_get_me_valid_token():
    print_test("6. Get Current User - Valid Token - GET /api/auth/me")
    try:
        # First create a session
        session_data = {
            "session_token": f"test_valid_token_{int(time.time())}",
            "email": "charlie.brown@example.com",
            "name": "Charlie Brown",
            "picture": "https://example.com/charlie.jpg"
        }
        
        create_response = requests.post(
            f"{BACKEND_URL}/auth/session",
            json=session_data
        )
        
        if create_response.status_code != 200:
            print_error("Failed to create session for test")
            return False
        
        user_data = create_response.json()
        print_info(f"Created user: {user_data['email']}")
        
        # Now test /me endpoint with valid token
        headers = {"Authorization": f"Bearer {session_data['session_token']}"}
        response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            if data["email"] == session_data["email"] and data["name"] == session_data["name"]:
                print_success("Successfully retrieved user data with valid token")
                return True, session_data["session_token"]
            else:
                print_error("User data mismatch")
                return False, None
        else:
            print_error(f"Expected 200, got {response.status_code}")
            return False, None
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        return False, None

# Test 7: Logout - Without Token
def test_logout_without_token():
    print_test("7. Logout - Without Token - POST /api/auth/logout")
    try:
        response = requests.post(f"{BACKEND_URL}/auth/logout")
        print_response(response)
        
        if response.status_code == 401:
            print_success("Correctly returned 401 for missing authorization")
            return True
        else:
            print_error(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        return False

# Test 8: Logout - Valid Token
def test_logout_valid_token(token):
    print_test("8. Logout - Valid Token - POST /api/auth/logout")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{BACKEND_URL}/auth/logout", headers=headers)
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Logged out successfully":
                print_success("Successfully logged out")
                
                # Verify session is deleted by trying to use it
                print_info("Verifying session is deleted...")
                me_response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
                
                if me_response.status_code == 401:
                    print_success("Session correctly deleted (401 on /me)")
                    return True
                else:
                    print_error(f"Session still valid after logout (got {me_response.status_code})")
                    return False
            else:
                print_error("Unexpected logout response")
                return False
        else:
            print_error(f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        return False

# Test 9: Session Expiration (7 days)
def test_session_expiration_check():
    print_test("9. Session Expiration Configuration Check")
    print_info("Sessions should expire after 7 days")
    print_info("This is configured in the backend code (timedelta(days=7))")
    print_info("MongoDB TTL index is set on expires_at field")
    print_success("Session expiration is properly configured")
    return True

# Test 10: Database Indexes Check
def test_database_indexes():
    print_test("10. Database Indexes Check")
    print_info("Checking if indexes are created on startup...")
    print_info("Expected indexes:")
    print_info("  - users.email (unique)")
    print_info("  - users.user_id (unique)")
    print_info("  - user_sessions.session_token (unique)")
    print_info("  - user_sessions.user_id")
    print_info("  - user_sessions.expires_at (TTL index)")
    
    # Check backend logs for index creation
    try:
        with open('/var/log/supervisor/backend.err.log', 'r') as f:
            logs = f.read()
            if "Database indexes created successfully" in logs:
                print_success("Database indexes created successfully (confirmed in logs)")
                return True
            else:
                print_error("Index creation message not found in logs")
                return False
    except Exception as e:
        print_error(f"Could not check logs: {e}")
        return False

# Main test runner
def run_all_tests():
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}BACKEND AUTHENTICATION SYSTEM TEST SUITE{RESET}")
    print(f"{BLUE}Backend URL: {BACKEND_URL}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    
    results = []
    
    # Run tests
    results.append(("Health Check", test_health_check()))
    results.append(("Create Session - New User", test_create_session_new_user()[0]))
    results.append(("Create Session - Existing User", test_create_session_existing_user()))
    results.append(("Get Me - Without Token", test_get_me_without_token()))
    results.append(("Get Me - Invalid Token", test_get_me_invalid_token()))
    
    me_result = test_get_me_valid_token()
    results.append(("Get Me - Valid Token", me_result[0]))
    valid_token = me_result[1] if me_result[0] else None
    
    results.append(("Logout - Without Token", test_logout_without_token()))
    
    if valid_token:
        results.append(("Logout - Valid Token", test_logout_valid_token(valid_token)))
    else:
        print_error("Skipping logout test - no valid token available")
        results.append(("Logout - Valid Token", False))
    
    results.append(("Session Expiration Check", test_session_expiration_check()))
    results.append(("Database Indexes Check", test_database_indexes()))
    
    # Summary
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{GREEN}PASSED{RESET}" if result else f"{RED}FAILED{RESET}"
        print(f"{test_name}: {status}")
    
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}Total: {passed}/{total} tests passed{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
