import React from 'react';

import '@testing-library/jest-dom'
import {render, screen} from '@testing-library/react';

import UserService from "../../../services/UserService";
import RenderOnOwner from "../RenderOnOwner";


test('not owner', () => {
    const owner_user_id = 'i_am_the_owner';
    const owner_content = 'Owner content';

    jest.spyOn(UserService, 'getUserId').mockImplementation(() => 'i_am_not_the_owner');
    render(
        <RenderOnOwner user_id={owner_user_id}>
            <div>{owner_content}</div>
        </RenderOnOwner>
    );
    expect(screen.queryByText(owner_content)).not.toBeInTheDocument();
})


test('is owner', () => {
    const owner_user_id = 'i_am_the_owner';
    const owner_content = 'Owner content';

    jest.spyOn(UserService, 'getUserId').mockImplementation(() => owner_user_id);
    render(
        <RenderOnOwner user_id={owner_user_id}>
            <div>Owner content</div>
        </RenderOnOwner>
    );
    expect(screen.getByText(owner_content)).toBeInTheDocument();
})
