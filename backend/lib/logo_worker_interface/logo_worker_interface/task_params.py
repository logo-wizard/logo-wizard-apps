import attr


@attr.s
class GenerateImageTaskParams:
    logo_id: str = attr.ib()


@attr.s
class DetectTextTaskParams:
    text_obj_id: str = attr.ib()


@attr.s
class EraseTextTaskParams:
    text_obj_id: str = attr.ib()


@attr.s
class StylizeImageTaskParams:
    img_obj_id: str = attr.ib()
