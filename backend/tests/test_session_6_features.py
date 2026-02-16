"""
Test Session 6 New Features:
1. Strategy Operational Table - POST /api/analyses/:id/strategy-table
2. Media Upload - POST /api/media/upload, GET /api/media/:file_id, GET /api/media/user/list
3. Creative Generation - POST /api/creatives/generate, GET /api/creatives/list/:id, GET /api/creatives/file/:id
4. Push Subscription - POST /api/push/subscribe
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Get auth token for authenticated tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]

    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}


class TestStrategyTable(TestAuth):
    """Test Strategy Operational Table - 4 profiles per audience"""
    
    def test_strategy_table_requires_auth(self):
        """Strategy table endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/analyses/test-id/strategy-table")
        assert response.status_code == 401
    
    def test_strategy_table_requires_strategic_analysis(self, auth_headers):
        """Strategy table requires analysis with strategic_analysis set"""
        # First, get analyses list to find one without strategic_analysis
        analyses = requests.get(f"{BASE_URL}/api/analyses", headers=auth_headers).json()
        
        # Find analysis in 'created' status (no strategic_analysis)
        created_analysis = next((a for a in analyses if a.get("status") == "created"), None)
        
        if created_analysis:
            response = requests.post(
                f"{BASE_URL}/api/analyses/{created_analysis['id']}/strategy-table",
                headers=auth_headers
            )
            # Should fail because no strategic_analysis
            assert response.status_code == 400
            assert "análise estratégica" in response.json()["detail"].lower() or "estrategica" in response.json()["detail"].lower()
    
    def test_strategy_table_with_parsed_analysis(self, auth_headers):
        """Strategy table works with parsed analysis (has strategic_analysis)"""
        # Get analyses list
        analyses = requests.get(f"{BASE_URL}/api/analyses", headers=auth_headers).json()
        
        # Find analysis with strategic_analysis (status >= parsed)
        parsed_analysis = next(
            (a for a in analyses if a.get("status") in ["parsed", "generated", "simulated", "completed"]),
            None
        )
        
        if parsed_analysis:
            # This will take time due to AI call
            response = requests.post(
                f"{BASE_URL}/api/analyses/{parsed_analysis['id']}/strategy-table",
                headers=auth_headers,
                timeout=120
            )
            assert response.status_code == 200
            data = response.json()
            
            # Verify structure: should have 4 profiles
            assert "perfis" in data
            assert len(data["perfis"]) == 4
            
            # Verify profile names
            profile_names = [p["nome"] for p in data["perfis"]]
            expected_profiles = ["Cético", "Interessado", "Impulsivo", "Desconfiado"]
            for expected in expected_profiles:
                assert any(expected in name for name in profile_names), f"Missing profile: {expected}"
            
            # Verify each profile has required fields
            for profile in data["perfis"]:
                assert "abordagem" in profile
                assert "motivacao" in profile
                assert "roteiro" in profile
                assert "pontos_fortes" in profile
                assert "pontos_fracos" in profile
        else:
            pytest.skip("No parsed analysis found to test strategy table")


