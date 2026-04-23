import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_calendar_events_invalid_parameters():
    url = f"{BASE_URL}/calendar/events"
    headers = {"Accept": "application/json"}

    # Case 1: Missing both start and end parameters
    response = requests.get(url, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 400, "Expected 400 Bad Request when missing start/end parameters"
    json_data = response.json()
    assert "error" in json_data or "detail" in json_data, "Response should contain error or detail key for validation errors"

    # Case 2: Malformed start date
    params = {"start": "2026-04-31", "end": "2026-04-30"}  # April 31st is invalid
    response = requests.get(url, headers=headers, params=params, timeout=TIMEOUT)
    assert response.status_code == 400, "Expected 400 Bad Request for malformed start date"
    json_data = response.json()
    assert "error" in json_data or "detail" in json_data, "Response should contain error or detail key for validation errors"

    # Case 3: Malformed end date
    params = {"start": "2026-04-01", "end": "2026-02-30"}  # February 30th invalid
    response = requests.get(url, headers=headers, params=params, timeout=TIMEOUT)
    assert response.status_code == 400, "Expected 400 Bad Request for malformed end date"
    json_data = response.json()
    assert "error" in json_data or "detail" in json_data, "Response should contain error or detail key for validation errors"

    # Case 4: Only start parameter provided (end missing)
    params = {"start": "2026-04-01"}
    response = requests.get(url, headers=headers, params=params, timeout=TIMEOUT)
    assert response.status_code == 400, "Expected 400 Bad Request when end parameter is missing"
    json_data = response.json()
    assert "error" in json_data or "detail" in json_data, "Response should contain error or detail key for validation errors"

    # Case 5: Only end parameter provided (start missing)
    params = {"end": "2026-04-30"}
    response = requests.get(url, headers=headers, params=params, timeout=TIMEOUT)
    assert response.status_code == 400, "Expected 400 Bad Request when start parameter is missing"
    json_data = response.json()
    assert "error" in json_data or "detail" in json_data, "Response should contain error or detail key for validation errors"

test_get_calendar_events_invalid_parameters()