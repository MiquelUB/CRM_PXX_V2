import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_post_create_new_contacte():
    # First, get a valid municipi_id by retrieving the list of municipalities
    municipi_id = None
    try:
        res_municipis = requests.get(f"{BASE_URL}/municipis", timeout=TIMEOUT)
        assert res_municipis.status_code == 200, f"GET /municipis failed with status {res_municipis.status_code}"
        municipis_data = res_municipis.json()
        assert isinstance(municipis_data, list), "Municipis response data is not a list"
        assert len(municipis_data) > 0, "No municipis available to use for contact creation"
        municipi_id = municipis_data[0].get("id") or municipis_data[0].get("municipi_id") or municipis_data[0].get("id") or municipis_data[0].get("nom") or None
        # Attempt typical keys for municipi id, fallback to first field string if no id
        if municipi_id is None:
            # fallback: first string value in the object as municipi_id
            for v in municipis_data[0].values():
                if isinstance(v, str):
                    municipi_id = v
                    break
        assert municipi_id is not None, "Could not determine municipi_id from municipis response"
    except Exception as e:
        raise AssertionError(f"Failed to obtain valid municipi_id: {e}")

    contact_payload = {
        "municipi_id": municipi_id,
        "name": "Test Contacte",
        "role": "Regidor",
        "email": "test.contacte@example.com"
    }

    created_contact_id = None
    try:
        response = requests.post(f"{BASE_URL}/contactes", json=contact_payload, timeout=TIMEOUT)
        assert response.status_code == 200, f"POST /contactes failed with status {response.status_code}"
        contact_data = response.json()
        # Validate the structure of the returned contact object
        assert isinstance(contact_data, dict), "Response is not a JSON object"
        for key in ["municipi_id", "name", "role", "email"]:
            assert key in contact_data, f"Response object missing '{key}'"
        assert contact_data["municipi_id"] == contact_payload["municipi_id"], "municipi_id mismatch"
        assert contact_data["name"] == contact_payload["name"], "name mismatch"
        assert contact_data["role"] == contact_payload["role"], "role mismatch"
        assert contact_data["email"] == contact_payload["email"], "email mismatch"
        # Assume there is an id field to identify the contact for deletion
        created_contact_id = contact_data.get("id")
        assert created_contact_id is not None, "Created contact object missing 'id' field"
    finally:
        if created_contact_id is not None:
            try:
                del_response = requests.delete(f"{BASE_URL}/contactes/{created_contact_id}", timeout=TIMEOUT)
                # We do not assert on delete success as the test primary focus is on create
            except Exception:
                pass

test_post_create_new_contacte()