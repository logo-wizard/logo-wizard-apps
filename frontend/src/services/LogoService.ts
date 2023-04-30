import axios from "axios";

import {
    Logo,
    LogoCreateResponse,
    LogoDraft,
    LogoListResponse,
    LogoStatus,
    MockupsResponse,
    Point,
    UserInfo
} from "../types/types";
import UserService from "./UserService";


const logoApi = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
});


interface colorizeRequestPoints {
    pointsImage: Point[],
    pointsGamut: Point[],
}


class LogoService {
    static configureLogoApi = () => {
        logoApi.interceptors.request.use(
            // @ts-ignore
            config => {
                if (UserService.isLoggedIn()) {
                    const cb = () => {
                        config.headers.Authorization = `Bearer ${UserService.getToken()}`;
                        return Promise.resolve(config);
                    };
                    return UserService.updateToken(cb);
                } else {
                    return Promise.resolve(config);
                }
            },
            error => {
                Promise.reject(error);
            }
        );
    };

    static getLinkByKey = (key: string) => `https://storage.yandexcloud.net/s3-logo/${key}`;

    static requestGeneration = (logo: LogoDraft) => logoApi.post<LogoCreateResponse>("/api/v1/logo", logo);

    static getLogoInfo = (logoId: string) => logoApi.get<Logo>(`/api/v1/logo/${logoId}/info`);

    static getLogoStatus = (logoId: string) => logoApi.get<{status: LogoStatus}>(`/api/v1/logo/${logoId}/status`);

    static deleteLogo = (logoId: string) => logoApi.delete<{logo_id: string}>(`/api/v1/logo/${logoId}`)

    static regenLogo = (logoId: string) => logoApi.post<Logo>(`/api/v1/logo/${logoId}/regen`)

    static updateLogoImage = (logoId: string, image: string) => {
        let data = new FormData();
        data.append('file', image);
        return logoApi.post(`/api/v1/logo/${logoId}/image`, data);
    }

    static colorize = (points: colorizeRequestPoints, image: string) => {
        let data = new FormData();
        data.append('file', image);
        data.set('points', JSON.stringify(points));

        return logoApi.post(`/api/v1/colorize`, data);
    }

    static detectText = (image: string) => {
        let data = new FormData();
        data.append('file', image);

        return logoApi.post<{text_id: string}>(`/api/v1/text/detect`, data);
    }

    static detectTextStatus = (text_id: string) => {
        return logoApi.get<{status: LogoStatus}>(`/api/v1/text/detect/${text_id}/status`);
    }

    static detectTextResult = (text_id: string) => {
        return logoApi.get<{mask: string}>(`/api/v1/text/detect/${text_id}/result`);
    }

    static eraseText = (image: string, mask: string) => {
        let data = new FormData();
        data.append('file', image);
        data.append('mask', mask);

        return logoApi.post<{text_id: string}>(`/api/v1/text/erase`, data);
    }

    static eraseTextStatus = (text_id: string) => {
        return logoApi.get<{status: LogoStatus}>(`/api/v1/text/erase/${text_id}/status`);
    }

    static eraseTextResult = (text_id: string) => {
        return logoApi.get<{result: string}>(`/api/v1/text/erase/${text_id}/result`);
    }

    static stylizeImage = (image: string, prompt: string) => {
        let data = new FormData();
        data.append('file', image);
        data.append('prompt', prompt);

        return logoApi.post<{img_id: string}>(`/api/v1/stylize`, data);
    }

    static stylizeImageStatus = (img_id: string) => {
        return logoApi.get<{status: LogoStatus}>(`/api/v1/stylize/${img_id}/status`);
    }

    static stylizeImageResult = (img_id: string) => {
        return logoApi.get<{result: string}>(`/api/v1/stylize/${img_id}/result`);
    }

    static getMyLogos = () => logoApi.get<LogoListResponse>(`/api/v1/logo/my`);

    static getUserLogos = (user_id: string) => logoApi.get<LogoListResponse>(`/api/v1/logo/user/${user_id}`);

    static getBatchLogos = (logos: LogoListResponse) => logoApi.post<Logo[]>(`/api/v1/logo/batch`, logos);

    static getMockups = (logo_id: string) => logoApi.get<MockupsResponse>(`/api/v1/logo/${logo_id}/mockups`);

    static getUserInfo = (user_id: string) => logoApi.get<UserInfo>(`/api/v1/user/${user_id}/info`);
}


export default LogoService;
