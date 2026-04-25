import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_deals_kanban_list():
    try:
        response = requests.get(f"{BASE_URL}/deals/kanban", timeout=TIMEOUT)
        # Assert response status code
        assert response.status_code == 200, f"Expected 200 OK but got {response.status_code}"
        # Assert response content-type is JSON
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type, f"Expected JSON response but got {content_type}"
        data = response.json()
        # The response must be a JSON object (dictionary)
        assert isinstance(data, dict), f"Response JSON is not an object but {type(data)}"

        # Each key (column) should map to a list (possibly empty)
        for key, val in data.items():
            assert isinstance(val, list), f"Kanban column '{key}' does not map to a list but {type(val)}"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_deals_kanban_list()