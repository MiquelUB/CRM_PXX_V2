import requests


def test_get_calendar_events():
    base_url = "http://localhost:8000"
    endpoint = "/calendar/events"
    params = {
        "start": "2026-04-01",
        "end": "2026-04-30"
    }
    timeout = 30
    url = base_url + endpoint

    try:
        response = requests.get(url, params=params, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate that 'data' is a list (events array)
    assert isinstance(data, list), "Response JSON is not a list (events array expected)"

    # Validate each event object in the events array is a dict and contains keys expected for react-big-calendar
    # react-big-calendar event usually has keys: id, title, start, end (iso datetime strings), allDay (optional)
    for event in data:
        assert isinstance(event, dict), "Each event should be a dictionary"
        # Mandatory keys validation (at least title, start, end)
        assert "title" in event, "Event missing 'title' key"
        assert "start" in event, "Event missing 'start' key"
        assert "end" in event, "Event missing 'end' key"
        # start and end should be strings (ISO format)
        assert isinstance(event["start"], str), "'start' should be a string"
        assert isinstance(event["end"], str), "'end' should be a string"


test_get_calendar_events()