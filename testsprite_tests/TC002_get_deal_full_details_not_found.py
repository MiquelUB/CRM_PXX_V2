import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_deal_full_details_not_found():
    non_existent_deal_id = 999999999  # Assumed to not exist
    url = f"{BASE_URL}/deals/{non_existent_deal_id}/full"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 404, f"Expected 404 Not Found but got {response.status_code}"
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Expected error payload should have error details, we check error key presence and message
    assert isinstance(data, dict), "Error payload should be a JSON object"
    assert ("error" in data or "detail" in data), "Error payload must contain 'error' or 'detail' key"
    # If detail or error is string check it is not empty
    error_message = data.get("error") or data.get("detail")
    assert isinstance(error_message, (str, dict)), "'error' or 'detail' should be a string or dict"
    if isinstance(error_message, str):
        assert error_message.strip() != "", "'error' or 'detail' message should not be empty"

test_get_deal_full_details_not_found()