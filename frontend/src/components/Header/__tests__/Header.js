import React from 'react';

import '@testing-library/jest-dom'
import {render, screen} from '@testing-library/react';

import UserService from "../../../services/UserService";
import Header from "../Header";


test('unauthorized', () => {
    render(<Header/>);
    expect(screen.getByText('Войти')).toBeInTheDocument();
})


test('authorized', () => {
    jest.spyOn(UserService, 'isLoggedIn').mockImplementation(() => true);
    render(<Header/>);
    expect(screen.getByText('Выйти')).toBeInTheDocument();
})
