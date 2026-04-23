import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30
HEADERS = {
    "Accept": "application/json"
}

def test_get_deal_full_details_invalid_id():
    invalid_deal_id = "abc"
    url = f"{BASE_URL}/deals/{invalid_deal_id}/full"
    try:
        response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 422, f"Expected status code 422, got {response.status_code}"

    # Validate response is JSON and contains validation error details
    try:
        error_payload = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(error_payload, dict), "Error payload is not a JSON object"
    # Check for typical validation error structure or keys
    has_error_detail = any(
        key in error_payload for key in ("detail", "errors", "message", "error")
    )
    assert has_error_detail, "Validation error details not found in response"

test_get_deal_full_details_invalid_id()