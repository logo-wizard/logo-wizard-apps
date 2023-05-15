import {FC} from "react";

import UserService from "../../services/UserService";
import Gravatar from "../Gravatar/Gravatar";
import ArrowBack from "../ArrowBack/ArrowBack";

import './style.css';


interface HeaderProps {
    backUrl?: string
}


const Header: FC<HeaderProps> = ({backUrl}) => {
    return (
        <div className={'my-nav'}>
            <div className={'nav-btn'}>
                <ArrowBack backUrl={backUrl}/>
            </div>

            <a href={'/'} className={'link-no-decoration'}>
                <div className={'nav-title'}>
                    Logo Wizard
                </div>
            </a>

            <div className={'profile-corner'}>
                <a href={'/profile'}>
                    <div className={'avatar-wrapper'}>
                        <Gravatar
                            username={UserService.getUsername()}
                            email={UserService.getEmail()}
                            size={50}
                            border={'var(--darker-primary) 2px solid'}
                        />
                    </div>
                </a>

                {!UserService.isLoggedIn() && (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => UserService.doLogin({redirectUri: UserService.getLoginRedirectUri()})}
                    >
                        Войти
                    </button>
                )}

                {UserService.isLoggedIn() && (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => UserService.doLogout({redirectUri: UserService.getLogoutRedirectUri()})}
                    >
                        Выйти
                    </button>
                )}
            </div>
        </div>
    )
}


export default Header;
