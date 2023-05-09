import aiohttp


async def test_stylization(client, sample_image_data_url):
    with aiohttp.MultipartWriter() as mpwriter:
        mpwriter.append(sample_image_data_url)  # image
        mpwriter.append('software testing style logo')  # prompt

    resp = await client.post(f'/api/v1/stylize', data=mpwriter)
    assert resp.status == 201, resp.json()
    resp_json = await resp.json()

    img_id = resp_json['img_id']

    resp = await client.get(f'/api/v1/stylize/{img_id}/status')
    assert resp.status == 200, resp.json()
    resp_json = await resp.json()
    assert resp_json['status'] == 'in_progress'

    resp = await client.get(f'/api/v1/stylize/{img_id}/result')
    assert resp.status == 200, resp.json()
    resp_json = await resp.json()
    assert resp_json['result'] is None  # because it is not processed at this point yet
