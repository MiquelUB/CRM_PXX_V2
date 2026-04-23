import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_calendar_events_success():
    url = f"{BASE_URL}/calendar/events"
    params = {
        "start": "2026-04-01",
        "end": "2026-04-30"
    }
    try:
        response = requests.get(url, params=params, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        events = response.json()
        assert isinstance(events, list), "Response JSON is not a list"
        # Validate that each event object contains required fields
        for event in events:
            assert isinstance(event, dict), "Event item is not a dict"
            assert "timestamp" in event, "Missing 'timestamp' in event"
            assert "type" in event, "Missing 'type' in event"
            assert "summary" in event, "Missing 'summary' in event"
            assert "related_deal_id" in event, "Missing 'related_deal_id' in event"
            assert "interaction_id" in event, "Missing 'interaction_id' in event"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_calendar_events_success()