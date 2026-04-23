import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_kanban_deals_empty():
    """
    Verify that GET /deals/kanban when no deals exist returns 200 OK 
    with empty column arrays allowing the client to render empty Kanban columns.
    Also test core endpoints for data integrity and correct status categorization.
    """
    # Step 1: GET /deals/kanban
    kanban_url = f"{BASE_URL}/deals/kanban"
    try:
        resp_kanban = requests.get(kanban_url, timeout=TIMEOUT)
        resp_kanban.raise_for_status()
    except requests.RequestException as e:
        assert False, f"GET /deals/kanban request failed: {e}"

    assert resp_kanban.status_code == 200
    try:
        kanban_data = resp_kanban.json()
    except ValueError:
        assert False, "Response from /deals/kanban is not valid JSON"

    # The payload should have columns with empty arrays (no deals)
    # We expect columns for statuses; each should be present with empty array values
    assert isinstance(kanban_data, dict), "Kanban response should be a JSON object"
    # Check keys correspond to columns (assuming keys are status names, values lists)
    for key, value in kanban_data.items():
        assert isinstance(value, list), f"Kanban column '{key}' should be a list"
        assert len(value) == 0, f"Kanban column '{key}' should be empty when no deals exist"

    # Since no deals exist, we cannot test /deals/{deal_id}/full directly, but verify response behavior
    # Test GET /deals/{deal_id}/full with a known non-existent deal_id to check 404 response
    non_existent_deal_id = 999999999
    deal_full_url = f"{BASE_URL}/deals/{non_existent_deal_id}/full"
    try:
        resp_deal_full = requests.get(deal_full_url, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"GET /deals/{non_existent_deal_id}/full request failed: {e}"
    assert resp_deal_full.status_code == 404

    # Test GET /calendar/events with a valid date range, expecting 200 and array of events (may be empty)
    calendar_url = f"{BASE_URL}/calendar/events"
    params = {"start": "2026-04-01", "end": "2026-04-30"}
    try:
        resp_calendar = requests.get(calendar_url, params=params, timeout=TIMEOUT)
        resp_calendar.raise_for_status()
    except requests.RequestException as e:
        assert False, f"GET /calendar/events request failed: {e}"

    assert resp_calendar.status_code == 200
    try:
        calendar_data = resp_calendar.json()
    except ValueError:
        assert False, "Response from /calendar/events is not valid JSON"

    assert isinstance(calendar_data, list), "Calendar events response should be a JSON array"
    # Each event, if any, should contain required keys
    for event in calendar_data:
        assert isinstance(event, dict), "Each calendar event should be an object"
        for field in ("timestamp", "type", "summary", "related_deal_id", "interaction_id"):
            assert field in event, f"Calendar event missing field '{field}'"

test_get_kanban_deals_empty()