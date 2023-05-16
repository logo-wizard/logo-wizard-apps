import React, {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {Button} from "react-bootstrap";

import Header from "../../Header/Header";
import {Logo, MockupsResponse} from "../../../types/types";
import LogoService from "../../../services/LogoService";
import UserService from "../../../services/UserService";
import RenderOnOwner from "../../RenderOnOwner/RenderOnOwner";
import {NotFound} from "../NotFoundPage/NotFoundPage";
import {Forbidden} from "../ForbiddenPage/ForbiddenPage";
import TriangleLoader from "../../Loader/Loader";

import './style.css';


const LogoViewerPage = () => {
    // Fetches and renders a logo with the id from the url and mockups, as well as some controls

    const [notFound, setNotFound] = useState<boolean>(false);
    const [forbidden, setForbidden] = useState<boolean>(false);
    const {logo_id} = useParams();
    const [logo, setLogo] = useState<Logo>();
    const [loaded, setLoaded] = useState<boolean>(false);
    const [mockups, setMockups] = useState<MockupsResponse>();
    const [mockupsLoaded, setMockupsLoaded] = useState<boolean>(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetch = () => {
            LogoService.getLogoInfo(logo_id!)
                .then(res => {
                    setLogo(res.data);
                    setLoaded(true);
                })
                .catch(err => {
                    console.log(err);
                    if (err.response.status === 404) {
                        setNotFound(true);
                    } else if (err.response.status === 403) {
                        setForbidden(true);
                    }
                })
        }

        if (!loaded) {
            fetch();
        }
    }, [loaded, logo_id]);

    useEffect(() => {
        const fetchMockups = () => {
            LogoService.getMockups(logo_id!)
                .then(res => {
                    setMockups(res.data);
                    setMockupsLoaded(true);
                })
                .catch(err => console.log(err))
        }

        if (!mockupsLoaded) {
            fetchMockups();
        }
    }, [mockupsLoaded, logo_id]);

    const downloadImage = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        window.open(`${logo!.link}`, '_blank');
    }

    const handleDelete = () => {
        LogoService.deleteLogo(logo!.id)
            .then(_ => {
                navigate('/profile');
            })
            .catch(err => console.log(err));
    }

    if (notFound) {
        return <NotFound/>;
    }

    if (forbidden) {
        return <Forbidden/>;
    }

    return (
        <div>
            <Header backUrl={'/'}/>
            <div className={'image-container'}>
                {loaded ? (
                    <>
                        <img
                            src={`${logo!.link}?${performance.now()}`}
                            alt={'result'}
                            onError={({currentTarget}) => {
                                const local_s3_link = currentTarget.src.replace('host.docker.internal', 'localhost');
                                if (currentTarget.src !== local_s3_link) currentTarget.src = local_s3_link;
                            }}
                        />

                        <div className={'buttons-wrapper'}>
                            <Button variant={'primary'} onClick={downloadImage}>
                                Скачать изображение
                            </Button>

                            {(logo!.created_by === null || logo!.created_by === UserService.getUserId()) && (
                                <Button variant={'primary'} onClick={() => navigate(`/edit-logo/${logo!.id}`)}>
                                    Продолжить обработку
                                </Button>
                            )}
                            <RenderOnOwner user_id={logo!.created_by}>
                                <Button variant={'outline-danger'} onClick={handleDelete}>
                                    Удалить
                                </Button>
                            </RenderOnOwner>
                        </div>
                    </>
                ) : (
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
                )}
            </div>
            {mockupsLoaded ? (
                <div className={'logo-mockups-container'}>
                    {mockups!.map((mockupS3Link, index) => {
                        return (
                            <img key={index} src={mockupS3Link} alt={'logo mockup'} onError={({currentTarget}) => {
                                const local_s3_link = currentTarget.src.replace('host.docker.internal', 'localhost');
                                if (currentTarget.src !== local_s3_link) currentTarget.src = local_s3_link;
                            }}/>
                        )
                    })}
                </div>
            ) : (
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
            )}
        </div>
    )
}

export default LogoViewerPage;
