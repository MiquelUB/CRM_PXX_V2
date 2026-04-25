import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_contactes_list():
    url = f"{BASE_URL}/contactes"
    try:
        response = requests.get(url, timeout=TIMEOUT)
        # Assert status code 200
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        data = response.json()
        # Assert the response is a list (array of contacts, possibly empty)
        assert isinstance(data, list), f"Expected response to be a list, got {type(data)}"
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

test_get_contactes_list()