import React, {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {Triangle} from "react-loader-spinner";
import {Button} from "react-bootstrap";

import Header from "../../Header/Header";
import {Logo, MockupsResponse} from "../../../types/types";
import LogoService from "../../../services/LogoService";
import RenderOnOwner from "../../RenderOnOwner/RenderOnOwner";

import './style.css';
import {NotFound} from "../NotFoundPage/NotFoundPage";


const LogoViewerPage = () => {
    const [notFound, setNotFound] = useState<boolean>(false);
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

    return (
        <div>
            <Header backUrl={'/'}/>
            <div className={'image-container'}>
                {loaded ? (
                    <>
                        <img src={`${logo!.link}`} alt={'result'}/>

                        <div className={'buttons-wrapper'}>
                            <Button variant={'primary'} onClick={downloadImage}>
                                Скачать изображение
                            </Button>

                            <RenderOnOwner user_id={logo!.created_by}>
                                <Button variant={'primary'} onClick={() => navigate(`/edit-logo/${logo!.id}`)}>
                                    Продолжить обработку
                                </Button>
                                <Button variant={'outline-danger'} onClick={handleDelete}>
                                    Удалить
                                </Button>
                                {/*<Button*/}
                                {/*    // style={{marginLeft: "auto", marginRight: 10}}*/}
                                {/*    variant="outline-danger"*/}
                                {/*    onClick={() => {*/}
                                {/*        openImage(thisLogo)*/}
                                {/*    }}*/}
                                {/*    disabled={thisLogo.status !== LogoStatus.ready}*/}
                                {/*>*/}
                                {/*    Удалить*/}
                                {/*</Button>*/}
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
                        <Triangle
                            height="100"
                            width="100"
                            color="#007bff"
                            ariaLabel="triangle-loading"
                            wrapperStyle={{}}
                            visible={true}
                        />
                    </div>
                )}
            </div>
            {mockupsLoaded ? (
                <div className={'logo-mockups-container'}>
                    {mockups!.map((mockupS3Key) => {
                        return (
                            <img key={mockupS3Key} src={LogoService.getLinkByKey(mockupS3Key)} alt={'logo mockup'}/>
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
                    <Triangle
                        height="100"
                        width="100"
                        color="#007bff"
                        ariaLabel="triangle-loading"
                        wrapperStyle={{}}
                        visible={true}
                    />
                </div>
            )}
        </div>
    )
}

export default LogoViewerPage;
