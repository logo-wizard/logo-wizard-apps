import React from 'react';

import '@testing-library/jest-dom'
import {render, screen} from '@testing-library/react';

import UserService from "../../../services/UserService";
import RenderOnAuthenticated from "../RenderOnAuthenticated";


test('unauthorized', () => {
    const auth_content = 'Auth content';

    render(
        <RenderOnAuthenticated>
            <div>{auth_content}</div>
        </RenderOnAuthenticated>
    );
    expect(screen.queryByText(auth_content)).not.toBeInTheDocument();
})


test('authorized', () => {
    const auth_content = 'Auth content';

    jest.spyOn(UserService, 'isLoggedIn').mockImplementation(() => true);
    render(
        <RenderOnAuthenticated>
            <div>{auth_content}</div>
        </RenderOnAuthenticated>
    );
    expect(screen.getByText(auth_content)).toBeInTheDocument();
})
