import React from "react";
import {useNavigate} from "react-router-dom";
import {Button} from "react-bootstrap";

import Header from "../../Header/Header";

import './style.css';

export const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div>
            <Header backUrl={'/'}/>
            <div className={'main-not-found-container'}>
                <h1>Такой страницы нет</h1>
                <p className="zoom-area">
                    Проверьте URL или вернитесь&nbsp;
                    <Button
                        variant={'primary'}
                        onClick={() => navigate('/')}
                    >
                        на главную
                    </Button>
                </p>
                <section className="error-container">
                    <span>4</span>
                    <span><span className="screen-reader-text">0</span></span>
                    <span>4</span>
                </section>
            </div>
        </div>
    )
}

const NotFoundPage = () => {
    return <NotFound/>;
}

export default NotFoundPage;
