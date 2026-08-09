def test_user_fixture_can_authenticate(client, test_user):
    response = client.get("/me", headers=test_user["auth_headers"])

    assert response.status_code == 200
    assert response.json()["email"] == test_user["email"]
    assert response.json()["role"] == "user"


def test_admin_fixture_can_access_admin_route(client, test_admin):
    response = client.get("/admin-check", headers=test_admin["auth_headers"])

    assert response.status_code == 200
    assert "Welcome admin" in response.json()["message"]
