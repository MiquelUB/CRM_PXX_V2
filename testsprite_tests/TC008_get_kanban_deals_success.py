import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30
HEADERS = {
    "Accept": "application/json",
}


def test_get_kanban_deals_success():
    # Test GET /deals/kanban returns 200 OK with correctly grouped deals by status
    try:
        response = requests.get(f"{BASE_URL}/deals/kanban", headers=HEADERS, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        kanban_data = response.json()
        assert isinstance(kanban_data, dict), "Response JSON should be a dictionary of status columns"

        # Each key should map to a list (Kanban columns)
        for status, deals_list in kanban_data.items():
            assert isinstance(deals_list, list), f"Value for status '{status}' should be a list"
            for deal in deals_list:
                # Each deal must include id, title, municipality_id, and ordering index
                assert isinstance(deal, dict), "Each deal item should be a dict"
                assert "id" in deal, "'id' not found in deal"
                assert isinstance(deal["id"], int), "'id' should be an integer"
                assert "title" in deal, "'title' not found in deal"
                assert isinstance(deal["title"], str), "'title' should be a string"
                assert "municipality_id" in deal, "'municipality_id' not found in deal"
                assert isinstance(deal["municipality_id"], int), "'municipality_id' should be an integer"
                assert "ordering" in deal, "'ordering' not found in deal"
                # ordering index could be int or float depending on implementation, accept int only here
                assert isinstance(deal["ordering"], int), "'ordering' should be an integer"

        # Additionally test core endpoints for data integrity and categorization
        # Try to get one deal_id from kanban to test /deals/{deal_id}/full
        sample_deal_id = None
        for deals_list in kanban_data.values():
            if deals_list:
                sample_deal_id = deals_list[0]["id"]
                break

        if sample_deal_id is not None:
            resp_deal_full = requests.get(f"{BASE_URL}/deals/{sample_deal_id}/full", headers=HEADERS, timeout=TIMEOUT)
            assert resp_deal_full.status_code == 200, f"/deals/{sample_deal_id}/full expected 200 OK"
            deal_full = resp_deal_full.json()
            # Check basic keys existence corresponding to deal, municipality, contacts, interactions
            assert "deal" in deal_full, "'deal' missing in /deals/{id}/full response"
            assert "municipality" in deal_full, "'municipality' missing in /deals/{id}/full response"
            assert "contacts" in deal_full, "'contacts' missing in /deals/{id}/full response"
            assert "interactions" in deal_full, "'interactions' missing in /deals/{id}/full response"

        # Test /calendar/events endpoint for current month (2026-04)
        params = {"start": "2026-04-01", "end": "2026-04-30"}
        resp_cal_events = requests.get(f"{BASE_URL}/calendar/events", headers=HEADERS, params=params, timeout=TIMEOUT)
        assert resp_cal_events.status_code == 200, "/calendar/events expected 200 OK"
        events = resp_cal_events.json()
        assert isinstance(events, list), "/calendar/events response should be a list"
        for event in events:
            assert "timestamp" in event, "'timestamp' missing in calendar event"
            assert "type" in event, "'type' missing in calendar event"
            assert "summary" in event, "'summary' missing in calendar event"
            assert "related_deal_id" in event, "'related_deal_id' missing in calendar event"
            assert "interaction_id" in event, "'interaction_id' missing in calendar event"

    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"


test_get_kanban_deals_success()