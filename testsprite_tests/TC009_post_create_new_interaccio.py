import requests
import datetime

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_post_create_new_interaccio():
    # First, create a new Deal resource to obtain a valid deal_id
    deal_payload = {
        "municipi_id": "M123",
        "estat": "open",
        "pla_tipus": "Mirador",
        "preu_acordat": 5000
    }
    deal_id = None
    interaccio_id = None
    headers = {"Content-Type": "application/json"}

    try:
        # Create deal
        deal_resp = requests.post(f"{BASE_URL}/deals", json=deal_payload, headers=headers, timeout=TIMEOUT)
        assert deal_resp.status_code == 200, f"Expected 200 for deal creation, got {deal_resp.status_code}"
        deal_data = deal_resp.json()
        assert "id" in deal_data, "Response from deal creation missing 'id'"
        deal_id = deal_data["id"]

        # Prepare interaction payload with valid deal_id
        interaccio_payload = {
            "deal_id": deal_id,
            "type": "note",
            "content": "Site visit scheduled",
            "timestamp": "2026-04-20T10:00:00Z"
        }

        # Create interaccio
        interaccio_resp = requests.post(f"{BASE_URL}/interaccions", json=interaccio_payload, headers=headers, timeout=TIMEOUT)
        assert interaccio_resp.status_code == 200, f"Expected 200 for interaccions creation, got {interaccio_resp.status_code}"
        interaccio_data = interaccio_resp.json()

        # Validate response contains the correct fields and values
        assert isinstance(interaccio_data, dict), "Interaccio response is not an object"
        assert interaccio_data.get("deal_id") == deal_id, "deal_id in response does not match request"
        assert interaccio_data.get("type") == "note", "type in response does not match request"
        assert interaccio_data.get("content") == "Site visit scheduled", "content in response does not match request"
        assert interaccio_data.get("timestamp") == "2026-04-20T10:00:00Z", "timestamp in response does not match request"
        # Save interaccions id for deletion if available
        interaccio_id = interaccio_data.get("id")

    finally:
        # Cleanup: delete created interaccio if possible
        if interaccio_id:
            try:
                requests.delete(f"{BASE_URL}/interaccions/{interaccio_id}", timeout=TIMEOUT)
            except Exception:
                pass
        # Cleanup: delete created deal if possible
        if deal_id:
            try:
                requests.delete(f"{BASE_URL}/deals/{deal_id}", timeout=TIMEOUT)
            except Exception:
                pass

test_post_create_new_interaccio()