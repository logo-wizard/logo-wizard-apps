import React from 'react';
import ReactDOM from 'react-dom/client';

import App from '../App';


test('renders without crashing', () => {
    const div = document.createElement('div');
    div.classList.add('root');
    const root = ReactDOM.createRoot(
        div
    );
    root.render(
        <App/>
    )
});
