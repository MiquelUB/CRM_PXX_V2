import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_deal_full_details_success():
    # Step 1: Create a new deal to get a valid deal_id
    create_deal_url = f"{BASE_URL}/deals"
    create_payload = {
        "title": "Test Deal for TC001",
        "municipality_id": 1
    }
    headers = {"Content-Type": "application/json"}

    # We assume the API for deal creation exists as a POST /deals with payload including title and municipality_id
    # This assumption is necessary since the test case requires a valid numeric deal_id and no resource id provided
    deal_id = None
    try:
        create_resp = requests.post(create_deal_url, json=create_payload, headers=headers, timeout=TIMEOUT)
        create_resp.raise_for_status()
        deal_data = create_resp.json()
        assert "id" in deal_data and isinstance(deal_data["id"], int)
        deal_id = deal_data["id"]
        
        # Step 2: Invoke GET /deals/{deal_id}/full
        full_url = f"{BASE_URL}/deals/{deal_id}/full"
        resp = requests.get(full_url, timeout=TIMEOUT)
        assert resp.status_code == 200

        data = resp.json()
        # Validate the main keys in the response JSON per PRD
        assert "deal" in data and isinstance(data["deal"], dict)
        assert "municipality" in data and isinstance(data["municipality"], dict)
        assert "contacts" in data and isinstance(data["contacts"], list)
        assert "interactions" in data and isinstance(data["interactions"], list)

        # Additional checks for data types inside arrays
        for contact in data["contacts"]:
            assert isinstance(contact, dict)
        for interaction in data["interactions"]:
            assert isinstance(interaction, dict)

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    finally:
        if deal_id is not None:
            # Cleanup - delete the created deal
            delete_url = f"{BASE_URL}/deals/{deal_id}"
            try:
                del_resp = requests.delete(delete_url, timeout=TIMEOUT)
                # Accept 200 or 204 as success for deletion
                assert del_resp.status_code in {200, 204}
            except requests.RequestException:
                pass

test_get_deal_full_details_success()