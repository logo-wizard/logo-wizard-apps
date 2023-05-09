import pytest

from logo_worker_interface.task_params import GenerateImageTaskParams

from logo_api.enums import LogoProcessingStatus
from logo_api.models import Logo

from logo_worker.tasks.gen import generate_image


@pytest.mark.asyncio
async def test_generate_logo(redis_model_manager, worker_task_ctx, logo_in_progress: Logo):
    assert logo_in_progress.link is None
    assert logo_in_progress.status == LogoProcessingStatus.in_progress

    await generate_image(
        ctx=worker_task_ctx,
        params=GenerateImageTaskParams(
            logo_id=logo_in_progress.id,
        ),
    )

    updated_logo = await Logo.get(redis_model_manager, logo_in_progress.id)
    assert updated_logo.link is not None
    assert updated_logo.status == LogoProcessingStatus.ready
