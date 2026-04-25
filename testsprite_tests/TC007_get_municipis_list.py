import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_municipis_list():
    url = f"{BASE_URL}/municipis"
    try:
        response = requests.get(url, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed with exception: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(data, list), f"Expected response to be a list, got {type(data)}"

test_get_municipis_list()