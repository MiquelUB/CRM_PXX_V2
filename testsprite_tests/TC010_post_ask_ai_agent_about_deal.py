import requests
import uuid

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_post_ask_ai_agent_about_deal():
    # Step 1: Create a new Deal to get a valid deal_id for testing the AI agent ask endpoint
    deal_payload = {
        "municipi_id": "M_TEST_" + str(uuid.uuid4()),
        "estat": "open",
        "pla_tipus": "MIRADOR",
        "preu_acordat": 1000
    }
    new_deal = None

    try:
        create_deal_resp = requests.post(
            f"{BASE_URL}/deals",
            json=deal_payload,
            timeout=TIMEOUT
        )
        assert create_deal_resp.status_code == 200, f"Creating deal failed: {create_deal_resp.text}"
        new_deal = create_deal_resp.json()
        deal_id = new_deal.get("id")
        assert deal_id, "Created deal response missing 'id'"
        
        # Step 2: POST /agent/deals/{deal_id}/ask with a valid question
        question_payload = {
            "query": {
                "question": "Summarize the current status and recommended next steps."
            }
        }
        agent_ask_resp = requests.post(
            f"{BASE_URL}/agent/deals/{deal_id}/ask",
            json=question_payload,
            timeout=TIMEOUT
        )
        assert agent_ask_resp.status_code == 200, f"AI agent ask failed: {agent_ask_resp.text}"
        agent_response = agent_ask_resp.json()
        
        # Validate AI agent response object for keys: summary, key_facts, suggestions
        assert isinstance(agent_response, dict), "Response is not a JSON object"
        expected_keys = {"summary", "key_facts", "suggestions"}
        missing_keys = expected_keys - set(agent_response.keys())
        assert not missing_keys, f"Missing keys in AI response: {missing_keys}"
        
        # Validate types
        assert isinstance(agent_response["summary"], str), "summary should be a string"
        assert isinstance(agent_response["key_facts"], (list, dict)), "key_facts should be a list or dict"
        assert isinstance(agent_response["suggestions"], (list, dict)), "suggestions should be a list or dict"

    finally:
        # Cleanup: Delete the created deal if possible to maintain test isolation
        if new_deal and deal_id:
            try:
                requests.delete(f"{BASE_URL}/deals/{deal_id}", timeout=TIMEOUT)
            except Exception:
                # Ignore cleanup errors
                pass

test_post_ask_ai_agent_about_deal()
