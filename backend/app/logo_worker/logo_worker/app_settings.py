from typing import Optional

from pydantic import BaseModel

from logo_api.base_settings import LogoSettingsCommon


class StableDiffusionSettings(BaseModel):
    MOCK: bool

    USE_DIFFUSERS: bool
    BASE_MODEL_PATH: str
    REPO: Optional[str]
    STEPS: int
    NEG_PROMPT: str
    HF_TOKEN: str

    OUTDIR: str
    SKIP_GRID: bool
    SKIP_SAVE: bool
    DDIM_STEPS: int
    PLMS: bool
    LAION400M: bool
    FIXED_CODE: bool
    DDIM_ETA: float
    N_ITER: int
    H: int
    W: int
    C: int
    F: int
    N_SAMPLES: int
    N_ROWS: int
    SCALE: float
    FROM_FILE: bool
    CONFIG: str
    CKPT: str
    SEED: int
    PRECISION: str


class DetectorSettings(BaseModel):
    DEVICE: str
    DETECTOR: str


class EraserSettings(BaseModel):
    DEVICE: str
    MODEL_PATH: str


class StylerSettings(BaseModel):
    MOCK: bool


class WorkerSettings(LogoSettingsCommon):
    SD: StableDiffusionSettings = StableDiffusionSettings(
        MOCK=False,
        USE_DIFFUSERS=True,
        BASE_MODEL_PATH='stabilityai/stable-diffusion-2',
        STEPS=30,
        REPO=None,
        NEG_PROMPT=(
            'low quality, worst quality, bad composition, extra digit,'
            ' fewer digits, text, inscription, watermark, label, asymmetric, shifted'
        ),
        HF_TOKEN='',
        OUTDIR='/outputs',
        SKIP_GRID=True,
        SKIP_SAVE=False,
        DDIM_STEPS=10,
        PLMS=True,
        LAION400M=False,
        FIXED_CODE=False,
        DDIM_ETA=0.0,
        N_ITER=1,
        H=128,
        W=128,
        C=4,
        F=8,
        N_SAMPLES=1,
        N_ROWS=0,
        SCALE=7.5,
        FROM_FILE=False,  # TODO remove
        CONFIG='/configs/stable-diffusion_v1-inference.yaml',
        CKPT='/models/model.ckpt',
        SEED=42,
        PRECISION='full',  # 'autocast'
    )

    TEXT_DETECTOR: DetectorSettings = DetectorSettings(
        DEVICE='cuda',
        DETECTOR='dbnetpp',
    )

    TEXT_ERASER: EraserSettings = EraserSettings(
        DEVICE='cuda',
        MODEL_PATH='/models/big-lama.pt',
    )

    STYLER: StylerSettings = StylerSettings(
        MOCK=False,
    )

    class Config(LogoSettingsCommon.Config):
        pass
