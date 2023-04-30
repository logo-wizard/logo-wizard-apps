async def test_ping(client):
    resp = await client.get('/api/v1/ping')
    assert resp.status == 200
    json_resp = await resp.json()
    assert 'result' in json_resp
