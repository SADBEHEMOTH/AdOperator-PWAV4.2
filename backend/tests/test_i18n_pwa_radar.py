"""
Test suite for i18n (multi-language), PWA, and Radar features
Tests language switching, PWA file accessibility, radar endpoints, and x-language header
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Login and get token for authenticated tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@test.com",
        "password": "test123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


class TestPWAFiles:
    """Test PWA file accessibility"""
    
    def test_manifest_json_accessible(self):
        """manifest.json should be accessible at root"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        data = response.json()
        assert data["short_name"] == "AdOperator"
        assert data["name"] == "AdOperator - Motor de Decisão"
        assert data["display"] == "standalone"
        assert data["start_url"] == "/"
        assert "icons" in data
        assert len(data["icons"]) >= 2
        print("✓ manifest.json accessible and valid")
    
    def test_service_worker_accessible(self):
        """service-worker.js should be accessible at root"""
        response = requests.get(f"{BASE_URL}/service-worker.js")
        assert response.status_code == 200
        content = response.text
        assert "CACHE_NAME" in content
        assert "adoperator-v1" in content
        assert "self.addEventListener" in content
        print("✓ service-worker.js accessible and valid")


class TestXLanguageHeader:
    """Test x-language header processing by backend"""
    
    def test_compliance_check_with_pt_language(self, auth_token):
        """Backend should accept x-language: pt header"""
        response = requests.post(
            f"{BASE_URL}/api/compliance/check",
            json={"text": "Este produto cura todas as doenças"},
            headers={"Authorization": f"Bearer {auth_token}", "x-language": "pt"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "riscos" in data
        assert "score" in data
        print("✓ x-language: pt header accepted")
    
    def test_compliance_check_with_en_language(self, auth_token):
        """Backend should accept x-language: en header"""
        response = requests.post(
            f"{BASE_URL}/api/compliance/check",
            json={"text": "This product cures everything"},
            headers={"Authorization": f"Bearer {auth_token}", "x-language": "en"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "riscos" in data
        print("✓ x-language: en header accepted")
    
    def test_compliance_check_with_es_language(self, auth_token):
        """Backend should accept x-language: es header"""
        response = requests.post(
            f"{BASE_URL}/api/compliance/check",
            json={"text": "Este producto cura todo"},
            headers={"Authorization": f"Bearer {auth_token}", "x-language": "es"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "riscos" in data
        print("✓ x-language: es header accepted")


class TestRadarEndpoints:
    """Test radar de tendências endpoints"""
    
    def test_get_radar_latest_returns_null_when_none(self, auth_token):
        """GET /api/radar/latest should return null when no radar exists"""
        response = requests.get(
            f"{BASE_URL}/api/radar/latest",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        # Can be null or a radar object
        data = response.json()
        if data is None:
            print("✓ GET /api/radar/latest returns null when no radar exists")
        else:
            assert "resumo" in data or "mudancas_mercado" in data
            print("✓ GET /api/radar/latest returns existing radar data")
    
    def test_generate_radar_requires_completed_analyses(self, auth_token):
        """POST /api/radar/generate requires completed analyses"""
        response = requests.post(
            f"{BASE_URL}/api/radar/generate",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Should either work (200) or fail because no completed analyses (400)
        if response.status_code == 400:
            assert "concluída" in response.json().get("detail", "") or "completed" in response.json().get("detail", "").lower()
            print("✓ POST /api/radar/generate correctly requires completed analyses")
        elif response.status_code == 200:
            data = response.json()
            assert "resumo" in data or "recomendacoes" in data
            print("✓ POST /api/radar/generate returned radar data")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_radar_generate_requires_auth(self):
        """POST /api/radar/generate should require authentication"""
        response = requests.post(f"{BASE_URL}/api/radar/generate")
        assert response.status_code == 401
        print("✓ POST /api/radar/generate requires authentication")


class TestAnalysesLanguageSupport:
    """Test that analyses endpoints accept x-language header"""
    
    def test_get_analyses_with_language(self, auth_token):
        """GET /api/analyses should accept x-language header"""
        for lang in ["pt", "en", "es"]:
            response = requests.get(
                f"{BASE_URL}/api/analyses",
                headers={"Authorization": f"Bearer {auth_token}", "x-language": lang}
            )
            assert response.status_code == 200
            assert isinstance(response.json(), list)
        print("✓ GET /api/analyses works with all 3 languages")


class TestAuthLanguageSupport:
    """Test authentication endpoints work with all languages"""
    
    def test_login_with_all_languages(self):
        """Login should work regardless of x-language header"""
        for lang in ["pt", "en", "es"]:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "test@test.com", "password": "test123"},
                headers={"x-language": lang}
            )
            assert response.status_code == 200
            assert "token" in response.json()
        print("✓ Login works with all 3 language headers")
    
    def test_auth_me_with_language(self, auth_token):
        """GET /api/auth/me should accept x-language header"""
        for lang in ["pt", "en", "es"]:
            response = requests.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {auth_token}", "x-language": lang}
            )
            assert response.status_code == 200
            assert "email" in response.json()
        print("✓ GET /api/auth/me works with all 3 languages")


class TestCompetitorAnalysisLanguage:
    """Test competitor analysis respects x-language header"""
    
    def test_get_competitor_analyses_with_language(self, auth_token):
        """GET /api/competitor/analyses should accept x-language header"""
        for lang in ["pt", "en", "es"]:
            response = requests.get(
                f"{BASE_URL}/api/competitor/analyses",
                headers={"Authorization": f"Bearer {auth_token}", "x-language": lang}
            )
            assert response.status_code == 200
            assert isinstance(response.json(), list)
        print("✓ GET /api/competitor/analyses works with all 3 languages")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
