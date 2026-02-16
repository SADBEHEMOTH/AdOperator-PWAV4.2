"""
Bug Fixes Session 7 - Test Cases
================================
Bug Fix 1 (P0): Facebook URL competitor analysis
Bug Fix 2 (P0): MarketComparePage 'Generate Creative' button navigation  
Bug Fix 3 (P0): Strategy table mobile rendering CSS classes
Bug Fix 4 (P1): fillExample() uses getRandomExample() not EXAMPLE_PRODUCT
Bug Fix 5 (P1): Direct image URL competitor analysis
"""

import pytest
import requests
import os
import time
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Register a test user and get token"""
    timestamp = int(time.time())
    response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "name": "Bug Fix Tester",
            "email": f"bugtest_s7_{timestamp}@test.com",
            "password": "test123"
        }
    )
    if response.status_code == 200:
        return response.json().get("token")
    elif response.status_code == 400:  # Email exists
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": f"bugtest_s7_{timestamp}@test.com", "password": "test123"}
        )
        if login_resp.status_code == 200:
            return login_resp.json().get("token")
    pytest.skip("Could not authenticate")

@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }

# ============================================================================
# BUG FIX 1 (P0): Facebook URL competitor analysis
# ============================================================================

class TestFacebookURLCompetitorAnalysis:
    """
    Bug Fix 1: POST /api/competitor/analyze with Facebook Ads Library URL
    should NOT return 400 error. It should return AI-based analysis.
    """
    
    def test_facebook_ads_library_url_analysis(self, headers):
        """Test that Facebook Ads Library URL returns valid analysis, not 400 error"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze",
            headers=headers,
            json={"url": "https://www.facebook.com/ads/library/?id=123456789"},
            timeout=60
        )
        
        # Should NOT be 400 - this was the bug
        assert response.status_code != 400, f"Got 400 error which was the bug: {response.text}"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Should have analysis data
        assert "analise" in data, "Missing 'analise' in response"
        assert "scraping_data" in data, "Missing 'scraping_data' in response"
        
        # Should detect as protected domain
        assert data["scraping_data"]["source_type"] == "protected", \
            f"Expected source_type='protected', got {data['scraping_data'].get('source_type')}"
        
        # Should have AI-generated analysis
        analise = data["analise"]
        assert "tipo_abertura" in analise
        assert "promessa" in analise
        assert "risco_bloqueio" in analise
        
        print(f"SUCCESS: Facebook URL analysis returned valid data with source_type=protected")

    def test_instagram_url_analysis(self, headers):
        """Test that Instagram URL also works (protected domain detection)"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze",
            headers=headers,
            json={"url": "https://www.instagram.com/p/ABC123/"},
            timeout=60
        )
        
        assert response.status_code != 400, f"Got 400 error for Instagram URL"
        assert response.status_code == 200
        
        data = response.json()
        assert data["scraping_data"]["source_type"] == "protected"
        print(f"SUCCESS: Instagram URL detected as protected domain")

    def test_tiktok_url_analysis(self, headers):
        """Test that TikTok URL works (protected domain)"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze",
            headers=headers,
            json={"url": "https://www.tiktok.com/@user/video/123"},
            timeout=60
        )
        
        assert response.status_code != 400
        assert response.status_code == 200
        
        data = response.json()
        assert data["scraping_data"]["source_type"] == "protected"
        print(f"SUCCESS: TikTok URL detected as protected domain")

# ============================================================================
# BUG FIX 5 (P1): Direct image URL competitor analysis
# ============================================================================

