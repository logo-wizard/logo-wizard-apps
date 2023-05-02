export enum LogoStatus {
    in_progress = 'in_progress',
    ready = 'ready',
    failed = 'failed',
}


export interface LogoDraft {
    [key: string]: any

    title: string
    is_public: boolean
    status: LogoStatus
    specialization: string[]
    palette: string
    style: string
    objects: string[]
}


export interface Logo {
    [key: string]: any

    id: string
    created_by: string | null
    title: string
    status: LogoStatus
    is_public: boolean
    link?: string | null
}


export interface LogoCreateResponse {
    logo_id: string
}


export interface UserInfo {
    id: string
    username: string
    firstName: string
    lastName: string
    email: string
}

export interface LogoListResponse {
    logos: { logo_id: string }[]
}

export interface MockupsResponse extends Array<string> {}


export type Point = {
    x: number
    y: number
}
