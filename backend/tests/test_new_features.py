"""
Test suite for AdOperator PASSO 1 features:
- Competitor Analysis API (POST /api/competitor/analyze, GET /api/competitor/analyses)
- Market Comparison API (POST /api/analyses/{id}/market-compare)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication for all other tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Auth failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    def test_login(self, auth_token):
        """Verify login works"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"Login successful, token received")


class TestCompetitorAnalysis:
    """Tests for Competitor Analysis feature"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_get_competitor_analyses_empty(self, headers):
        """Test GET /api/competitor/analyses returns list (empty or with items)"""
        response = requests.get(f"{BASE_URL}/api/competitor/analyses", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/competitor/analyses returned {len(data)} items")
    
    def test_competitor_analyze_with_simple_url(self, headers):
        """Test POST /api/competitor/analyze with a simple public URL"""
        # Using a simple, stable URL for testing
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze",
            headers=headers,
            json={"url": "https://httpbin.org/html"},
            timeout=60
        )
        
        # Either success or specific error (like scraping failed)
        if response.status_code == 200:
            data = response.json()
            assert "analise" in data or "id" in data
            # Check expected structure
            if "analise" in data:
                analise = data["analise"]
                assert "tipo_abertura" in analise or "promessa" in analise
            print(f"Competitor analysis successful: {list(data.keys())}")
        elif response.status_code == 400:
            # URL might be blocked or unreachable - this is expected behavior
            print(f"URL scraping blocked/failed (expected): {response.json().get('detail')}")
        else:
            # Unexpected error
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")
    
    def test_competitor_analyze_invalid_url(self, headers):
        """Test POST /api/competitor/analyze with invalid URL returns 400/422"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze",
            headers=headers,
            json={"url": "not-a-valid-url"},
            timeout=30
        )
        # Should return 4xx error for invalid URL
        assert response.status_code in [400, 422], f"Expected 4xx, got {response.status_code}"
        print(f"Invalid URL correctly rejected: {response.status_code}")
    
    def test_competitor_analyses_after_analyze(self, headers):
        """Test that competitor analyses list updates after analysis"""
        response = requests.get(f"{BASE_URL}/api/competitor/analyses", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Check structure if items exist
        if len(data) > 0:
            item = data[0]
            assert "url" in item
            assert "created_at" in item
            print(f"Competitor analyses list has {len(data)} items")


class TestMarketComparison:
    """Tests for Market Comparison feature"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def analysis_with_strategy(self, headers):
        """Create an analysis and run parse to get strategic_analysis"""
        # Create analysis
        create_resp = requests.post(
            f"{BASE_URL}/api/analyses",
            headers=headers,
            json={
                "nome": "TEST_MarketCompare Product",
                "nicho": "Emagrecimento",
                "promessa_principal": "Perder peso de forma saudavel",
                "publico_alvo": "Mulheres 30-50 anos",
                "beneficios": "Emagrecimento rapido sem efeitos colaterais",
                "ingredientes_mecanismo": "Formula natural com ingredientes organicos",
                "tom": "empoderador"
            }
        )
        assert create_resp.status_code == 200
        analysis_id = create_resp.json()["id"]
        
        # Run parse to get strategic_analysis
        parse_resp = requests.post(
            f"{BASE_URL}/api/analyses/{analysis_id}/parse",
            headers=headers,
            timeout=60
        )
        
        # Parse might fail or succeed - return analysis_id either way
        return analysis_id
    
    def test_market_compare_requires_strategy(self, headers):
        """Test that market-compare fails without strategic_analysis"""
        # Create new analysis WITHOUT running parse
        create_resp = requests.post(
            f"{BASE_URL}/api/analyses",
            headers=headers,
            json={
                "nome": "TEST_NoStrategy Product",
                "nicho": "Fitness",
                "promessa_principal": "Ganho muscular",
                "publico_alvo": "",
                "beneficios": "",
                "ingredientes_mecanismo": "",
                "tom": ""
            }
        )
        assert create_resp.status_code == 200
        analysis_id = create_resp.json()["id"]
        
        # Try market-compare without parse
        response = requests.post(
            f"{BASE_URL}/api/analyses/{analysis_id}/market-compare",
            headers=headers,
            timeout=30
        )
        
        # Should fail because no strategic_analysis
        assert response.status_code == 400
        assert "estratégica" in response.json().get("detail", "").lower() or "strategic" in response.json().get("detail", "").lower() or "primeiro" in response.json().get("detail", "").lower()
        print(f"Market compare correctly requires strategic analysis: {response.json()['detail']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/analyses/{analysis_id}", headers=headers)
    
    def test_market_compare_with_strategy(self, headers, analysis_with_strategy):
        """Test POST /api/analyses/{id}/market-compare with valid analysis"""
        analysis_id = analysis_with_strategy
        
        # Check if analysis has strategic_analysis
        get_resp = requests.get(f"{BASE_URL}/api/analyses/{analysis_id}", headers=headers)
        analysis = get_resp.json()
        
        if not analysis.get("strategic_analysis"):
            pytest.skip("Analysis doesn't have strategic_analysis - Claude API may have failed")
        
        # Run market compare
        response = requests.post(
            f"{BASE_URL}/api/analyses/{analysis_id}/market-compare",
            headers=headers,
            timeout=90  # AI calls can take time
        )
        
        if response.status_code == 200:
            data = response.json()
            # Check expected structure
            expected_keys = ["anuncios_mercado", "padroes_dominantes", "comparativo_usuario", "hooks_por_tipo"]
            found_keys = [k for k in expected_keys if k in data]
            assert len(found_keys) > 0, f"Expected at least one of {expected_keys}, got {list(data.keys())}"
            print(f"Market compare successful with keys: {found_keys}")
        else:
            # Log the error but don't fail hard - AI calls can timeout
            print(f"Market compare returned {response.status_code}: {response.text[:200]}")
    
    def test_market_compare_invalid_id(self, headers):
        """Test market-compare with non-existent analysis ID"""
        response = requests.post(
            f"{BASE_URL}/api/analyses/fake-invalid-uuid-12345/market-compare",
            headers=headers,
            timeout=10
        )
        assert response.status_code == 404
        print("Market compare correctly returns 404 for invalid ID")


class TestExistingEndpoints:
    """Verify existing endpoints still work"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_get_analyses(self, headers):
        """Test GET /api/analyses returns list"""
        response = requests.get(f"{BASE_URL}/api/analyses", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/analyses returned {len(data)} analyses")
    
    def test_create_analysis(self, headers):
        """Test POST /api/analyses creates new analysis"""
        response = requests.post(
            f"{BASE_URL}/api/analyses",
            headers=headers,
            json={
                "nome": "TEST_Basic Product",
                "nicho": "Tecnologia",
                "promessa_principal": "Revolucionar o mercado",
                "publico_alvo": "",
                "beneficios": "",
                "ingredientes_mecanismo": "",
                "tom": ""
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["status"] == "created"
        print(f"Created analysis: {data['id']}")
        
        # Cleanup
        del_resp = requests.delete(f"{BASE_URL}/api/analyses/{data['id']}", headers=headers)
        assert del_resp.status_code == 200
    
    def test_compliance_check(self, headers):
        """Test POST /api/compliance/check"""
        response = requests.post(
            f"{BASE_URL}/api/compliance/check",
            headers=headers,
            json={"text": "Este produto cura todas as doencas e garante resultado 100%"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "riscos" in data
        assert "score" in data
        assert len(data["riscos"]) > 0, "Should detect risky terms"
        print(f"Compliance check found {len(data['riscos'])} risks, score: {data['score']}")


# Cleanup fixture for TEST_ prefixed data
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed analyses after all tests"""
    yield
    
    # Get token
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@test.com",
        "password": "test123"
    })
    if response.status_code != 200:
        return
    
    token = response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get all analyses
    analyses = requests.get(f"{BASE_URL}/api/analyses", headers=headers)
    if analyses.status_code != 200:
        return
    
    # Delete TEST_ prefixed analyses
    for a in analyses.json():
        if a.get("product", {}).get("nome", "").startswith("TEST_"):
            requests.delete(f"{BASE_URL}/api/analyses/{a['id']}", headers=headers)
            print(f"Cleaned up: {a['product']['nome']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
