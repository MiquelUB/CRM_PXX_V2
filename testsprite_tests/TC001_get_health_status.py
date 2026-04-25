import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_health_status():
    url = f"{BASE_URL}/health"
    try:
        response = requests.get(url, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, dict), "Response is not a JSON object"
        assert "status" in data and isinstance(data["status"], str), "'status' key missing or not a string"
        assert "version" in data and isinstance(data["version"], str), "'version' key missing or not a string"
        assert "timestamp" in data and isinstance(data["timestamp"], str), "'timestamp' key missing or not a string"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    except ValueError:
        assert False, "Response is not valid JSON"

test_get_health_status()