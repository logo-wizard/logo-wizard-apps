import aiohttp


async def test_text_detection(client, sample_image_data_url):
    with aiohttp.MultipartWriter() as mpwriter:
        mpwriter.append(sample_image_data_url)

    resp = await client.post(f'/api/v1/text/detect', data=mpwriter)
    assert resp.status == 201, resp.json()
    resp_json = await resp.json()

    text_id = resp_json['text_id']

    resp = await client.get(f'/api/v1/text/detect/{text_id}/status')
    assert resp.status == 200, resp.json()
    resp_json = await resp.json()
    assert resp_json['status'] == 'in_progress'

    resp = await client.get(f'/api/v1/text/detect/{text_id}/result')
    assert resp.status == 200, resp.json()
    resp_json = await resp.json()
    assert resp_json['mask'] is None  # because it is not processed at this point yet
