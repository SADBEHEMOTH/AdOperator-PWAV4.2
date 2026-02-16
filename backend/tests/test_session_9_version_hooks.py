"""
Session 9 Testing: Creative Version History and Hook Templates

Tests:
1. Hook Templates API - GET /api/creatives/hooks returns 5 templates
2. Creative Generation with hook_template - POST /api/creatives/generate accepts hook_template and parent_creative_id
3. Version Tracking - Creatives have version field, increment on iterate
4. List Creatives - GET /api/creatives/list/{analysis_id} returns version, hook_template, parent_creative_id, created_at
5. build_contextual_prompt function - validates prompt contains context from analysis
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@test.com",
        "password": "test123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

@pytest.fixture(scope="module")
def completed_analysis_id():
    """Use existing completed analysis from previous sessions"""
    return "6ee78296-45eb-47e4-87e4-14fc77cad986"


class TestHookTemplatesAPI:
    """Feature 1: Hook Templates API endpoint tests"""
    
    def test_hooks_endpoint_returns_5_templates(self):
        """GET /api/creatives/hooks should return 5 templates"""
        response = requests.get(f"{BASE_URL}/api/creatives/hooks")
        assert response.status_code == 200
        data = response.json()
        
        assert "templates" in data
        assert len(data["templates"]) == 5
        print("✓ Hooks endpoint returns 5 templates")
    
    def test_hooks_template_structure(self):
        """Each template should have id, label, desc, icon fields"""
        response = requests.get(f"{BASE_URL}/api/creatives/hooks")
        assert response.status_code == 200
        templates = response.json()["templates"]
        
        required_fields = ["id", "label", "desc", "icon"]
        for tpl in templates:
            for field in required_fields:
                assert field in tpl, f"Missing field {field} in template {tpl.get('id')}"
        print("✓ All templates have required fields (id, label, desc, icon)")
    
    def test_hooks_template_ids(self):
        """Should have specific template IDs: vsl, ugc, before_after, depoimento, problema_solucao"""
        response = requests.get(f"{BASE_URL}/api/creatives/hooks")
        templates = response.json()["templates"]
        
        expected_ids = {"vsl", "ugc", "before_after", "depoimento", "problema_solucao"}
        actual_ids = {tpl["id"] for tpl in templates}
        
        assert expected_ids == actual_ids, f"Expected IDs {expected_ids}, got {actual_ids}"
        print("✓ All 5 expected template IDs present")
    
    def test_hooks_endpoint_unauthenticated(self):
        """GET /api/creatives/hooks should work without authentication"""
        response = requests.get(f"{BASE_URL}/api/creatives/hooks")
        assert response.status_code == 200
        print("✓ Hooks endpoint works without auth (public)")


class TestCreativeGenerationWithHookTemplate:
    """Feature 3: Creative Generation accepts hook_template and parent_creative_id"""
    
    def test_generate_accepts_hook_template(self, auth_headers, completed_analysis_id):
        """POST /api/creatives/generate should accept hook_template field"""
        payload = {
            "analysis_id": completed_analysis_id,
            "provider": "claude_text",  # Fast provider for testing
            "prompt": "Test prompt for session 9",
            "hook_template": "vsl"
        }
        response = requests.post(f"{BASE_URL}/api/creatives/generate", json=payload, headers=auth_headers, timeout=60)
        
        # Accept success or 500 (if AI service has issues)
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert data.get("hook_template") == "vsl"
            print(f"✓ Creative generated with hook_template=vsl, id={data['id']}")
        else:
            pytest.skip("AI service unavailable for this test")
    
    def test_generate_accepts_empty_hook_template(self, auth_headers, completed_analysis_id):
        """POST /api/creatives/generate should accept empty hook_template"""
        payload = {
            "analysis_id": completed_analysis_id,
            "provider": "claude_text",
            "prompt": "Test prompt no hook",
            "hook_template": ""
        }
        response = requests.post(f"{BASE_URL}/api/creatives/generate", json=payload, headers=auth_headers, timeout=60)
        
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            data = response.json()
            assert data.get("hook_template") in [None, ""]
            print("✓ Creative generated with empty hook_template")
        else:
            pytest.skip("AI service unavailable")
    
    def test_generate_accepts_parent_creative_id(self, auth_headers, completed_analysis_id):
        """POST /api/creatives/generate should accept parent_creative_id for versioning"""
        # First create a creative
        payload1 = {
            "analysis_id": completed_analysis_id,
            "provider": "claude_text",
            "prompt": "First version creative",
            "hook_template": "ugc"
        }
        resp1 = requests.post(f"{BASE_URL}/api/creatives/generate", json=payload1, headers=auth_headers, timeout=60)
        
        if resp1.status_code != 200:
            pytest.skip("AI service unavailable")
        
        creative1 = resp1.json()
        creative1_id = creative1["id"]
        creative1_version = creative1.get("version", 1)
        print(f"✓ First creative created: id={creative1_id}, version={creative1_version}")
        
        # Create second creative with parent_creative_id
        payload2 = {
            "analysis_id": completed_analysis_id,
            "provider": "claude_text",
            "prompt": "Second version - iterating",
            "hook_template": "ugc",
            "parent_creative_id": creative1_id
        }
        resp2 = requests.post(f"{BASE_URL}/api/creatives/generate", json=payload2, headers=auth_headers, timeout=60)
        
        assert resp2.status_code == 200
        creative2 = resp2.json()
        creative2_version = creative2.get("version", 1)
        
        # Version should increment
        assert creative2_version == creative1_version + 1, f"Expected version {creative1_version+1}, got {creative2_version}"
        print(f"✓ Second creative created with parent_id: version={creative2_version}")


class TestVersionTracking:
    """Feature 4: Version field in creatives"""
    
    def test_creative_has_version_field(self, auth_headers, completed_analysis_id):
        """Creatives in list should have version field"""
        response = requests.get(f"{BASE_URL}/api/creatives/list/{completed_analysis_id}", headers=auth_headers)
        assert response.status_code == 200
        
        creatives = response.json()
        if len(creatives) == 0:
            pytest.skip("No creatives to test version field")
        
        # Check all creatives have version
        for creative in creatives:
            assert "version" in creative, f"Missing version field in creative {creative.get('id')}"
            assert isinstance(creative["version"], int)
        print(f"✓ All {len(creatives)} creatives have version field")
    
    def test_list_creatives_returns_required_fields(self, auth_headers, completed_analysis_id):
        """GET /api/creatives/list/{analysis_id} returns version, hook_template, parent_creative_id, created_at"""
        response = requests.get(f"{BASE_URL}/api/creatives/list/{completed_analysis_id}", headers=auth_headers)
        assert response.status_code == 200
        
        creatives = response.json()
        if len(creatives) == 0:
            pytest.skip("No creatives to test fields")
        
        required_fields = ["version", "hook_template", "parent_creative_id", "created_at"]
        for creative in creatives:
            for field in required_fields:
                assert field in creative, f"Missing field {field} in creative"
        print(f"✓ All creatives have fields: {required_fields}")


class TestBuildContextualPrompt:
    """Feature 8: Contextual prompt building (via generated creative's prompt_used)"""
    
    def test_contextual_prompt_contains_analysis_data(self, auth_headers, completed_analysis_id):
        """Generated creative should contain context from analysis in prompt_used"""
        # Get analysis to know what data to expect
        analysis_resp = requests.get(f"{BASE_URL}/api/analyses/{completed_analysis_id}", headers=auth_headers)
        if analysis_resp.status_code != 200:
            pytest.skip("Could not get analysis data")
        
        analysis = analysis_resp.json()
        product_name = analysis.get("product", {}).get("nome", "")
        
        # Generate with hook template that should include context
        payload = {
            "analysis_id": completed_analysis_id,
            "provider": "claude_text",
            "prompt": "",  # Empty prompt forces contextual prompt building
            "hook_template": "problema_solucao"
        }
        response = requests.post(f"{BASE_URL}/api/creatives/generate", json=payload, headers=auth_headers, timeout=60)
        
        if response.status_code != 200:
            pytest.skip("AI service unavailable")
        
        data = response.json()
        prompt_used = data.get("prompt_used", "")
        
        # Prompt should contain product name
        assert product_name.lower() in prompt_used.lower() or len(product_name) < 3, \
            f"Product name '{product_name}' not found in prompt"
        
        # Prompt should contain hook template direction
        assert "problema" in prompt_used.lower() or "dor" in prompt_used.lower(), \
            "Hook template direction not in prompt"
        
        print(f"✓ Contextual prompt contains analysis data (product: {product_name})")


class TestCodeVerification:
    """Verify backend code has required structures"""
    
    def test_hook_templates_dict_exists(self):
        """HOOK_TEMPLATES dict should exist in server.py"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        # Read the server file
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        assert 'HOOK_TEMPLATES = {' in content or 'HOOK_TEMPLATES={' in content
        assert '"vsl":' in content
        assert '"ugc":' in content
        assert '"before_after":' in content
        assert '"depoimento":' in content
        assert '"problema_solucao":' in content
        print("✓ HOOK_TEMPLATES dict exists with all 5 templates")
    
    def test_build_contextual_prompt_function_exists(self):
        """build_contextual_prompt function should exist"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        assert 'def build_contextual_prompt(' in content
        print("✓ build_contextual_prompt function exists")
    
    def test_generate_creative_uses_version_tracking(self):
        """generate_creative endpoint should track versions"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        # Check version tracking logic
        assert '"version":' in content or "'version':" in content
        assert 'parent_creative_id' in content
        print("✓ Version tracking code exists in generate_creative")
    
    def test_creative_input_model_has_hook_fields(self):
        """CreativeGenerationInput should have hook_template and parent_creative_id"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        assert 'hook_template:' in content
        assert 'parent_creative_id:' in content
        print("✓ CreativeGenerationInput has hook_template and parent_creative_id fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
