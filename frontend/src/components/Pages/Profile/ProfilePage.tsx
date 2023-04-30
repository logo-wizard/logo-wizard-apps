import React, {FC, useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {Button} from "react-bootstrap";
import {Triangle} from "react-loader-spinner";
import Skeleton from "react-loading-skeleton";

import UserService from "../../../services/UserService";
import Header from "../../Header/Header";
import Gravatar from "../../Gravatar/Gravatar";
import {LogoCardsCollection} from "../../LogoCard/LogoCard";
import LogoService from "../../../services/LogoService";
import {Logo, LogoListResponse, UserInfo} from "../../../types/types";
import RenderOnOwner from "../../RenderOnOwner/RenderOnOwner";

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
                {userInfoLoaded ? (
                    <>
                        <Gravatar
                            username={userInfo!.username}
                            email={userInfo!.email}
                            size={200}
                            border={'#5584b8 4px solid'}
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

            {/*<LogoCardsCollection*/}
            {/*    amount={3}*/}
            {/*    loaded={true}*/}
            {/*    logos={mockLogoList}*/}
            {/*/>*/}

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
                    <Triangle
                        height="100"
                        width="100"
                        color="#007bff"
                        ariaLabel="triangle-loading"
                        wrapperStyle={{}}
                        visible={true}
                    />
                </div>
            ) : logoIdsList.logos.length === 0 ? (
                <div className={'no-logos-area-wrapper'}>
                    <h2>
                        Похоже, здесь пока нет ни одного логотипа
                    </h2>
                    <RenderOnOwner user_id={user_id}>
                        <Button variant={'primary'} onClick={() => navigate('/')}>
                            Создать
                        </Button>
                    </RenderOnOwner>
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

            {/*<LogoCardCollection>*/}
            {/*    <LogoCard link={'https://ya.ru'} img={'https://img3.goodfon.ru/original/1024x1024/8/69/priroda-gory-kamni-les.jpg'} text={'asdfqwer'} />*/}
            {/*    <LogoCard link={'https://ya.ru'} img={'https://img3.goodfon.ru/original/2048x2048/9/86/kariby-more-most-zelen.jpg'} text={'zxcv1234'} />*/}
            {/*    <LogoCard link={'https://ya.ru'} img={'https://img3.goodfon.ru/original/2048x2048/9/86/kariby-more-most-zelen.jpg'} text={'zxcv1234'} />*/}
            {/*    <LogoCard link={'https://ya.ru'} img={'https://img3.goodfon.ru/original/2048x2048/9/86/kariby-more-most-zelen.jpg'} text={'zxcv1234'} />*/}
            {/*    <LogoCard link={'https://ya.ru'} img={'https://img3.goodfon.ru/original/2048x2048/9/86/kariby-more-most-zelen.jpg'} text={'zxcv1234'} />*/}
            {/*</LogoCardCollection>*/}
        </div>
    )
}

export default ProfilePage;
