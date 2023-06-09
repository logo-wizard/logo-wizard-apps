import React, {FC, useEffect, useState} from "react";

import {Badge, Card} from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';

import {Logo, LogoStatus, UserInfo} from "../../types/types";
import LogoService from "../../services/LogoService";
import RenderOnOwner from "../RenderOnOwner/RenderOnOwner";
import TriangleLoader from "../Loader/Loader";

import './style.css';


interface LogoCardProps {
    logo: Logo
    doPoll: boolean  // whether to poll the log when its status is not ready
    onDelete?: (logoId: string) => void;
    withRegen: boolean;  // whether to allow regeneration
}


interface LogoCardsCollectionProps {
    loaded: boolean
    amount: number
    logos?: Logo[]
    onDelete?: (logoId: string) => void;
    withRegen: boolean;
}


const LogoCardSkeleton = () => {
    return (
        <Card style={{width: '18rem', height: 400}}>
            <div style={{height: 200}}>
                <Skeleton width={'100%'} height={'100%'}></Skeleton>
            </div>
            <Card.Body>
                <Skeleton width={'70%'}/>
                <br/>

                <Skeleton width={'100%'}/>
                <br/>
                <Skeleton width={'100%'}/>
                <br/>
                <Skeleton width={'100%'}/>
                <br/>
            </Card.Body>
        </Card>
    )
}


const LogoCard: FC<LogoCardProps> = ({logo, doPoll, onDelete, withRegen}) => {
    const openImage = (id: string) => window.open(`/view-logo/${id}`, '_blank');
    const openUser = (id: string) => window.open(`/user/${id}`, '_blank');

    const [thisLogo, setThisLogo] = useState<Logo>(logo);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

    const isRealUser = (userInfo: UserInfo | null) => userInfo !== null && userInfo?.id !== '';

    useEffect(() => {
        if (!doPoll || thisLogo.status !== LogoStatus.in_progress) return;

        const waitForStatus = () => {
            LogoService.getLogoStatus(thisLogo.id)
                .then(res => {
                    const status = res.data.status;
                    if (status === LogoStatus.in_progress) {
                        setTimeout(waitForStatus, 1000);
                    } else {
                        LogoService.getLogoInfo(thisLogo.id)
                            .then(res => {
                                setThisLogo(res.data);
                            })
                            .catch(err => console.log(err));
                    }
                    return;
                })
                .catch(err => console.log(err));
        }
        waitForStatus();
    })

    useEffect(() => {
        if (thisLogo.created_by === null) {
            setUserInfo({
                id: '',
                username: 'Аноним',
                firstName: 'Анонимный',
                lastName: 'Пользователь',
                email: '',
            });
            return;
        }
        const fetch = () => {
            LogoService.getUserInfo(thisLogo.created_by!)
                .then(res => {
                    setUserInfo(res.data);
                })
                .catch(err => console.log(err))
        }

        if (userInfo === null) {
            fetch();
        }
    }, [thisLogo.created_by]);

    const renderLogoImage = (logo: Logo) => {
        if (logo.status === LogoStatus.ready) {
            return (
                <Card.Img
                    variant="top"
                    className={'logo-card-image'}
                    src={logo.link!}
                    onError={({currentTarget}) => {
                        const local_s3_link = currentTarget.src.replace('host.docker.internal', 'localhost');
                        if (currentTarget.src !== local_s3_link) currentTarget.src = local_s3_link;
                    }}
                    style={{
                        height: '100%',
                        width: '100%',
                        objectFit: 'cover',
                        borderBottom: '1px solid rgba(0,0,0,.125)',
                    }}/>
            )
        } else if (logo.status === LogoStatus.in_progress) {
            return (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    verticalAlign: 'middle',
                    width: '100%',
                    height: '100%',
                    margin: 'auto',
                    borderBottom: '1px solid rgba(0,0,0,.125)',
                }}>
                    <TriangleLoader width={100} height={100}/>
                </div>
            )
        } else if (logo.status === LogoStatus.failed) {
            return (
                <Card.Img variant="top" alt={'failed'} src={`${process.env.PUBLIC_URL}/assets/failed.png`} style={{
                    height: '100%',
                    width: '100%',
                    padding: 35,
                    objectFit: 'contain',
                    borderBottom: '1px solid rgba(0,0,0,.125)',
                }}/>
            )
        }
    }

    return (
        <Card className={'logo-card'} key={thisLogo.id} style={{width: '18rem', height: 400}}>
            {withRegen && (
                <div
                    className={'regen-icon-wrapper'}
                >
                    <Button
                        variant="outline-dark"
                        onClick={() => {
                            if (thisLogo.status === LogoStatus.in_progress) return;
                            LogoService.regenLogo(thisLogo.id)
                                .then(res => {
                                    setThisLogo(res.data)
                                })
                                .catch(err => console.log(err))
                        }}
                        className={'regen-icon' + (thisLogo.status === LogoStatus.in_progress ? ' processing' : '')}
                    >
                    </Button>
                </div>
            )}
            <div style={{height: 200, overflow: 'hidden'}}>
                {renderLogoImage(thisLogo)}
            </div>
            <Card.Body>
                <Card.Title
                    style={{
                        WebkitBoxOrient: 'vertical',
                        display: '-webkit-box',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        WebkitLineClamp: 1,
                    }}
                >
                    {thisLogo.title}
                </Card.Title>
                <Card.Subtitle
                    className={`mb-2 text-muted one-line-no-wrap ${isRealUser(userInfo) ? 'cursor-pointer' : ''}`}
                    onClick={(e: React.MouseEvent) => isRealUser(userInfo) ? openUser(userInfo!.id) : null}
                >
                    Автор: {userInfo === null ? (<Skeleton width={'30%'}/>) : userInfo.username}
                </Card.Subtitle>
                <div>
                    <Card.Text>
                        <Badge pill bg={thisLogo.is_public ? 'primary' : 'secondary'}>
                            {thisLogo.is_public ? 'Публичный' : 'Скрытый'}
                        </Badge>
                    </Card.Text>
                </div>
                <div style={{width: '100%', minHeight: 100, position: 'relative'}}>
                    <div style={{position: 'absolute', bottom: 0, width: '100%'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                            <div>
                                <Button
                                    variant="outline-dark"
                                    onClick={() => {
                                        openImage(thisLogo.id)
                                    }}
                                    disabled={thisLogo.status !== LogoStatus.ready}
                                >
                                    Открыть
                                </Button>
                            </div>
                            <div>
                                {onDelete !== undefined && (
                                    <RenderOnOwner user_id={thisLogo.created_by}>
                                        <Button
                                            variant="outline-danger"
                                            onClick={() => onDelete(thisLogo.id)}
                                        >
                                            Удалить
                                        </Button>
                                    </RenderOnOwner>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Card.Body>
        </Card>
    )
}


const LogoCardsCollection: FC<LogoCardsCollectionProps> = (
    {
        loaded,
        amount,
        logos,
        onDelete = undefined,
        withRegen
    }
) => {
    return (
        <div className={'logo-cards-container'}>
            {!loaded || !logos ? (
                Array.from({length: amount}).map((_, index) => {
                    return (
                        <LogoCardSkeleton key={index}/>
                    )
                })
            ) : (
                logos.map(logo => (
                    <LogoCard key={logo.id} logo={logo} doPoll={true} onDelete={onDelete} withRegen={withRegen}/>
                ))
            )}
        </div>
    )
}


export {LogoCard, LogoCardsCollection};
