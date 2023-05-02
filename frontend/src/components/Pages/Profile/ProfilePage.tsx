import React, {FC, useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";

import {Button, Toast} from "react-bootstrap";
import Skeleton from "react-loading-skeleton";

import UserService from "../../../services/UserService";
import Header from "../../Header/Header";
import Gravatar from "../../Gravatar/Gravatar";
import {LogoCardsCollection} from "../../LogoCard/LogoCard";
import LogoService from "../../../services/LogoService";
import {Logo, LogoListResponse, UserInfo} from "../../../types/types";
import RenderOnOwner from "../../RenderOnOwner/RenderOnOwner";
import TriangleLoader from "../../Loader/Loader";

import './style.css';


interface ProfilePageProps {
    other: boolean
}


const ProfilePage: FC<ProfilePageProps> = ({other = false}) => {
    const {user_id} = useParams();

    const navigate = useNavigate();

    const [userInfo, setUserInfo] = useState<UserInfo>();
    const [userInfoLoaded, setUserInfoLoaded] = useState<boolean>(false);

    const [logoIdsListLoaded, setLogoIdsListLoaded] = useState<boolean>(false);
    const [logoIdsList, setLogoIdsList] = useState<LogoListResponse>({logos: []})

    const [logoListLoaded, setLogoListLoaded] = useState<boolean>(false);
    const [logoList, setLogoList] = useState<Logo[]>([]);

    const [showCopied, setShowCopied] = useState<boolean>(false);

    const resetLogos = () => {
        setLogoIdsListLoaded(false);
        setLogoListLoaded(false);
    }

    const handleDelete = (logoId: string) => {
        LogoService.deleteLogo(logoId)
            .then(_ => {
                resetLogos();
            })
            .catch(err => console.log(err));
    }

    useEffect(() => {
        // Fetch current user info on load

        const fetchUserInfo = () => {
            if (other && user_id) {
                LogoService.getUserInfo(user_id)
                    .then(res => {
                        setUserInfo(res.data);
                        setUserInfoLoaded(true);
                    })
                    .catch(err => console.log(err))
            } else if (UserService.isLoggedIn()) {
                setUserInfo(UserService.getMyUserInfo())
                setUserInfoLoaded(true);
            }
        }

        if (!userInfoLoaded) {
            fetchUserInfo();
        }
    }, [userInfoLoaded]);

    useEffect(() => {
        // Fetch user logo IDs list to then load them

        const fetchLogoIdsList = () => {
            if (other && user_id) {
                LogoService.getUserLogos(user_id)
                    .then(res => {
                        setLogoIdsList(res.data);
                        setLogoIdsListLoaded(true);
                    })
                    .catch(err => console.log(err))
            } else if (!other && !user_id) {
                LogoService.getMyLogos()
                    .then(res => {
                        setLogoIdsList(res.data);
                        setLogoIdsListLoaded(true);
                    })
                    .catch(err => console.log(err))
            } else {
                alert('Something went wrong, redirecting to the profile page.');
                navigate('/profile');
            }
        }

        if (!logoIdsListLoaded) {
            fetchLogoIdsList();
        }
    }, [logoIdsListLoaded]);

    useEffect(() => {
        // Fetch complete logo info by IDs list

        const fetchLogoList = () => {
            LogoService.getBatchLogos(logoIdsList)
                .then(res => {
                    setLogoList(res.data);
                    setLogoListLoaded(true);
                })
                .catch(err => console.log(err))
        }

        if (logoIdsListLoaded && !logoListLoaded) {
            fetchLogoList();
        }
    }, [logoIdsListLoaded, logoListLoaded]);

    return (
        <div>
            <Header backUrl={'/'}/>
            <div className={'profile-header'}>
                <Toast
                    className={'toast-copied'}
                    onClose={() => setShowCopied(false)}
                    show={showCopied}
                    delay={3000}
                    autohide
                >
                    <Toast.Header>Ссылка скопирована в буфер обмена</Toast.Header>
                </Toast>
                {(userInfo || user_id) && (
                    <div className={'link-icon-wrapper'}>
                        <div className={'link-icon' + (!userInfoLoaded ? ' not-ready' : '')}
                             onClick={() => {
                                 const userId = user_id || userInfo?.id;
                                 const url = new URL(window.location.toString());
                                 const profileLink = `${url.protocol}//${url.host}/user/${userId}`;
                                 navigator.clipboard.writeText(profileLink);
                                 setShowCopied(true);
                             }}
                        ></div>
                    </div>
                )}
                {userInfoLoaded ? (
                    <>
                        <Gravatar
                            username={userInfo!.username}
                            email={userInfo!.email}
                            size={200}
                            border={'var(--darker-primary) 4px solid'}
                        />
                        <div className={'profile-username'}>
                            {userInfo!.username}
                        </div>
                    </>
                ) : (
                    <>
                        <Skeleton circle={true} width={200} height={200}/>
                        <br/>
                        <Skeleton width={200} height={40}/>
                    </>
                )}
            </div>

            <br/>

            {!logoIdsListLoaded ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    verticalAlign: 'middle',
                    width: '100%',
                    height: '100%',
                    margin: 'auto',
                }}>
                    <TriangleLoader width={100} height={100}/>
                </div>
            ) : logoIdsList.logos.length === 0 ? (
                <div className={'no-logos-area-wrapper'}>
                    <h2 style={{textAlign: 'center'}}>
                        Похоже, здесь пока нет ни одного логотипа
                    </h2>
                    {userInfo && (
                        <RenderOnOwner user_id={userInfo.id}>
                            <Button variant={'primary'} onClick={() => navigate('/')}>
                                Создать
                            </Button>
                        </RenderOnOwner>
                    )}
                </div>
            ) : (
                <LogoCardsCollection
                    amount={logoIdsList.logos.length}
                    loaded={logoListLoaded}
                    logos={logoList}
                    onDelete={handleDelete}
                    withRegen={!other}
                />
            )}
        </div>
    )
}

export default ProfilePage;
