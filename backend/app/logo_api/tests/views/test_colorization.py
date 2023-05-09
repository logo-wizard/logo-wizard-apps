import json

import aiohttp


async def test_colorization(client, sample_image_data_url):
    with aiohttp.MultipartWriter() as mpwriter:
        mpwriter.append(sample_image_data_url)
        mpwriter.append(json.dumps(dict(
            pointsImage=[{'x': 0, 'y': 0}],
            pointsGamut=[{'x': 0, 'y': 0}],
        )))

    resp = await client.post(f'/api/v1/colorize', data=mpwriter)
    assert resp.status == 200, resp.json()
    resp_json = await resp.json()
    assert all(key in resp_json for key in ['result', 'gamut'])
