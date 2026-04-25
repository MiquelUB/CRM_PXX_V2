import requests
import traceback

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_deal_full_360_view():
    created_deal_id = None
    created_municipi_id = None
    headers = {"Content-Type": "application/json"}

    try:
        # Step 1: Get a list of Municipis to use a valid municipi_id or create one if none exist
        resp_municipis = requests.get(f"{BASE_URL}/municipis", timeout=TIMEOUT)
        assert resp_municipis.status_code == 200, f"Failed to get municipis, status code: {resp_municipis.status_code}"
        municipis_list = resp_municipis.json()
        if not isinstance(municipis_list, list):
            raise AssertionError(f"Municipis response is not a list: {municipis_list}")
        if municipis_list:
            created_municipi_id = municipis_list[0].get("id") or municipis_list[0].get("municipi_id") or municipis_list[0].get("id", None)
            if created_municipi_id is None:
                # fallback to first municipi's any string id field
                for key in municipis_list[0]:
                    if isinstance(municipis_list[0][key], str):
                        created_municipi_id = municipis_list[0][key]
                        break
        else:
            # No municipi found, create one (not in PRD but necessary for test)
            # Since no POST /municipis endpoint described, fail test
            raise AssertionError("No municipis available to associate deal with.")

        # Step 2: Create a new Deal to test the full 360 view endpoint
        deal_payload = {
            "municipi_id": created_municipi_id,
            "estat": "open",
            "pla_tipus": "Mirador",
            "preu_acordat": 5000
        }
        resp_create = requests.post(f"{BASE_URL}/deals", json=deal_payload, headers=headers, timeout=TIMEOUT)
        assert resp_create.status_code == 200, f"Failed to create deal, status code: {resp_create.status_code}, body: {resp_create.text}"
        deal_obj = resp_create.json()
        assert isinstance(deal_obj, dict), f"Create deal response not object: {deal_obj}"
        created_deal_id = deal_obj.get("id")
        assert created_deal_id, "Created deal object missing 'id' field"

        # Step 3: Query the aggregated 360 view for the created deal
        resp_full = requests.get(f"{BASE_URL}/deals/{created_deal_id}/full", timeout=TIMEOUT)
        assert resp_full.status_code == 200, f"GET full 360 view failed, status code: {resp_full.status_code}, body: {resp_full.text}"

        full_360_obj = resp_full.json()
        assert isinstance(full_360_obj, dict), "360 view response is not a JSON object"

        # Validate expected keys in the response (deal details, municipi, contactes, interaccions)
        required_keys = ["deal", "municipi", "contactes", "interaccions"]
        for key in required_keys:
            # They may be empty but keys should exist
            assert key in full_360_obj, f"Key '{key}' missing in full 360 view response"

        # Optionally assert that the deal id matches
        if isinstance(full_360_obj.get("deal"), dict):
            assert full_360_obj["deal"].get("id") == created_deal_id, "Deal id in 360 view does not match requested deal id"

    except Exception:
        traceback.print_exc()
        raise

    finally:
        # Cleanup the created deal
        if created_deal_id:
            try:
                del_resp = requests.delete(f"{BASE_URL}/deals/{created_deal_id}", timeout=TIMEOUT)
                # Deletion success not guaranteed: ignore failures but log if any
                if del_resp.status_code not in (200, 204, 404):
                    print(f"Warning: Unexpected status code on deal deletion: {del_resp.status_code}")
            except Exception:
                print(f"Exception during cleanup of deal id {created_deal_id}:")
                traceback.print_exc()

test_get_deal_full_360_view()