class TestDirectImageURLCompetitorAnalysis:
    """
    Bug Fix 5: POST /api/competitor/analyze with a direct image URL 
    should NOT crash. It should return analysis with source_type='image'.
    """
    
    def test_direct_jpg_image_url(self, headers):
        """Test that direct .jpg image URL doesn't crash and returns analysis"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze",
            headers=headers,
            json={"url": "https://example.com/test-ad.jpg"},
            timeout=60
        )
        
        # Should NOT crash (500) - this was the bug
        assert response.status_code != 500, f"Got 500 error which was the bug: {response.text}"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Should detect as image URL
        assert data["scraping_data"]["source_type"] == "image", \
            f"Expected source_type='image', got {data['scraping_data'].get('source_type')}"
        
        # Should have AI-generated analysis
        assert "analise" in data
        assert "formato_visual" in data["analise"]
        
        print(f"SUCCESS: Direct .jpg URL returns analysis with source_type=image")

    def test_direct_png_image_url(self, headers):
        """Test .png image URL"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze",
            headers=headers,
            json={"url": "https://example.com/banner.png"},
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["scraping_data"]["source_type"] == "image"
        print(f"SUCCESS: Direct .png URL returns analysis with source_type=image")

    def test_direct_webp_image_url(self, headers):
        """Test .webp image URL"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze",
            headers=headers,
            json={"url": "https://cdn.example.com/creative.webp"},
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["scraping_data"]["source_type"] == "image"
        print(f"SUCCESS: Direct .webp URL returns analysis with source_type=image")

# ============================================================================
# CODE VERIFICATION TESTS (Bug Fix 3 & 4 - Frontend code checks)
# ============================================================================

class TestFrontendCodeVerification:
    """
    These tests verify the frontend code changes directly since they 
    involve CSS classes and JavaScript function calls.
    """
    
    def test_bug_fix_3_strategy_table_mobile_responsive_classes(self):
        """
        Bug Fix 3: Verify responsive CSS classes in AnalysisFlow.js strategy table
        Expected classes: grid-cols-1, sm:grid-cols-2, break-words, min-w-0, overflow-x-auto
        """
        with open("/app/frontend/src/pages/AnalysisFlow.js", "r") as f:
            content = f.read()
        
        # Check for responsive grid classes
        assert "grid-cols-1" in content, "Missing grid-cols-1 for mobile layout"
        assert "sm:grid-cols-2" in content, "Missing sm:grid-cols-2 for tablet/desktop"
        
        # Check for text wrapping classes
        assert "break-words" in content, "Missing break-words class for text wrapping"
        assert "min-w-0" in content, "Missing min-w-0 class for flex children"
        assert "overflow-x-auto" in content, "Missing overflow-x-auto for horizontal scroll"
        
        # Verify these are in the strategy table section (lines 628-679)
        lines = content.split("\n")
        strategy_section = "\n".join(lines[627:680])  # Lines 628-680 (0-indexed: 627-679)
        
        assert "strategy-table" in strategy_section or "Strategy" in strategy_section, \
            "Strategy table section not found in expected lines"
        
        print("SUCCESS: Bug Fix 3 - Strategy table has mobile responsive classes")

    def test_bug_fix_4_fill_example_uses_get_random_example(self):
        """
        Bug Fix 4: Verify fillExample() uses getRandomExample() not EXAMPLE_PRODUCT
        """
        with open("/app/frontend/src/pages/AnalysisFlow.js", "r") as f:
            content = f.read()
        
        # Should NOT have EXAMPLE_PRODUCT variable
        assert "EXAMPLE_PRODUCT" not in content, \
            "EXAMPLE_PRODUCT should not exist - it should be NICHE_EXAMPLES with getRandomExample()"
        
        # Should have NICHE_EXAMPLES array
        assert "NICHE_EXAMPLES" in content, "Missing NICHE_EXAMPLES array"
        
        # Should have getRandomExample function
        assert "getRandomExample" in content, "Missing getRandomExample function"
        
        # fillExample should call getRandomExample
        fill_example_match = re.search(r'const fillExample\s*=\s*\(\)\s*=>\s*\{([^}]+)\}', content)
        if not fill_example_match:
            # Try alternate pattern
            fill_example_section_start = content.find("const fillExample")
            if fill_example_section_start != -1:
                fill_example_section = content[fill_example_section_start:fill_example_section_start+200]
                assert "getRandomExample" in fill_example_section, \
                    "fillExample should call getRandomExample()"
            else:
                pytest.fail("Could not find fillExample function")
        else:
            fill_example_body = fill_example_match.group(1)
            assert "getRandomExample" in fill_example_body, \
                "fillExample should call getRandomExample()"
        
        print("SUCCESS: Bug Fix 4 - fillExample uses getRandomExample(), not EXAMPLE_PRODUCT")

    def test_bug_fix_2_market_compare_navigation_path(self):
        """
        Bug Fix 2: Verify MarketComparePage navigates to /analysis/${id}/creative 
        NOT /analysis/new
        """
        with open("/app/frontend/src/pages/MarketComparePage.js", "r") as f:
            content = f.read()
        
        # Check that the Generate Creative button navigates to correct path
        # Expected: navigate(`/analysis/${id}/creative`)
        # NOT: navigate("/analysis/new")
        
        # Find the generate-creative-from-advantage button and its onClick
        assert "generate-creative-from-advantage" in content, \
            "Missing data-testid='generate-creative-from-advantage'"
        
        # Check the navigation path near line 332
        # Should be /analysis/${id}/creative
        assert "/analysis/${id}/creative" in content or "`/analysis/${id}/creative`" in content, \
            "Navigation should be to /analysis/${id}/creative"
        
        # Should NOT navigate to /analysis/new for this button
        lines = content.split("\n")
        for i, line in enumerate(lines):
            if "generate-creative-from-advantage" in line:
                # Check surrounding lines (within 5 lines)
                surrounding = "\n".join(lines[max(0,i-5):min(len(lines),i+5)])
                # The onClick should navigate to /analysis/${id}/creative
                if "navigate" in surrounding and "/analysis/new" in surrounding:
                    # Check if it's NOT the actual navigation for this button
                    assert "`/analysis/${id}/creative`" in surrounding, \
                        "generate-creative-from-advantage should navigate to /analysis/${id}/creative"
        
        print("SUCCESS: Bug Fix 2 - MarketComparePage navigates to /analysis/${id}/creative")


# ============================================================================
# Integration test for competitor analysis flow
# ============================================================================

class TestCompetitorAnalysisIntegration:
    """Test the complete competitor analysis flow with various URL types"""
    
    def test_competitor_analysis_requires_auth(self):
        """Test that competitor analysis requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze",
            headers={"Content-Type": "application/json"},
            json={"url": "https://example.com"}
        )
        assert response.status_code == 401
        print("SUCCESS: Competitor analysis correctly requires auth")

    def test_competitor_analysis_regular_url(self, headers):
        """Test competitor analysis with regular webpage URL"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze",
            headers=headers,
            json={"url": "https://httpbin.org/html"},
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have regular webpage analysis
        assert data["scraping_data"]["source_type"] == "webpage"
        assert "analise" in data
        print("SUCCESS: Regular webpage URL analysis works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
