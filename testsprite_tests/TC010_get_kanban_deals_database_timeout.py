import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_kanban_deals_database_timeout():
    url = f"{BASE_URL}/deals/kanban"
    try:
        response = requests.get(url, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

    # Assert status code is 503 Service Unavailable
    assert response.status_code == 503, f"Expected 503, got {response.status_code}"

    # Check response content for retry suggestion message
    try:
        json_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # The retry suggestion message should be in the response
    # Check for a key or message that suggests retry
    retry_msg_found = False

    # Possible key names or phrases we expect to find
    retry_suggestions = [
        "retry",
        "try again",
        "service unavailable",
        "temporarily unavailable",
        "please retry",
        "please try again",
        "timeout",
        "503"
    ]

    if isinstance(json_data, dict):
        # Search all string values in the dict for retry phrases
        for value in json_data.values():
            if isinstance(value, str):
                lowered = value.lower()
                if any(phrase in lowered for phrase in retry_suggestions):
                    retry_msg_found = True
                    break
        # If response has an error key or message key
        if not retry_msg_found:
            for key in json_data.keys():
                if "error" in key.lower() or "message" in key.lower():
                    val = json_data.get(key, "")
                    if isinstance(val, str) and any(phrase in val.lower() for phrase in retry_suggestions):
                        retry_msg_found = True
                        break

    assert retry_msg_found, "Retry suggestion message not found in 503 response"

test_get_kanban_deals_database_timeout()