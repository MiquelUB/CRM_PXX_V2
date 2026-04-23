import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_calendar_events_data_store_unreachable():
    url = f"{BASE_URL}/calendar/events"
    try:
        response = requests.get(url, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed with an exception: {e}"

    assert response.status_code == 500, (
        f"Expected status code 500 but got {response.status_code}. "
        f"Response content: {response.text}"
    )
    # Optionally check for indication of event retrieval failure in response body
    try:
        json_data = response.json()
        error_messages = [
            "event retrieval failure",
            "data store unreachable",
            "internal server error",
            "database error"
        ]
        assert any(msg in response.text.lower() for msg in error_messages) or \
            any(msg in str(json_data).lower() for msg in error_messages), \
            "Response does not indicate event retrieval failure"
    except ValueError:
        # Response is not JSON - still acceptable as long as 500 returned
        pass

test_get_calendar_events_data_store_unreachable()