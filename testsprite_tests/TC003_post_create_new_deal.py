import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_post_create_new_deal():
    url = f"{BASE_URL}/deals"
    payload = {
        "municipi_id": "M123",
        "estat": "open",
        "pla_tipus": "Mirador",
        "preu_acordat": 5000
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Unexpected status code: {response.status_code}, Response: {response.text}"
        data = response.json()
        # Validate the response includes the created deal object with an id and matching fields
        assert isinstance(data, dict), "Response is not a JSON object"
        assert "id" in data, "Created deal object missing 'id'"
        assert data.get("municipi_id") == payload["municipi_id"], "municipi_id does not match"
        assert data.get("estat") == payload["estat"], "estat does not match"
        assert data.get("pla_tipus") == payload["pla_tipus"], "pla_tipus does not match"
        assert data.get("preu_acordat") == payload["preu_acordat"], "preu_acordat does not match"
    finally:
        # Attempt to clean up by deleting the created deal if id is present
        if 'data' in locals() and "id" in data:
            deal_id = data["id"]
            delete_url = f"{BASE_URL}/deals/{deal_id}"
            try:
                resp = requests.delete(delete_url, timeout=TIMEOUT)
                # It's acceptable if the delete returns 200 or 204; no assertion here to avoid masking original errors
            except Exception:
                pass

test_post_create_new_deal()