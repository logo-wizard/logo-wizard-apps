import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import UserService from './services/UserService';
import LogoService from "./services/LogoService";

import './index.css';


const root = ReactDOM.createRoot(
    document.getElementById('root') as Element
);


console.log(`App env is "${process.env.REACT_APP_ENV}"`);


const renderApp = () => {
    root.render(
        <App/>
    )
}

UserService.initKeycloak(renderApp);
LogoService.configureLogoApi();
