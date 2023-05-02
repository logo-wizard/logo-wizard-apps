import React from "react";
import {useNavigate} from "react-router-dom";
import {Button} from "react-bootstrap";

import Header from "../../Header/Header";

import './style.css';

export const Forbidden = () => {
    const navigate = useNavigate();

    return (
        <div>
            <Header backUrl={'/'}/>
            <div className={'main-not-found-container'}>
                <h1>Недостаточно прав</h1>
                <p className="zoom-area">
                    <Button
                        variant={'primary'}
                        onClick={() => navigate('/')}
                    >
                        На главную
                    </Button>
                </p>
                <section className="error-container">
                    <span>4</span>
                    <span><span className="screen-reader-text">0</span></span>
                    <span>3</span>
                </section>
            </div>
        </div>
    )
}

const ForbiddenPage = () => {
    return <Forbidden/>;
}

export default ForbiddenPage;
