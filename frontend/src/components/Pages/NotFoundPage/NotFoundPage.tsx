import React from "react";

import Header from "../../Header/Header";

import './style.css';


export const NotFound = () => {
    return (
        <div>
            <Header backUrl={'/'}/>
            <div className={'main-not-found-container'}>
                <h1>Такой страницы нет</h1>
                <p className="zoom-area">
                    Проверьте URL или вернитесь <a href={'/'}>на главную</a>
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
