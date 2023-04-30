import marshmallow as ma

from logo_api.schemas.base import BaseRequestSchema


class UserInfoRequestSchema(BaseRequestSchema):
    user_id = ma.fields.String()


class UserInfoResponseSchema(BaseRequestSchema):  # TODO verify whether all fields are required
    id = ma.fields.String()
    username = ma.fields.String()
    firstName = ma.fields.String()
    lastName = ma.fields.String()
    email = ma.fields.String()
