import React, {FC} from "react";
import {useNavigate} from "react-router-dom";

import UserService from "../services/UserService";
import Gravatar from "../components/Gravatar/Gravatar";

import './style.css';


const PrivateRoute: FC<{ children: JSX.Element }> = ({children}) => {
    // A helper component that renders the passed components when the user is authenticated and a login page if not

    const navigate = useNavigate();

    return UserService.isLoggedIn() ? children : (
        <div className={'login-banner'}>
            <Gravatar
                size={200}
                border={'var(--darker-primary) 4px solid'}
            />
            <div className={'login-banner-text'}>
                Для продолжения необходимо авторизоваться
            </div>
            <div className={'login-banner-btn'}>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => UserService.doLogin({redirectUri: UserService.getLoginRedirectUri()})}
                >
                    Войти
                </button>
            </div>
            <div className={'login-banner-btn'}>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate('/')}
                >
                    На главную
                </button>
            </div>
        </div>
    );
};

export default PrivateRoute;