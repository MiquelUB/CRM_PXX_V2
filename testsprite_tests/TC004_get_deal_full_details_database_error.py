import requests

BASE_URL = "http://localhost:8000"

def test_get_deal_full_details_database_error():
    # We assume dealing with a specific deal_id that triggers a database error for testing
    # This deal ID should be one that the test environment treats to simulate a DB failure.
    # Using a placeholder deal_id for the purpose of this test.
    deal_id = 99999999  

    url = f"{BASE_URL}/deals/{deal_id}/full"
    headers = {
        "Accept": "application/json"
    }

    try:
        response = requests.get(url, headers=headers, timeout=30)
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed with an exception: {e}"

    assert response.status_code == 500, f"Expected status code 500 but got {response.status_code}"

    try:
        response_json = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Check presence of diagnostic message in the response JSON
    # Assuming there's a key like 'detail' or 'error' containing the diagnostic info
    diagnostic_keys = ["detail", "error", "message"]
    diagnostic_message = None
    for key in diagnostic_keys:
        if key in response_json:
            diagnostic_message = response_json[key]
            break

    assert diagnostic_message is not None, "Diagnostic message not found in response JSON"
    assert isinstance(diagnostic_message, str) and diagnostic_message.strip() != "", "Diagnostic message is empty or not a string"

test_get_deal_full_details_database_error()