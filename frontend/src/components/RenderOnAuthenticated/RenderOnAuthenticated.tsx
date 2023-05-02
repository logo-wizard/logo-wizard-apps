import {FC, ReactNode} from "react";

import UserService from "../../services/UserService";


interface Props {
    children: ReactNode
}


const RenderOnAuthenticated: FC<Props> = (props) => {
    // A helper component that renders the passed components only if the user is authenticated

    return (UserService.isLoggedIn()) ? (
        <>{props.children}</>
    ) : null
};


export default RenderOnAuthenticated;
