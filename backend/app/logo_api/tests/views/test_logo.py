from logo_api.models import Logo


async def test_logo_info(client, logo_ready: Logo):
    resp = await client.get(f'/api/v1/logo/{logo_ready.id}/info')
    assert resp.status == 200, resp.json()
    json_resp = await resp.json()
    assert 'status' in json_resp, json_resp
    assert json_resp['status'] == 'ready', json_resp