class TestMediaUpload(TestAuth):
    """Test Media Upload - image and video upload"""
    
    def test_media_upload_requires_auth(self):
        """Media upload requires authentication"""
        # Create a simple test image
        img_data = self._create_test_png()
        files = {"file": ("test.png", img_data, "image/png")}
        response = requests.post(f"{BASE_URL}/api/media/upload", files=files)
        assert response.status_code == 401
    
    def test_media_upload_image(self, auth_headers):
        """Upload image file and verify"""
        img_data = self._create_test_png()
        files = {"file": ("test_upload.png", img_data, "image/png")}
        
        response = requests.post(
            f"{BASE_URL}/api/media/upload",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "filename" in data
        assert "type" in data
        assert data["type"] == "image"
        assert "size" in data
        
        # Store for later tests
        self.__class__.uploaded_file_id = data["id"]
        print(f"Uploaded image with id: {data['id']}")
    
    def test_media_get_file(self, auth_headers):
        """Retrieve uploaded file"""
        file_id = getattr(self.__class__, 'uploaded_file_id', None)
        if not file_id:
            pytest.skip("No uploaded file to retrieve")
        
        response = requests.get(f"{BASE_URL}/api/media/{file_id}")
        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("image/")
    
    def test_media_list_user_files(self, auth_headers):
        """List user's uploaded media"""
        response = requests.get(
            f"{BASE_URL}/api/media/user/list",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # If we uploaded a file, it should be in the list
        if getattr(self.__class__, 'uploaded_file_id', None):
            file_ids = [m["id"] for m in data]
            assert self.__class__.uploaded_file_id in file_ids
    
    def test_media_upload_rejects_invalid_type(self, auth_headers):
        """Upload rejects non-image/video files"""
        files = {"file": ("test.txt", b"Hello World", "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/media/upload",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 400
        assert "imagens" in response.json()["detail"].lower() or "videos" in response.json()["detail"].lower()
    
    def test_media_get_nonexistent_file(self):
        """Get non-existent file returns 404"""
        response = requests.get(f"{BASE_URL}/api/media/nonexistent-file-id")
        assert response.status_code == 404
    
    def _create_test_png(self):
        """Create a minimal valid PNG file"""
        # Minimal PNG: 1x1 pixel white image
        # PNG signature + IHDR + IDAT + IEND
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 pixel
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0xFF,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        return io.BytesIO(png_data)


class TestCreativeGeneration(TestAuth):
    """Test Creative Generation - 3 providers"""
    
    def test_creative_generate_requires_auth(self):
        """Creative generation requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/creatives/generate",
            json={"analysis_id": "test", "provider": "claude_text"}
        )
        assert response.status_code == 401
    
    def test_creative_generate_claude_text(self, auth_headers):
        """Generate creative with claude_text provider (briefing, no image)"""
        # Get analyses list to find one
        analyses = requests.get(f"{BASE_URL}/api/analyses", headers=auth_headers).json()
        
        # Find any analysis
        analysis = next(iter(analyses), None)
        if not analysis:
            pytest.skip("No analysis found for creative generation")
        
        response = requests.post(
            f"{BASE_URL}/api/creatives/generate",
            headers=auth_headers,
            json={
                "analysis_id": analysis["id"],
                "provider": "claude_text",
                "prompt": ""
            },
            timeout=120
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "id" in data
        assert "provider" in data
        assert data["provider"] == "claude_text"
        assert "briefing" in data  # Claude text returns briefing
        
        briefing = data["briefing"]
        # Verify briefing has expected fields
        assert "conceito_visual" in briefing
        
        # Store for later tests
        self.__class__.creative_id = data["id"]
        self.__class__.analysis_id_for_creatives = analysis["id"]
        print(f"Generated creative with id: {data['id']}")
    
    def test_creative_list_by_analysis(self, auth_headers):
        """List creatives for an analysis"""
        analysis_id = getattr(self.__class__, 'analysis_id_for_creatives', None)
        if not analysis_id:
            # Get any analysis
            analyses = requests.get(f"{BASE_URL}/api/analyses", headers=auth_headers).json()
            analysis_id = analyses[0]["id"] if analyses else None
        
        if not analysis_id:
            pytest.skip("No analysis found")
        
        response = requests.get(
            f"{BASE_URL}/api/creatives/list/{analysis_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_creative_file_endpoint(self):
        """Get creative file (only works for image providers)"""
        # This endpoint only returns files for nano_banana and gpt_image
        response = requests.get(f"{BASE_URL}/api/creatives/file/nonexistent-id")
        assert response.status_code == 404
    
    def test_creative_invalid_provider(self, auth_headers):
        """Invalid provider returns 400"""
        analyses = requests.get(f"{BASE_URL}/api/analyses", headers=auth_headers).json()
        
        if not analyses:
            pytest.skip("No analysis found")
        
        response = requests.post(
            f"{BASE_URL}/api/creatives/generate",
            headers=auth_headers,
            json={
                "analysis_id": analyses[0]["id"],
                "provider": "invalid_provider"
            }
        )
        
        assert response.status_code == 400
        assert "provider" in response.json()["detail"].lower()


class TestPushSubscription(TestAuth):
    """Test Push Notification Subscription"""
    
    def test_push_subscribe_requires_auth(self):
        """Push subscription requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            json={"endpoint": "https://test.endpoint", "keys": {}}
        )
        assert response.status_code == 401
    
    def test_push_subscribe_success(self, auth_headers):
        """Subscribe to push notifications"""
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            headers=auth_headers,
            json={
                "endpoint": "https://test-push-endpoint.example.com/push/v1/test-id",
                "keys": {
                    "p256dh": "test-public-key-base64",
                    "auth": "test-auth-secret-base64"
                }
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "subscribed"
    
    def test_push_subscribe_updates_existing(self, auth_headers):
        """Subscribing again updates existing subscription (upsert)"""
        # Subscribe first time
        response1 = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            headers=auth_headers,
            json={
                "endpoint": "https://old-endpoint.example.com",
                "keys": {"p256dh": "old-key", "auth": "old-auth"}
            }
        )
        assert response1.status_code == 200
        
        # Subscribe second time with new endpoint
        response2 = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            headers=auth_headers,
            json={
                "endpoint": "https://new-endpoint.example.com",
                "keys": {"p256dh": "new-key", "auth": "new-auth"}
            }
        )
        assert response2.status_code == 200


class TestPWAFiles:
    """Test PWA manifest and service worker"""
    
    def test_manifest_json_accessible(self):
        """PWA manifest.json is accessible"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        data = response.json()
        
        assert "name" in data
        assert "short_name" in data
        assert "icons" in data
        assert "start_url" in data
        assert "display" in data
    
    def test_service_worker_accessible(self):
        """Service worker is accessible"""
        response = requests.get(f"{BASE_URL}/service-worker.js")
        assert response.status_code == 200
        
        content = response.text
        # Verify push event handler exists
        assert "push" in content
        assert "addEventListener" in content


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
