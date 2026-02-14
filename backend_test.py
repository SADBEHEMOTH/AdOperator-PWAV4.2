#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime

class AdOperatorAPITester:
    def __init__(self, base_url="https://decide-ads.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, response_code=None, details=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "name": name,
            "success": success,
            "response_code": response_code,
            "details": details
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}")
        if response_code:
            print(f"   Status Code: {response_code}")
        if details and not success:
            print(f"   Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            print(f"\n🔍 Testing {name}...")
            print(f"   URL: {url}")
            
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True, response.status_code, "Success")
                    return True, response_data
                except json.JSONDecodeError:
                    self.log_test(name, True, response.status_code, "Success (no JSON)")
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, response.status_code, error_data.get('detail', 'Unknown error'))
                except:
                    self.log_test(name, False, response.status_code, response.text[:200])
                return False, {}

        except requests.exceptions.RequestException as e:
            self.log_test(name, False, None, f"Network error: {str(e)}")
            return False, {}
        except Exception as e:
            self.log_test(name, False, None, f"Unexpected error: {str(e)}")
            return False, {}

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION ENDPOINTS")
        print("="*50)

        # Test login with existing user
        success, response = self.run_test(
            "Login with existing test user",
            "POST",
            "auth/login",
            200,
            data={"email": "test@test.com", "password": "test123"}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"   ✅ Token obtained: {self.token[:20]}...")
        
        # Test login with invalid credentials
        self.run_test(
            "Login with invalid credentials",
            "POST", 
            "auth/login",
            401,
            data={"email": "invalid@test.com", "password": "wrongpass"}
        )
        
        # Test /auth/me endpoint
        if self.token:
            success, user_data = self.run_test(
                "Get current user info",
                "GET",
                "auth/me", 
                200
            )
            if success:
                print(f"   User info: {user_data}")

        # Test register new user (with timestamp to avoid conflicts)
        timestamp = datetime.now().strftime('%H%M%S')
        new_user_email = f"newuser_{timestamp}@test.com"
        success, response = self.run_test(
            "Register new user",
            "POST",
            "auth/register",
            200,
            data={
                "name": f"Test User {timestamp}",
                "email": new_user_email,
                "password": "testpass123"
            }
        )

        # Test register with existing email
        self.run_test(
            "Register with existing email",
            "POST",
            "auth/register",
            400,
            data={
                "name": "Test User",
                "email": "test@test.com",
                "password": "testpass123" 
            }
        )

    def test_analyses_crud(self):
        """Test analyses CRUD operations"""
        print("\n" + "="*50)
        print("TESTING ANALYSES CRUD")
        print("="*50)
        
        if not self.token:
            print("❌ Skipping analyses tests - no auth token")
            return None

        # Test create analysis
        product_data = {
            "nome": "TestProduct Pro",
            "nicho": "Test Niche",
            "publico_alvo": "Test audience 25-45 anos",
            "promessa_principal": "This product promises to test everything perfectly",
            "beneficios": "Amazing benefits include testing and more testing",
            "ingredientes_mecanismo": "Secret test ingredients that make magic happen",
            "tom": "persuasivo"
        }
        
        success, analysis = self.run_test(
            "Create new analysis",
            "POST",
            "analyses",
            200,
            data=product_data
        )
        
        analysis_id = None
        if success and 'id' in analysis:
            analysis_id = analysis['id']
            print(f"   ✅ Analysis created with ID: {analysis_id}")

        # Test list analyses
        success, analyses_list = self.run_test(
            "List user analyses",
            "GET", 
            "analyses",
            200
        )
        
        if success:
            print(f"   Found {len(analyses_list)} analyses")

        # Test get single analysis
        if analysis_id:
            success, single_analysis = self.run_test(
                "Get single analysis",
                "GET",
                f"analyses/{analysis_id}",
                200
            )
            
            if success:
                print(f"   Analysis status: {single_analysis.get('status', 'unknown')}")

        # Test get non-existent analysis
        self.run_test(
            "Get non-existent analysis", 
            "GET",
            "analyses/fake-id-12345",
            404
        )
        
        return analysis_id

    def test_without_auth(self):
        """Test endpoints without authentication"""
        print("\n" + "="*50)
        print("TESTING UNAUTHORIZED ACCESS")
        print("="*50)
        
        # Store current token and remove it
        temp_token = self.token
        self.token = None
        
        # Test protected endpoints without auth
        self.run_test(
            "Get user info without auth",
            "GET",
            "auth/me",
            401
        )
        
        self.run_test(
            "List analyses without auth", 
            "GET",
            "analyses",
            401
        )
        
        self.run_test(
            "Create analysis without auth",
            "POST",
            "analyses", 
            401,
            data={"nome": "test"}
        )
        
        # Restore token
        self.token = temp_token

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['name']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    print("AdOperator API Testing")
    print("Backend URL: https://decide-ads.preview.emergentagent.com")
    print("="*60)
    
    tester = AdOperatorAPITester()
    
    # Run all tests
    tester.test_auth_endpoints()
    analysis_id = tester.test_analyses_crud()
    tester.test_without_auth()
    
    # Print final results
    all_passed = tester.print_summary()
    
    if analysis_id:
        print(f"\n💡 Created test analysis ID: {analysis_id}")
        print("   You can use this for frontend testing")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())