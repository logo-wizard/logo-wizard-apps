import Keycloak from "keycloak-js";

import {UserInfo} from "../types/types";


const _keycloak = new Keycloak({
    url: process.env.REACT_APP_KC_URL,
    realm: "logo",
    clientId: "logo",
});


class UserService {
    // Provides an interface to get user info

    static getLoginRedirectUri = () => window.location.protocol + '//' + window.location.host + '/profile';

    static getLogoutRedirectUri = () => window.location.protocol + '//' + window.location.host + '/';

    static initKeycloak = (onAuthenticatedCallback: () => void) => {
        _keycloak.init({
            onLoad: 'check-sso',
            silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
            pkceMethod: 'S256',
        })
            .then((authenticated) => {
                if (!authenticated) {
                    console.log("User is not authenticated..!");
                }
                onAuthenticatedCallback();
            })
            .catch(console.error);
    };

    static doLogin = _keycloak.login;

    static doLogout = _keycloak.logout;

    static getToken = () => _keycloak.token;

    static isLoggedIn = () => !!_keycloak.token;

    static updateToken = (successCallback: () => void) =>
        _keycloak.updateToken(5)
            .then(successCallback)
            .catch(this.doLogin);

    static getTokenParsed = () => _keycloak.tokenParsed;

    static getUserId = () => _keycloak.tokenParsed?.sub;

    static getUsername = () => _keycloak.tokenParsed?.preferred_username;

    static getEmail = () => _keycloak.tokenParsed?.email;

    static getMyUserInfo = () => { return {
        id: _keycloak.tokenParsed!.sub,
        username: _keycloak.tokenParsed!.preferred_username,
        firstName: _keycloak.tokenParsed!.firstName,
        lastName: _keycloak.tokenParsed!.lastName,
        email: _keycloak.tokenParsed!.email,
    } as UserInfo}

    static hasRole = (roles: string[]) => roles.some((role) => _keycloak.hasRealmRole(role));
}


export default UserService;
