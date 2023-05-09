import React from 'react';
import {MemoryRouter, Route, Routes} from "react-router-dom";

import '@testing-library/jest-dom'
import {render, screen} from '@testing-library/react';

import PrivateRoute from "../PrivateRoute";
import UserService from "../../services/UserService";


test('unauthorized', () => {
    const privateRoute = '/private-route'

    render(
        <MemoryRouter initialEntries={[privateRoute]}>
            <Routes>
                <Route path={privateRoute} element={
                    <PrivateRoute>
                        <div>Private Content</div>
                    </PrivateRoute>
                }/>
            </Routes>
        </MemoryRouter>,
    )

    expect(screen.getByText('Для продолжения необходимо авторизоваться')).toBeInTheDocument();
})


test('authorized', () => {
    const privateRoute = '/private-route';

    jest.spyOn(UserService, 'isLoggedIn').mockImplementation(() => true);

    render(
        <MemoryRouter initialEntries={[privateRoute]}>
            <Routes>
                <Route path={privateRoute} element={
                    <PrivateRoute>
                        <div>Private Content</div>
                    </PrivateRoute>
                }/>
            </Routes>
        </MemoryRouter>,
    )

    expect(screen.getByText('Private Content')).toBeInTheDocument();
})
