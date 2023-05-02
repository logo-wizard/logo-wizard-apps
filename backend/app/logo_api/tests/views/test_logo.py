from logo_api.enums import LogoProcessingStatus

from logo_api.redis_model import RedisModelManager

from logo_api.models import Logo


async def test_create_logo(client):
    resp = await client.post(
        f'/api/v1/logo',
        json=dict(
            title='My Test Test Logo',
            specialization=['Spec1', 'Spec2'],
            palette='Palette',
            style='style',
            objects=['object1', 'object2'],
            is_public=True,
        ),
    )
    assert resp.status == 201, resp.json()
    json_resp = await resp.json()
    assert 'logo_id' in json_resp, json_resp


async def test_logo_regen(client, logo_ready):
    resp = await client.post(f'/api/v1/logo/{logo_ready.id}/regen')
    assert resp.status == 200, resp.json()
    json_resp = await resp.json()
    assert 'id' in json_resp, json_resp
    assert 'title' in json_resp, json_resp


async def test_logo_status(client, logo_ready: Logo):
    resp = await client.get(f'/api/v1/logo/{logo_ready.id}/status')
    assert resp.status == 200, resp.json()
    json_resp = await resp.json()
    assert 'status' in json_resp, json_resp
    assert json_resp['status'] == 'ready', json_resp


async def test_logo_info(client, logo_ready: Logo):
    resp = await client.get(f'/api/v1/logo/{logo_ready.id}/info')
    assert resp.status == 200, resp.json()
    json_resp = await resp.json()
    assert 'status' in json_resp, json_resp
    assert json_resp['status'] == 'ready', json_resp
    assert json_resp['title'] == logo_ready.title, json_resp


async def test_logo_info_batch(client, first_user_id: str, redis_model_manager: RedisModelManager):
    logos: list[Logo] = []
    n_logos = 5
    for i in range(n_logos):
        logo = Logo(
            manager=redis_model_manager,
            title=f'My Test Logo #{i + 1}',
            specialization=[],
            palette='',
            style='',
            objects=[],
            is_public=True,
            created_by=first_user_id,
            status=LogoProcessingStatus.ready,
            prompt='',
        )
        await logo.save(ttl=None)
        logos.append(logo)

    resp = await client.post(
        f'/api/v1/logo/batch',
        json=dict(
            logos=[{'logo_id': logo.id} for logo in logos]
        )
    )
    assert resp.status == 200, resp.json()
    json_resp = await resp.json()
    assert len(json_resp) == n_logos
    assert all('id' in logo for logo in json_resp)
